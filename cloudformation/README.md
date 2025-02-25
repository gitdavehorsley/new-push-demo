# SMS API CloudFormation Deployment

This directory contains a CloudFormation template to deploy a Lambda function and API Gateway for sending SMS messages.

## Prerequisites

- AWS CLI installed and configured with appropriate credentials

## Files

- `template.yaml` - CloudFormation template that defines the Lambda function and API Gateway

## Deployment Steps

1. **Deploy the CloudFormation Stack**

   ```bash
   aws cloudformation create-stack \
     --stack-name SendSmsStack \
     --template-body file://template.yaml \
     --capabilities CAPABILITY_IAM
   ```

2. **Get the API Gateway Endpoint URL**

   After the stack is created, you can get the API Gateway endpoint URL:

   ```bash
   aws cloudformation describe-stacks \
     --stack-name SendSmsStack \
     --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
     --output text
   ```

3. **Update the Frontend**

   Update the PhoneNumberForm.js file to use the API Gateway endpoint:

   ```javascript
   // Replace this section in PhoneNumberForm.js
   try {
     // Call the API Gateway endpoint to send SMS
     console.log('Sending SMS to:', phoneNumber);
     
     const response = await fetch('YOUR_API_ENDPOINT_URL', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         phoneNumber: phoneNumber,
         message: 'Thank you for subscribing to push notifications!'
       })
     });
     
     const lambdaResponse = await response.json();
     console.log('API Gateway response:', lambdaResponse);
   ```

4. **Commit Changes to Git**

   After updating the frontend, commit your changes to Git:

   ```bash
   cd ../
   git add .
   git commit -m "Update frontend to use API Gateway"
   git push
   ```

5. **Wait for Amplify Rebuild**

   After pushing to Git, wait for Amplify to rebuild the application.

## Architecture

This deployment creates:

1. A Lambda function that sends SMS messages using Amazon SNS
2. An API Gateway REST API with a `/send-sms` endpoint
3. The necessary IAM permissions for the Lambda function to publish to SNS

The API Gateway endpoint accepts POST requests with the following JSON body:

```json
{
  "phoneNumber": "+1234567890",
  "message": "Your notification message here"
}
```

## Cleanup

To remove all resources created by this stack:

```bash
aws cloudformation delete-stack --stack-name SendSmsStack
```
