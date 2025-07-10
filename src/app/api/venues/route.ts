import { NextRequest, NextResponse } from 'next/server';
import { getAllVenues, getVenuesWithShowCounts, createVenue } from '@/lib/db/queries';

export async function GET() {
  try {
    console.log('🏛️ Fetching all venues with show counts');
    
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
    console.log('🏛️ Creating new venue');
    
    const body = await request.json();
    
    const { name, slug, address, description } = body;
    
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
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
    
    return NextResponse.json(newVenue, { status: 201 });
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