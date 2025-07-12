# Mobile App Environment Setup

## 🔧 Required Environment Variables

Create a `.env` file in the `mobile-app` directory with these variables:

```bash
# ============================================================================
# MOBILE APP ENVIRONMENT VARIABLES
# ============================================================================
# 🚨 IMPORTANT: Replace these values with your actual Google OAuth credentials

# API Configuration
EXPO_PUBLIC_API_URL=https://then-production.up.railway.app

# Stripe Configuration (if needed)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here

# Google OAuth Configuration
# 🔧 GET THESE FROM GOOGLE CLOUD CONSOLE (see GOOGLE_OAUTH_SETUP.md)
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com

# Development Configuration
EXPO_PUBLIC_ENABLE_DEV_MODE=true
EXPO_PUBLIC_ENABLE_MOCK_AUTH=false
```

## 🚀 Quick Setup

1. **Copy the template above** into `mobile-app/.env`
2. **Replace the placeholder values** with your actual Google OAuth credentials
3. **Follow the Google Cloud Console setup** in `GOOGLE_OAUTH_SETUP.md`
4. **Test the authentication flow**

## 🔍 How to Get Your Credentials

Follow the complete guide in `GOOGLE_OAUTH_SETUP.md` to:
1. Set up Google Cloud Console project
2. Create OAuth 2.0 client IDs (Web + Android)
3. Get SHA-1 fingerprint from Expo
4. Configure environment variables

## 🧪 Testing

- **Expo Go**: Uses mock authentication (development)
- **Development Build**: Uses real Google authentication
- **Production**: Uses real Google authentication 