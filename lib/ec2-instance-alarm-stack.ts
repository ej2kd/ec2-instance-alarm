import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Alarm, Metric } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import {
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  IpAddresses,
  MachineImage,
  SecurityGroup,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Construct } from "constructs";
import { readFileSync } from "fs";

export class Ec2InstanceAlarmStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "Vpc", {
      ipAddresses: IpAddresses.cidr("10.1.0.0/16"),
      vpcName: "Ec2InstanceAlarmVpc",
      maxAzs: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: SubnetType.PUBLIC,
        },
      ],
    });

    const securityGroup = new SecurityGroup(this, "SecurityGroup", {
      vpc: vpc,
      securityGroupName: "TestSecurityGroup",
      allowAllOutbound: true,
    });

    const testIntance = new Instance(this, "TestInstance", {
      vpc: vpc,
      vpcSubnets: vpc.selectSubnets({ subnetGroupName: "Public" }),
      instanceType: InstanceType.of(
        InstanceClass.BURSTABLE3,
        InstanceSize.MICRO
      ),
      machineImage: MachineImage.fromSsmParameter(
        "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64"
      ),
      securityGroup: securityGroup,
      ssmSessionPermissions: true,
    });

    const userDataScript = readFileSync("./lib/user-data.sh", "utf8");
    testIntance.addUserData(userDataScript);

    const instanceCheckMetric = new Metric({
      metricName: "StatusCheckFailed_Instance",
      namespace: "AWS/EC2",
      dimensionsMap: {
        InstanceId: testIntance.instanceId,
      },
      statistic: "max",
      label: "Status Check Failed Instance",
      period: Duration.seconds(60),
    });

    const alarm = new Alarm(this, "InstanceCheckAlarm", {
      evaluationPeriods: 1,
      threshold: 1,
      metric: instanceCheckMetric,
    });

    const topic = new Topic(this, "Topic", {
      displayName: "InstanceFailedTopic",
    });
    topic.addSubscription(new EmailSubscription("your-address@example.com"));
    alarm.addAlarmAction(new SnsAction(topic));
  }
}
