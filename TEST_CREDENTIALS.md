# 🧪 **TEST CREDENTIALS & TESTING STRATEGY**

## 🔐 **EXISTING TEST CREDENTIALS**

### **🏛️ Venue Users**
```
👤 Venue Manager:
   📧 Email: manager@victoriapalace.com
   🔑 Password: manager123
   🏢 Role: venue (manager)
   🎭 Venue: Victoria Palace Theatre

👤 Venue Staff:
   📧 Email: staff@victoriapalace.com
   🔑 Password: staff123
   🏢 Role: venue (staff)
   🎭 Venue: Victoria Palace Theatre
```

### **👥 Customer Users**
```
👤 Test Customer:
   📧 Email: john.doe@example.com
   🔑 Password: password123
   🏢 Role: customer
   ✅ Email verified
```

### **🎭 Guest User Testing**
```
👤 Guest Session (Auto-created):
   📧 Email: test.guest@example.com
   🔑 Session Token: Auto-generated (24h expiry)
   🏢 Role: customer (guest)
   📱 Device: iPhone 16 Plus
```

---

## 🚀 **COMPREHENSIVE TESTING PLAN**

### **📱 Phase 1: Guest Checkout Flow (CURRENT ISSUE)**

#### **✅ Test Cases**
1. **Guest Email Collection**
   - Open Hamilton seat map
   - Select seats (not logged in)
   - Should show email collection modal ✅
   
2. **Guest Session Creation**
   - Submit valid email in guest modal
   - Should create guest session successfully ✅
   - Backend endpoint now exists and works ✅

3. **Guest Payment Flow**
   - Continue to Stripe PaymentSheet
   - Complete payment with test card
   - Should show success page with QR code

4. **Guest Ticket Storage**
   - Tickets should be stored against guest session
   - Should show "login to save tickets" prompt

#### **🔧 iOS App Fix Needed**
The iOS app should now work since `/api/auth/guest` endpoint exists.

---

### **📱 Phase 2: Registered User Flow**

#### **✅ Test Cases**
1. **Registration Flow**
   - Sign up with new email
   - Verify email (if required)
   - Login and select seats
   - Complete payment
   - Tickets saved to account

2. **Login Flow**
   - Login with existing credentials
   - Select seats (no email prompt)
   - Complete payment
   - Tickets appear in tickets tab

---

### **🧪 Phase 3: Payment Testing**

#### **💳 Stripe Test Cards**
```
✅ Success Card:
   💳 Number: 4242 4242 4242 4242
   📅 Expiry: Any future date
   🔒 CVC: Any 3 digits

❌ Decline Card:
   💳 Number: 4000 0000 0000 0002
   📅 Expiry: Any future date
   🔒 CVC: Any 3 digits

🧪 Authentication Required:
   💳 Number: 4000 0027 6000 3184
   📅 Expiry: Any future date
   🔒 CVC: Any 3 digits
```

---

### **📊 Phase 4: Complete Flow Validation**

#### **🎯 End-to-End Test Scenarios**

**Scenario A: Happy Guest Path**
1. Open app → Hamilton seat map
2. Select seat (e.g., "SideA-3-1")
3. Email prompt → Enter: `guest.test@example.com`
4. PaymentSheet → Use: `4242 4242 4242 4242`
5. Success page → QR code + Apple Wallet
6. Verify ticket storage → Check guest session

**Scenario B: Happy Registered Path**
1. Login with: `john.doe@example.com` / `password123`
2. Select seats → No email prompt
3. PaymentSheet → Complete payment
4. Success page → Tickets saved to account
5. Navigate to tickets tab → Verify offline storage

**Scenario C: Guest to Registered Conversion**
1. Complete guest checkout (Scenario A)
2. Success page → "Sign up to save tickets"
3. Create account → Same email as guest
4. Tickets should appear in new account

---

## 🛠️ **IMMEDIATE ACTION PLAN**

### **Step 1: Test Guest Flow (NOW)**
```bash
# 1. Rebuild and launch iOS app
cd /Users/isakparild/Desktop/theone/LML
xcodebuild -project LML.xcodeproj -scheme LML -destination 'platform=iOS Simulator,name=iPhone 16 Plus' build

# 2. Test guest checkout with real email
# Use: mats.parild@gmail.com (your email)

# 3. Monitor backend logs
# Look for: "🎭 Guest session endpoint hit"
```

### **Step 2: Database Verification**
```sql
-- Check guest user creation
SELECT id, email, name, role, created_at 
FROM users 
WHERE email = 'mats.parild@gmail.com'
ORDER BY created_at DESC;

-- Check Hamilton seats availability
SELECT section_id, status, COUNT(*) 
FROM seats 
WHERE show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e' 
GROUP BY section_id, status;
```

### **Step 3: API Health Check**
```bash
# Test all auth endpoints
curl -X GET http://192.168.68.79:3001/api/auth/guest
curl -X POST http://192.168.68.79:3001/api/auth/guest \
  -H "Content-Type: application/json" \
  -d '{"email": "health.check@test.com", "deviceInfo": {"platform": "iOS"}}'
```

---

## 📈 **SUCCESS METRICS**

### **✅ Guest Flow Success**
- ✅ Email modal appears for non-authenticated users
- ✅ Guest session created without errors
- ✅ PaymentSheet loads with Stripe branding
- ✅ Payment completes successfully
- ✅ QR code generated on success page
- ✅ Guest user created in database

### **✅ Registered User Success**
- ✅ No email prompt for logged-in users
- ✅ Direct payment flow
- ✅ Tickets saved to user account
- ✅ Offline ticket access

### **✅ Database Integrity**
- ✅ User records created properly
- ✅ Seat reservations linked correctly
- ✅ Payment records associated
- ✅ Guest sessions tracked

---

## 🔄 **NEXT PHASES**

### **Phase 2: Offline Tickets (After Guest Fix)**
- Implement Core Data storage
- Sync tickets after login/signup
- QR code state management
- Apple Maps venue integration

### **Phase 3: Advanced Features**
- Push notifications for show reminders
- Apple Wallet PassKit integration
- Social sharing of tickets
- Venue check-in flow

---

## 📞 **SUPPORT CONTACTS**

**For Testing Issues:**
- Backend Logs: Check Railway dashboard
- iOS Issues: Xcode console + device logs
- Payment Issues: Stripe dashboard test mode
- Database Issues: Railway PostgreSQL logs

**Test Data Reset:**
```sql
-- Clear test guest users (if needed)
DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%guest%';

-- Reset seat availability (if needed)
UPDATE seats SET status = 'available' WHERE show_id = '81447867-94ac-47b1-96cf-d70d3d5ad02e';
``` 