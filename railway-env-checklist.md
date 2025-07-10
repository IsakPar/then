# Railway Environment Variables Checklist

## Before Deployment
- [ ] Have access to current `.env.local` file
- [ ] Stripe account with test/live API keys ready
- [ ] Railway account created and connected to GitHub

## Required Environment Variables for Railway

### Database
- [ ] `DATABASE_URL` - Automatically provided by Railway PostgreSQL service

### Stripe (Copy from your .env.local)
- [ ] `STRIPE_SECRET_KEY=sk_test_...` or `sk_live_...`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` or `pk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...` (Update after deployment)

### Application
- [ ] `NEXT_PUBLIC_APP_URL=https://your-app-name.railway.app`
- [ ] `NODE_ENV=production`

### Optional (if in your .env.local)
- [ ] `RESEND_API_KEY=...` (if using email)
- [ ] Any other custom environment variables

## Railway Setup Steps
- [ ] Created Railway project
- [ ] Connected GitHub repository
- [ ] Added PostgreSQL service
- [ ] Set all environment variables in Railway dashboard
- [ ] Triggered first deployment
- [ ] Updated Stripe webhook URL
- [ ] Ran database migrations
- [ ] Tested production environment

## Post-Deployment Verification
- [ ] App loads at Railway URL
- [ ] Database connection works
- [ ] Seat selection works
- [ ] Stripe checkout works
- [ ] Payment webhooks work
- [ ] Booking confirmation works 