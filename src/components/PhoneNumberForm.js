import React, { useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import { createPhoneNumber } from '../graphql/mutations.js';
import '../styles/main.css';

// API endpoints for OTP verification
const SEND_OTP_ENDPOINT = 'https://API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com/prod/send-otp';
const VERIFY_OTP_ENDPOINT = 'https://API_GATEWAY_ID.execute-api.us-east-1.amazonaws.com/prod/verify-otp';

const client = generateClient();

const PhoneNumberForm = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [expiresIn, setExpiresIn] = useState('5 minutes');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!phoneNumber || phoneNumber.trim() === '') {
      setError('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      // Call the API Gateway endpoint to send OTP
      console.log('Sending OTP to:', phoneNumber);
      
      const response = await fetch(SEND_OTP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber
        })
      });
      
      const responseData = await response.json();
      console.log('API Gateway response:', responseData);
      
      if (response.status === 429) {
        // Rate limited
        setError(`Too many verification attempts. ${responseData.message}`);
        return;
      }
      
      if (response.status !== 200) {
        throw new Error(responseData.message || 'Failed to send verification code');
      }
      
      // Parse the response body
      const responseBody = JSON.parse(responseData.body);
      
      // Set expiration time from response
      if (responseBody.expiresIn) {
        setExpiresIn(responseBody.expiresIn);
      }
      
      // Move to OTP verification step
      setStep('otp');
      setMessage(`Verification code sent! Please check your phone and enter the code below. It will expire in ${expiresIn}.`);
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!otp || otp.trim() === '') {
      setError('Please enter the verification code');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Call the API Gateway endpoint to verify OTP
      const response = await fetch(VERIFY_OTP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          otp: otp
        })
      });
      
      const responseData = await response.json();
      console.log('Verification response:', responseData);
      
      // Parse the response body
      const responseBody = JSON.parse(responseData.body);
      
      if (response.status !== 200) {
        // Update remaining attempts if provided
        if (responseBody.remainingAttempts !== undefined) {
          setRemainingAttempts(responseBody.remainingAttempts);
        }
        
        throw new Error(responseBody.message || 'Failed to verify code');
      }
      
      if (responseBody.verified) {
        // OTP is valid, save phone number to database
        const result = await client.graphql({
          query: createPhoneNumber,
          variables: {
            input: {
              phoneNumber: phoneNumber,
              createdAt: new Date().toISOString()
            }
          }
        });

        console.log('Phone number saved to database:', result);
        
        // Clear form and show success message
        setPhoneNumber('');
        setOtp('');
        setStep('phone');
        setMessage('Phone number verified and submitted successfully!');
      } else {
        // Invalid OTP
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      console.error('Error verifying OTP or submitting phone number:', err);
      setError(`${err.message}. ${remainingAttempts > 0 ? `Remaining attempts: ${remainingAttempts}` : 'Please request a new code.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Subscribe for Push Notifications</h2>
      
      {step === 'phone' ? (
        <form onSubmit={handleSendOtp}>
          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number:</label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1 (123) 456-7890"
              disabled={isSubmitting}
            />
            <small>US phone numbers only (+1)</small>
          </div>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <div className="form-group">
            <p>A verification code has been sent to {phoneNumber}</p>
            <p className="expires-text">Code expires in {expiresIn}</p>
            <label htmlFor="otp">Verification Code:</label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              disabled={isSubmitting}
            />
          </div>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Verify & Subscribe'}
          </button>
          <button 
            type="button" 
            onClick={() => setStep('phone')} 
            disabled={isSubmitting}
            className="secondary-button"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={isSubmitting}
            className="secondary-button"
          >
            Resend Code
          </button>
        </form>
      )}
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default PhoneNumberForm;
