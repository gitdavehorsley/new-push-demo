import Amplify from 'aws-amplify';
import config from './amplifyconfiguration.json';

// Configure Amplify
export const configureAmplify = () => {
  console.log('Configuring Amplify with:', config);
  Amplify.configure(config);
};
