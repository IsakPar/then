# 🔐 **Venue-Specific Authentication Migration Plan**

## 🎯 **Implementation Overview**

This migration replaces hardcoded venue passwords with a secure, database-driven authentication system where each user account is tied to specific venue(s) and roles.

---

## 📋 **Migration Steps**

### **Phase 1: Database Setup** ⚙️
```bash
# 1. Run the database migration
psql -d your_database -f src/lib/db/venue-auth-schema.sql

# 2. Verify sample accounts created
psql -d your_database -c "
SELECT email, name, v.slug as venue_slug, uv.role 
FROM users u 
JOIN user_venues uv ON u.id = uv.user_id 
JOIN venues v ON uv.venue_id = v.id 
WHERE u.role = 'venue';"
```

**Expected Output:**
```
criterion_validation@lastminutelive.com | Criterion Door Staff    | criterion-theatre    | validator
phantom_manager@lastminutelive.com      | Phantom Theatre Manager | phantom-opera-house  | manager  
victoria_admin@lastminutelive.com       | Victoria Palace Admin   | victoria-palace      | admin
```

### **Phase 2: API Migration** 🔄
```typescript
// Before (Hardcoded)
const VENUE_CREDENTIALS = [
  { slug: 'criterion', password: 'hardcoded123', permissions: ['view', 'edit'] }
]

// After (Database-driven)
const authResult = await authenticateVenueStaff(email, password, venueSlug)
// Returns: { userId, venueSlug, role, permissions[] }
```

### **Phase 3: Route Protection** 🛡️
```typescript
// NEW: Venue-specific route protection
import { validateVenueAccess } from '@/lib/venue-auth-new'

// In /venue/[slug]/page.tsx
export default function VenueSlugPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  
  useEffect(() => {
    async function checkAccess() {
      const { authorized, error } = await validateVenueAccess(slug)
      
      if (!authorized) {
        router.push('/venue-login?error=' + encodeURIComponent(error))
        return
      }
      
      // User authorized for this specific venue
      loadVenueData()
    }
    
    checkAccess()
  }, [slug])
}
```

---

## 🔑 **New Authentication Flow**

### **1. Login Process**
```typescript
// User credentials
const credentials = {
  email: 'criterion_validation@lastminutelive.com',
  password: 'Criterion2024!',
  venueSlug: 'criterion-theatre' // Optional - will validate access
}

// Database lookup
const auth = await authenticateVenueStaff(email, password, venueSlug)
// Returns: { success: true, venueSlug: 'criterion-theatre', role: 'validator', permissions: ['validate_tickets', 'view_door_list'] }

// Session creation
const sessionToken = await createVenueSession(auth)
// Creates database session with 8-hour expiry

// Cookie storage
cookies.set('venue-session', sessionToken, { httpOnly: true, path: '/venue' })
```

### **2. Route Access Validation**
```typescript
// Every venue route checks access
const session = await getVenueAuth() // Gets from DB using session token
// Returns: { userId, venueSlug: 'criterion-theatre', role: 'validator', permissions: [] }

// Venue restriction enforcement
if (requiredVenueSlug !== session.venueSlug) {
  throw new Error('Access denied - wrong venue')
}

// Permission check
if (!session.permissions.includes('manage_shows')) {
  throw new Error('Insufficient permissions')
}
```

---

## 🏗️ **Role & Permission System**

### **Venue Roles:**
- **`validator`**: Door staff - can only validate tickets
- **`manager`**: Venue management - can create shows, view reports
- **`admin`**: Full control - can manage users, settings, data export

### **Permission Mapping:**
```sql
-- Validator permissions
'validate_tickets'    -- Can scan QR codes at door
'view_door_list'      -- Can see today's booking list

-- Manager permissions (includes validator + more)
'validate_tickets', 'view_door_list'
'view_reports'        -- Can see sales/booking reports  
'manage_shows'        -- Can create/edit/cancel shows
'view_analytics'      -- Can see performance metrics

-- Admin permissions (includes manager + more)  
'validate_tickets', 'view_door_list', 'view_reports', 'manage_shows', 'view_analytics'
'manage_users'        -- Can add/remove venue staff
'manage_settings'     -- Can modify venue settings
'export_data'         -- Can export venue data
```

---

## 🚀 **Example Implementation**

### **1. Create Venue Staff Account**
```typescript
import { createVenueStaffAccount } from '@/lib/db/venue-auth-queries'

// Create new venue validator
const result = await createVenueStaffAccount(
  'criterion_door_2@lastminutelive.com',
  'SecurePassword123!',
  'Criterion Door Staff #2', 
  'criterion-theatre',
  'validator'
)

if (result.success) {
  console.log(`✅ Created staff account: ${result.userId}`)
} else {
  console.error(`❌ Failed: ${result.error}`)
}
```

