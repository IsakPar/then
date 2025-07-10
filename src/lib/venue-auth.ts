import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// Define venue credentials - in production these should be in a database
interface VenueCredentials {
  slug: string
  password: string
  permissions: string[]
}

// Default venue credentials - these should be moved to environment variables or database
const VENUE_CREDENTIALS: VenueCredentials[] = [
  {
    slug: 'victoria-palace',
    password: 'hamilton2024!',
    permissions: ['view', 'edit', 'manage']
  },
  {
    slug: 'phantom-opera-house',
    password: 'phantom2024!',
    permissions: ['view', 'edit', 'manage']
  },
  {
    slug: 'west-end-palace',
    password: 'westend2024!',
    permissions: ['view', 'edit', 'manage']
  }
]

// Master admin password for all venues
const MASTER_ADMIN_PASSWORD = process.env.VENUE_MASTER_PASSWORD || 'admin2024master!'

export interface AuthResult {
  success: boolean
  venueSlug?: string
  permissions?: string[]
  isMasterAdmin?: boolean
  error?: string
}

export async function authenticateVenueAccess(password: string, venueSlug?: string): Promise<AuthResult> {
  // Check master admin password first
  if (password === MASTER_ADMIN_PASSWORD) {
    return {
      success: true,
      venueSlug: venueSlug || 'all',
      permissions: ['view', 'edit', 'manage', 'admin'],
      isMasterAdmin: true
    }
  }

  // Check venue-specific password
  if (venueSlug) {
    const venueCredentials = VENUE_CREDENTIALS.find(vc => vc.slug === venueSlug)
    if (venueCredentials && venueCredentials.password === password) {
      return {
        success: true,
        venueSlug,
        permissions: venueCredentials.permissions
      }
    }
  }

  // Check if password matches any venue (for general access)
  const matchingVenue = VENUE_CREDENTIALS.find(vc => vc.password === password)
  if (matchingVenue) {
    return {
      success: true,
      venueSlug: matchingVenue.slug,
      permissions: matchingVenue.permissions
    }
  }

  return {
    success: false,
    error: 'Invalid password or venue access denied'
  }
}

export async function setVenueAuthCookie(authResult: AuthResult) {
  if (!authResult.success) return

  const cookieStore = await cookies()
  const authData = {
    venueSlug: authResult.venueSlug,
    permissions: authResult.permissions,
    isMasterAdmin: authResult.isMasterAdmin,
    timestamp: Date.now()
  }

  cookieStore.set('venue-auth', JSON.stringify(authData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8 // 8 hours
  })
}

export async function getVenueAuth(): Promise<AuthResult | null> {
  try {
    const cookieStore = await cookies()
    const authCookie = cookieStore.get('venue-auth')
    
    if (!authCookie) return null

    const authData = JSON.parse(authCookie.value)
    
    // Check if auth is expired (8 hours)
    if (Date.now() - authData.timestamp > 8 * 60 * 60 * 1000) {
      return null
    }

    return {
      success: true,
      venueSlug: authData.venueSlug,
      permissions: authData.permissions,
      isMasterAdmin: authData.isMasterAdmin
    }
  } catch (error) {
    return null
  }
}

export async function clearVenueAuth() {
  const cookieStore = await cookies()
  cookieStore.delete('venue-auth')
}

export function checkVenuePermission(auth: AuthResult | null, requiredPermission: string): boolean {
  if (!auth || !auth.success) return false
  if (auth.isMasterAdmin) return true
  return auth.permissions?.includes(requiredPermission) || false
}

// Get venue credentials for management
export function getVenueCredentials(): VenueCredentials[] {
  return VENUE_CREDENTIALS
}

// Add new venue credentials (for future database integration)
export async function addVenueCredentials(slug: string, password: string, permissions: string[]): Promise<boolean> {
  // This would be a database operation in production
  VENUE_CREDENTIALS.push({ slug, password, permissions })
  return true
}

// Update venue credentials
export async function updateVenueCredentials(slug: string, password?: string, permissions?: string[]): Promise<boolean> {
  const index = VENUE_CREDENTIALS.findIndex(vc => vc.slug === slug)
  if (index === -1) return false

  if (password) VENUE_CREDENTIALS[index].password = password
  if (permissions) VENUE_CREDENTIALS[index].permissions = permissions
  return true
}

// Delete venue credentials
export async function deleteVenueCredentials(slug: string): Promise<boolean> {
  const index = VENUE_CREDENTIALS.findIndex(vc => vc.slug === slug)
  if (index === -1) return false

  VENUE_CREDENTIALS.splice(index, 1)
  return true
} 