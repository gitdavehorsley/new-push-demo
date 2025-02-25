import { Amplify } from '@aws-amplify/core';
import config from './amplifyconfiguration.json';

// Configure Amplify
export const configureAmplify = () => {
  // Add Lambda configuration
  const amplifyConfig = {
    ...config,
    Lambda: {
      region: 'us-east-1', // Make sure this matches your project region
      endpoints: [
        {
          name: 'send-sms',
          endpoint: process.env.REACT_APP_LAMBDA_ENDPOINT || 'https://lambda.us-east-1.amazonaws.com',
          service: 'lambda',
          region: 'us-east-1'
        }
      ]
    }
  };
  
  console.log('Configuring Amplify with:', amplifyConfig);
  Amplify.configure(amplifyConfig);
};
