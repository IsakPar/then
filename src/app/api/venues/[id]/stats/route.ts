import { NextRequest, NextResponse } from 'next/server';
import { getVenueStatistics, getVenueById } from '@/lib/db/queries';
import { validateVenueAccess } from '@/lib/venue-auth-new';
import { performSecurityCheck, logSecurityEvent } from '@/lib/venue-security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get client IP for security logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // SECURITY CHECK: Comprehensive security validation
    const securityCheck = performSecurityCheck(request, 'auth', clientIP);
    
    if (!securityCheck.allowed) {
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
        origin: request.headers.get('origin') || undefined,
        operation: 'venue_stats',
        reason: securityCheck.reason
      });

      return NextResponse.json(
        { error: securityCheck.reason },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }
    
    console.log(`📊 Fetching statistics for venue: ${id}`);
    
    // Check if venue exists
    const venue = await getVenueById(id);
    
    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { 
          status: 404,
          headers: securityCheck.headers 
        }
      );
    }

    // VENUE ACCESS VALIDATION: Ensure user can only access their venue stats
    const venueAccess = await validateVenueAccess(venue.slug);
    
    if (!venueAccess.authorized) {
      console.log(`🚫 VENUE STATS ACCESS DENIED: ${venueAccess.error} for venue ${venue.slug}`);
      
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        operation: 'venue_stats',
        reason: `Unauthorized venue stats access attempt: ${venue.slug}`
      });

      return NextResponse.json(
        { error: venueAccess.error || 'Access denied to venue statistics' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }

    // PERMISSION CHECK: Ensure user has view permissions
    if (!venueAccess.session?.permissions?.includes('view_reports')) {
      console.log(`🚫 STATS PERMISSION DENIED: User lacks view_reports permission for ${venue.slug}`);
      
      return NextResponse.json(
        { error: 'Insufficient permissions to view venue statistics' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }
    
    const stats = await getVenueStatistics(id);
    
    console.log(`✅ Venue statistics for ${venue.name}:`, stats);
    
    return NextResponse.json(stats, {
      headers: securityCheck.headers
    });
  } catch (error) {
    console.error('❌ Error fetching venue statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue statistics' },
      { status: 500 }
    );
  }
} 