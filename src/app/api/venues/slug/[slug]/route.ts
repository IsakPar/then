import { NextRequest, NextResponse } from 'next/server';
import { getVenueBySlug } from '@/lib/db/queries';
import { getSecurityHeaders } from '@/lib/venue-security';

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
        { 
          status: 404,
          headers: getSecurityHeaders()
        }
      );
    }
    
    console.log('✅ Venue found:', venue);
    
    // Note: Venue discovery by slug might be public for customers
    // but we still apply security headers
    return NextResponse.json(venue, {
      headers: getSecurityHeaders()
    });
  } catch (error) {
    console.error('❌ Error fetching venue by slug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue' },
      { 
        status: 500,
        headers: getSecurityHeaders()
      }
    );
  }
} 