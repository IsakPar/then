// ============================================================================
// VENUE CMS SECURITY UTILITIES
// Comprehensive security controls for venue staff management
// ============================================================================

import { NextRequest } from 'next/server'

// ============================================================================
// TYPES
// ============================================================================

export interface SecurityConfig {
  enableVenueStaffCreation: boolean
  enableMasterAdmin: boolean
  maxLoginAttempts: number
  rateLimitWindowMs: number
  allowedOrigins: string[]
  enableMobileBlocking: boolean
  productionMode: boolean
}

export interface RateLimitEntry {
  attempts: number
  windowStart: number
  blocked: boolean
}

// ============================================================================
// SECURITY CONFIGURATION
// ============================================================================

export const SECURITY_CONFIG: SecurityConfig = {
  enableVenueStaffCreation: process.env.ENABLE_VENUE_STAFF_CREATION === 'true',
  enableMasterAdmin: process.env.ENABLE_MASTER_ADMIN === 'true',
  maxLoginAttempts: parseInt(process.env.MAX_VENUE_LOGIN_ATTEMPTS || '5'),
  rateLimitWindowMs: parseInt(process.env.VENUE_RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://then-production.up.railway.app',
    'https://lastminutelive.com',
    ...(process.env.ADDITIONAL_ALLOWED_ORIGINS?.split(',') || [])
  ],
  enableMobileBlocking: process.env.ENABLE_MOBILE_BLOCKING !== 'false', // Default true
  productionMode: process.env.NODE_ENV === 'production'
}

// In-memory rate limiting (for production, use Redis)
const rateLimitMap = new Map<string, RateLimitEntry>()

// ============================================================================
// MOBILE APP DETECTION & BLOCKING
// ============================================================================

/**
 * Comprehensive mobile app detection and blocking
 */
export function detectAndBlockMobile(request: NextRequest): {
  isMobile: boolean
  shouldBlock: boolean
  reason?: string
} {
  if (!SECURITY_CONFIG.enableMobileBlocking) {
    return { isMobile: false, shouldBlock: false }
  }

  const userAgent = request.headers.get('user-agent') || ''
  const mobileHeader = request.headers.get('x-mobile-app')
  const platformHeader = request.headers.get('x-platform')
  
  // Check explicit mobile headers
  if (mobileHeader === 'true') {
    return {
      isMobile: true,
      shouldBlock: true,
      reason: 'Explicit mobile app header detected'
    }
  }

  // Check platform headers
  const mobilePlatforms = ['ios', 'android', 'react-native', 'expo']
  if (platformHeader && mobilePlatforms.includes(platformHeader.toLowerCase())) {
    return {
      isMobile: true,
      shouldBlock: true,
      reason: `Mobile platform header detected: ${platformHeader}`
    }
  }

  // Check user agent patterns
  const mobilePatterns = [
    /Mobile|Android|iPhone|iPad|iPod|Windows Phone|BlackBerry/i,
    /React-Native|Expo|Cordova|PhoneGap/i,
    /LastMinuteLive-Mobile-App/i
  ]

  for (const pattern of mobilePatterns) {
    if (pattern.test(userAgent)) {
      return {
        isMobile: true,
        shouldBlock: true,
        reason: `Mobile user agent pattern detected: ${userAgent}`
      }
    }
  }

  return { isMobile: false, shouldBlock: false }
}

// ============================================================================
// ORIGIN VALIDATION
// ============================================================================

/**
 * Validate request origin against allowed domains
 */
