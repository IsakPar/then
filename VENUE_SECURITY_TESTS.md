# 🧪 **Venue CMS Security Testing Suite**
## **Comprehensive Production Readiness Verification**

---

## 🎯 **Test Environment Setup**

```bash
# Set your production URL
PROD_URL="https://then-production.up.railway.app"
LOCAL_URL="http://localhost:3000"

# Test with your actual production URL
TEST_URL=$PROD_URL
```

---

## 📱 **1. MOBILE BLOCKING VERIFICATION**

### **Test 1.1: Mobile App Header Detection**
```bash
# Should return 403 Forbidden
curl -X POST "$TEST_URL/api/venue-admin/create-staff" \
  -H "Content-Type: application/json" \
  -H "x-mobile-app: true" \
  -d '{"email":"test@test.com","password":"test123","name":"Test","venueSlug":"test","role":"validator"}' \
  -v

# Expected: 403 Forbidden with security event logged
```

### **Test 1.2: Mobile User-Agent Detection**
```bash
# iOS User Agent - Should return 403
curl -X POST "$TEST_URL/api/venue-admin/create-staff" \
  -H "Content-Type: application/json" \
  -H "User-Agent: LastMinuteLive-Mobile-App" \
  -d '{"email":"test@test.com","password":"test123","name":"Test","venueSlug":"test","role":"validator"}' \
  -v

# Android User Agent - Should return 403  
curl -X POST "$TEST_URL/api/venue-admin/create-staff" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 LastMinuteLive-Mobile-App" \
  -d '{"email":"test@test.com","password":"test123","name":"Test","venueSlug":"test","role":"validator"}' \
  -v

# Expected: 403 Forbidden for both
```

### **Test 1.3: Platform Header Detection**
```bash
# React Native Platform - Should return 403
curl -X POST "$TEST_URL/api/venue-admin/create-staff" \
  -H "Content-Type: application/json" \
  -H "x-platform: react-native" \
  -d '{"email":"test@test.com","password":"test123","name":"Test","venueSlug":"test","role":"validator"}' \
  -v

# Expected: 403 Forbidden
```

### **Test 1.4: All Venue Endpoints Mobile Blocking**
```bash
# Test mobile blocking on all critical endpoints
ENDPOINTS=(
  "/api/venues"
  "/api/venues/any-venue-id"
  "/api/venues/any-venue-id/stats"
  "/api/venues/any-venue-id/bookings/today"
  "/api/venues/any-venue-id/validate"
  "/api/venues/any-venue-id/shows"
  "/api/venue-admin/create-staff"
)

for endpoint in "${ENDPOINTS[@]}"; do
  echo "Testing mobile blocking on: $endpoint"
  curl -X GET "$TEST_URL$endpoint" \
    -H "x-mobile-app: true" \
    -w "Status: %{http_code}\n" \
    -s -o /dev/null
done

# Expected: All should return 403 Forbidden
```

---

## 🔐 **2. AUTHENTICATION VERIFICATION**

### **Test 2.1: Unauthenticated Access Blocking**
```bash
# All venue endpoints should require authentication
curl -X GET "$TEST_URL/api/venues/any-venue-id" -v
curl -X GET "$TEST_URL/api/venues/any-venue-id/stats" -v  
curl -X GET "$TEST_URL/api/venues/any-venue-id/bookings/today" -v
curl -X POST "$TEST_URL/api/venues/any-venue-id/validate" -v

# Expected: 403 Forbidden for all (authentication required)
```

### **Test 2.2: Valid Authentication Flow**
```bash
# 1. Login with valid credentials (use sample accounts from schema)
curl -X POST "$TEST_URL/api/venue-auth-new" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "email": "phantom_manager@lastminutelive.com",
    "password": "Phantom2024Manager!",
    "venueSlug": "phantom-opera-house"
  }' \
  -c cookies.txt \
  -v

# Expected: 200 OK with authentication success

# 2. Use authenticated session to access venue data
curl -X GET "$TEST_URL/api/venues/phantom-venue-id" \
  -b cookies.txt \
  -v

# Expected: 200 OK with venue data
```

---

## 🏛️ **3. CROSS-VENUE ACCESS PREVENTION**

