# Google Auth & Email Setup Guide

## Overview
This guide covers:
1. Setting up Google OAuth authentication
2. Configuring Mailjet for email verification and booking confirmations
3. Testing the complete authentication and email flow

## 🔐 Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create or Select a Project**
   - Click the project dropdown at the top
   - Either create a new project or select an existing one

3. **Enable Google+ API**
   - Go to **APIs & Services** > **Library**
   - Search for "Google+ API" and enable it
   - Also enable "Google Identity API" if not already enabled

4. **Create OAuth Credentials**
   - Go to **APIs & Services** > **Credentials**
   - Click **Create Credentials** > **OAuth client ID**
   - Choose **Web application**
   - Set the following:
     - **Name**: `LastMinuteLive Web Client`
     - **Authorized JavaScript origins**: 
       - `http://localhost:3001` (for local development)
       - `https://then-production.up.railway.app` (for production)
     - **Authorized redirect URIs**:
       - `http://localhost:3001/api/auth/callback/google` (for local development)
       - `https://then-production.up.railway.app/api/auth/callback/google` (for production)

5. **Copy your credentials**
   - Copy the **Client ID** and **Client Secret**

### Step 2: Configure Environment Variables

Add these to your `.env.local` file for local development:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

For Railway production, add the same variables to your Railway environment variables.

### Step 3: Update NextAuth Configuration

Your `src/lib/auth.ts` already includes Google OAuth configuration. Just ensure it's properly configured:

```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
}),
```

## 📧 Mailjet Email Setup

### Step 1: Create Mailjet Account

1. **Sign up for Mailjet**
   - Go to [https://www.mailjet.com/](https://www.mailjet.com/)
   - Create a free account (30,000 emails/month)

2. **Get API Keys**
   - Go to **Account Settings** > **Master API Keys**
   - Copy your **API Key** and **Secret Key**

3. **Verify Your Domain (Optional but Recommended)**
   - Go to **Account Settings** > **Sender Addresses**
   - Add and verify your domain (e.g., `lastminutelive.com`)
   - This improves email deliverability

### Step 2: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Mailjet Configuration
MAILJET_API_KEY=your_mailjet_api_key_here
MAILJET_SECRET_KEY=your_mailjet_secret_key_here
FROM_EMAIL=noreply@lastminutelive.com
FROM_NAME=LastMinuteLive

# Email Verification
REQUIRE_EMAIL_VERIFICATION=true
```

For Railway production, add the same variables to your Railway environment variables.

### Step 3: Test Email Configuration

Your system already has comprehensive email templates. The email service includes:

- ✅ Email verification
- ✅ Welcome emails  
- ✅ Password reset emails
- ✅ Booking confirmation emails

## 🔧 Complete Environment Variables

Here's your complete `.env.local` file template:

```bash
# Authentication & Security
NEXTAUTH_SECRET=ukqSgA2cYwqxVKcZq3dqrJFQiVM7ZeQmt34AE5ojINU
NEXTAUTH_URL=http://localhost:3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lastminutelive

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Email Service (Mailjet)
MAILJET_API_KEY=your_mailjet_api_key_here
MAILJET_SECRET_KEY=your_mailjet_secret_key_here
FROM_EMAIL=noreply@lastminutelive.com
FROM_NAME=LastMinuteLive

# Email Verification
REQUIRE_EMAIL_VERIFICATION=true

# Payment Processing (Stripe)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Venue Authentication
VENUE_MASTER_PASSWORD=admin2024master!
```

## 🚀 Railway Production Setup

Add these environment variables to your Railway project:

```bash
# Authentication & Security
NEXTAUTH_SECRET=ukqSgA2cYwqxVKcZq3dqrJFQiVM7ZeQmt34AE5ojINU
NEXTAUTH_URL=https://then-production.up.railway.app
NODE_ENV=production

# Database (Railway will provide this)
DATABASE_URL=postgresql://postgres:password@host:port/database

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Email Service (Mailjet)
MAILJET_API_KEY=your_mailjet_api_key_here
MAILJET_SECRET_KEY=your_mailjet_secret_key_here
FROM_EMAIL=noreply@lastminutelive.com
FROM_NAME=LastMinuteLive

# Email Verification
REQUIRE_EMAIL_VERIFICATION=true

# Payment Processing (Stripe)
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# App URL
NEXT_PUBLIC_APP_URL=https://then-production.up.railway.app

# Venue Authentication
VENUE_MASTER_PASSWORD=admin2024master!
```

## 📱 Mobile App Environment Variables

Update your `mobile-app/.env` file:

```bash
# Mobile app environment variables
EXPO_PUBLIC_API_URL=https://then-production.up.railway.app
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key_here
```

## 🧪 Testing the Setup

### Test Google OAuth

1. **Start your development server**:
   ```bash
   pnpm run dev
   ```

2. **Visit the sign-in page**:
   ```
   http://localhost:3001/auth/signin
   ```

3. **Test Google sign-in**:
   - Click the Google sign-in button
   - Complete the OAuth flow
   - Verify you're redirected back and signed in

### Test Email Verification

1. **Create a new account**:
   ```bash
   curl -X POST http://localhost:3001/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "SecurePassword123!",
       "name": "Test User"
     }'
   ```

2. **Check your server logs** for the email verification link
3. **Visit the verification link** to confirm email verification works

### Test Booking Confirmation Emails

1. **Make a test booking** through the seat selection process
2. **Complete the Stripe checkout**
3. **Check that a booking confirmation email is sent**

## 🔍 Troubleshooting

### Common Issues

1. **Google OAuth "redirect_uri_mismatch" error**:
   - Ensure your redirect URIs in Google Cloud Console exactly match your app URLs
   - Check for trailing slashes or protocol mismatches

2. **Mailjet emails not sending**:
   - Verify your API keys are correct
   - Check your Mailjet dashboard for sending statistics
   - Ensure your FROM_EMAIL domain is verified

3. **Email verification links not working**:
   - Check that NEXTAUTH_URL is set correctly
   - Verify the token expiration settings
   - Check server logs for token validation errors

### Debug Commands

```bash
# Test database connection
pnpm run db:test

# Test email sending (development mode)
curl -X POST http://localhost:3001/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check Google OAuth configuration
curl -X GET http://localhost:3001/api/auth/providers
```

## 🎯 Next Steps

1. **Set up Google OAuth credentials** following Step 1
2. **Configure Mailjet account** following the email setup steps
3. **Update your environment variables** in both local and Railway
4. **Test the complete authentication flow**
5. **Test email verification and booking confirmations**

The system is already built to handle all these features - you just need to provide the API keys and credentials!

## 📋 Checklist

- [ ] Google Cloud project created
- [ ] Google OAuth credentials configured
- [ ] Mailjet account created and API keys obtained
- [ ] Environment variables updated locally
- [ ] Environment variables updated on Railway
- [ ] Google sign-in tested
- [ ] Email verification tested
- [ ] Booking confirmation emails tested
- [ ] Mobile app environment variables updated 