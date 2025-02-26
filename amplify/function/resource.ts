import { defineFunction } from '@aws-amplify/backend';

// Define the OTP verification function
export const otpVerificationFunction = defineFunction({
  entry: '../../lambda/otp-verification/index.js',
  environment: {
    // SNS and DynamoDB configuration
    SNS_TOPIC_ARN: process.env.SNS_TOPIC_ARN || '',
    OTP_TABLE_NAME: process.env.OTP_TABLE_NAME || 'OtpVerification',
    OTP_EXPIRY_MINUTES: '5',
    MAX_OTP_ATTEMPTS: '3',
    RATE_LIMIT_HOURS: '1',
    MAX_OTP_REQUESTS: '3'
  }
});

// Keep the old function for backward compatibility
export const sendSmsFunction = defineFunction({
  entry: '../../lambda/send-sms/index.js',
  environment: {
    // Pinpoint project ID - this is already set up
    PINPOINT_PROJECT_ID: '2610e382c60e4cf4bc148b61221f3116'
  }
});

// Note: The IAM permissions for SNS and DynamoDB are defined in the CloudFormation template
