const AWS = require('aws-sdk');
const sns = new AWS.SNS();

// SNS Topic ARN for sending SMS messages
const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:829591350088:NewPushDemo-SMS';

/**
 * Lambda function to send SMS notifications
 * 
 * Expected event format:
 * {
 *   "phoneNumber": "+1234567890",
 *   "message": "Your notification message here"
 * }
 */
exports.handler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  
  try {
    // Extract phone number and message from the event
    const { phoneNumber, message } = event;
    
    // Validate inputs
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    
    if (!message) {
      throw new Error('Message is required');
    }
    
    // Format phone number if needed (ensure it has country code)
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);
    
    // Prepare parameters for SNS publish
    const params = {
      Message: message,
      PhoneNumber: formattedPhoneNumber,
      MessageAttributes: {
        'AWS.SNS.SMS.SenderID': {
          DataType: 'String',
          StringValue: 'NewPushDemo'
        },
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      }
    };
    
    // Send the SMS
    const result = await sns.publish(params).promise();
    console.log('SMS sent successfully:', result);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'SMS notification sent successfully',
        messageId: result.MessageId
      })
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    
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
