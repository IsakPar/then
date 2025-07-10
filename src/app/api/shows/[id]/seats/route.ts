import { NextRequest, NextResponse } from 'next/server';
import { getShowSeats } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: showId } = await params;
    
    console.log(`🎫 Fetching seats for show: ${showId}`);

    // Get all seats for the show with section information
    const seats = await getShowSeats(showId);
    
    console.log(`✅ Found ${seats.length} seats for show ${showId}`);

    return NextResponse.json(seats);

  } catch (error) {
    console.error('💥 Seats API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch seats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 