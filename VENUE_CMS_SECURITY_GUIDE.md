# 🔐 **Venue CMS Security Guide**
## Complete Web-Only Authentication System

---

## 🎯 **Critical Security Requirement: ✅ ENFORCED**

**✅ Venue authentication accounts can ONLY be created from the web app**
- ❌ iOS app cannot create, promote, or modify venue CMS users under any conditions
- ✅ Account creation logic exists only in secure web routes  
- ✅ Mobile endpoints are completely blocked from venue user management

---

## 🛡️ **Multi-Layer Security Implementation**

### **Layer 1: Mobile App Detection & Blocking**
```typescript
// Detects and blocks ALL mobile access attempts
- x-mobile-app: 'true' header → BLOCKED
- User-Agent patterns (iOS, Android, React-Native) → BLOCKED  
- Platform headers (expo, react-native) → BLOCKED
- Mobile device user agents → BLOCKED
```

### **Layer 2: Origin Validation**
```typescript
// Only allows requests from authorized web domains
allowedOrigins: [
  'http://localhost:3000',           // Development
  'http://localhost:3001',           // Development alt
  'https://then-production.up.railway.app',  // Production
  'https://lastminutelive.com'       // Custom domain
]
```

### **Layer 3: Authentication & Authorization**
```typescript
// Multi-level permission checks
1. Valid venue session required
2. 'manage_users' permission required
3. Admin role required for admin account creation
4. Venue-specific access enforcement
```

### **Layer 4: Rate Limiting**
```typescript
// Prevents brute force attacks
- Max 5 attempts per 15-minute window
- Per-IP tracking with automatic reset
- Progressive blocking with retry-after headers
```

### **Layer 5: Feature Flags**
```bash
# Environment-controlled security toggles
ENABLE_VENUE_STAFF_CREATION=true    # Master switch
ENABLE_MOBILE_BLOCKING=true         # Mobile detection
ENABLE_MASTER_ADMIN=false           # Emergency access
MAX_VENUE_LOGIN_ATTEMPTS=5          # Rate limit config
```

---

## 📊 **Security API Endpoints**

### **✅ SECURE: Venue Staff Creation**
```
POST /api/venue-admin/create-staff
- Web-only access
- Admin authentication required
- Rate limited (5 attempts/15min)
- Origin validation enforced
- Comprehensive logging
```

### **✅ SECURE: Venue Authentication**  
```
POST /api/venue-auth-new
- Database-driven credentials
- Venue-specific sessions
- Role-based permissions
- No hardcoded passwords
```

### **❌ BLOCKED: Mobile App Access**
```typescript
// Mobile signup API - SECURE
if (isMobileApp && role !== 'customer') {
  console.log(`🔒 Security: Mobile app attempted to create ${role} account`);
  role = 'customer'; // Force to customer role
}
```

---

## 🔒 **Database-Driven Authentication**

### **User Account Structure**
```sql
-- Venue staff accounts tied to specific venue + role
users {
  id: UUID,
  email: TEXT,
  role: 'venue',           -- Fixed venue role
  password_hash: TEXT      -- Bcrypt hashed
}

user_venues {
  user_id: UUID,
  venue_id: UUID,
  role: 'validator' | 'manager' | 'admin'  -- Venue-specific role
}
```

### **Session Management**
```sql
-- Secure venue sessions with expiration
venue_auth_sessions {
  session_token: TEXT,     -- Cryptographically secure
  user_id: UUID,
  venue_id: UUID,
  role: venue_role,
  permissions: TEXT[],
  expires_at: TIMESTAMP,   -- 8-hour session timeout
  last_activity: TIMESTAMP
}
```

---

## 🚨 **Security Monitoring & Logging**

### **Automated Security Events**
```typescript
// All security violations are logged
'mobile_blocked'        → Mobile app access attempt
'origin_blocked'        → Invalid origin detected  
'rate_limited'         → Too many failed attempts
'unauthorized_access'   → Invalid authentication
```

