# Email Verification Test Guide

## 🧪 Testing Email Verification

### Test 1: Email Verification with Development Mode

When `MAILJET_API_KEY` is not configured (development mode), emails are logged to console:

```bash
# 1. Start your server
pnpm run dev

# 2. Create a test user
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'

# 3. Check your server logs for the email verification link
# Look for lines like:
# 📧 Development mode: Email would be sent to: test@example.com
# 📧 Subject: Verify Your LastMinuteLive Email
# 📧 Content (first 200 chars): Hi Test User, Welcome to LastMinuteLive!...
```

### Test 2: Email Verification with Mailjet

When `MAILJET_API_KEY` is configured, actual emails are sent:

```bash
# 1. Configure Mailjet in your .env.local
MAILJET_API_KEY=your_actual_api_key
MAILJET_SECRET_KEY=your_actual_secret_key

# 2. Restart your server
pnpm run dev

# 3. Create a test user with your real email
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-real-email@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'

# 4. Check your email inbox for the verification email
# 5. Click the verification link to confirm it works
```

### Test 3: Booking Confirmation Email

```bash
# 1. Complete a booking through the seat selection process
# 2. Go through Stripe checkout (use test card: 4242 4242 4242 4242)
# 3. Check your email for the booking confirmation with:
#    - Show details
#    - Seat information
#    - Validation code
```

## 🔧 Environment Variables Checklist

For proper email functionality, ensure these are set:

```bash
# Required for email verification
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
FROM_EMAIL=noreply@lastminutelive.com
FROM_NAME=LastMinuteLive

# Required for email verification enforcement
REQUIRE_EMAIL_VERIFICATION=true

# Required for verification links
NEXTAUTH_URL=http://localhost:3001  # or your production URL
```

## 📊 Monitoring Email Delivery

### Check Mailjet Dashboard
1. Go to [Mailjet Dashboard](https://app.mailjet.com/stats)
2. View sending statistics
3. Check for bounces or delivery issues

### Check Server Logs
Look for these log messages:
- `📧 Email sent successfully to: user@example.com`
- `📧 Development mode: Email would be sent to: user@example.com`
- `⚠️ Failed to send booking confirmation email`

## 🚨 Common Issues

### Issue 1: Emails Not Sending
**Solution**: Check your Mailjet API keys and server logs

### Issue 2: Verification Links Not Working
**Solution**: Ensure `NEXTAUTH_URL` is set correctly

### Issue 3: Booking Confirmation Emails Missing
**Solution**: Check that the `confirmSeatReservations` function is being called

## ✅ Expected Behavior

1. **Signup**: User receives verification email immediately
2. **Email Verification**: Clicking link marks email as verified
3. **Booking**: After successful payment, user receives booking confirmation
4. **Content**: All emails use professional HTML templates
5. **Validation Codes**: Booking emails contain unique validation codes

## 📝 Test Results

Use this checklist to verify everything works:

- [ ] Email verification sent on signup
- [ ] Verification link works correctly
- [ ] Welcome email sent after signup
- [ ] Booking confirmation email sent after payment
- [ ] All emails use proper HTML templates
- [ ] Validation codes are included in booking emails
- [ ] Email delivery is tracked in Mailjet dashboard

## 🔍 Debug Commands

```bash
# Test email verification API directly
curl -X POST http://localhost:3001/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test password reset email
curl -X POST http://localhost:3001/api/auth/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
``` 