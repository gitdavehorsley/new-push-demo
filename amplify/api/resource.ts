import { defineApi } from '@aws-amplify/backend';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export const api = defineApi({
  routes: (routeBuilder) => {
    // Create the Lambda function
    const sendSmsFunction = new Function(routeBuilder.stack, 'SendSmsFunction', {
      runtime: Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: Code.fromAsset(path.join(__dirname, '../../lambda/send-sms')),
      environment: {
        SNS_TOPIC_ARN: 'arn:aws:sns:us-east-1:829591350088:NewPushDemo-SMS'
      }
    });
    
    // Add SNS permissions to the Lambda function
    sendSmsFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ['sns:Publish'],
        resources: ['*']
      })
    );
    
    // Define the API route
    return {
      '/send-sms': {
        post: {
          integration: sendSmsFunction,
          authorizer: 'iam'