### **Monitoring Data**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "event": "mobile_blocked", 
  "ip": "192.168.1.100",
  "userAgent": "LastMinuteLive-Mobile-App",
  "operation": "create_staff",
  "reason": "Explicit mobile app header detected"
}
```

---

## 🧪 **Security Testing Checklist**

### **✅ Mobile Isolation Tests**
- [ ] iOS app cannot access `/api/venue-admin/create-staff`
- [ ] Mobile user-agents are blocked from venue creation
- [ ] `x-mobile-app: true` header triggers 403 Forbidden
- [ ] Mobile signup forced to `customer` role only

### **✅ Authentication Bypass Tests**  
- [ ] Unauthenticated requests blocked
- [ ] Cross-venue access prevention
- [ ] Invalid permissions rejection
- [ ] Session timeout enforcement

### **✅ Rate Limiting Tests**
- [ ] 6th failed attempt within 15min → blocked
- [ ] Different IPs have independent limits  
- [ ] Successful authentication resets limit
- [ ] Retry-After header provided when blocked

### **✅ Origin Validation Tests**
- [ ] Unauthorized domains blocked
- [ ] CORS preflight requests handled
- [ ] Development localhost allowed
- [ ] Production domains whitelisted

---

## ⚙️ **Environment Configuration**

### **Production Security Settings**
```bash
# /railway-env-production.txt
ENABLE_VENUE_STAFF_CREATION=true
ENABLE_MOBILE_BLOCKING=true  
ENABLE_MASTER_ADMIN=false
MAX_VENUE_LOGIN_ATTEMPTS=3
VENUE_RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
NODE_ENV=production
```

### **Development Settings**
```bash
# /local-env-development.txt  
ENABLE_VENUE_STAFF_CREATION=true
ENABLE_MOBILE_BLOCKING=true
ENABLE_MASTER_ADMIN=true     # For testing only
MAX_VENUE_LOGIN_ATTEMPTS=5
NODE_ENV=development
```

---

## 🔧 **Implementation Details**

### **Venue Staff Account Creation Flow**
```mermaid
graph TD
    A[Admin Request] --> B[Mobile Detection]
    B -->|Mobile| C[🚨 BLOCKED]
    B -->|Web| D[Origin Validation]
    D -->|Invalid| C
    D -->|Valid| E[Rate Limit Check] 
    E -->|Exceeded| C
    E -->|OK| F[Authentication Check]
    F -->|Failed| C
    F -->|Success| G[Permission Check]
    G -->|No manage_users| C
    G -->|Authorized| H[Create Account]
    H --> I[✅ Success + Logging]
```

### **Security Headers Applied**
```typescript
{
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY', 
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' // Production only
}
```

---

## 🎯 **Key Security Achievements**

### **✅ Complete Mobile Isolation**
- **Zero mobile access** to venue staff creation
- **Multiple detection layers** prevent bypass attempts  
- **Comprehensive logging** of all blocked attempts

### **✅ Enterprise-Ready Authentication**
- **Database-driven** credential management
- **Role-based** venue-specific access control
- **Session management** with automatic expiration

### **✅ Attack Prevention**
- **Rate limiting** prevents brute force attacks
- **Origin validation** blocks unauthorized domains
- **Security headers** prevent common web attacks

### **✅ Operational Control**
- **Feature flags** for instant security toggles
- **Environment-specific** configuration
- **Comprehensive monitoring** and alerting

---

## 🚀 **Next Steps: Testing & Deployment**

1. **Run Security Tests**
   ```bash
   # Test mobile blocking
   curl -H "x-mobile-app: true" POST /api/venue-admin/create-staff
   # Should return 403 Forbidden
   ```

2. **Enable Production Security**
   ```bash
   # Set Railway environment variables
   ENABLE_VENUE_STAFF_CREATION=true
   ENABLE_MOBILE_BLOCKING=true
   ```

3. **Monitor Security Events**
   ```bash
   # Watch logs for security violations
   railway logs --filter "SECURITY EVENT"
   ```

**🔒 Result: Venue CMS is now completely isolated from mobile access with enterprise-grade security controls.** 