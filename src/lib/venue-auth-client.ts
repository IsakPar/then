// Client-side venue authentication utilities

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

export interface AuthResult {
  success: boolean
  venueSlug?: string
  permissions?: string[]
  isMasterAdmin?: boolean
  error?: string
}

// Get venue credentials for client-side display
export function getVenueCredentials(): VenueCredentials[] {
  return VENUE_CREDENTIALS
}

export function checkVenuePermission(auth: AuthResult | null, requiredPermission: string): boolean {
  if (!auth || !auth.success) return false
  if (auth.isMasterAdmin) return true
  return auth.permissions?.includes(requiredPermission) || false
} 