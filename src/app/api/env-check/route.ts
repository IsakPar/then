import { NextRequest, NextResponse } from 'next/server';
import { SECURITY_CONFIG } from '@/lib/venue-security';

/**
 * Environment configuration check endpoint
 * Helps verify security settings are properly configured in production
 */
export async function GET(request: NextRequest) {
  try {
    // Return security configuration status (safe for monitoring)
    const config = {
      mobile_blocking: SECURITY_CONFIG.enableMobileBlocking,
      venue_staff_creation: SECURITY_CONFIG.enableVenueStaffCreation,
      master_admin: SECURITY_CONFIG.enableMasterAdmin,
      node_env: process.env.NODE_ENV,
      max_login_attempts: SECURITY_CONFIG.maxLoginAttempts,
      production_mode: SECURITY_CONFIG.productionMode,
      timestamp: new Date().toISOString()
    };

    console.log('🔧 Environment check requested:', config);

    return NextResponse.json(config);

  } catch (error) {
    console.error('❌ Environment check error:', error);
    return NextResponse.json(
      { error: 'Environment check failed' },
      { status: 500 }
    );
  }
} 