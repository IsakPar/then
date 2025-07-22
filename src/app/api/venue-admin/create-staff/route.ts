import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createVenueStaffAccount } from '@/lib/db/venue-auth-queries'
import { getVenueAuth } from '@/lib/venue-auth-new'
import { 
  performSecurityCheck, 
  recordFailedAttempt, 
  resetRateLimit,
  logSecurityEvent 
} from '@/lib/venue-security'

// ============================================================================
// SECURE VENUE STAFF CREATION API
// ⚠️ WEB-ONLY: This endpoint is restricted to web app administrators only
// ============================================================================

interface CreateStaffRequest {
  email: string
  password: string
  name: string
  venueSlug: string
  role: 'validator' | 'manager' | 'admin'
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting and logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'

    // COMPREHENSIVE SECURITY CHECK
    const securityCheck = performSecurityCheck(request, 'create_staff', clientIP)
    
    if (!securityCheck.allowed) {
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
        origin: request.headers.get('origin') || undefined,
        operation: 'create_staff',
        reason: securityCheck.reason
      })

      recordFailedAttempt(clientIP, 'create_staff')
      
      return NextResponse.json(
        { 
          success: false, 
          error: securityCheck.reason 
        },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      )
    }

    // AUTHENTICATION CHECK: Verify admin authentication
    const venueAuth = await getVenueAuth()
    if (!venueAuth || !venueAuth.permissions?.includes('manage_users')) {
      console.log('🚨 SECURITY: Unauthorized venue staff creation attempt')
      
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
        operation: 'create_staff',
        reason: 'Missing admin authentication or manage_users permission'
      })

      recordFailedAttempt(clientIP, 'create_staff')
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Administrator authentication required to create venue staff accounts.' 
        },
        { 
          status: 401,
          headers: securityCheck.headers 
        }
      )
    }

    // Parse and validate request
    const body: CreateStaffRequest = await request.json()
    const { email, password, name, venueSlug, role } = body

    if (!email || !password || !name || !venueSlug || !role) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'All fields are required: email, password, name, venueSlug, role' 
        },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['validator', 'manager', 'admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid role. Must be validator, manager, or admin.' 
        },
        { status: 400 }
      )
    }

    // SECURITY CHECK #4: Only admin can create admin accounts
    if (role === 'admin' && venueAuth.role !== 'admin') {
      console.log(`🚨 SECURITY: Non-admin attempted to create admin account: ${email}`)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Only venue administrators can create admin accounts.' 
        },
        { status: 403 }
      )
    }

    // SECURITY CHECK #5: Ensure creating for authorized venue only
    if (venueAuth.venueSlug !== venueSlug) {
      console.log(`🚨 SECURITY: Attempted to create staff for unauthorized venue: ${venueSlug}`)
      return NextResponse.json(
        { 
          success: false, 
          error: 'You can only create staff accounts for your authorized venue.' 
        },
        { status: 403 }
      )
    }

    console.log(`🔐 ADMIN: Creating venue staff account: ${email} for ${venueSlug} with role: ${role}`)

    // Create the venue staff account
    const result = await createVenueStaffAccount(email, password, name, venueSlug, role)

    if (result.success) {
      console.log(`✅ ADMIN: Successfully created venue staff account: ${email}`)
      
      // Reset rate limiting on successful creation
      resetRateLimit(clientIP, 'create_staff')
      
      return NextResponse.json({
        success: true,
        userId: result.userId,
        message: `Venue staff account created successfully for ${email}`
      }, {
        headers: securityCheck.headers
      })
    } else {
      console.error(`❌ ADMIN: Failed to create venue staff account: ${result.error}`)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to create venue staff account' 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Venue staff creation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error during account creation' 
      },
      { status: 500 }
    )
  }
}

// Block all other HTTP methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to create venue staff accounts.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to create venue staff accounts.' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to create venue staff accounts.' },
    { status: 405 }
  )
} 