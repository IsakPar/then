import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/connection'
import { shows, venues, sections, seats } from '@/lib/db/schema'
import { eq, count, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    console.log('🎭 Fetching available shows for iOS app...');

    // Get all active shows with venue and pricing information
    const showsData = await db.select({
      id: shows.id,
      title: shows.title,
      description: shows.description,
      date: shows.date,
      time: shows.time,
      imageUrl: shows.imageUrl,
      isActive: shows.isActive,
      venueId: shows.venueId,
      venueName: venues.name,
      venueAddress: venues.address,
      seatMapId: shows.seatMapId
    })
    .from(shows)
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(shows.isActive, true))
    .orderBy(shows.date, shows.time);

    console.log(`✅ Found ${showsData.length} active shows`);

    // For each show, get sections with pricing and availability
    const enhancedShows = await Promise.all(
      showsData.map(async (show) => {
        try {
          // Get sections for this show's seat map
          const sectionsData = await db.select({
            sectionId: sections.id,
            sectionName: sections.name,
            displayName: sections.displayName,
            colorHex: sections.colorHex,
            basePricePence: sections.basePricePence,
            isAccessible: sections.isAccessible
          })
          .from(sections)
          .where(eq(sections.seatMapId, show.seatMapId));

          // Get seat availability for each section
          const seatPricing = await Promise.all(
            sectionsData.map(async (section) => {
              const [availabilityData] = await db.select({
                totalSeats: count(seats.id),
                availableSeats: count(sql`CASE WHEN ${seats.status} = 'available' THEN 1 END`)
              })
              .from(seats)
              .where(eq(seats.sectionId, section.sectionId));

              return {
                section_id: section.sectionId,
                section_name: section.sectionName || section.displayName,
                color_code: section.colorHex,
                price: Math.round(section.basePricePence / 100), // Convert pence to pounds
                available_seats: availabilityData?.availableSeats || 0,
                total_seats: availabilityData?.totalSeats || 0,
                is_accessible: section.isAccessible
              };
            })
          );

          // Calculate min/max prices
          const prices = seatPricing.map(s => s.price).filter(p => p > 0);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

          // Determine seat map type based on show title
          const seatMapType = show.title.toLowerCase().includes('hamilton') ? 'mongodb' : 
                             show.title.toLowerCase().includes('phantom') ? 'hybrid' : 'standard';

          return {
            id: show.id,
            title: show.title,
            description: show.description,
            date: show.date,
            time: show.time,
            imageUrl: show.imageUrl,
            venue_name: show.venueName,
            address: show.venueAddress,
            location: show.venueAddress,
            seatMapId: show.seatMapId,
            seatMapType,
            seat_pricing: seatPricing,
            min_price: minPrice,
            max_price: maxPrice,
            total_available_seats: seatPricing.reduce((sum, s) => sum + s.available_seats, 0),
            // iOS app compatibility fields
            ios_config: {
              api_endpoint: seatMapType === 'mongodb' ? '/api/payment-intent-mongo' : 
                           seatMapType === 'hybrid' ? '/api/seatmap/phantom-hybrid' : '/api/payment-intent',
              seat_map_endpoint: seatMapType === 'hybrid' ? `/api/seatmap/phantom-hybrid` : null,
              booking_flow: seatMapType
            }
          };
        } catch (error) {
          console.error(`❌ Error processing show ${show.title}:`, error);
          // Return basic show info if detailed data fails
          return {
            id: show.id,
            title: show.title,
            description: show.description,
            date: show.date,
            time: show.time,
            imageUrl: show.imageUrl,
            venue_name: show.venueName,
            address: show.venueAddress,
            location: show.venueAddress,
            seatMapId: show.seatMapId,
            seatMapType: 'standard',
            seat_pricing: [],
            min_price: 0,
            max_price: 0,
            total_available_seats: 0,
            ios_config: {
              api_endpoint: '/api/payment-intent',
              seat_map_endpoint: null,
              booking_flow: 'standard'
            }
          };
        }
      })
    );

    console.log(`🎯 Enhanced ${enhancedShows.length} shows with pricing and availability data`);

    return NextResponse.json(enhancedShows, {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });

  } catch (error) {
    console.error('❌ Error fetching shows:', error);
    return NextResponse.json({
      error: 'Failed to fetch shows',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add CORS support for iOS app
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 