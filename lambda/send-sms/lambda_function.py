import boto3
import json
import logging
import re
import random
import string
import os

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize Pinpoint client
pinpoint = boto3.client('pinpoint')

# Pinpoint Project ID - will be set as environment variable
PINPOINT_PROJECT_ID = os.environ.get('PINPOINT_PROJECT_ID')

def generate_otp():
    """Generate a 4-digit OTP code"""
    return ''.join(random.choices(string.digits, k=4))

def lambda_handler(event, context):
    """
    Lambda function to send SMS notifications
    
    Expected event format:
    {
        "phoneNumber": "+1234567890",
        "message": "Your notification message here"
    }
    
    Or for OTP:
    {
        "phoneNumber": "+1234567890",
        "action": "send_otp"
    }
    """
    logger.info(f"Event received: {json.dumps(event)}")
    
    try:
        # Extract phone number and message from the event
        phone_number = event.get('phoneNumber')
        message = event.get('message')
        action = event.get('action')
        
        # Validate inputs
        if not phone_number:
            raise ValueError('Phone number is required')
        
        # Handle OTP generation if action is send_otp
        if action == 'send_otp':
            otp = generate_otp()
            message = f"Your verification code is: {otp}"
            logger.info(f"Generated OTP: {otp}")
            
            # Return the OTP in the response for verification
            response_data = {
                'otp': otp
            }
        elif not message:
            # If not an OTP request and no message provided, raise error
            raise ValueError('Message is required')
        else:
            # Regular SMS with no special handling
            response_data = {}
        
        # Format phone number if needed (ensure it has country code)
        formatted_phone_number = format_phone_number(phone_number)
        
        # Prepare parameters for Pinpoint send_messages
        params = {
            'ApplicationId': PINPOINT_PROJECT_ID,
            'MessageRequest': {
                'Addresses': {
                    formatted_phone_number: {
                        'ChannelType': 'SMS'
                    }
                },
                'MessageConfiguration': {
                    'SMSMessage': {
                        'Body': message,
                        'MessageType': 'TRANSACTIONAL',
                        'OriginationNumber': os.environ.get('ORIGINATION_NUMBER', None),
                        'SenderId': 'NewPushDemo'
                    }
                }
            }
        }
        
        # Send the SMS using Pinpoint
        response = pinpoint.send_messages(**params)
        logger.info(f"SMS sent successfully: {response}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'SMS notification sent successfully',
                'messageId': response['MessageResponse']['Result'][formatted_phone_number]['MessageId'],
                **response_data
            })
        }
    
    except Exception as e:
        logger.error(f"Error sending SMS: {str(e)}")
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Failed to send SMS notification',
                'error': str(e)
            })
        }

def format_phone_number(phone_number):
    """
    Helper function to format phone numbers
    Ensures the phone number has the country code
    """
    # Remove any non-digit characters
    cleaned = re.sub(r'\D', '', phone_number)
    
    # If the number doesn't start with a country code (e.g., +1 for US),
    # add the default country code (assuming US)
    if not phone_number.startswith('+'):
        # If the number is 10 digits (US format without country code)
        if len(cleaned) == 10:
            return '+1' + cleaned
        # If it's 11 digits and starts with 1 (US format with country code but missing +)
        elif len(cleaned) == 11 and cleaned.startswith('1'):
            return '+' + cleaned
        # Otherwise, just add + at the beginning
        else:
            return '+' + cleaned
    
    return phone_number
