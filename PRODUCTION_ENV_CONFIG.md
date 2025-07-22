# 🌐 **Production Environment Configuration**
## **Railway Deployment Security Settings**

---

## 🔐 **CRITICAL SECURITY ENVIRONMENT VARIABLES**

### **Required for Railway Production Deployment:**

```bash
# ============================================================================
# VENUE CMS SECURITY CONFIGURATION
# ============================================================================

# 🚨 CRITICAL: Enable venue staff creation (web-only)
ENABLE_VENUE_STAFF_CREATION=true

# 🚨 CRITICAL: Block mobile app access to venue endpoints  
ENABLE_MOBILE_BLOCKING=true

# 🚨 CRITICAL: Disable master admin bypass in production
ENABLE_MASTER_ADMIN=false

# 🚨 CRITICAL: Stricter rate limiting for production
MAX_VENUE_LOGIN_ATTEMPTS=3
VENUE_RATE_LIMIT_WINDOW_MS=900000

# 🚨 CRITICAL: Production security mode
NODE_ENV=production

# ============================================================================
# DATABASE & AUTH CONFIGURATION  
# ============================================================================

# Database connection (Postgres)
DATABASE_URL=postgresql://[railway-provided-url]

# NextAuth configuration
NEXTAUTH_SECRET=[secure-random-string-32-chars]
NEXTAUTH_URL=https://then-production.up.railway.app

# ============================================================================
# STRIPE CONFIGURATION
# ============================================================================

STRIPE_PUBLISHABLE_KEY=pk_live_[your-live-publishable-key]
STRIPE_SECRET_KEY=sk_live_[your-live-secret-key]
STRIPE_WEBHOOK_SECRET=whsec_[your-webhook-secret]

# ============================================================================
# EMAIL CONFIGURATION
# ============================================================================

# Gmail SMTP for production emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[your-gmail-address]
SMTP_PASS=[your-app-password]
EMAIL_FROM=[your-from-address]

# ============================================================================
# GOOGLE OAUTH (Optional)
# ============================================================================

GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]

# ============================================================================
# SECURITY MONITORING
# ============================================================================

# Enable comprehensive security logging
ENABLE_SECURITY_LOGGING=true
SECURITY_LOG_LEVEL=info

# Additional allowed origins (comma-separated)
ADDITIONAL_ALLOWED_ORIGINS=https://lastminutelive.com,https://www.lastminutelive.com
```

---

## 🚀 **Railway Deployment Commands**

### **1. Set All Environment Variables:**

```bash
# Set critical security variables
railway variables set ENABLE_VENUE_STAFF_CREATION=true
railway variables set ENABLE_MOBILE_BLOCKING=true  
railway variables set ENABLE_MASTER_ADMIN=false
railway variables set MAX_VENUE_LOGIN_ATTEMPTS=3
railway variables set NODE_ENV=production

# Set database URL (Railway provides this automatically)
# railway variables set DATABASE_URL=postgresql://[auto-provided]

# Set authentication secrets
railway variables set NEXTAUTH_SECRET=$(openssl rand -base64 32)
railway variables set NEXTAUTH_URL=https://then-production.up.railway.app

# Set Stripe keys (replace with your live keys)
railway variables set STRIPE_PUBLISHABLE_KEY=pk_live_[your-key]
railway variables set STRIPE_SECRET_KEY=sk_live_[your-key]  
railway variables set STRIPE_WEBHOOK_SECRET=whsec_[your-secret]

# Set email configuration
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=587
railway variables set SMTP_USER=[your-gmail]
railway variables set SMTP_PASS=[your-app-password]
railway variables set EMAIL_FROM=[your-email]
```

### **2. Verify Environment Variables:**

```bash
# Check all variables are set correctly
railway variables

# Should show all security variables with correct values
```

### **3. Deploy with Security Enabled:**

```bash
# Deploy to production with security configuration
railway up

# Monitor deployment logs
railway logs
```

---

## 🧪 **Environment Variable Verification**

### **Security Configuration Test:**

```bash
# Test that security is properly configured
curl -X GET "https://then-production.up.railway.app/api/env-check" \
  -H "x-mobile-app: true" \
  -v

# Expected response:
# {
#   "mobile_blocking": true,
#   "venue_staff_creation": true, 
#   "master_admin": false,
#   "node_env": "production"
# }
```

