#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const REGION = 'us-east-1'; // Change to your AWS region
const STACK_NAME_PREFIX = 'NewPushDemo';
const RESOURCES_STACK_NAME = `${STACK_NAME_PREFIX}-OtpResources`;
const API_STACK_NAME = `${STACK_NAME_PREFIX}-OtpApi`;
const FRONTEND_FILE_PATH = path.resolve(__dirname, '../src/components/PhoneNumberForm.js');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

/**
 * Execute a shell command and return the output
 */
function executeCommand(command) {
  console.log(`${colors.yellow}Executing:${colors.reset} ${command}`);
  try {
    const output = execSync(command, { encoding: 'utf8' });
    return output.trim();
  } catch (error) {
    console.error(`${colors.red}Error executing command:${colors.reset} ${error.message}`);
    if (error.stdout) console.error(`${colors.red}stdout:${colors.reset} ${error.stdout}`);
    if (error.stderr) console.error(`${colors.red}stderr:${colors.reset} ${error.stderr}`);
    throw error;
  }
}

/**
 * Deploy a CloudFormation stack
 */
function deployStack(stackName, templatePath, parameters = []) {
  const paramString = parameters.length > 0 
    ? `--parameters ${parameters.join(' ')}` 
    : '';
  
  console.log(`\n${colors.bright}${colors.cyan}Deploying stack: ${stackName}${colors.reset}`);
  
  try {
    // Check if stack exists
    try {
      executeCommand(`aws cloudformation describe-stacks --stack-name ${stackName} --region ${REGION}`);
      console.log(`Stack ${stackName} exists, updating...`);
      
      // Update existing stack
      executeCommand(`aws cloudformation update-stack \
        --stack-name ${stackName} \
        --template-body file://${templatePath} \
        ${paramString} \
        --capabilities CAPABILITY_IAM \
        --region ${REGION}`);
      
      // Wait for stack update to complete
      executeCommand(`aws cloudformation wait stack-update-complete \
        --stack-name ${stackName} \
        --region ${REGION}`);
      
    } catch (error) {
      if (error.stderr && error.stderr.includes('does not exist')) {
        console.log(`Stack ${stackName} does not exist, creating...`);
        
        // Create new stack
        executeCommand(`aws cloudformation create-stack \
          --stack-name ${stackName} \
          --template-body file://${templatePath} \
          ${paramString} \
          --capabilities CAPABILITY_IAM \
          --region ${REGION}`);
        
        // Wait for stack creation to complete
        executeCommand(`aws cloudformation wait stack-create-complete \
          --stack-name ${stackName} \
          --region ${REGION}`);
      } else {
        throw error;
      }
    }
    
    // Get stack outputs
    const stackOutputs = JSON.parse(executeCommand(`aws cloudformation describe-stacks \
      --stack-name ${stackName} \
      --query "Stacks[0].Outputs" \
      --region ${REGION}`));
    
    return stackOutputs;
  } catch (error) {
    console.error(`${colors.red}Failed to deploy stack ${stackName}:${colors.reset}`, error);
    process.exit(1);
  }
}

/**
 * Package and deploy the Lambda function
 */
function packageLambda(functionPath, outputPath) {
  console.log(`\n${colors.bright}${colors.cyan}Packaging Lambda function: ${functionPath}${colors.reset}`);
  
  // Create deployment directory if it doesn't exist
  const deploymentDir = path.join(functionPath, 'deployment');
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }
  
  // Install dependencies
  console.log(`Installing dependencies...`);
  executeCommand(`cd ${functionPath} && npm install --production`);
  
  // Create zip file
  console.log(`Creating zip file...`);
  executeCommand(`cd ${functionPath} && zip -r ${outputPath} . -x "node_modules/aws-sdk/*" "deployment/*" "*.zip"`);
  
  console.log(`${colors.green}Lambda function packaged successfully at ${outputPath}${colors.reset}`);
}

/**
 * Update the Lambda function code
 */
function updateLambdaCode(functionName, zipFilePath) {
  console.log(`\n${colors.bright}${colors.cyan}Updating Lambda function code: ${functionName}${colors.reset}`);
  
  try {
    executeCommand(`aws lambda update-function-code \
      --function-name ${functionName} \
      --zip-file fileb://${zipFilePath} \
      --region ${REGION}`);
    
    console.log(`${colors.green}Lambda function code updated successfully${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to update Lambda function code:${colors.reset}`, error);
    process.exit(1);
  }
}

