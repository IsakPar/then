import { NextRequest, NextResponse } from 'next/server';
import { validateVenueTicket, getVenueById } from '@/lib/db/queries';
import { validateVenueAccess } from '@/lib/venue-auth-new';
import { performSecurityCheck, logSecurityEvent } from '@/lib/venue-security';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get client IP for security logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // SECURITY CHECK: Comprehensive security validation for ticket validation
    const securityCheck = performSecurityCheck(request, 'auth', clientIP);
    
    if (!securityCheck.allowed) {
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
        origin: request.headers.get('origin') || undefined,
        operation: 'ticket_validation',
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
    const { validationCode } = body;
    
    console.log(`🎫 Validating ticket for venue: ${id}, code: ${validationCode}`);
    
    if (!validationCode || typeof validationCode !== 'string') {
      return NextResponse.json(
        { error: 'Validation code is required' },
        { 
          status: 400,
          headers: securityCheck.headers 
        }
      );
    }
    
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

    // VENUE ACCESS VALIDATION: Ensure user can only validate tickets for their venue
    const venueAccess = await validateVenueAccess(venue.slug);
    
    if (!venueAccess.authorized) {
      console.log(`🚫 TICKET VALIDATION ACCESS DENIED: ${venueAccess.error} for venue ${venue.slug}`);
      
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        operation: 'ticket_validation',
        reason: `Unauthorized ticket validation attempt: ${venue.slug}`
      });

      return NextResponse.json(
        { error: venueAccess.error || 'Access denied to ticket validation' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }

    // PERMISSION CHECK: Ensure user has validate tickets permissions
    if (!venueAccess.session?.permissions?.includes('validate_tickets')) {
      console.log(`🚫 VALIDATION PERMISSION DENIED: User lacks validate_tickets permission for ${venue.slug}`);
      
      return NextResponse.json(
        { error: 'Insufficient permissions to validate tickets' },
        { 
          status: 403,
          headers: securityCheck.headers 
        }
      );
    }
    
    const ticket = await validateVenueTicket(id, validationCode.trim().toUpperCase());
    
    if (!ticket) {
      console.log(`❌ Invalid ticket code: ${validationCode} for venue: ${venue.name}`);
      return NextResponse.json(
        { error: 'Invalid verification code or ticket not found' },
        { 
          status: 404,
          headers: securityCheck.headers 
        }
      );
    }
    
    console.log(`✅ Ticket validated successfully for venue: ${venue.name}`, {
      customer: ticket.booking.customerName,
      show: ticket.show.title,
      seats: ticket.seats
    });
    
    return NextResponse.json(ticket, {
      headers: securityCheck.headers
    });
  } catch (error) {
    console.error('❌ Error validating venue ticket:', error);
    return NextResponse.json(
      { error: 'Failed to validate ticket' },
      { status: 500 }
    );
  }
} 