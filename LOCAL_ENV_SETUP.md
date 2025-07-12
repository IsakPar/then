# Local Development Environment Setup

## 1. Create `.env.local` File

Create a `.env.local` file in your project root with the following environment variables:

```bash
# Authentication & Security
NEXTAUTH_SECRET=ukqSgA2cYwqxVKcZq3dqrJFQiVM7ZeQmt34AE5ojINU
NEXTAUTH_URL=http://localhost:3001
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lastminutelive

# Email Service (Mailjet) - Add your actual keys here
MAILJET_API_KEY=your-mailjet-api-key-here
MAILJET_SECRET_KEY=your-mailjet-secret-key-here
FROM_EMAIL=noreply@lastminutelive.com
FROM_NAME=LastMinuteLive

# Payment Processing (Stripe) - Add your actual keys here
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret_here

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Venue Authentication
VENUE_MASTER_PASSWORD=admin2024master!

# Social Auth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-client-secret

# Development flags
REQUIRE_EMAIL_VERIFICATION=false
```

## 2. Quick Setup Commands

```bash
# Create the .env.local file
cp LOCAL_ENV_SETUP.md .env.local

# Then edit .env.local with your actual API keys
```

## 3. Required API Keys

- **Mailjet**: Get from https://app.mailjet.com/account/api_keys
- **Stripe**: Get from https://dashboard.stripe.com/apikeys
- **Google OAuth**: Get from https://console.cloud.google.com/apis/credentials
- **Apple OAuth**: Get from https://developer.apple.com/account/resources/identifiers/list

## 4. Development Mode

The app will run in development mode and skip email verification when `REQUIRE_EMAIL_VERIFICATION=false` is set.

## 5. Mobile App Configuration

For mobile app development, also create a `.env` file in the `mobile-app` directory:

```bash
# Mobile app environment variables
EXPO_PUBLIC_API_URL=http://192.168.68.79:3001
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key_here
```

Note: Replace `192.168.68.79` with your actual local IP address. 