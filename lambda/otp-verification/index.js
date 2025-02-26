const AWS = require('aws-sdk');
const crypto = require('crypto');

// Initialize AWS clients
const sns = new AWS.SNS();
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Environment variables
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const OTP_TABLE_NAME = process.env.OTP_TABLE_NAME || 'OtpVerification';
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10);
const MAX_OTP_ATTEMPTS = parseInt(process.env.MAX_OTP_ATTEMPTS || '3', 10);
const RATE_LIMIT_HOURS = parseInt(process.env.RATE_LIMIT_HOURS || '1', 10);
const MAX_OTP_REQUESTS = parseInt(process.env.MAX_OTP_REQUESTS || '3', 10);

/**
 * Lambda function to handle OTP operations
 * 
 * Expected event format for sending OTP:
 * {
 *   "action": "send_otp",
 *   "phoneNumber": "+1234567890"
 * }
 * 
 * Expected event format for verifying OTP:
 * {
 *   "action": "verify_otp",
 *   "phoneNumber": "+1234567890",
 *   "otp": "1234"
 * }
 */
exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    // Extract parameters from the event
    const { action, phoneNumber, otp } = event;
    
    // Validate inputs
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    
    // Format and validate phone number
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    if (!isValidUSPhoneNumber(formattedPhoneNumber)) {
      throw new Error('Invalid US phone number format. Must start with +1 followed by 10 digits');
    }
    
    // Handle different actions
    if (action === 'send_otp') {
      return await sendOtp(formattedPhoneNumber);
    } else if (action === 'verify_otp') {
      if (!otp) {
        throw new Error('OTP is required for verification');
      }
      return await verifyOtp(formattedPhoneNumber, otp);
    } else {
      throw new Error('Invalid action. Must be "send_otp" or "verify_otp"');
    }
  } catch (error) {
    console.error('Error in Lambda function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to process OTP operation',
        error: error.message
      })
    };
  }
};

/**
 * Generate a random 6-digit OTP
 */
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash an OTP for secure storage
 */
function hashOtp(otp, phoneNumber) {
  return crypto
    .createHmac('sha256', phoneNumber) // Use phone number as a salt
    .update(otp)
    .digest('hex');
}

/**
 * Send an OTP via SMS
 */
async function sendOtp(phoneNumber) {
  // Check rate limiting
  const rateCheckResult = await checkRateLimit(phoneNumber);
  if (!rateCheckResult.allowed) {
    return {
      statusCode: 429,
      body: JSON.stringify({
        message: `Rate limit exceeded. Please try again after ${rateCheckResult.resetTime}`,
        rateLimited: true
      })
    };
  }
  
  // Generate a random 6-digit OTP
  const otp = generateOtp();
  const otpHash = hashOtp(otp, phoneNumber);
  
  // Calculate expiry time (current time + OTP_EXPIRY_MINUTES)
  const now = new Date();
  const expiresAt = Math.floor(now.getTime() / 1000) + (OTP_EXPIRY_MINUTES * 60);
  const createdAt = now.toISOString();
  
  // Store the OTP hash in DynamoDB
  await dynamoDB.put({
    TableName: OTP_TABLE_NAME,
    Item: {
      phoneNumber,
      createdAt,
      otpHash,
      expiresAt,
      attempts: 0,
      requestCount: rateCheckResult.currentCount + 1,
      lastRequestTime: now.toISOString()
    }
  }).promise();
  
  // Create the SMS message
  const message = `Your verification code is: ${otp}. This code will expire in ${OTP_EXPIRY_MINUTES} minutes.`;
  
  // Send the SMS using SNS
  const params = {
    Message: message,
    PhoneNumber: phoneNumber,
    MessageAttributes: {
      'AWS.SNS.SMS.SMSType': {
        DataType: 'String',
        StringValue: 'Transactional'
      }
    }
  };
  
  // If SNS_TOPIC_ARN is provided, publish to the topic instead of directly to the phone number
  if (SNS_TOPIC_ARN) {
    params.TopicArn = SNS_TOPIC_ARN;
    delete params.PhoneNumber;
  }
  
  const result = await sns.publish(params).promise();
  console.log('SMS sent successfully:', result);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Verification code sent successfully',
      messageId: result.MessageId,
      expiresIn: `${OTP_EXPIRY_MINUTES} minutes`
    })
  };
}

/**
 * Verify an OTP
 */
