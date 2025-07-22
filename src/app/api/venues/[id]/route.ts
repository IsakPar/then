import { NextRequest, NextResponse } from 'next/server';
import { getVenueById, updateVenue, deleteVenue } from '@/lib/db/queries';
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
        operation: 'venue_get',
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
    
    console.log(`🏛️ Fetching venue: ${id}`);
    
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

    // VENUE ACCESS VALIDATION: Ensure user can only access their venue
    const venueAccess = await validateVenueAccess(venue.slug);
    
    if (!venueAccess.authorized) {
      console.log(`🚫 VENUE ACCESS DENIED: ${venueAccess.error} for venue ${venue.slug}`);
      
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        operation: 'venue_get',
        reason: `Unauthorized venue access attempt: ${venue.slug}`
      });

      return NextResponse.json(
        { error: venueAccess.error || 'Access denied' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }
    
    console.log('✅ Venue found:', venue);
    
    return NextResponse.json(venue, {
      headers: securityCheck.headers
    });
  } catch (error) {
    console.error('❌ Error fetching venue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
        operation: 'venue_update',
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

    const body = await request.json();
    
    console.log(`🏛️ Updating venue: ${id}`, body);
    
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

    // VENUE ACCESS VALIDATION: Ensure user can only update their venue
    const venueAccess = await validateVenueAccess(venue.slug);
    
    if (!venueAccess.authorized) {
      console.log(`🚫 VENUE UPDATE DENIED: ${venueAccess.error} for venue ${venue.slug}`);
      
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        operation: 'venue_update',
        reason: `Unauthorized venue update attempt: ${venue.slug}`
      });

      return NextResponse.json(
        { error: venueAccess.error || 'Access denied' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }

    // PERMISSION CHECK: Ensure user has manage permissions
    if (!venueAccess.session?.permissions?.includes('manage_settings')) {
      console.log(`🚫 PERMISSION DENIED: User lacks manage_settings permission for ${venue.slug}`);
      
      return NextResponse.json(
        { error: 'Insufficient permissions to update venue' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }
    
    const updatedVenue = await updateVenue(id, body);
    
    console.log('✅ Venue updated:', updatedVenue);
    
    return NextResponse.json(updatedVenue, {
      headers: securityCheck.headers
    });
  } catch (error) {
    console.error('❌ Error updating venue:', error);
    
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A venue with this slug already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update venue' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
        operation: 'venue_delete',
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
    
    console.log(`🏛️ Deleting venue: ${id}`);
    
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

    // VENUE ACCESS VALIDATION: Ensure user can only delete their venue
    const venueAccess = await validateVenueAccess(venue.slug);
    
    if (!venueAccess.authorized) {
      console.log(`🚫 VENUE DELETE DENIED: ${venueAccess.error} for venue ${venue.slug}`);
      
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        operation: 'venue_delete',
        reason: `Unauthorized venue delete attempt: ${venue.slug}`
      });

      return NextResponse.json(
        { error: venueAccess.error || 'Access denied' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }

    // PERMISSION CHECK: Ensure user has admin permissions for deletion
    if (venueAccess.session?.role !== 'admin') {
      console.log(`🚫 ADMIN PERMISSION REQUIRED: User role ${venueAccess.session?.role} cannot delete venue ${venue.slug}`);
      
      return NextResponse.json(
        { error: 'Only venue administrators can delete venues' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }
    
    const deletedVenue = await deleteVenue(id);
    
    console.log('✅ Venue deleted:', deletedVenue);
    
    return NextResponse.json(
      { message: 'Venue deleted successfully', venue: deletedVenue },
      { headers: securityCheck.headers }
    );
  } catch (error) {
    console.error('❌ Error deleting venue:', error);
    return NextResponse.json(
      { error: 'Failed to delete venue' },
      { status: 500 }
    );
  }
} 