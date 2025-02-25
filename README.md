# NewPushDemo

A React application that collects phone numbers for push notifications, built with AWS Amplify and DynamoDB.

## Overview

This application provides a simple form for users to submit their phone numbers for push notifications. The phone numbers are stored in an AWS DynamoDB table through AWS Amplify.

## Technologies Used

- React.js
- AWS Amplify (Gen 2)
- Amazon DynamoDB
- AWS AppSync (GraphQL API)

## Project Structure

```
new-push-demo/
├── src/
│   ├── components/
│   │   └── PhoneNumberForm.js
│   ├── styles/
│   │   └── main.css
│   ├── graphql/
│   │   └── mutations.js
│   ├── amplify-config.js
│   └── App.js
├── amplify/
│   ├── data/
│   │   └── resource.ts
│   └── backend.ts
├── public/
├── amplifyconfiguration.json
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js and npm installed
- AWS account
- AWS CLI configured with appropriate credentials

### Local Development

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/new-push-demo.git
   cd new-push-demo
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Install Amplify CLI:
   ```
   npm install -g @aws-amplify/cli
   ```

4. Initialize Amplify backend:
   ```
   npx amplify sandbox
   ```

5. Start the development server:
   ```
   npm start
   ```

### Deployment to AWS Amplify

1. Push the local Amplify environment to AWS:
   ```
   npx amplify push
   ```

2. Deploy the frontend to AWS Amplify Hosting:
   ```
   npx amplify publish
   ```

## AWS Resources Created

- **DynamoDB Table**: Stores phone numbers submitted through the form
- **AppSync API**: GraphQL API for interacting with the DynamoDB table
- **Amplify Hosting**: Hosts the React application

## Environment Variables

The application uses the following environment variables, which are stored in the `amplifyconfiguration.json` file:

- `aws_project_region`: AWS region for the project
- `aws_appsync_graphqlEndpoint`: GraphQL API endpoint
- `aws_appsync_region`: AppSync region
- `aws_appsync_authenticationType`: Authentication type for AppSync
- `aws_appsync_apiKey`: API key for AppSync

## License

This project is licensed under the MIT License - see the LICENSE file for details.
