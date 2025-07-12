# Google OAuth Setup for Mobile Authentication

## 🚀 Complete Google Cloud Console Configuration

### Step 1: Create Google Cloud Project

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project or select existing one**
   - Project Name: `LastMinuteLive-Auth` (or your preferred name)
   - Note down the Project ID

### Step 2: Enable Required APIs

1. **Navigate to `APIs & Services > Library`**
2. **Search and enable these APIs:**
   - `Google+ API` (for basic profile info)
   - `Google Identity Toolkit API` (for authentication)

### Step 3: Configure OAuth Consent Screen

1. **Go to `APIs & Services > OAuth consent screen`**
2. **Choose `External` user type**
3. **Fill out the required information:**
   - App name: `Last Minute Live`
   - User support email: Your email
   - Developer contact information: Your email
4. **Add these scopes:**
   - `email`
   - `profile`
   - `openid`

### Step 4: Create OAuth 2.0 Client IDs

You need **TWO** different client IDs:

#### 4.1 Web Client ID (for token verification)
```
Application Type: Web application
Name: LastMinuteLive-Web
Authorized redirect URIs: 
  - https://then-production.up.railway.app/api/auth/callback
  - http://localhost:3001/api/auth/callback
```

#### 4.2 Android Client ID (for mobile app)
```
Application Type: Android
Name: LastMinuteLive-Android
Package name: com.isakpar.lastminutelive
SHA-1 certificate fingerprint: [Get from Expo]
```

### Step 5: Get SHA-1 Fingerprint for Android

For Expo apps, get the SHA-1 fingerprint:

```bash
# Install EAS CLI if not already installed
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Get credentials (choose Android)
eas credentials

# Select your project and profile
# Choose "Keystore: Manage everything needed to build your project"
# Copy the SHA-1 fingerprint shown
```

**Example SHA-1:** `A1:B2:C3:D4:E5:F6:G7:H8:I9:J0:K1:L2:M3:N4:O5:P6:Q7:R8:S9:T0`

### Step 6: Record Your Credentials

After creating both client IDs, save these values:

```
WEB_CLIENT_ID=123456789-abc...xyz.apps.googleusercontent.com
WEB_CLIENT_SECRET=GOCSPX-abc...xyz

ANDROID_CLIENT_ID=123456789-def...xyz.apps.googleusercontent.com
```

## 🔧 Environment Variables Setup

### For Railway Backend (.env)
```bash
GOOGLE_CLIENT_ID=123456789-abc...xyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc...xyz
```

### For Mobile App (.env)
```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=123456789-abc...xyz.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=123456789-def...xyz.apps.googleusercontent.com
```

## 🧪 Testing Setup

### Development Testing
- Local backend accepts mock tokens
- Mobile app can use demo mode in Expo Go

### Production Testing  
- Railway backend validates real Google tokens
- Mobile app needs development build for real authentication

## 🚨 Common Issues

### Issue: "Developer Error Code 10"
**Solution:** 
- Ensure SHA-1 fingerprint matches exactly
- Use correct Client ID (Web for token verification)
- Check package name matches exactly

### Issue: "Invalid authentication token"
**Solution:**
- Verify GOOGLE_CLIENT_ID is set in Railway
- Ensure Web Client ID is used for backend validation
- Check token is real Google token, not mock

### Issue: "Sign in cancelled"
**Solution:**
- Test on real device, not simulator
- Ensure Google Play Services available
- Check internet connection

## 📱 Mobile App Configuration

The mobile app automatically detects environment:
- **Expo Go**: Uses mock authentication for testing
- **Development Build**: Uses real Google authentication
- **Production**: Uses real Google authentication

## 🔐 Security Notes

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Test thoroughly** before production deployment
4. **Monitor authentication logs** for suspicious activity

## 🎯 Next Steps

1. ✅ Set up Google Cloud Console (above)
2. ✅ Configure environment variables 
3. ✅ Update mobile app configuration
4. ✅ Test authentication flow
5. ✅ Deploy to production

---

**🚀 Ready to implement? Follow the configuration steps below!** 