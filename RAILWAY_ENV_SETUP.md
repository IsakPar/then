# 🚀 Railway Environment Setup Guide

## 🚨 **CRITICAL: Missing Google OAuth Variables**

Your mobile app authentication is failing because Railway is missing these **required** Google OAuth environment variables:

### **Google OAuth Configuration** (REQUIRED for mobile app auth)
```bash
GOOGLE_CLIENT_ID=130250667313-jb8fab344cnqt41j2vb4uo3c4eudi2fm.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

The **Client ID** above is already configured in your mobile app - **you just need to add the matching Client Secret**.

## 🔧 **Required Environment Variables**

Copy these environment variables to your Railway project dashboard under the **Variables** tab:

### 1. **Google OAuth (CRITICAL - Required for mobile app)**
```bash
GOOGLE_CLIENT_ID=130250667313-jb8fab344cnqt41j2vb4uo3c4eudi2fm.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### 2. **Authentication & Security**
```bash
NEXTAUTH_SECRET=ukqSgA2cYwqxVKcZq3dqrJFQiVM7ZeQmt34AE5ojINU
NEXTAUTH_URL=https://then-production.up.railway.app
NODE_ENV=production
```

### 3. **Email Service (Mailjet)**
```bash
MAILJET_API_KEY=your-mailjet-api-key-here
MAILJET_SECRET_KEY=your-mailjet-secret-key-here
FROM_EMAIL=noreply@lastminutelive.com
FROM_NAME=LastMinuteLive
```

### 4. **Payment Processing (Stripe)**
```bash
STRIPE_SECRET_KEY=sk_test_or_live_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
```

### 5. **Application Configuration**
```bash
NEXT_PUBLIC_APP_URL=https://then-production.up.railway.app
REQUIRE_EMAIL_VERIFICATION=true
VENUE_MASTER_PASSWORD=admin2024master!
```

### 6. **Database**
```bash
# Railway auto-configures this, but if needed manually:
DATABASE_URL=postgresql://postgres:***@mainline.proxy.rlwy.net:52262/railway
```

## 🎯 **Immediate Action Required**

### **Step 1: Get Your Google Client Secret**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Find your project with Client ID: `130250667313-jb8fab344cnqt41j2vb4uo3c4eudi2fm.apps.googleusercontent.com`
3. Copy the **Client Secret** for this Client ID

### **Step 2: Add to Railway**
1. Go to [Railway Dashboard](https://railway.app)
2. Open your project
3. Click on your app service (not PostgreSQL)
4. Go to "Variables" tab
5. Add the `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` variables

### **Step 3: Test**
After adding the Google OAuth variables, test the mobile app authentication:
```bash
# Test the social auth endpoint
curl -X POST https://then-production.up.railway.app/api/auth/social \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "idToken": "mock-id-token-123", "user": {"email": "test@example.com", "name": "Test User", "id": "test-123"}}'
```

## 📋 **Setup Steps**

### Step 1: Get Your API Keys

1. **Google OAuth** (URGENT):
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Find client ID: `130250667313-jb8fab344cnqt41j2vb4uo3c4eudi2fm.apps.googleusercontent.com`
   - Copy the Client Secret

2. **Mailjet Account:**
   - Go to [Mailjet](https://www.mailjet.com)
   - Create account or login
   - Go to API Keys section
   - Copy API Key and Secret Key

3. **Stripe Account:**
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Get your Secret Key and Publishable Key
   - Set up webhook endpoint: `https://then-production.up.railway.app/api/webhooks/stripe`
   - Copy webhook secret

### Step 2: Add Variables to Railway

1. **Go to Railway Dashboard:**
   - Visit [railway.app](https://railway.app)
   - Open your project
   - Click on your app service (not PostgreSQL)
   - Go to "Variables" tab

2. **Add Each Variable:**
   - Click "New Variable"
   - Add name and value for each variable above
   - Click "Save"

### Step 3: Generate Required Secrets

1. **NEXTAUTH_SECRET:**
   ```bash
   # Generate a random 32-character secret:
   openssl rand -base64 32
   ```

## 🚨 **Critical Issues to Fix**

The current Railway deployment fails because:

1. **Missing Google OAuth keys** - Mobile app authentication failing with HTTP 400/500 errors
2. **Missing Mailjet keys** - Auth system can't send emails
3. **Missing NEXTAUTH_SECRET** - JWT tokens can't be signed
4. **Missing NEXTAUTH_URL** - Email verification links are broken

## 🔄 **After Adding Variables**

1. **Trigger Redeploy:**
   - Go to Railway dashboard
   - Click "Deploy" or push new commit
   - Wait for build to complete

2. **Test Endpoints:**
   ```bash
   # Test auth endpoints
   curl https://then-production.up.railway.app/api/auth/social
   curl https://then-production.up.railway.app/api/seat-checkout
   ```

## 📱 **Mobile App Update**

Your mobile app is already configured correctly with:
- ✅ `EXPO_PUBLIC_API_URL=https://then-production.up.railway.app`
- ✅ `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=130250667313-jb8fab344cnqt41j2vb4uo3c4eudi2fm.apps.googleusercontent.com`
- ✅ `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=130250667313-jb8fab344cnqt41j2vb4uo3c4eudi2fm.apps.googleusercontent.com`

## 🧪 **Testing Checklist**

After adding Google OAuth variables to Railway:
- [ ] Mobile app Google Sign-In works
- [ ] `/api/auth/social` returns success (not 500 error)
- [ ] Mobile app can authenticate users
- [ ] JWT tokens are generated correctly
- [ ] Email verification works (if Mailjet configured)
- [ ] End-to-end booking flow works

---

## ⚠️ **Important Notes**

- **Google OAuth**: The mobile app is already configured with the correct Client ID - you just need to add the Client Secret to Railway
- **Environment Variables**: Never commit secrets to GitHub
- **Database**: Railway PostgreSQL has automatic backups
- **SSL**: Automatically handled by Railway
- **Scaling**: Railway can auto-scale as needed
- **Costs**: Monitor usage in Railway dashboard

**Your mobile app will work immediately after adding the Google OAuth variables to Railway!** 🎉 