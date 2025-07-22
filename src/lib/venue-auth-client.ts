// ============================================================================
// LEGACY VENUE AUTH CLIENT - DEPRECATED
// This file has been replaced by venue-auth-new.ts
// No hardcoded credentials - all authentication is database-driven
// ============================================================================

interface VenueCredentials {
  slug: string
  password: string
  permissions: string[]
}

// REMOVED: All hardcoded credentials have been migrated to database
const VENUE_CREDENTIALS: VenueCredentials[] = []

export interface AuthResult {
  success: boolean
  venueSlug?: string
  permissions?: string[]
  isMasterAdmin?: boolean
  error?: string
}

// DEPRECATED: Use venue-auth-new.ts instead
export function getVenueCredentials(): VenueCredentials[] {
  console.warn('⚠️ DEPRECATED: getVenueCredentials() - Use venue-auth-new.ts for secure authentication')
  return []
}

export function checkVenuePermission(auth: AuthResult | null, requiredPermission: string): boolean {
  console.warn('⚠️ DEPRECATED: checkVenuePermission() - Use venue-auth-new.ts for secure authentication')
  return false
} 