import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { 
  authenticateVenueStaff, 
  createVenueSession, 
  getVenueSession, 
  clearVenueSession,
  checkVenuePermission,
  type VenueAuthResult,
  type VenueSession,
  type VenueRole
} from './db/venue-auth-queries'

// ============================================================================
// TYPES
// ============================================================================

export interface NewAuthResult {
  success: boolean
  userId?: string
  venueSlug?: string
  venueId?: string  
  role?: VenueRole
  permissions?: string[]
  sessionToken?: string
  error?: string
}

export interface SessionData {
  userId: string
  venueSlug: string
  venueId: string
  role: VenueRole
  permissions: string[]
  sessionToken: string
  expiresAt: Date
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * NEW: Authenticate venue staff with email/password
 * Replaces the hardcoded password authentication
 */
export async function authenticateVenueAccess(
  email: string, 
  password: string,
  venueSlug?: string
): Promise<NewAuthResult> {
  
  console.log(`🔐 NEW AUTH: Authenticating ${email} for venue: ${venueSlug || 'any'}`);

  // Use database authentication instead of hardcoded passwords
  const authResult = await authenticateVenueStaff(email, password, venueSlug);
  
  if (!authResult.success) {
    return {
      success: false,
      error: authResult.error || 'Authentication failed'
    };
  }

  return {
    success: true,
    userId: authResult.userId,
    venueSlug: authResult.venueSlug,
    venueId: authResult.venueId,
    role: authResult.role,
    permissions: authResult.permissions
  };
}

/**
 * NEW: Set secure venue session cookie with database session
 */
export async function setVenueAuthCookie(
  authResult: NewAuthResult,
  request?: NextRequest
): Promise<boolean> {
  if (!authResult.success) return false;

  try {
    // Get client info for session tracking
    const ipAddress = request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || 'unknown';
    const userAgent = request?.headers.get('user-agent') || 'unknown';

    // Create database session
    const sessionToken = await createVenueSession(authResult, ipAddress, userAgent);
    
    if (!sessionToken) {
      console.error('❌ Failed to create venue session');
      return false;
    }

    // Set secure cookie with session token only
    const cookieStore = await cookies();
    cookieStore.set('venue-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/venue' // Only send cookie on venue routes
    });

    console.log(`✅ Created secure venue session for: ${authResult.venueSlug}`);
    return true;

  } catch (error) {
    console.error('❌ Error setting venue auth cookie:', error);
    return false;
  }
}

/**
 * NEW: Get current venue session from database
 */
export async function getVenueAuth(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('venue-session');
    
    if (!sessionCookie?.value) {
      return null;
    }

    // Get session from database
    const session = await getVenueSession(sessionCookie.value);
    
    if (!session) {
      // Clear invalid cookie
      cookieStore.delete('venue-session');
      return null;
    }

    return {
      userId: session.userId,
      venueSlug: session.venueSlug,
      venueId: session.venueId,
      role: session.role,
      permissions: session.permissions,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt
    };

  } catch (error) {
    console.error('❌ Error getting venue auth:', error);
    return null;
  }
}

/**
 * NEW: Clear venue session from database and cookie
 */
export async function clearVenueAuth(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('venue-session');
    
    if (sessionCookie?.value) {
      // Clear from database
      await clearVenueSession(sessionCookie.value);
    }
    
    // Clear cookie
    cookieStore.delete('venue-session');
    
  } catch (error) {
    console.error('❌ Error clearing venue auth:', error);
  }
}

/**
 * NEW: Check venue permission with venue restrictions
 */
