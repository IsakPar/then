import { NextRequest, NextResponse } from 'next/server';
import { getVenueShows, getVenueById } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`🎭 Fetching shows for venue: ${id}`);
    
    // Check if venue exists
    const venue = await getVenueById(id);
    
    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    const shows = await getVenueShows(id);
    
    console.log(`✅ Found ${shows.length} shows for venue: ${venue.name}`);
    
    return NextResponse.json(shows);
  } catch (error) {
    console.error('❌ Error fetching venue shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue shows' },
      { status: 500 }
    );
  }
} 