export function validateOrigin(request: NextRequest): {
  isValid: boolean
  origin?: string
  referer?: string
  reason?: string
} {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // Check origin header
  if (origin) {
    const isValidOrigin = SECURITY_CONFIG.allowedOrigins.some(allowed => 
      origin.startsWith(allowed)
    )
    if (isValidOrigin) {
      return { isValid: true, origin }
    }
  }

  // Check referer header as fallback
  if (referer) {
    const isValidReferer = SECURITY_CONFIG.allowedOrigins.some(allowed => 
      referer.startsWith(allowed)
    )
    if (isValidReferer) {
      return { isValid: true, referer }
    }
  }

  return {
    isValid: false,
    origin,
    referer,
    reason: `Invalid origin. Origin: ${origin}, Referer: ${referer}, Allowed: ${SECURITY_CONFIG.allowedOrigins.join(', ')}`
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Check if IP/user is rate limited for venue operations
 */
export function checkRateLimit(
  identifier: string,
  operation: 'login' | 'create_staff' | 'auth'
): {
  isBlocked: boolean
  remainingAttempts: number
  resetTime: number
  reason?: string
} {
  const key = `${operation}:${identifier}`
  const now = Date.now()
  
  // Clean up old entries
  cleanupRateLimitMap()
  
  const entry = rateLimitMap.get(key)
  
  if (!entry) {
    // First attempt - create new entry
    rateLimitMap.set(key, {
      attempts: 1,
      windowStart: now,
      blocked: false
    })
    
    return {
      isBlocked: false,
      remainingAttempts: SECURITY_CONFIG.maxLoginAttempts - 1,
      resetTime: now + SECURITY_CONFIG.rateLimitWindowMs
    }
  }

  // Check if window has expired
  if (now - entry.windowStart > SECURITY_CONFIG.rateLimitWindowMs) {
    // Reset window
    rateLimitMap.set(key, {
      attempts: 1,
      windowStart: now,
      blocked: false
    })
    
    return {
      isBlocked: false,
      remainingAttempts: SECURITY_CONFIG.maxLoginAttempts - 1,
      resetTime: now + SECURITY_CONFIG.rateLimitWindowMs
    }
  }

  // Increment attempts
  entry.attempts++
  
  if (entry.attempts > SECURITY_CONFIG.maxLoginAttempts) {
    entry.blocked = true
    
    return {
      isBlocked: true,
      remainingAttempts: 0,
      resetTime: entry.windowStart + SECURITY_CONFIG.rateLimitWindowMs,
      reason: `Too many ${operation} attempts. Try again later.`
    }
  }

  return {
    isBlocked: false,
    remainingAttempts: SECURITY_CONFIG.maxLoginAttempts - entry.attempts,
    resetTime: entry.windowStart + SECURITY_CONFIG.rateLimitWindowMs
  }
}

/**
 * Record a failed attempt for rate limiting
 */
export function recordFailedAttempt(
  identifier: string,
  operation: 'login' | 'create_staff' | 'auth'
): void {
  checkRateLimit(identifier, operation) // This will increment the counter
}

/**
 * Reset rate limiting for an identifier (for successful operations)
 */
export function resetRateLimit(
  identifier: string,
  operation: 'login' | 'create_staff' | 'auth'
): void {
  const key = `${operation}:${identifier}`
  rateLimitMap.delete(key)
}

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitMap(): void {
  const now = Date.now()
  
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > SECURITY_CONFIG.rateLimitWindowMs) {
      rateLimitMap.delete(key)
    }
  }
}

// ============================================================================
// FEATURE FLAGS
// ============================================================================

/**
 * Check if venue staff creation is enabled
 */
export function isVenueStaffCreationEnabled(): boolean {
  return SECURITY_CONFIG.enableVenueStaffCreation
}

/**
 * Check if master admin is enabled
 */
export function isMasterAdminEnabled(): boolean {
  return SECURITY_CONFIG.enableMasterAdmin
}

/**
 * Get security headers for venue responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...(SECURITY_CONFIG.productionMode && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    })
  }
}

// ============================================================================
// COMPREHENSIVE SECURITY CHECK
// ============================================================================

/**
 * Comprehensive security check for venue operations
 */
export function performSecurityCheck(
  request: NextRequest,
  operation: 'login' | 'create_staff' | 'auth',
  identifier?: string
): {
  allowed: boolean
  reason?: string
  headers?: Record<string, string>
} {
  // 1. Check feature flags
  if (operation === 'create_staff' && !isVenueStaffCreationEnabled()) {
    return {
      allowed: false,
      reason: 'Venue staff creation is currently disabled',
      headers: getSecurityHeaders()
    }
  }

  // 2. Check mobile blocking
  const mobileCheck = detectAndBlockMobile(request)
  if (mobileCheck.shouldBlock) {
    return {
      allowed: false,
      reason: `Mobile access blocked: ${mobileCheck.reason}`,
      headers: getSecurityHeaders()
    }
  }

  // 3. Check origin validation
  const originCheck = validateOrigin(request)
  if (!originCheck.isValid) {
    return {
      allowed: false,
      reason: `Origin validation failed: ${originCheck.reason}`,
      headers: getSecurityHeaders()
    }
  }

  // 4. Check rate limiting
  if (identifier) {
    const rateLimitCheck = checkRateLimit(identifier, operation)
    if (rateLimitCheck.isBlocked) {
      return {
        allowed: false,
        reason: rateLimitCheck.reason,
        headers: {
          ...getSecurityHeaders(),
          'Retry-After': Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000).toString()
        }
      }
    }
  }

  return {
    allowed: true,
    headers: getSecurityHeaders()
  }
}

// ============================================================================
// LOGGING & MONITORING
// ============================================================================

/**
 * Log security events for monitoring
 */
export function logSecurityEvent(
  event: 'mobile_blocked' | 'origin_blocked' | 'rate_limited' | 'unauthorized_access',
  details: {
    ip?: string
    userAgent?: string
    origin?: string
    identifier?: string
    operation?: string
    reason?: string
  }
): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    event,
    environment: SECURITY_CONFIG.productionMode ? 'production' : 'development',
    ...details
  }

  if (SECURITY_CONFIG.productionMode) {
    // In production, you might want to send this to a monitoring service
    console.log('🚨 SECURITY EVENT:', JSON.stringify(logEntry))
  } else {
    console.log('🚨 SECURITY EVENT:', logEntry)
  }

  // TODO: Send to monitoring service (e.g., DataDog, New Relic, etc.)
} 