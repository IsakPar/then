# Google Authentication Troubleshooting Guide

## 🚨 Common Errors and Solutions

### Error: "Invalid authentication token"

**What this means:** The backend cannot verify the Google ID token sent by the mobile app.

**Root Causes:**
1. **Mock tokens in production** - Mobile app sending fake tokens to production backend
2. **Missing GOOGLE_CLIENT_ID** - Backend environment variable not set
3. **Wrong Client ID** - Using Android Client ID instead of Web Client ID
4. **Expired/malformed token** - Token corruption during transmission

**Solutions:**

#### 1. Check Backend Environment Variables
```bash
# In Railway dashboard, verify these variables are set:
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-web-client-secret
```

#### 2. Verify Mobile App Configuration
```bash
# In mobile-app/.env file:
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

#### 3. Check Token Type
- **Production Backend:** Requires real Google tokens
- **Development Backend:** Accepts mock tokens
- **Mobile App in Expo Go:** Generates mock tokens
- **Mobile App Development Build:** Generates real tokens

---

### Error: "DEVELOPER_ERROR" (Code 10)

**What this means:** Google SDK configuration mismatch.

**Root Causes:**
1. **Wrong SHA-1 fingerprint** - Certificate doesn't match
2. **Package name mismatch** - Bundle ID doesn't match Google Console
3. **Missing OAuth client** - Android client ID not created
4. **Wrong Client ID type** - Using wrong OAuth application type

**Solutions:**

#### 1. Verify SHA-1 Fingerprint
```bash
# Get SHA-1 from Expo
eas credentials
# Choose Android > Your project > Keystore
# Copy the SHA-1 fingerprint exactly
```

#### 2. Check Google Cloud Console
- Go to APIs & Services > Credentials
- Verify Android OAuth client exists
- Package name: `com.isakpar.lastminutelive`
- SHA-1: Must match Expo credentials exactly

#### 3. Verify Bundle ID
```json
// mobile-app/app.json
"android": {
  "package": "com.isakpar.lastminutelive"  // Must match Google Console
}
```

---

### Error: "Sign in cancelled" / "No response"

**Root Causes:**
1. **Missing Google Play Services** - Device doesn't support Google auth
2. **Network issues** - No internet connection
3. **Client ID misconfiguration** - Wrong or missing credentials

**Solutions:**

#### 1. Test Device Compatibility
```typescript
// Check before signing in
await GoogleSignin.hasPlayServices();
```

#### 2. Test on Physical Device
- Google Sign-In may not work on simulators
- Use real Android device for testing

#### 3. Verify Network Connection
- Ensure device has internet access
- Test with mobile data and WiFi

---

### Error: Mock Authentication with Production Backend

**What you'll see:**
```
⚠️ Mock authentication detected with production backend!
⚠️ This will fail. Please set up real Google OAuth credentials.
```

**Why this happens:**
- Mobile app is in Expo Go (development mode)
- Backend is Railway (production mode)  
- Mock tokens cannot be validated by production backend

**Solutions:**

#### Option 1: Use Local Backend for Development
```bash
# Start local backend
cd /path/to/backend
pnpm run dev

# Update mobile app to use local backend
# mobile-app/.env
EXPO_PUBLIC_API_URL=http://localhost:3001
```

#### Option 2: Create Development Build
```bash
# Install development client
cd mobile-app
npx expo install expo-dev-client

# Build development version with real Google auth
eas build --profile development --platform android
```

---

## 🔧 Debug Tools

### 1. Check Configuration Status
Add this to your mobile app:

```typescript
import { socialAuthService } from './src/lib/socialAuth';

// Check configuration
const status = socialAuthService.getConfigurationStatus();
console.log('Google Auth Status:', status);
```

### 2. Backend Logging
Check Railway logs for detailed error messages:
```bash
# Look for these log patterns:
🔒 Production mode: Validating token with Google...
❌ Token verification failed:
✅ Google token verified for:
```

### 3. Mobile App Logging
Check Expo/React Native logs:
```bash
# Look for these log patterns:
🔧 Configuring Google Sign-In...
✅ Google Sign-In configured successfully
🔵 Starting real Google Sign-In...
⚠️ Mock authentication detected with production backend!
```

---

## 🎯 Step-by-Step Resolution

### For "Invalid authentication token" Error:

1. **Identify the environment mismatch:**
   - Mobile app in Expo Go → Mock tokens
   - Backend on Railway → Production mode
   - Production mode rejects mock tokens ❌

2. **Choose your solution:**

   **Option A: Local Development (Recommended)**
   ```bash
   # Start local backend (accepts mock tokens)
   pnpm run dev
   
   # Update mobile app
   EXPO_PUBLIC_API_URL=http://localhost:3001
   ```

   **Option B: Real Authentication**
   ```bash
   # Set up Google OAuth credentials
   # Create development build
   eas build --profile development
   ```

3. **Verify the fix:**
   - Check logs for successful authentication
   - Test login flow end-to-end
   - Confirm user creation in database

---

## 🧪 Testing Checklist

### Environment Setup
- [ ] Google Cloud Console project created
- [ ] OAuth consent screen configured  
- [ ] Web Client ID created for backend
- [ ] Android Client ID created for mobile
- [ ] SHA-1 fingerprint matches Expo credentials
- [ ] Environment variables set correctly

### Mobile App
- [ ] .env file configured with credentials
- [ ] Google Sign-In package installed
- [ ] app.json includes Google Sign-In plugin
- [ ] EAS configuration ready

### Backend
- [ ] GOOGLE_CLIENT_ID environment variable set
- [ ] GOOGLE_CLIENT_SECRET environment variable set
- [ ] Social auth endpoint responding
- [ ] Token validation working

### Testing
- [ ] Expo Go works with mock authentication + local backend
- [ ] Development build works with real authentication + production backend
- [ ] Production build ready for deployment

---

## 🚀 Quick Fix Summary

**If you're getting "Invalid authentication token":**

1. **For immediate testing:** Use local backend with Expo Go
2. **For production testing:** Create development build with real credentials
3. **For deployment:** Use production build with verified credentials

**Most common mistake:** Trying to use mock tokens (Expo Go) with production backend (Railway) ❌

**Correct setup:** Match token type with backend environment ✅

---

## 🆘 Still Having Issues?

1. **Check the logs** - Railway backend logs show exact error details
2. **Verify credentials** - Double-check all Client IDs and environment variables  
3. **Test locally first** - Use local backend to eliminate backend issues
4. **Use development build** - Create EAS development build for real authentication testing

Remember: **Mock authentication only works with development backends!** 🔧 