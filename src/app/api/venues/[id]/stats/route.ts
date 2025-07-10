import { NextRequest, NextResponse } from 'next/server';
import { getVenueStatistics, getVenueById } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`📊 Fetching statistics for venue: ${id}`);
    
    // Check if venue exists
    const venue = await getVenueById(id);
    
    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    const stats = await getVenueStatistics(id);
    
    console.log(`✅ Venue statistics for ${venue.name}:`, stats);
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('❌ Error fetching venue statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue statistics' },
      { status: 500 }
    );
  }
} 