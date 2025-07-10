import { NextRequest, NextResponse } from 'next/server';
import { getShowWithPricing } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get('id');

    if (showId) {
      // Get single show
      const shows = await getShowWithPricing(showId);
      const show = shows[0] || null;
      
      if (!show) {
        return NextResponse.json({ error: 'Show not found' }, { status: 404 });
      }

      return NextResponse.json(show);
    } else {
      // Get all active shows
      const shows = await getShowWithPricing();
      return NextResponse.json(shows);
    }
  } catch (error) {
    console.error('❌ Shows API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shows' },
      { status: 500 }
    );
  }
} 