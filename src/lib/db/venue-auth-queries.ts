import { db } from './connection'
import { users, accounts, venues, userVenues } from './schema'
import { eq, and, sql } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export type VenueRole = 'validator' | 'manager' | 'admin'

export interface VenueAuthResult {
  success: boolean
  userId?: string
  venueId?: string
  venueSlug?: string
  role?: VenueRole
  permissions?: string[]
  sessionToken?: string
  error?: string
}

export interface VenueSession {
  id: string
  sessionToken: string
  userId: string
  venueId: string
  venueSlug: string
  role: VenueRole
  permissions: string[]
  expiresAt: Date
  lastActivity: Date
}

// ============================================================================
// AUTHENTICATION FUNCTIONS
// ============================================================================

/**
 * Authenticate venue staff with email/password
 * Returns venue access and permissions
 */
export async function authenticateVenueStaff(
  email: string, 
  password: string,
  venueSlug?: string
): Promise<VenueAuthResult> {
  try {
    console.log(`🔐 Authenticating venue staff: ${email} for venue: ${venueSlug || 'any'}`);

    // Call the database function for authentication
    const result = await db.execute(sql`
      SELECT * FROM authenticate_venue_staff(${email}, ${password}, ${venueSlug || null})
    `);

    if (result.length === 0) {
      return { success: false, error: 'Invalid credentials or no venue access' };
    }

    // If multiple venues returned (no venue specified), return first one
    const auth = result[0] as any;
    
    return {
      success: true,
      userId: auth.user_id,
      venueId: auth.venue_id, 
      venueSlug: auth.venue_slug,
      role: auth.role as VenueRole,
      permissions: auth.permissions || []
    };

  } catch (error) {
    console.error('❌ Venue authentication error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Authentication failed' 
    };
  }
}

/**
 * Create a secure venue session token
 */
export async function createVenueSession(
  authResult: VenueAuthResult,
  ipAddress?: string,
  userAgent?: string
): Promise<string | null> {
  if (!authResult.success || !authResult.userId || !authResult.venueId) {
    return null;
  }

  try {
    const sessionToken = randomUUID() + '.' + randomUUID(); // Secure random token
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

    await db.execute(sql`
      INSERT INTO venue_auth_sessions (
        session_token, user_id, venue_id, role, permissions,
        ip_address, user_agent, expires_at
      ) VALUES (
        ${sessionToken}, ${authResult.userId}, ${authResult.venueId}, 
        ${authResult.role}, ${authResult.permissions},
        ${ipAddress || null}, ${userAgent || null}, ${expiresAt}
      )
      ON CONFLICT (user_id, venue_id) 
      DO UPDATE SET 
        session_token = EXCLUDED.session_token,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        ip_address = EXCLUDED.ip_address,
        user_agent = EXCLUDED.user_agent,
        expires_at = EXCLUDED.expires_at,
        last_activity = NOW()
    `);

    console.log(`✅ Created venue session for user: ${authResult.userId} venue: ${authResult.venueSlug}`);
    return sessionToken;

  } catch (error) {
    console.error('❌ Error creating venue session:', error);
    return null;
  }
}

/**
 * Validate and retrieve venue session
 */
export async function getVenueSession(sessionToken: string): Promise<VenueSession | null> {
  try {
    const result = await db.execute(sql`
      SELECT 
        vas.id,
        vas.session_token,
        vas.user_id,
        vas.venue_id,
        v.slug as venue_slug,
        vas.role,
        vas.permissions,
        vas.expires_at,
        vas.last_activity
      FROM venue_auth_sessions vas
      JOIN venues v ON vas.venue_id = v.id
      WHERE vas.session_token = ${sessionToken}
      AND vas.expires_at > NOW()
    `);

    if (result.length === 0) {
      return null;
    }

    const session = result[0] as any;

    // Update last activity
    await db.execute(sql`
      UPDATE venue_auth_sessions 
      SET last_activity = NOW() 
      WHERE session_token = ${sessionToken}
    `);

    return {
      id: session.id,
      sessionToken: session.session_token,
      userId: session.user_id,
      venueId: session.venue_id,
      venueSlug: session.venue_slug,
      role: session.role as VenueRole,
      permissions: session.permissions || [],
      expiresAt: new Date(session.expires_at),
      lastActivity: new Date(session.last_activity)
    };

  } catch (error) {
    console.error('❌ Error getting venue session:', error);
    return null;
  }
}

