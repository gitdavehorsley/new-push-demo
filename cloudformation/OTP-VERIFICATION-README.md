# OTP Verification System

This document describes the OTP (One-Time Password) verification system implemented for the New Push Demo application. The system uses AWS SNS for SMS delivery and DynamoDB for secure OTP storage, providing a cost-effective and secure solution for phone number verification.

## Architecture

The OTP verification system consists of the following components:

1. **DynamoDB Table**: Stores OTP hashes with TTL for automatic cleanup
2. **SNS Topic**: Used for sending SMS messages
3. **Lambda Function**: Handles OTP generation, storage, and verification
4. **API Gateway**: Provides REST endpoints for sending and verifying OTPs
5. **Frontend Component**: User interface for entering phone numbers and OTPs

### Security Features

- OTPs are stored as hashes in DynamoDB, not plaintext
- OTPs expire after 5 minutes (configurable)
- Maximum of 3 verification attempts per OTP (configurable)
- Rate limiting of 3 OTP requests per hour per phone number (configurable)
- Phone number validation for US numbers

## Cost Optimization

- SNS is more cost-effective than Pinpoint for simple SMS delivery (approximately 30-40% cheaper)
- DynamoDB TTL automatically removes expired OTPs to minimize storage costs
- Rate limiting prevents abuse and controls costs

## Deployment

The deployment process is automated using the `deploy-otp-resources.js` script, which:

1. Packages the Lambda function
2. Deploys the CloudFormation stack for DynamoDB and SNS
3. Deploys the CloudFormation stack for Lambda and API Gateway
4. Updates the Lambda function code
5. Updates the frontend code with the API Gateway endpoints

### Prerequisites

- AWS CLI installed and configured with appropriate permissions
- Node.js and npm installed
- Zip command-line utility installed

### Deployment Steps

1. Make the deployment script executable:
   ```bash
   chmod +x cloudformation/deploy-otp-resources.js
   ```

2. Run the deployment script:
   ```bash
   node cloudformation/deploy-otp-resources.js
   ```

3. Commit the changes to Git:
   ```bash
   git add .
   git commit -m "Implement cost-effective OTP verification with SNS and DynamoDB"
   git push
   ```

4. Wait for Amplify to rebuild the application

5. Test the OTP verification functionality

## CloudFormation Templates

The system uses two CloudFormation templates:

1. `otp-resources.yaml`: Defines the DynamoDB table and SNS topic
2. `otp-api.yaml`: Defines the Lambda function and API Gateway

## Lambda Function

The Lambda function (`lambda/otp-verification/index.js`) handles:

- Generating secure 6-digit OTPs
- Storing OTP hashes in DynamoDB with expiration
- Sending OTPs via SNS
- Verifying OTPs against stored hashes
- Enforcing rate limits and attempt limits

## Frontend Integration

The frontend component (`src/components/PhoneNumberForm.js`) has been updated to:

- Use the new API endpoints for sending and verifying OTPs
- Display expiration time information
- Show remaining attempts
- Support resending OTPs
- Handle rate limiting errors

## Configuration

The system can be configured through environment variables in the CloudFormation templates:

- `OTP_EXPIRY_MINUTES`: Number of minutes before an OTP expires (default: 5)
- `MAX_OTP_ATTEMPTS`: Maximum number of verification attempts per OTP (default: 3)
- `RATE_LIMIT_HOURS`: Number of hours for rate limiting (default: 1)
- `MAX_OTP_REQUESTS`: Maximum number of OTP requests per rate limit period (default: 3)

## Troubleshooting

If you encounter issues with the OTP verification system:

1. Check CloudWatch Logs for the Lambda function
2. Verify that the API Gateway endpoints are correctly configured in the frontend
3. Ensure that the SNS service has permissions to send SMS messages
4. Check that the DynamoDB table has TTL enabled
5. Verify that the Lambda function has the necessary permissions to access DynamoDB and SNS

## Future Improvements

Potential future improvements to the system:

1. Add support for international phone numbers
2. Implement multi-channel OTP delivery (email, push notifications)
3. Add analytics for tracking verification success rates
4. Implement progressive backoff for failed verification attempts
5. Add support for authenticator apps (TOTP)
