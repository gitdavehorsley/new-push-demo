const AWS = require('aws-sdk');
const pinpoint = new AWS.Pinpoint();

// Pinpoint Project ID - will be set as environment variable
const PINPOINT_PROJECT_ID = process.env.PINPOINT_PROJECT_ID;

/**
 * Lambda function to send SMS notifications with OTP
 * 
 * Expected event format:
 * {
 *   "phoneNumber": "+1234567890",
 *   "action": "send_otp" | "verify_otp",
 *   "message": "Your notification message here" (optional if action is send_otp),
 *   "otp": "1234" (only required for verify_otp action),
 *   "stored_otp": "1234" (only required for verify_otp action)
 * }
 */
exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    // Extract phone number and action from the event
    const { phoneNumber, action = 'send_otp', message } = event;
    
    // Validate inputs
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    
    // Format phone number if needed (ensure it has country code)
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    
    // Handle different actions
    if (action === 'send_otp') {
      return await sendOtp(formattedPhoneNumber, message);
    } else if (action === 'verify_otp') {
      const { otp, stored_otp } = event;
      if (!otp) {
        throw new Error('OTP is required for verification');
      }
      if (!stored_otp) {
        throw new Error('Stored OTP is required for verification');
      }
      return verifyOtp(otp, stored_otp);
    } else if (message) {
      // If a message is provided, send it directly (backward compatibility)
      return await sendSms(formattedPhoneNumber, message);
    } else {
      throw new Error('Invalid action or missing message');
    }
  } catch (error) {
    console.error('Error in Lambda function:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to send SMS notification',
        error: error.message
      })
    };
  }
};

/**
 * Generate a random 4-digit OTP
 */
function generateOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Send an OTP via SMS
 */
async function sendOtp(phoneNumber, customMessage = null) {
  // Generate a random 4-digit OTP
  const otp = generateOtp();
  
  // Create the SMS message
  const message = customMessage || `Your verification code is: ${otp}. This code will expire in 10 minutes.`;
  
  // Send the SMS
  const result = await sendSms(phoneNumber, message);
  
  // Parse the result body to add the OTP
  const resultBody = JSON.parse(result.body);
  resultBody.otp = otp;
  
  // Return the result with the OTP
  return {
    ...result,
    body: JSON.stringify(resultBody)
  };
}

/**
 * Verify an OTP
 */
function verifyOtp(providedOtp, storedOtp) {
  if (providedOtp === storedOtp) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'OTP verified successfully',
        verified: true
      })
    };
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: 'Invalid OTP',
        verified: false
      })
    };
  }
}

/**
 * Send an SMS message
 */
async function sendSms(phoneNumber, message) {
  // Prepare parameters for Pinpoint send_messages
  const params = {
    ApplicationId: PINPOINT_PROJECT_ID,
    MessageRequest: {
      Addresses: {
        [phoneNumber]: {
          ChannelType: 'SMS'
        }
      },
      MessageConfiguration: {
        SMSMessage: {
          Body: message,
          MessageType: 'TRANSACTIONAL',
          OriginationNumber: process.env.ORIGINATION_NUMBER || undefined,
          SenderId: 'NewPushDemo'
        }
      }
    }
  };
  
  // Send the SMS using Pinpoint
  const result = await pinpoint.sendMessages(params).promise();
  console.log('SMS sent successfully:', result);
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'SMS notification sent successfully',
      messageId: result.MessageResponse.Result[phoneNumber].MessageId
    })
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
