#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Ec2InstanceAlarmStack } from '../lib/ec2-instance-alarm-stack';

const app = new cdk.App();
new Ec2InstanceAlarmStack(app, 'Ec2InstanceAlarmStack');
