"use client";

import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';
import { sessionStorage } from 'aws-amplify/utils';
import { useEffect } from 'react';

// Configure AWS Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_AWS_USER_POOL_ID,
      userPoolClientId: process.env.NEXT_PUBLIC_AWS_USER_POOL_CLIENT_ID,
      region: process.env.NEXT_PUBLIC_AWS_COGNITO_REGION,
    }
  }
});

// Force Amplify to use sessionStorage so tokens are deleted when the tab closes
cognitoUserPoolsTokenProvider.setKeyValueStorage(sessionStorage);

export default function AmplifyProvider({ children }) {
  // The configuration is already called above, but this wrapper ensures
  // it runs on the client side early in the React lifecycle.
  useEffect(() => {
    // This empty effect just ensures this component executes client-side
  }, []);

  return <>{children}</>;
}
