#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {App, Stack, Tags, StackProps} from 'aws-cdk-lib';
import {CdkEC2Stack} from '../lib/cdk-ec2-stack';

let date_ob = new Date();
const dateStamp = date_ob.toDateString()
const timestamp = date_ob.toLocaleTimeString()
const dtstamp = dateStamp+''+' '+timestamp

const app = new App();
const ec2_stack = new CdkEC2Stack(app, 'cdk-stack', {
  stackName: 'CDK-EC2-Deploy',
  env: {
    region: process.env.CDK_DEFAULT_REGION,
    account: process.env.CDK_DEFAULT_ACCOUNT,
  },
});


Tags.of(app).add("solution", "Systems Manager Fleet Manager RDP Demo")
Tags.of(app).add("environment", "test")
Tags.of(app).add("costcenter", "internal")
Tags.of(app).add("updatetimestamp", dtstamp)