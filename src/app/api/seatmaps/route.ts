import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSeatMaps } from '@/lib/db/queries';

export async function GET() {
  try {
    console.log('🗺️ Fetching available seat maps');
    
    const seatMaps = await getAvailableSeatMaps();
    
    console.log(`✅ Found ${seatMaps.length} seat maps`);
    
    return NextResponse.json(seatMaps);
  } catch (error) {
    console.error('❌ Error fetching seat maps:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seat maps' },
      { status: 500 }
    );
  }
} 