# 🎭 **USER AUTHENTICATION & TICKETS SYSTEM PLAN**

## 📋 **EXECUTIVE SUMMARY**

This plan implements a smart authentication and offline ticketing system that:
- Detects user login status during booking
- Creates guest accounts for non-authenticated users
- Provides offline ticket access with intelligent storage management
- Integrates Apple Maps for venue navigation
- Implements a four-state QR code validation system

---

## 🔐 **SMART AUTHENTICATION FLOW**

### **Dynamic Booking Experience**
```
┌─────────────────────────────────────┐
│  SEAT SELECTION COMPLETE            │
├─────────────────────────────────────┤
│  ✅ Logged In User:                 │
│     → Direct to Payment             │
│     → Auto-save to Tickets Tab     │
│                                    │
│  🔍 Guest User:                    │
│     → Email Required for Booking   │
│     → Create Guest Account         │
│     → Show Signup Prompt on Success│
└─────────────────────────────────────┘
```

### **Guest-to-User Conversion Flow**
1. **Guest Checkout**: Email required → Guest account created
2. **Payment Success**: Show signup/login prompt with benefits
3. **Conversion**: If they signup/login → Transfer guest tickets to real account
4. **Offline Storage**: Tickets sync to device for offline access

---

## 🗄️ **DATABASE SCHEMA**

### **Enhanced Users Table**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- nullable for guest accounts
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  account_type VARCHAR(20) DEFAULT 'guest', -- 'guest', 'registered', 'premium'
  email_verified BOOLEAN DEFAULT false,
  guest_session_id VARCHAR(255), -- for guest account tracking
  auth_provider VARCHAR(50) DEFAULT 'email',
  created_at TIMESTAMP DEFAULT now(),
  converted_at TIMESTAMP, -- when guest became registered user
  last_login TIMESTAMP
);
```

### **Enhanced Bookings Table**
```sql
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  show_id UUID REFERENCES shows(id) ON DELETE CASCADE,
  booking_reference VARCHAR(20) UNIQUE NOT NULL,
  payment_intent_id VARCHAR(255),
  total_amount INTEGER NOT NULL,
  booking_status VARCHAR(20) DEFAULT 'confirmed',
  seats_count INTEGER NOT NULL,
  booking_date TIMESTAMP DEFAULT now(),
  qr_code_data VARCHAR(500),
  qr_code_status VARCHAR(20) DEFAULT 'valid', -- 'valid', 'used', 'invalid', 'expired'
  last_qr_check TIMESTAMP, -- when QR was last validated
  venue_coordinates JSONB, -- lat/lng for Apple Maps
  guest_session_id VARCHAR(255), -- for guest bookings
  converted_to_user_id UUID, -- if guest account was converted
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### **QR Code Status Tracking**
```sql
CREATE TABLE qr_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  qr_code_data VARCHAR(500) NOT NULL,
  validation_status VARCHAR(20) NOT NULL, -- 'admit', 'wrong_date', 'invalid', 'already_used'
  validation_timestamp TIMESTAMP DEFAULT now(),
  venue_scanner_id VARCHAR(100), -- which device/gate scanned it
  show_date DATE NOT NULL,
  attempted_entry_time TIMESTAMP,
  notes TEXT
);
```

### **Local Ticket Storage**
```sql
CREATE TABLE local_tickets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  booking_data JSONB NOT NULL, -- complete ticket info
  qr_code_status VARCHAR(20) DEFAULT 'valid',
  last_sync TIMESTAMP DEFAULT now(),
  is_offline_available BOOLEAN DEFAULT true,
  storage_size_bytes INTEGER -- for storage management
);
```

### **Guest Session Tracking**
```sql
CREATE TABLE guest_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT now(),
  converted_at TIMESTAMP, -- when became registered user
  expires_at TIMESTAMP NOT NULL
);
```

---

## 🎫 **OFFLINE TICKETS SYSTEM**

### **Four-State QR Code System**
- ✅ **ADMIT**: Green badge, ready for entry
- ⚠️ **WRONG DATE**: Yellow badge, valid but not today  
- ❌ **INVALID**: Red badge, corrupted/fake ticket
- 🚫 **ALREADY USED**: Gray badge, entry completed

### **Smart Storage Management**
- **Keep Offline**: Upcoming events with valid QR codes
- **Sync Only**: Past events (fetch on demand)
- **Remove**: Used QR codes, expired tickets
- **Compress**: Event images, reduce data size

### **Apple Maps Integration**
```json
{
  "venue": {
    "name": "Victoria Palace Theatre",
    "address": "Victoria St, London SW1E 5EA",
    "coordinates": {
      "latitude": 51.4965,
      "longitude": -0.1367
    },
    "apple_maps_url": "maps://?daddr=51.4965,-0.1367"
  }
}
```

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: Smart Auth Flow** *(Week 1)*

#### **Deliverables:**
- [ ] Auth detection system in checkout flow
- [ ] Guest account creation API endpoints
- [ ] Email collection modal for non-authenticated users
- [ ] Basic session management with JWT tokens
- [ ] Database schema implementation

#### **Technical Tasks:**
1. Create database tables (users, guest_sessions)
2. Implement auth detection in `HamiltonSeatMapView`
3. Build guest email collection component
4. Create guest account API endpoints
5. Update checkout flow with auth branching

#### **Success Metrics:**
- ✅ 100% of bookings require email (guest or authenticated)
- ✅ Auth detection works correctly in 100% of cases
- ✅ Guest accounts created successfully for all non-auth users
- ✅ Zero authentication errors during checkout

---

### **Phase 2: Booking Integration** *(Week 2)*

