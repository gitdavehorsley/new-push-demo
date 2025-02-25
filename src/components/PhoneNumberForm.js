import React, { useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { Amplify } from 'aws-amplify';
import { createPhoneNumber } from '../graphql/mutations.js';
import '../styles/main.css';

const client = generateClient();

const PhoneNumberForm = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [storedOtp, setStoredOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'

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
      
      const response = await fetch('https://qbxe9azea3.execute-api.us-east-1.amazonaws.com/prod/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber,
          action: 'send_otp'
        })
      });
      
      const lambdaResponse = await response.json();
      console.log('API Gateway response:', lambdaResponse);
      
      // Store the OTP for verification
      const responseBody = JSON.parse(lambdaResponse.body);
      setStoredOtp(responseBody.otp);
      
      // Move to OTP verification step
      setStep('otp');
      setMessage('Verification code sent! Please check your phone and enter the 4-digit code below.');
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
      // Verify OTP
      if (otp === storedOtp) {
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
        setStoredOtp('');
        setStep('phone');
        setMessage('Phone number verified and submitted successfully!');
      } else {
        // Invalid OTP
        setError('Invalid verification code. Please try again.');
      }
    } catch (err) {
      console.error('Error verifying OTP or submitting phone number:', err);
      setError('Failed to verify and submit phone number. Please try again.');
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
              placeholder="Enter your phone number"
              disabled={isSubmitting}
            />
          </div>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp}>
          <div className="form-group">
            <p>A verification code has been sent to {phoneNumber}</p>
            <label htmlFor="otp">Verification Code:</label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 4-digit code"
              maxLength={4}
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
        </form>
      )}
      
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default PhoneNumberForm;