### **Test 3.1: Venue Isolation Enforcement**
```bash
# 1. Login as phantom_manager
curl -X POST "$TEST_URL/api/venue-auth-new" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login", 
    "email": "phantom_manager@lastminutelive.com",
    "password": "Phantom2024Manager!",
    "venueSlug": "phantom-opera-house"
  }' \
  -c phantom_cookies.txt

# 2. Try to access Criterion Theatre data (should be denied)
curl -X GET "$TEST_URL/api/venues/criterion-venue-id" \
  -b phantom_cookies.txt \
  -v

# Expected: 403 Forbidden - Access denied to different venue

# 3. Try to access Criterion venue stats (should be denied)
curl -X GET "$TEST_URL/api/venues/criterion-venue-id/stats" \
  -b phantom_cookies.txt \
  -v

# Expected: 403 Forbidden
```

### **Test 3.2: Cross-Venue Staff Creation Prevention**
```bash
# Try to create staff for different venue
curl -X POST "$TEST_URL/api/venue-admin/create-staff" \
  -H "Content-Type: application/json" \
  -b phantom_cookies.txt \
  -d '{
    "email": "hacker@test.com",
    "password": "hack123",
    "name": "Hacker",
    "venueSlug": "criterion-theatre", 
    "role": "admin"
  }' \
  -v

# Expected: 403 Forbidden - Can only create staff for authorized venue
```

---

## ⚡ **4. RATE LIMITING VERIFICATION**

### **Test 4.1: Login Rate Limiting**
```bash
# Make 6 failed login attempts rapidly
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST "$TEST_URL/api/venue-auth-new" \
    -H "Content-Type: application/json" \
    -d '{
      "action": "login",
      "email": "fake@email.com", 
      "password": "wrongpassword"
    }' \
    -w "Status: %{http_code}\n" \
    -s
done

# Expected: First 5 should return 401, 6th should return 429 with Retry-After header
```

### **Test 4.2: Staff Creation Rate Limiting**
```bash
# Make 6 staff creation attempts rapidly (after proper auth)
for i in {1..6}; do
  echo "Staff creation attempt $i:"
  curl -X POST "$TEST_URL/api/venue-admin/create-staff" \
    -H "Content-Type: application/json" \
    -b valid_admin_cookies.txt \
    -d "{
      \"email\": \"test$i@test.com\",
      \"password\": \"test123\", 
      \"name\": \"Test $i\",
      \"venueSlug\": \"phantom-opera-house\",
      \"role\": \"validator\"
    }" \
    -w "Status: %{http_code}\n" \
    -s
done

# Expected: After 5 attempts, should return 429 with Retry-After header
```

---

## 🌐 **5. ORIGIN VALIDATION VERIFICATION**

### **Test 5.1: Invalid Origin Blocking**
```bash
# Test with unauthorized origin
curl -X POST "$TEST_URL/api/venue-admin/create-staff" \
  -H "Content-Type: application/json" \
  -H "Origin: https://malicious-site.com" \
  -d '{"email":"test@test.com","password":"test123","name":"Test","venueSlug":"test","role":"validator"}' \
  -v

# Expected: 403 Forbidden - Invalid origin
```

### **Test 5.2: Valid Origin Acceptance**
```bash
# Test with valid production origin
curl -X POST "$TEST_URL/api/venue-admin/create-staff" \
  -H "Content-Type: application/json" \
  -H "Origin: https://then-production.up.railway.app" \
  -H "Authorization: Bearer valid-token" \
  -d '{"email":"test@test.com","password":"test123","name":"Test","venueSlug":"test","role":"validator"}' \
  -v

# Expected: Should not be blocked by origin validation (may fail on auth)
```

---

## 🔑 **6. PERMISSION SYSTEM VERIFICATION**

### **Test 6.1: Role-Based Permission Enforcement**
```bash
# 1. Login as validator (lowest permission level)
curl -X POST "$TEST_URL/api/venue-auth-new" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "email": "criterion_validation@lastminutelive.com", 
    "password": "Criterion2024!",
    "venueSlug": "criterion-theatre"
  }' \
  -c validator_cookies.txt

# 2. Try to access venue stats (should be denied - requires view_reports)
curl -X GET "$TEST_URL/api/venues/criterion-venue-id/stats" \
  -b validator_cookies.txt \
  -v

# Expected: 403 Forbidden - Insufficient permissions

# 3. Try to create staff (should be denied - requires manage_users)
curl -X POST "$TEST_URL/api/venue-admin/create-staff" \
  -H "Content-Type: application/json" \
  -b validator_cookies.txt \
  -d '{
    "email": "new@test.com",
    "password": "test123", 
    "name": "New Staff",
    "venueSlug": "criterion-theatre",
    "role": "validator"
  }' \
  -v

# Expected: 403 Forbidden - Insufficient permissions
```

