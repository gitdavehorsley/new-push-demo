import { defineFunction, type ClientSchema } from '@aws-amplify/backend';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export const sendSmsFunction = defineFunction({
  entry: '../../lambda/send-sms/index.js',
  environment: {
    SNS_TOPIC_ARN: 'arn:aws:sns:us-east-1:829591350088:NewPushDemo-SMS'
  },
  permissions: [
    new PolicyStatement({
      actions: ['sns:Publish'],
      resources: ['*']
    })
  ]
});