/**
 * Update the frontend code with the API Gateway endpoints
 */
function updateFrontend(sendOtpEndpoint, verifyOtpEndpoint) {
  console.log(`\n${colors.bright}${colors.cyan}Updating frontend code with API endpoints${colors.reset}`);
  
  try {
    let frontendCode = fs.readFileSync(FRONTEND_FILE_PATH, 'utf8');
    
    // Replace API Gateway endpoints
    frontendCode = frontendCode.replace(
      /const SEND_OTP_ENDPOINT = '.*';/,
      `const SEND_OTP_ENDPOINT = '${sendOtpEndpoint}';`
    );
    frontendCode = frontendCode.replace(
      /const VERIFY_OTP_ENDPOINT = '.*';/,
      `const VERIFY_OTP_ENDPOINT = '${verifyOtpEndpoint}';`
    );
    
    fs.writeFileSync(FRONTEND_FILE_PATH, frontendCode);
    
    console.log(`${colors.green}Frontend code updated successfully${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}Failed to update frontend code:${colors.reset}`, error);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.bright}${colors.green}Starting OTP resources deployment${colors.reset}`);
  
  // Step 1: Package the Lambda function
  const lambdaPath = path.resolve(__dirname, '../lambda/otp-verification');
  const zipFilePath = path.join(lambdaPath, 'deployment/function.zip');
  packageLambda(lambdaPath, zipFilePath);
  
  // Step 2: Deploy the resources stack (DynamoDB table and SNS topic)
  const resourcesOutputs = deployStack(
    RESOURCES_STACK_NAME,
    path.resolve(__dirname, './otp-resources.yaml')
  );
  
  // Extract outputs from resources stack
  const otpTableName = resourcesOutputs.find(o => o.OutputKey === 'OtpTableName').OutputValue;
  const snsTopicArn = resourcesOutputs.find(o => o.OutputKey === 'SmsTopicArn').OutputValue;
  
  console.log(`${colors.green}Resources deployed:${colors.reset}`);
  console.log(`- OTP Table Name: ${otpTableName}`);
  console.log(`- SNS Topic ARN: ${snsTopicArn}`);
  
  // Step 3: Deploy the API stack (Lambda function and API Gateway)
  const apiOutputs = deployStack(
    API_STACK_NAME,
    path.resolve(__dirname, './otp-api.yaml'),
    [
      `ParameterKey=OtpTableName,ParameterValue=${otpTableName}`,
      `ParameterKey=SnsTopicArn,ParameterValue=${snsTopicArn}`
    ]
  );
  
  // Extract outputs from API stack
  const lambdaFunctionName = apiOutputs.find(o => o.OutputKey === 'LambdaFunctionName').OutputValue;
  const sendOtpEndpoint = apiOutputs.find(o => o.OutputKey === 'SendOtpEndpoint').OutputValue;
  const verifyOtpEndpoint = apiOutputs.find(o => o.OutputKey === 'VerifyOtpEndpoint').OutputValue;
  
  console.log(`${colors.green}API deployed:${colors.reset}`);
  console.log(`- Lambda Function Name: ${lambdaFunctionName}`);
  console.log(`- Send OTP Endpoint: ${sendOtpEndpoint}`);
  console.log(`- Verify OTP Endpoint: ${verifyOtpEndpoint}`);
  
  // Step 4: Update the Lambda function code
  updateLambdaCode(lambdaFunctionName, zipFilePath);
  
  // Step 5: Update the frontend code with the API Gateway endpoints
  updateFrontend(sendOtpEndpoint, verifyOtpEndpoint);
  
  console.log(`\n${colors.bright}${colors.green}Deployment completed successfully!${colors.reset}`);
  console.log(`\nNext steps:`);
  console.log(`1. Commit the changes to Git`);
  console.log(`2. Wait for Amplify to rebuild the application`);
  console.log(`3. Test the OTP verification functionality`);
}

// Run the main function
main().catch(error => {
  console.error(`${colors.red}Deployment failed:${colors.reset}`, error);
  process.exit(1);
});