/**
 * Check if user has specific permission for venue
 */
export async function checkVenuePermission(
  sessionToken: string, 
  requiredPermission: string,
  requiredVenueSlug?: string
): Promise<boolean> {
  try {
    const session = await getVenueSession(sessionToken);
    
    if (!session) {
      return false;
    }

    // Check venue restriction
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
 * Logout from venue session
 */
export async function clearVenueSession(sessionToken: string): Promise<boolean> {
  try {
    await db.execute(sql`
      DELETE FROM venue_auth_sessions 
      WHERE session_token = ${sessionToken}
    `);
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing venue session:', error);
    return false;
  }
}

/**
 * Get all venue access for a user (for session management)
 */
export async function getUserVenueAccess(userId: string): Promise<VenueAuthResult[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        v.id as venue_id,
        v.slug as venue_slug,
        v.name as venue_name,
        uv.role,
        ARRAY_AGG(vrp.permission) as permissions
      FROM venues v
      JOIN user_venues uv ON v.id = uv.venue_id
      JOIN venue_role_permissions vrp ON uv.role = vrp.role
      WHERE uv.user_id = ${userId}
      GROUP BY v.id, v.slug, v.name, uv.role
      ORDER BY v.name
    `);

    return result.map((row: any) => ({
      success: true,
      userId,
      venueId: row.venue_id,
      venueSlug: row.venue_slug,
      role: row.role as VenueRole,
      permissions: row.permissions || []
    }));

  } catch (error) {
    console.error('❌ Error getting user venue access:', error);
    return [];
  }
}

// ============================================================================
// ADMIN FUNCTIONS (for managing venue staff)
// ============================================================================

/**
 * Create new venue staff account
 */
export async function createVenueStaffAccount(
  email: string,
  password: string,
  name: string,
  venueSlug: string,
  role: VenueRole = 'validator'
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const passwordHash = await bcrypt.hash(password, 12);
    
    const result = await db.execute(sql`
      SELECT create_venue_staff(
        ${email}, 
        ${passwordHash}, 
        ${name}, 
        ${venueSlug}, 
        ${role}
      ) as user_id
    `);

    const userId = result[0]?.user_id as string;
    
    if (userId) {
      console.log(`✅ Created venue staff account: ${email} for ${venueSlug}`);
      return { success: true, userId };
    } else {
      return { success: false, error: 'Failed to create venue staff account' };
    }

  } catch (error) {
    console.error('❌ Error creating venue staff account:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Account creation failed' 
    };
  }
}

/**
 * List all venue staff for a venue
 */
export async function getVenueStaff(venueSlug: string): Promise<any[]> {
  try {
    const result = await db.execute(sql`
      SELECT 
        u.id,
        u.email,
        u.name,
        uv.role,
        uv.created_at,
        u.email_verified,
        CASE WHEN vas.session_token IS NOT NULL THEN true ELSE false END as is_active
      FROM users u
      JOIN user_venues uv ON u.id = uv.user_id
      JOIN venues v ON uv.venue_id = v.id
      LEFT JOIN venue_auth_sessions vas ON u.id = vas.user_id AND v.id = vas.venue_id AND vas.expires_at > NOW()
      WHERE v.slug = ${venueSlug}
      AND u.role = 'venue'
      ORDER BY uv.created_at DESC
    `);

    return result;

  } catch (error) {
    console.error('❌ Error getting venue staff:', error);
    return [];
  }
}

/**
 * Remove venue staff access
 */
export async function removeVenueStaff(userId: string, venueSlug: string): Promise<boolean> {
  try {
    // Remove venue access
    await db.execute(sql`
      DELETE FROM user_venues 
      WHERE user_id = ${userId} 
      AND venue_id = (SELECT id FROM venues WHERE slug = ${venueSlug})
    `);

    // Clear any active sessions
    await db.execute(sql`
      DELETE FROM venue_auth_sessions 
      WHERE user_id = ${userId} 
      AND venue_id = (SELECT id FROM venues WHERE slug = ${venueSlug})
    `);

    console.log(`✅ Removed venue staff access: ${userId} from ${venueSlug}`);
    return true;

  } catch (error) {
    console.error('❌ Error removing venue staff:', error);
    return false;
  }
} 