### **Manual Verification Checklist:**

```bash
# ✅ Check each environment variable is set:
echo "ENABLE_VENUE_STAFF_CREATION: $ENABLE_VENUE_STAFF_CREATION"  # Should be "true"
echo "ENABLE_MOBILE_BLOCKING: $ENABLE_MOBILE_BLOCKING"            # Should be "true"  
echo "ENABLE_MASTER_ADMIN: $ENABLE_MASTER_ADMIN"                  # Should be "false"
echo "NODE_ENV: $NODE_ENV"                                        # Should be "production"
echo "MAX_VENUE_LOGIN_ATTEMPTS: $MAX_VENUE_LOGIN_ATTEMPTS"        # Should be "3"
```

---

## 🔒 **Security Verification After Deployment**

### **1. Mobile Blocking Test:**
```bash
curl -X POST "https://then-production.up.railway.app/api/venue-admin/create-staff" \
  -H "x-mobile-app: true" \
  -v

# Expected: 403 Forbidden (mobile blocked)
```

### **2. Venue Staff Creation Test:**
```bash
# Should work from web browser but fail from mobile
curl -X POST "https://then-production.up.railway.app/api/venue-admin/create-staff" \
  -H "Content-Type: application/json" \
  -H "Origin: https://then-production.up.railway.app" \
  -d '{"email":"test@test.com","password":"test123","name":"Test","venueSlug":"test","role":"validator"}' \
  -v

# Expected: 401 Unauthorized (needs authentication, but not blocked)
```

### **3. Master Admin Disabled Test:**
```bash
# Master admin should be disabled in production
curl -X POST "https://then-production.up.railway.app/api/venue-auth-new" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "email": "any@email.com",
    "password": "[VENUE_MASTER_PASSWORD]"
  }' \
  -v

# Expected: 401 Unauthorized (master admin disabled)
```

---

## 📊 **Monitoring & Logging Setup**

### **Railway Logs Monitoring:**

```bash
# Monitor security events in real-time
railway logs --filter "SECURITY EVENT"

# Monitor authentication attempts  
railway logs --filter "venue-auth"

# Monitor mobile blocking
railway logs --filter "mobile_blocked"
```

### **Security Alerts Setup:**

```bash
# Set up monitoring for critical security events
# (This would typically be done through a monitoring service)

# Events to monitor:
# - mobile_blocked: Mobile access attempts
# - origin_blocked: Invalid domain access  
# - rate_limited: Brute force attempts
# - unauthorized_access: Invalid authentication
# - cross_venue_access: Venue isolation violations
```

---

## ⚙️ **Development vs Production Differences**

| Setting | Development | Production |
|---------|-------------|------------|
| `ENABLE_MASTER_ADMIN` | `true` | `false` |
| `MAX_VENUE_LOGIN_ATTEMPTS` | `5` | `3` |
| `NODE_ENV` | `development` | `production` |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://then-production.up.railway.app` |
| `STRIPE_KEYS` | Test keys | Live keys |
| `Security Headers` | Basic | Full HTTPS headers |

---

## 🚨 **Critical Production Checklist**

### **Before Deployment:**
- [ ] `ENABLE_MASTER_ADMIN=false` (disable dev bypass)
- [ ] `ENABLE_MOBILE_BLOCKING=true` (block mobile access)
- [ ] `NODE_ENV=production` (enable production security)
- [ ] `NEXTAUTH_SECRET` set to secure random string
- [ ] `DATABASE_URL` pointing to production database
- [ ] Stripe live keys configured (not test keys)
- [ ] SMTP configuration for production emails

### **After Deployment:**
- [ ] Mobile blocking working (403 on mobile requests)
- [ ] Venue authentication working (database-driven)
- [ ] Cross-venue access blocked (venue isolation)
- [ ] Rate limiting functional (429 after limits)
- [ ] Security logging enabled (events in Railway logs)
- [ ] Session expiry working (8-hour timeout)

---

## 🎯 **Final Production Security Status**

**✅ PRODUCTION READY** when all environment variables are configured and all security tests pass.

**Configuration Time: ~30 minutes**  
**Verification Time: ~15 minutes**  
**Total Deployment Time: ~45 minutes**

**🔒 Security Rating: A+** - Enterprise-grade configuration with all critical security measures enabled. 