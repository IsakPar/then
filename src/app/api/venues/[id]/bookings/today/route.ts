import { NextRequest, NextResponse } from 'next/server';
import { getTodaysVenueBookings, getVenueById } from '@/lib/db/queries';
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

    // SECURITY CHECK: Comprehensive security validation for sensitive customer data
    const securityCheck = performSecurityCheck(request, 'auth', clientIP);
    
    if (!securityCheck.allowed) {
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
        origin: request.headers.get('origin') || undefined,
        operation: 'venue_bookings',
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
    
    console.log(`🎫 Fetching today's bookings for venue: ${id}`);
    
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

    // VENUE ACCESS VALIDATION: Ensure user can only access their venue bookings
    const venueAccess = await validateVenueAccess(venue.slug);
    
    if (!venueAccess.authorized) {
      console.log(`🚫 VENUE BOOKINGS ACCESS DENIED: ${venueAccess.error} for venue ${venue.slug}`);
      
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        operation: 'venue_bookings',
        reason: `Unauthorized venue bookings access attempt: ${venue.slug}`
      });

      return NextResponse.json(
        { error: venueAccess.error || 'Access denied to venue bookings' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }

    // PERMISSION CHECK: Ensure user has view bookings permissions (sensitive customer data)
    if (!venueAccess.session?.permissions?.includes('view_door_list')) {
      console.log(`🚫 BOOKINGS PERMISSION DENIED: User lacks view_door_list permission for ${venue.slug}`);
      
      return NextResponse.json(
        { error: 'Insufficient permissions to view venue bookings' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }
    
    const bookings = await getTodaysVenueBookings(id);
    
    console.log(`✅ Found ${bookings.length} bookings for today at venue: ${venue.name}`);
    
    return NextResponse.json(bookings, {
      headers: securityCheck.headers
    });
  } catch (error) {
    console.error('❌ Error fetching today\'s venue bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s bookings' },
      { status: 500 }
    );
  }
} 