# Railway Environment Setup

## 🚀 Your Railway App URL
**https://then-production.up.railway.app**

## 🔐 Required Environment Variables

### 1. Database (Already configured in Railway)
```
DATABASE_URL=postgresql://postgres:cwJdoGwjeqiAXEXRYFINYPMyyQOPsUvT@mainline.proxy.rlwy.net:52262/railway
```

### 2. Stripe Configuration (You need to add these)
```
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

### 3. Application Configuration
```
NEXT_PUBLIC_APP_URL=https://then-production.up.railway.app
NODE_ENV=production
```

## 🎯 Next Steps

1. **Create .env.local locally**: Copy the variables above to a local .env.local file for testing
2. **Set Railway Environment Variables**: Add these to your Railway dashboard
3. **Configure Stripe Webhook**: Set webhook URL to https://then-production.up.railway.app/api/webhooks/stripe
4. **Test End-to-End**: Test the complete booking flow

## 🔗 Stripe Webhook URL
```
https://then-production.up.railway.app/api/webhooks/stripe
```

## 📋 Railway Dashboard Setup
1. Go to railway.app
2. Open your "laudable-reprieve" project
3. Click on the "then" service (not Postgres)
4. Go to "Variables" tab
5. Add each environment variable above 