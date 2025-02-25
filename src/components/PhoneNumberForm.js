import React, { useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { createPhoneNumber } from '../graphql/mutations.js';
import '../styles/main.css';

const client = generateClient();

const PhoneNumberForm = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
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
      // Create a new phone number entry in DynamoDB
      await client.graphql({
        query: createPhoneNumber,
        variables: {
          input: {
            phoneNumber: phoneNumber,
            createdAt: new Date().toISOString()
          }
        }
      });

      // Clear form and show success message
      setPhoneNumber('');
      setMessage('Phone number submitted successfully!');
    } catch (err) {
      console.error('Error submitting phone number:', err);
      setError('Failed to submit phone number. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Subscribe for Push Notifications</h2>
      <form onSubmit={handleSubmit}>
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
          {isSubmitting ? 'Submitting...' : 'Subscribe'}
        </button>
        
        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
};

export default PhoneNumberForm;
