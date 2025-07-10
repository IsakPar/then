import { NextRequest, NextResponse } from 'next/server'
import { authenticateVenueAccess, setVenueAuthCookie, clearVenueAuth, getVenueAuth } from '@/lib/venue-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { password, venueSlug, action } = body

    if (action === 'logout') {
      await clearVenueAuth()
      return NextResponse.json({ success: true, message: 'Logged out successfully' })
    }

    if (action === 'login') {
      if (!password) {
        return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 })
      }

      const authResult = await authenticateVenueAccess(password, venueSlug)
      
      if (authResult.success) {
        await setVenueAuthCookie(authResult)
        return NextResponse.json({
          success: true,
          venueSlug: authResult.venueSlug,
          permissions: authResult.permissions,
          isMasterAdmin: authResult.isMasterAdmin,
          message: 'Authentication successful'
        })
      } else {
        return NextResponse.json({ success: false, error: authResult.error }, { status: 401 })
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('❌ Venue auth error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getVenueAuth()
    
    if (auth) {
      return NextResponse.json({
        success: true,
        authenticated: true,
        venueSlug: auth.venueSlug,
        permissions: auth.permissions,
        isMasterAdmin: auth.isMasterAdmin
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