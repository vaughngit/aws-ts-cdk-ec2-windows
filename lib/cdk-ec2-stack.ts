import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {App, Stack, Tags, StackProps} from 'aws-cdk-lib';
import {aws_iam as iam }from 'aws-cdk-lib';
import {aws_ec2 as ec2 }from 'aws-cdk-lib';
import {MultipartBody, UserData, WindowsVersion } from 'aws-cdk-lib/aws-ec2';
import {aws_secretsmanager  as secman} from 'aws-cdk-lib'; 
import {readFileSync} from 'fs';
var generator = require('generate-password');

export class CdkEC2Stack extends Stack {
  constructor(scope: App, id: string, props?: StackProps) {
    super(scope, id, props);

  //hardcoded credentails intended for TESTING ENVIRONMENTS only 
  const user = "demouser"
  //const password = "SuperSecretPwd11!!"
  var password = generator.generate({
    length: 16,
    numbers: true,
    exclude: "@£$%&*()#€"
  });

  //Target Default VPC
  const vpc = ec2.Vpc.fromLookup(this, 'import default vpc', { isDefault: true });

  //Create Instance SecurityGroup -
  const serverSG = new ec2.SecurityGroup(this, 'create security group for instance', {vpc});
  // NO INBOUND TRAFFIC ALLOWED    
  // uncomment to allow port web traffic ingress into web server traffic 
  // serverSG.addIngressRule( ec2.Peer.anyIpv4(), ec2.Port.tcp(3389), 'allow RDP traffic from anywhere')

  // uncomment to allow RDP Traffic ingress over the internet into server traffic
  // serverSG.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'allow HTTP traffic from anywhere' ); 

  //Create ec2 instance role 
  const role =  new iam.Role(this, 'ec2 instance role', 
    {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      roleName: "CDK_TypeScript_EC2_Instance_Role",
      description: 'SSM IAM role in AWS CDK',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore"
        ),
      ],
    }
  )

  ///*  Add inline policy to role created above */
  role.addToPolicy(
    new iam.PolicyStatement(
    {
      effect: iam.Effect.ALLOW,
      actions: ["logs:DescribeLogGroups", "logs:CreateLogGroup" ], 
      resources : ["*"]
    }));
    role.addToPolicy(
      new iam.PolicyStatement(
      {
        effect: iam.Effect.ALLOW,
        actions: ["logs:CreateLogStream", "logs:DescribeLogStreams", "logs:PutLogEvents" ], 
        //resources : ["arn:aws:logs:*:*:log-group:/aws/systemManager/SessionManagerLogs" ] //specify write only to specific logGroup
        resources : ["*"]
      }));

  //Configure UserData Scripts to create demouser and install base webserver
  const multipartUserData = new ec2.MultipartUserData
  const commandsUserData = ec2.UserData.forWindows(); 
  multipartUserData.addUserDataPart(commandsUserData, MultipartBody.SHELL_SCRIPT);
  commandsUserData.addCommands(`$user="${user}"`);
  commandsUserData.addCommands(`$secureString = ConvertTo-SecureString "${password}" -AsPlainText -Force`);
  commandsUserData.addCommands("new-localuser $user -password  $secureString");
  commandsUserData.addCommands("Add-LocalGroupMember -Group \"Administrators\" -Member $user");
  commandsUserData.addCommands("Get-LocalUser $user | select *");

  // uncomment to install IIS webserver 
  // commandsUserData.addCommands("Install-WindowsFeature -name Web-Server -IncludeManagementTools");

  //Create EC2 Instance: 
    const ec2Instance = new ec2.Instance(this, 'ec2-instance', {
      vpc,
      role,
      securityGroup: serverSG,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      machineImage: new ec2.WindowsImage(WindowsVersion.WINDOWS_SERVER_2022_ENGLISH_FULL_BASE),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3A,
        ec2.InstanceSize.MEDIUM,
      ),
      instanceName: "TestWindowInstance-js-cdk",
      userData: commandsUserData
    });

    new cdk.CfnOutput(this, 'username', {value:user })
    new cdk.CfnOutput(this, 'password', {value: password}) 
    new cdk.CfnOutput(this, 'InstanceId', {value: ec2Instance.instanceId})

  }
  
}