#### **Deliverables:**
- [ ] Link Stripe payments to user/guest accounts
- [ ] Create booking records after successful payment
- [ ] Guest-to-user conversion system
- [ ] Basic ticket display in TicketsView
- [ ] QR code generation for bookings

#### **Technical Tasks:**
1. Update `handlePaymentResult` to save booking data
2. Create bookings and booked_seats tables
3. Implement guest conversion flow
4. Build basic TicketsView with user's bookings
5. Generate QR codes for venue entry

#### **Success Metrics:**
- ✅ 100% of successful payments create booking records
- ✅ Guest-to-user conversion rate > 30%
- ✅ All tickets display correctly in TicketsView
- ✅ QR codes generated for 100% of bookings

---

### **Phase 3: Offline Storage System** *(Week 3)*

#### **Deliverables:**
- [ ] Local ticket storage implementation
- [ ] Smart sync system with QR status checking
- [ ] Offline ticket access in TicketsView
- [ ] Storage cleanup and optimization
- [ ] Apple Maps integration for venues

#### **Technical Tasks:**
1. Implement local_tickets table and sync logic
2. Create QR status validation system
3. Build offline ticket viewing capability
4. Implement storage cleanup algorithms
5. Add Apple Maps links to ticket details

#### **Success Metrics:**
- ✅ Tickets accessible offline 100% of the time
- ✅ Storage usage stays under 10MB limit
- ✅ QR status sync accuracy > 99%
- ✅ Apple Maps integration works for all venues

---

### **Phase 4: Enhanced Features** *(Week 4)*

#### **Deliverables:**
- [ ] Advanced QR validation with four states
- [ ] Conversion prompts on payment success
- [ ] Push notifications for show reminders
- [ ] Performance optimization
- [ ] Comprehensive testing suite

#### **Technical Tasks:**
1. Implement qr_validations table and logic
2. Create conversion prompt component
3. Add push notification system
4. Optimize database queries and app performance
5. Write comprehensive test coverage

#### **Success Metrics:**
- ✅ QR validation accuracy > 99.5%
- ✅ App performance: <2s load times
- ✅ Push notification delivery rate > 95%
- ✅ Zero critical bugs in production

---

## 📊 **OVERALL SUCCESS METRICS**

### **User Experience**
- ✅ **Seamless Checkout**: Auth detection works 100% of cases
- ✅ **Offline Access**: Tickets available without internet
- ✅ **Conversion Rate**: >30% guest-to-user conversion
- ✅ **User Retention**: Users return for future bookings

### **Technical Performance**
- ✅ **Payment Integration**: 100% of payments create tickets
- ✅ **Data Accuracy**: QR codes work correctly at venues
- ✅ **Storage Efficiency**: <10MB storage per user
- ✅ **App Stability**: <1% crash rate

### **Business Impact**
- ✅ **User Registration**: Increase registered user base
- ✅ **Repeat Purchases**: Higher customer lifetime value
- ✅ **Venue Operations**: Faster entry with QR codes
- ✅ **Customer Satisfaction**: Offline ticket access

---

## 🎯 **GUEST CONVERSION STRATEGY**

### **Success Page Conversion Prompt**
```
┌─────────────────────────────────────┐
│  🎉 Payment Successful!            │
├─────────────────────────────────────┤
│  Your tickets are ready!           │
│                                    │
│  💡 Save tickets offline?          │
│  Sign up or log in to:             │
│  • Access tickets offline          │
│  • Get arrival reminders           │
│  • View all your bookings          │
│                                    │
│  [Sign Up] [Log In] [Continue]     │
│                                    │
│  ⚠️ As guest: tickets only in email│
└─────────────────────────────────────┘
```

### **Conversion Benefits**
- ✅ **Offline Access**: No internet needed for tickets
- ✅ **Smart Reminders**: Show notifications
- ✅ **Easy Rebooking**: Faster future purchases
- ✅ **Ticket History**: Never lose your tickets

---

## 🔄 **QR CODE LIFECYCLE**

### **State Management**
```javascript
const QR_STATES = {
  ADMIT: {
    color: 'green',
    icon: '✅',
    message: 'Ready for entry',
    allowEntry: true
  },
  WRONG_DATE: {
    color: 'yellow', 
    icon: '⚠️',
    message: 'Valid ticket, wrong date',
    allowEntry: false
  },
  INVALID: {
    color: 'red',
    icon: '❌', 
    message: 'Invalid ticket',
    allowEntry: false
  },
  ALREADY_USED: {
    color: 'gray',
    icon: '🚫',
    message: 'Entry completed',
    allowEntry: false
  }
}
```

### **Storage Cleanup Logic**
- Remove used tickets after 24 hours
- Remove invalid tickets immediately
- Keep wrong_date tickets until show date passes
- Compress old event data after 30 days

---

## 🛡️ **SECURITY & PRIVACY**

### **Data Protection**
- ✅ **Password Hashing**: bcrypt with salt
- ✅ **JWT Tokens**: Short-lived access tokens
- ✅ **Local Encryption**: Secure offline storage
- ✅ **API Security**: Rate limiting and validation

### **Guest Privacy**
- ✅ **Minimal Data**: Only email required for guests
- ✅ **Session Expiry**: Guest sessions auto-expire
- ✅ **Data Cleanup**: Remove unused guest accounts
- ✅ **GDPR Compliance**: User data deletion rights

---

## 🎉 **READY TO BEGIN IMPLEMENTATION**

This plan provides a comprehensive roadmap for building an intelligent, user-friendly authentication and ticketing system. The phased approach ensures steady progress with measurable success metrics at each stage.

**Let's start with Phase 1: Smart Auth Flow!** 🚀 