### **2. Venue-Specific Route Protection**
```typescript
// src/app/venue/[slug]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { validateVenueAccess } from '@/lib/venue-auth-new'

export default function VenueSlugPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    async function checkVenueAccess() {
      try {
        const { authorized, session, error } = await validateVenueAccess(slug)
        
        if (!authorized) {
          console.log(`🚫 Access denied to ${slug}: ${error}`)
          router.push(`/venue-login?error=${encodeURIComponent(error || 'Access denied')}`)
          return
        }

        console.log(`✅ Access granted to ${slug} for user: ${session?.role}`)
        setAuthorized(true)
        setSession(session)
        
      } catch (error) {
        console.error('Venue access check failed:', error)
        router.push('/venue-login?error=Access validation failed')
      } finally {
        setLoading(false)
      }
    }

    checkVenueAccess()
  }, [slug, router])

  if (loading) {
    return <div>Validating venue access...</div>
  }

  if (!authorized) {
    return <div>Access denied</div>
  }

  return (
    <div>
      <h1>Welcome to {slug}</h1>
      <p>Role: {session?.role}</p>
      <p>Permissions: {session?.permissions.join(', ')}</p>
      
      {/* Your venue dashboard content */}
    </div>
  )
}
```

### **3. Permission-Gated Components**
```typescript
// src/components/VenuePermissionGate.tsx
interface PermissionGateProps {
  children: React.ReactNode
  requiredPermission: string
  fallback?: React.ReactNode
}

export function VenuePermissionGate({ children, requiredPermission, fallback }: PermissionGateProps) {
  const [hasPermission, setHasPermission] = useState(false)
  
  useEffect(() => {
    async function checkPermission() {
      const session = await getVenueAuth()
      const allowed = session?.permissions.includes(requiredPermission) || false
      setHasPermission(allowed)
    }
    checkPermission()
  }, [requiredPermission])

  if (!hasPermission) {
    return fallback || <div>Insufficient permissions</div>
  }

  return <>{children}</>
}

// Usage in components
<VenuePermissionGate requiredPermission="manage_shows">
  <CreateShowButton />
</VenuePermissionGate>

<VenuePermissionGate requiredPermission="validate_tickets">
  <QRCodeScanner />
</VenuePermissionGate>
```

---

## 🔒 **Security Features**

### **1. Venue Isolation**
- ✅ Users can **ONLY** access their assigned venue
- ✅ `criterion_validation` cannot access `/venue/phantom-opera-house`
- ✅ Direct URL access blocked with automatic redirect

### **2. Session Security**
- ✅ Database-backed sessions with expiration
- ✅ IP address and user agent tracking
- ✅ Automatic session cleanup on logout
- ✅ Session invalidation on password change

### **3. Audit Trail**
- ✅ All login attempts logged
- ✅ Failed access attempts tracked
- ✅ Session activity monitoring
- ✅ Permission usage logging

---

## 📊 **Testing the Migration**

### **1. Test Sample Accounts**
```bash
# Test Criterion validator
curl -X POST http://localhost:3000/api/venue-auth-new \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "email": "criterion_validation@lastminutelive.com", 
    "password": "Criterion2024!",
    "venueSlug": "criterion-theatre"
  }'

# Expected: Success with validator permissions
# Expected: Access denied to other venues
```

### **2. Test Venue Restrictions**
```bash
# Login as Criterion user
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/venue-auth-new ...)

# Try to access Phantom venue (should fail)
curl -H "Cookie: venue-session=TOKEN" \
  http://localhost:3000/venue/phantom-opera-house

# Expected: 403 Access Denied with redirect to criterion-theatre
```

### **3. Test Permission Boundaries**
```bash
# Login as validator (limited permissions)
# Try to access show management (should fail)
# Try to access user management (should fail)
# Try to validate tickets (should succeed)
```

---

## 🚀 **Deployment Checklist**

### **Pre-deployment:**
- [ ] Database migration executed
- [ ] Sample accounts tested
- [ ] Environment variables set
- [ ] Backup current system

### **Environment Variables:**
```bash
# Add to .env
VENUE_MASTER_PASSWORD=emergency_admin_password_2024
ENABLE_MASTER_ADMIN=false  # Disable in production
DATABASE_URL=postgresql://...
```

### **Rollback Plan:**
- Keep old authentication system as `venue-auth-legacy.ts`
- Feature flag to switch between systems
- Database rollback scripts prepared

---

## 🎯 **Success Metrics**

### **Immediate Validation:**
- ✅ `criterion_validation` can ONLY access Criterion Theatre
- ✅ Login with wrong venue fails gracefully  
- ✅ Permissions are enforced at component level
- ✅ Sessions persist across page reloads
- ✅ Logout clears all session data

### **Security Verification:**
- ✅ No hardcoded credentials in source code
- ✅ All venue access logged and auditable
- ✅ Session tokens are cryptographically secure
- ✅ Failed login attempts are rate-limited
- ✅ Expired sessions are automatically cleaned up

---

This migration provides **true venue isolation** with **granular permission control**, replacing the insecure hardcoded system with a production-ready, scalable authentication architecture. 🔐✨ 