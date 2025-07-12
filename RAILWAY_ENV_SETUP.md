# 🚀 Railway Environment Setup Guide

## 🔧 **Required Environment Variables**

Copy these environment variables to your Railway project dashboard under the **Variables** tab:

### 1. **Authentication & Security**
```bash
NEXTAUTH_SECRET=ukqSgA2cYwqxVKcZq3dqrJFQiVM7ZeQmt34AE5ojINU
NEXTAUTH_URL=https://then-production.up.railway.app
NODE_ENV=production
```

### 2. **Email Service (Mailjet)**
```bash
MAILJET_API_KEY=your-mailjet-api-key-here
MAILJET_SECRET_KEY=your-mailjet-secret-key-here
FROM_EMAIL=noreply@lastminutelive.com
FROM_NAME=LastMinuteLive
```

### 3. **Payment Processing (Stripe)**
```bash
STRIPE_SECRET_KEY=sk_test_or_live_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here
```

### 4. **Application Configuration**
```bash
NEXT_PUBLIC_APP_URL=https://then-production.up.railway.app
REQUIRE_EMAIL_VERIFICATION=true
VENUE_MASTER_PASSWORD=admin2024master!
```

### 5. **Database**
```bash
# Railway auto-configures this, but if needed manually:
DATABASE_URL=postgresql://postgres:***@mainline.proxy.rlwy.net:52262/railway
```

## 📋 **Setup Steps**

### Step 1: Get Your API Keys

1. **Mailjet Account:**
   - Go to [Mailjet](https://www.mailjet.com)
   - Create account or login
   - Go to API Keys section
   - Copy API Key and Secret Key

2. **Stripe Account:**
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

1. **Missing Mailjet keys** - Auth system can't send emails
2. **Missing NEXTAUTH_SECRET** - JWT tokens can't be signed
3. **Missing NEXTAUTH_URL** - Email verification links are broken

## 🔄 **After Adding Variables**

1. **Trigger Redeploy:**
   - Go to Railway dashboard
   - Click "Deploy" or push new commit
   - Wait for build to complete

2. **Test Endpoints:**
   ```bash
   # Test auth endpoints
   curl https://then-production.up.railway.app/api/auth/signin
   curl https://then-production.up.railway.app/api/seat-checkout
   ```

## 📱 **Mobile App Update**

Once Railway backend is fixed, update mobile app configuration:

```typescript
// mobile-app/src/config/index.ts
api: {
  baseUrl: 'https://then-production.up.railway.app',
}
```

```json
// mobile-app/app.json
{
  "extra": {
    "apiUrl": "https://then-production.up.railway.app"
  }
}
```

## 🧪 **Testing Checklist**

After deployment:
- [ ] `/api/shows` returns JSON
- [ ] `/api/auth/signin` returns JSON (not 404)
- [ ] `/api/auth/verify` returns JSON (not 404)
- [ ] `/api/seat-checkout` returns JSON (not error)
- [ ] Mobile app can connect to Railway backend
- [ ] End-to-end booking flow works 