import { NextRequest, NextResponse } from 'next/server';
import { getTodaysVenueBookings, getVenueById } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`🎫 Fetching today's bookings for venue: ${id}`);
    
    // Check if venue exists
    const venue = await getVenueById(id);
    
    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    const bookings = await getTodaysVenueBookings(id);
    
    console.log(`✅ Found ${bookings.length} bookings for today at venue: ${venue.name}`);
    
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('❌ Error fetching today\'s venue bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s bookings' },
      { status: 500 }
    );
  }
} 