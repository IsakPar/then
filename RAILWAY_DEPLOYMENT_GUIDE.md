# 🚀 Railway Deployment Guide

## Prerequisites
- GitHub account with this repository pushed
- Railway account (sign up at [railway.app](https://railway.app))
- Stripe account with API keys
- Current `.env.local` file with all required environment variables

## 📋 Environment Variables Needed

Based on your codebase, you'll need these environment variables in Railway:

```bash
# Database (Railway will provide this automatically)
DATABASE_URL=postgresql://...

# Stripe Payment Processing
STRIPE_SECRET_KEY=sk_test_... (or sk_live_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... (or pk_live_...)
STRIPE_WEBHOOK_SECRET=whsec_... (will be updated after deployment)

# Application URLs
NEXT_PUBLIC_APP_URL=https://your-app.railway.app

# Node Environment
NODE_ENV=production
```

## 🔧 Step 1: Create Railway Project

1. **Go to Railway Dashboard**
   - Visit [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `theone` repository
   - Railway will automatically detect it's a Next.js app

## 🗄️ Step 2: Add PostgreSQL Database

1. **Add Database Service**
   - In your Railway project dashboard
   - Click "New Service" 
   - Select "PostgreSQL"
   - Railway will automatically provision the database

2. **Get Database URL**
   - Click on the PostgreSQL service
   - Go to "Variables" tab
   - Copy the `DATABASE_URL` value

## ⚙️ Step 3: Configure Environment Variables

1. **In your Railway project dashboard**
   - Click on your app service (not the database)
   - Go to "Variables" tab
   - Add each environment variable:

```bash
STRIPE_SECRET_KEY=sk_test_51Xxxxxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_1234...
NEXT_PUBLIC_APP_URL=https://your-app-name.railway.app
NODE_ENV=production
```

2. **Database URL**
   - Should be automatically connected
   - If not, manually add `DATABASE_URL` from your PostgreSQL service

## 🚀 Step 4: Deploy

1. **Trigger Deployment**
   - Railway should auto-deploy when you push to main branch
   - Or click "Deploy" in the dashboard

2. **Monitor Build**
   - Watch the build logs in Railway dashboard
   - First build may take 5-10 minutes

3. **Get Your URL**
   - Once deployed, Railway provides a public URL
   - Format: `https://your-app-name.railway.app`

## 🗃️ Step 5: Run Database Migrations

You have two options:

### Option A: Using Railway's PostgreSQL directly
1. **Connect to Railway Database**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and connect
   railway login
   railway link [your-project-id]
   
   # Run migrations using your local Drizzle setup
   npm run db:push
   ```

### Option B: Manual SQL execution
1. **Copy your migration SQL**
   - Use the SQL from your `lastminutelive/fresh-start-migration.sql`
   
2. **Execute in Railway**
   - Go to PostgreSQL service in Railway
   - Use the "Query" tab or connect with a PostgreSQL client
   - Run your migration SQL

## 🔔 Step 6: Update Stripe Webhooks

1. **Get your Railway URL**
   - Format: `https://your-app-name.railway.app`

2. **Update Stripe Webhook**
   - Go to Stripe Dashboard > Webhooks
   - Edit your existing webhook
   - Update URL to: `https://your-app-name.railway.app/api/webhooks/stripe`

3. **Update Webhook Secret**
   - Copy the webhook signing secret from Stripe
   - Add `STRIPE_WEBHOOK_SECRET` to Railway environment variables

## 🧪 Step 7: Test Production

1. **Visit your Railway URL**
2. **Test seat booking flow**:
   - Select seats
   - Go through Stripe checkout
   - Verify booking confirmation
   - Check database records

## 🔧 Troubleshooting

### Build Fails
- Check Railway build logs
- Ensure all dependencies are in `package.json`
- Verify Next.js config is correct

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check if Railway PostgreSQL service is running
- Ensure your connection.ts uses SSL in production

### Stripe Issues
- Verify all Stripe environment variables
- Check webhook URL is accessible
- Test with Stripe test mode first

### Environment Variables
- Double-check all variables are set in Railway
- Use Railway CLI to verify: `railway variables`

## 🔄 Continuous Deployment

Railway automatically deploys when you push to your main branch. Your workflow:

1. Make changes locally
2. Test locally
3. Commit and push to GitHub
4. Railway auto-deploys
5. Verify changes in production

## 📊 Monitoring

- **Railway Dashboard**: Monitor deployments, logs, metrics
- **Database**: Check PostgreSQL metrics in Railway
- **Stripe**: Monitor payments in Stripe dashboard

## 🎯 Next Steps After Deployment

1. **Test thoroughly** with small transactions
2. **Set up monitoring** for errors
3. **Configure custom domain** (optional)
4. **Switch to Stripe live mode** when ready
5. **Set up backups** for your database

---

## ⚠️ Important Notes

- **Environment Variables**: Never commit secrets to GitHub
- **Database**: Railway PostgreSQL has automatic backups
- **SSL**: Automatically handled by Railway
- **Scaling**: Railway can auto-scale as needed
- **Costs**: Monitor usage in Railway dashboard

Your app should now be live at your Railway URL! 🎉 