async function verifyOtp(phoneNumber, providedOtp) {
  // Get the latest OTP record for this phone number
  const queryResult = await dynamoDB.query({
    TableName: OTP_TABLE_NAME,
    KeyConditionExpression: 'phoneNumber = :phone',
    ExpressionAttributeValues: {
      ':phone': phoneNumber
    },
    ScanIndexForward: false, // Sort in descending order (newest first)
    Limit: 1
  }).promise();
  
  // Check if an OTP record exists
  if (!queryResult.Items || queryResult.Items.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'No verification code found. Please request a new code',
        verified: false
      })
    };
  }
  
  const otpRecord = queryResult.Items[0];
  
  // Check if OTP has expired
  const currentTime = Math.floor(Date.now() / 1000);
  if (otpRecord.expiresAt < currentTime) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Verification code has expired. Please request a new code',
        verified: false
      })
    };
  }
  
  // Check if max attempts exceeded
  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Maximum verification attempts exceeded. Please request a new code',
        verified: false
      })
    };
  }
  
  // Increment the attempts counter
  await dynamoDB.update({
    TableName: OTP_TABLE_NAME,
    Key: {
      phoneNumber: phoneNumber,
      createdAt: otpRecord.createdAt
    },
    UpdateExpression: 'SET attempts = attempts + :inc',
    ExpressionAttributeValues: {
      ':inc': 1
    }
  }).promise();
  
  // Hash the provided OTP and compare with stored hash
  const providedOtpHash = hashOtp(providedOtp, phoneNumber);
  
  if (providedOtpHash === otpRecord.otpHash) {
    // OTP is valid - delete the OTP record to prevent reuse
    await dynamoDB.delete({
      TableName: OTP_TABLE_NAME,
      Key: {
        phoneNumber: phoneNumber,
        createdAt: otpRecord.createdAt
      }
    }).promise();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Phone number verified successfully',
        verified: true
      })
    };
  } else {
    // Invalid OTP
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Invalid verification code',
        verified: false,
        remainingAttempts: MAX_OTP_ATTEMPTS - (otpRecord.attempts + 1)
      })
    };
  }
}

/**
 * Check rate limiting for OTP requests
 */
async function checkRateLimit(phoneNumber) {
  // Get the latest OTP record for this phone number
  const queryResult = await dynamoDB.query({
    TableName: OTP_TABLE_NAME,
    KeyConditionExpression: 'phoneNumber = :phone',
    ExpressionAttributeValues: {
      ':phone': phoneNumber
    },
    ScanIndexForward: false, // Sort in descending order (newest first)
    Limit: 1
  }).promise();
  
  // If no record exists, allow the request
  if (!queryResult.Items || queryResult.Items.length === 0) {
    return { allowed: true, currentCount: 0 };
  }
  
  const latestRecord = queryResult.Items[0];
  const lastRequestTime = new Date(latestRecord.lastRequestTime);
  const hoursSinceLastRequest = (Date.now() - lastRequestTime.getTime()) / (1000 * 60 * 60);
  
  // If the last request was more than RATE_LIMIT_HOURS ago, reset the counter
  if (hoursSinceLastRequest >= RATE_LIMIT_HOURS) {
    return { allowed: true, currentCount: 0 };
  }
  
  // Check if the request count is below the limit
  if (latestRecord.requestCount < MAX_OTP_REQUESTS) {
    return { allowed: true, currentCount: latestRecord.requestCount };
  }
  
  // Calculate when the rate limit will reset
  const resetTime = new Date(lastRequestTime.getTime() + (RATE_LIMIT_HOURS * 60 * 60 * 1000));
  const resetTimeString = resetTime.toLocaleString();
  
  return { 
    allowed: false, 
    currentCount: latestRecord.requestCount,
    resetTime: resetTimeString
  };
}

/**
 * Helper function to format phone numbers
 * Ensures the phone number has the country code
 */
function formatPhoneNumber(phoneNumber) {
  // Remove any non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If the number doesn't start with a country code (e.g., +1 for US),
  // add the default country code (assuming US)
  if (!phoneNumber.startsWith('+')) {
    // If the number is 10 digits (US format without country code)
    if (cleaned.length === 10) {
      return '+1' + cleaned;
    }
    // If it's 11 digits and starts with 1 (US format with country code but missing +)
    else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return '+' + cleaned;
    }
    // Otherwise, just add + at the beginning
    else {
      return '+' + cleaned;
    }
  }
  
  return phoneNumber;
}

/**
 * Validate that a phone number is a valid US number
 */
function isValidUSPhoneNumber(phoneNumber) {
  // US phone numbers should start with +1 followed by 10 digits
  const usPhoneRegex = /^\+1\d{10}$/;
  return usPhoneRegex.test(phoneNumber);
}
