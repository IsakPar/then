# Social Authentication Setup Guide

This guide covers setting up Google and Apple Sign-In for the LastMinuteLive mobile app.

## Google Sign-In Setup

### 1. Google Cloud Console Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials

### 2. Configure OAuth Credentials
Create the following OAuth 2.0 client IDs:

#### Web Client ID (for token verification)
- Application type: Web application
- Authorized redirect URIs: Add your backend API domain

#### iOS Client ID (if deploying to iOS)
- Application type: iOS
- Bundle ID: Your app's bundle identifier

#### Android Client ID (if deploying to Android)  
- Application type: Android
- Package name: Your app's package name
- SHA-1 certificate fingerprint: Get from your keystore

### 3. Update Configuration
Update the Google configuration in `src/lib/socialAuth.ts`:

```typescript
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID_HERE', // From Google Cloud Console
  iosClientId: 'YOUR_IOS_CLIENT_ID_HERE', // iOS client ID (optional)
  offlineAccess: true,
  hostedDomain: '',
  forceCodeForRefreshToken: true,
});
```

## Apple Sign-In Setup

### 1. Apple Developer Account
1. Go to [Apple Developer Console](https://developer.apple.com)
2. Register your app identifier
3. Enable "Sign In with Apple" capability

### 2. Configure Certificates
1. Create a Services ID for web authentication
2. Configure the redirect URLs for your backend
3. Generate a private key for server-side token verification

### 3. iOS Configuration
Add Sign In with Apple capability to your iOS app in Xcode:
1. Select your target
2. Go to "Signing & Capabilities"
3. Add "Sign In with Apple" capability

## Backend API Endpoints

Make sure your backend API supports these endpoints:

- `POST /api/auth/social` - Handle social authentication
- `POST /api/auth/send-verification` - Send email verification
- `POST /api/auth/verify-email` - Verify email token
- `POST /api/auth/resend-verification` - Resend verification email

## Email Verification with Mailjet

### 1. Mailjet Account Setup
1. Create account at [Mailjet](https://www.mailjet.com)
2. Get API key and secret from account settings
3. Verify your sender domain

### 2. Environment Variables
Add these to your backend environment:

```
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
MAILJET_FROM_EMAIL=noreply@yourdomain.com
MAILJET_FROM_NAME=LastMinuteLive
```

### 3. Backend Implementation
The backend should handle:
- Sending verification emails via Mailjet
- Generating secure verification tokens
- Validating email verification tokens
- Updating user email verification status

## Testing

### Test Users
- Create test accounts for Google and Apple
- Test both successful and failed authentication flows
- Verify email verification flow works

### Error Handling
Test these scenarios:
- Network errors during sign-in
- Cancelled authentication flows
- Invalid tokens
- Email verification failures

## Security Notes

1. **Never commit** actual client IDs or secrets to version control
2. Use environment variables or secure configuration files
3. Validate all tokens on the backend
4. Implement rate limiting for verification emails
5. Use HTTPS for all authentication endpoints

## Production Deployment

Before going live:
1. Replace all placeholder client IDs with real ones
2. Test on actual devices (not just simulators)
3. Verify deep linking works correctly
4. Test email delivery and spam folder issues
5. Set up monitoring for authentication failures 