import { NextRequest, NextResponse } from 'next/server';
import { getVenueBySlug } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    console.log(`🏛️ Fetching venue by slug: ${slug}`);
    
    const venue = await getVenueBySlug(slug);
    
    if (!venue) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    console.log('✅ Venue found:', venue);
    
    return NextResponse.json(venue);
  } catch (error) {
    console.error('❌ Error fetching venue by slug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue' },
      { status: 500 }
    );
  }
} 