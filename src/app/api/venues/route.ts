import { NextRequest, NextResponse } from 'next/server';
import { getAllVenues, getVenuesWithShowCounts, createVenue } from '@/lib/db/queries';
import { getVenueAuth } from '@/lib/venue-auth-new';
import { performSecurityCheck, logSecurityEvent } from '@/lib/venue-security';

export async function GET() {
  try {
    console.log('🏛️ Fetching all venues with show counts');
    
    // Note: Venue list might be public for customer browsing
    // Only sensitive operations require authentication
    const venues = await getVenuesWithShowCounts();
    
    console.log(`✅ Found ${venues.length} venues`);
    
    return NextResponse.json(venues);
  } catch (error) {
    console.error('❌ Error fetching venues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venues' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for security logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

    // SECURITY CHECK: Comprehensive security validation for venue creation
    const securityCheck = performSecurityCheck(request, 'create_staff', clientIP);
    
    if (!securityCheck.allowed) {
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
        origin: request.headers.get('origin') || undefined,
        operation: 'venue_creation',
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

    // AUTHENTICATION CHECK: Verify venue admin authentication for venue creation
    const venueAuth = await getVenueAuth();
    if (!venueAuth || !venueAuth.permissions?.includes('manage_settings')) {
      console.log('🚨 SECURITY: Unauthorized venue creation attempt');
      
      logSecurityEvent('unauthorized_access', {
        ip: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
        operation: 'venue_creation',
        reason: 'Missing admin authentication or manage_settings permission'
      });

      return NextResponse.json(
        { error: 'Administrator authentication required to create venues.' },
        { 
          status: 401,
          headers: securityCheck.headers 
        }
      );
    }

    console.log('🏛️ Creating new venue');
    
    const body = await request.json();
    
    const { name, slug, address, description } = body;
    
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { 
          status: 400,
          headers: securityCheck.headers 
        }
      );
    }
    
    const venueData = {
      name,
      slug,
      address: address || null,
      description: description || null,
      defaultSeatMapId: null,
    };
    
    console.log('🏛️ Creating venue with data:', venueData);
    
    const newVenue = await createVenue(venueData);
    
    console.log('✅ Venue created successfully:', newVenue);
    
    return NextResponse.json(newVenue, { 
      status: 201,
      headers: securityCheck.headers 
    });
  } catch (error) {
    console.error('❌ Error creating venue:', error);
    
    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { error: 'A venue with this slug already exists' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create venue' },
      { status: 500 }
    );
  }
} 