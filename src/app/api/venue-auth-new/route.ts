import { NextRequest, NextResponse } from 'next/server'
import { 
  authenticateVenueAccess, 
  setVenueAuthCookie, 
  clearVenueAuth, 
  getVenueAuth 
} from '@/lib/venue-auth-new'

// ============================================================================
// NEW VENUE AUTHENTICATION API
// Replaces hardcoded credentials with database-driven authentication
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, venueSlug, action } = body

    // Handle logout
    if (action === 'logout') {
      await clearVenueAuth()
      return NextResponse.json({ 
        success: true, 
        message: 'Logged out successfully' 
      })
    }

    // Handle login
    if (action === 'login') {
      if (!email || !password) {
        return NextResponse.json({ 
          success: false, 
          error: 'Email and password are required' 
        }, { status: 400 })
      }

      console.log(`🔐 NEW AUTH: Login attempt for ${email} at venue: ${venueSlug || 'any'}`);

      // Authenticate with database
      const authResult = await authenticateVenueAccess(email, password, venueSlug)
      
      if (!authResult.success) {
        console.log(`❌ Authentication failed: ${authResult.error}`);
        return NextResponse.json({ 
          success: false, 
          error: authResult.error || 'Authentication failed' 
        }, { status: 401 })
      }

      // Create secure session
      const sessionCreated = await setVenueAuthCookie(authResult, request)
      
      if (!sessionCreated) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create session' 
        }, { status: 500 })
      }

      console.log(`✅ Authentication successful for: ${email} at ${authResult.venueSlug}`);

      return NextResponse.json({
        success: true,
        userId: authResult.userId,
        venueSlug: authResult.venueSlug,
        venueId: authResult.venueId,
        role: authResult.role,
        permissions: authResult.permissions,
        message: 'Authentication successful'
      })
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 })

  } catch (error) {
    console.error('❌ Venue auth API error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getVenueAuth()
    
    if (session) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        userId: session.userId,
        venueSlug: session.venueSlug,
        venueId: session.venueId,
        role: session.role,
        permissions: session.permissions,
        expiresAt: session.expiresAt
      })
    } else {
      return NextResponse.json({
        success: true,
        authenticated: false
      })
    }
  } catch (error) {
    console.error('❌ Get venue auth error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check authentication' },
      { status: 500 }
    )
  }
} 