export async function checkVenuePermissionNew(
  requiredPermission: string,
  requiredVenueSlug?: string
): Promise<boolean> {
  try {
    const session = await getVenueAuth();
    
    if (!session) {
      console.log('❌ No venue session found');
      return false;
    }

    // Check venue restriction - user can only access their assigned venue
    if (requiredVenueSlug && session.venueSlug !== requiredVenueSlug) {
      console.log(`❌ Venue access denied: ${session.venueSlug} != ${requiredVenueSlug}`);
      return false;
    }

    // Check permission
    const hasPermission = session.permissions.includes(requiredPermission);
    
    console.log(`🔐 Permission check: ${requiredPermission} for ${session.venueSlug}: ${hasPermission}`);
    return hasPermission;

  } catch (error) {
    console.error('❌ Error checking venue permission:', error);
    return false;
  }
}

/**
 * NEW: Validate venue access for specific venue slug
 * This is the key function that enforces venue-specific access
 */
export async function validateVenueAccess(requiredVenueSlug: string): Promise<{
  authorized: boolean;
  session?: SessionData;
  error?: string;
}> {
  try {
    const session = await getVenueAuth();
    
    if (!session) {
      return { 
        authorized: false, 
        error: 'Not authenticated' 
      };
    }

    // CRITICAL: Enforce venue restriction
    if (session.venueSlug !== requiredVenueSlug) {
      console.log(`🚫 VENUE ACCESS DENIED: ${session.venueSlug} attempted to access ${requiredVenueSlug}`);
      return { 
        authorized: false, 
        error: `Access denied. You can only access ${session.venueSlug}, not ${requiredVenueSlug}` 
      };
    }

    console.log(`✅ VENUE ACCESS GRANTED: ${session.venueSlug} === ${requiredVenueSlug}`);
    return { 
      authorized: true, 
      session 
    };

  } catch (error) {
    console.error('❌ Error validating venue access:', error);
    return { 
      authorized: false, 
      error: 'Access validation failed' 
    };
  }
}

// ============================================================================
// ROUTE PROTECTION UTILITIES
// ============================================================================

/**
 * NEW: Middleware helper for venue route protection
 */
export async function requireVenueAccess(
  requiredPermission: string,
  requiredVenueSlug?: string
): Promise<{ authorized: boolean; redirect?: string; session?: SessionData }> {
  
  const session = await getVenueAuth();
  
  if (!session) {
    return { 
      authorized: false, 
      redirect: '/venue-login' 
    };
  }

  // Check venue access if specific venue required
  if (requiredVenueSlug && session.venueSlug !== requiredVenueSlug) {
    return { 
      authorized: false, 
      redirect: `/venue/${session.venueSlug}` // Redirect to their allowed venue
    };
  }

  // Check permission
  if (!session.permissions.includes(requiredPermission)) {
    return { 
      authorized: false, 
      redirect: `/venue/${session.venueSlug}?error=insufficient_permissions`
    };
  }

  return { 
    authorized: true, 
    session 
  };
}

/**
 * NEW: Get user's allowed venues (for venue switcher)
 */
export async function getUserAllowedVenues(): Promise<string[]> {
  try {
    const session = await getVenueAuth();
    
    if (!session) {
      return [];
    }

    // For now, users only have access to one venue
    // Future enhancement: support multi-venue access
    return [session.venueSlug];

  } catch (error) {
    console.error('❌ Error getting allowed venues:', error);
    return [];
  }
}

// ============================================================================
// BACKWARDS COMPATIBILITY (for gradual migration)
// ============================================================================

/**
 * LEGACY: Maintain compatibility with old AuthResult interface
 */
export function toLegacyAuthResult(session: SessionData): any {
  return {
    success: true,
    venueSlug: session.venueSlug,
    permissions: session.permissions,
    isMasterAdmin: false // No more master admin in new system
  };
}

// ============================================================================
// MASTER ADMIN SUPPORT (for development/emergency access)
// ============================================================================

/**
 * Master admin bypass for development (can be disabled in production)
 */
export async function checkMasterAdminAccess(password: string): Promise<boolean> {
  const masterPassword = process.env.VENUE_MASTER_PASSWORD;
  
  // Disable master admin in production unless explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.ENABLE_MASTER_ADMIN) {
    return false;
  }
  
  return masterPassword && password === masterPassword;
} 