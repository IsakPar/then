import { NextRequest, NextResponse } from 'next/server';
import { getVenueShows, getVenueById } from '@/lib/db/queries';
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
        operation: 'venue_shows',
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
    
    console.log(`🎭 Fetching shows for venue: ${id}`);
    
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

    // VENUE ACCESS VALIDATION: Ensure user can only access their venue shows
    const venueAccess = await validateVenueAccess(venue.slug);
    
    if (!venueAccess.authorized) {
      console.log(`🚫 VENUE SHOWS ACCESS DENIED: ${venueAccess.error} for venue ${venue.slug}`);
      
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        operation: 'venue_shows',
        reason: `Unauthorized venue shows access attempt: ${venue.slug}`
      });

      return NextResponse.json(
        { error: venueAccess.error || 'Access denied to venue shows' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }

    // PERMISSION CHECK: Ensure user has view shows permissions
    if (!venueAccess.session?.permissions?.includes('manage_shows')) {
      console.log(`🚫 SHOWS PERMISSION DENIED: User lacks manage_shows permission for ${venue.slug}`);
      
      return NextResponse.json(
        { error: 'Insufficient permissions to view venue shows' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }
    
    const shows = await getVenueShows(id);
    
    console.log(`✅ Found ${shows.length} shows for venue: ${venue.name}`);
    
    return NextResponse.json(shows, {
      headers: securityCheck.headers
    });
  } catch (error) {
    console.error('❌ Error fetching venue shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue shows' },
      { status: 500 }
    );
  }
} 