### **Test 6.2: Admin Permission Verification**
```bash
# 1. Login as admin
curl -X POST "$TEST_URL/api/venue-auth-new" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "email": "victoria_admin@lastminutelive.com",
    "password": "Victoria2024Admin!",
    "venueSlug": "victoria-palace"
  }' \
  -c admin_cookies.txt

# 2. Access all venue endpoints (should all work)
curl -X GET "$TEST_URL/api/venues/victoria-venue-id" -b admin_cookies.txt -v
curl -X GET "$TEST_URL/api/venues/victoria-venue-id/stats" -b admin_cookies.txt -v
curl -X GET "$TEST_URL/api/venues/victoria-venue-id/bookings/today" -b admin_cookies.txt -v

# Expected: 200 OK for all (admin has all permissions)
```

---

## ⏰ **7. SESSION EXPIRY VERIFICATION**

### **Test 7.1: Session Timeout (Manual Test)**
```bash
# Note: This requires waiting 8+ hours - for production testing only

# 1. Login and save session
curl -X POST "$TEST_URL/api/venue-auth-new" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "email": "phantom_manager@lastminutelive.com",
    "password": "Phantom2024Manager!",
    "venueSlug": "phantom-opera-house"
  }' \
  -c session_cookies.txt

# 2. Wait 8+ hours (or modify expiry in DB for testing)

# 3. Try to access venue data with expired session
curl -X GET "$TEST_URL/api/venues/phantom-venue-id" \
  -b session_cookies.txt \
  -v

# Expected: 403 Forbidden - Session expired
```

---

## 🛡️ **8. SECURITY HEADERS VERIFICATION**

### **Test 8.1: Security Headers Applied**
```bash
# Check that security headers are present
curl -X GET "$TEST_URL/api/venues/any-id" \
  -H "x-mobile-app: true" \
  -I

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Referrer-Policy: strict-origin-when-cross-origin
```

---

## 📊 **9. SECURITY LOGGING VERIFICATION**

### **Test 9.1: Security Events Logged**
```bash
# Generate security events and check logs
# 1. Mobile access attempt
curl -X POST "$TEST_URL/api/venue-admin/create-staff" -H "x-mobile-app: true"

# 2. Invalid origin attempt  
curl -X POST "$TEST_URL/api/venue-admin/create-staff" -H "Origin: https://evil.com"

# 3. Rate limit violation
for i in {1..6}; do
  curl -X POST "$TEST_URL/api/venue-auth-new" -d '{"action":"login","email":"fake","password":"fake"}'
done

# Check Railway logs:
# railway logs --filter "SECURITY EVENT"

# Expected: Security events logged for mobile_blocked, origin_blocked, rate_limited
```

---

## ✅ **TEST RESULTS VALIDATION**

### **Expected Results Summary:**

| Test Category | Expected Result | Security Level |
|---------------|----------------|----------------|
| **Mobile Blocking** | 403 Forbidden on all mobile requests | ✅ **CRITICAL** |
| **Authentication** | 403 Forbidden without valid session | ✅ **CRITICAL** |
| **Cross-Venue Access** | 403 Forbidden for other venues | ✅ **HIGH** |
| **Rate Limiting** | 429 Too Many Requests after limits | ✅ **MEDIUM** |
| **Origin Validation** | 403 Forbidden for invalid origins | ✅ **MEDIUM** |
| **Permission System** | 403 Forbidden for insufficient perms | ✅ **HIGH** |
| **Session Expiry** | 403 Forbidden after 8 hours | ✅ **MEDIUM** |
| **Security Headers** | All security headers present | ✅ **LOW** |
| **Security Logging** | Events logged for all violations | ✅ **MEDIUM** |

---

## 🚀 **PRODUCTION DEPLOYMENT CRITERIA**

**✅ READY FOR PRODUCTION** when all tests pass with expected results.

**🚨 DEPLOYMENT BLOCKERS** if any test fails:
- Mobile access not blocked → **CRITICAL BLOCKER**
- Unauthenticated access allowed → **CRITICAL BLOCKER**  
- Cross-venue access possible → **HIGH BLOCKER**
- Permissions not enforced → **HIGH BLOCKER**

**🎯 TARGET: 100% PASS RATE** for enterprise-grade security certification. 