import { NextRequest, NextResponse } from 'next/server';
import { getActiveShows, getShowWithPricing } from '@/lib/db/queries';
import { db } from '@/lib/db/connection';
import { shows, venues, seatMaps, sections, seats } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get('id');

    if (showId) {
      // Get specific show with pricing
      console.log(`🎭 Fetching show with pricing: ${showId}`);
      const shows = await getShowWithPricing(showId);
      
      if (shows.length === 0) {
        console.log(`❌ Show not found: ${showId}`);
        return NextResponse.json({ error: 'Show not found' }, { status: 404 });
      }
      
      console.log(`✅ Show found: ${shows[0].title}`);
      return NextResponse.json(shows[0]);
    } else {
      // Get all active shows with pricing
      console.log('🎭 Fetching all active shows');
      const shows = await getShowWithPricing();
      
      console.log(`✅ Found ${shows.length} active shows`);
      return NextResponse.json(shows);
    }
  } catch (error) {
    console.error('💥 Shows API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch shows',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 Creating new show');
    
    const body = await request.json();
    console.log('📝 Show creation request:', body);
    
    const { 
      title, 
      description, 
      date, 
      time, 
      venueId, 
      seatMapId, 
      imageUrl, 
      durationMinutes 
    } = body;
    
    // Validate required fields
    if (!title || !date || !time || !venueId || !seatMapId) {
      return NextResponse.json(
        { error: 'Missing required fields: title, date, time, venueId, seatMapId' },
        { status: 400 }
      );
    }
    
    // Verify venue exists
    const venue = await db
      .select()
      .from(venues)
      .where(eq(venues.id, venueId))
      .limit(1);
      
    if (venue.length === 0) {
      return NextResponse.json(
        { error: 'Venue not found' },
        { status: 404 }
      );
    }
    
    // Verify seat map exists
    const seatMap = await db
      .select()
      .from(seatMaps)
      .where(eq(seatMaps.id, seatMapId))
      .limit(1);
      
    if (seatMap.length === 0) {
      return NextResponse.json(
        { error: 'Seat map not found' },
        { status: 404 }
      );
    }
    
    console.log(`🎭 Creating show for venue: ${venue[0].name} with seat map: ${seatMap[0].name}`);
    
    // Create the show
    const newShow = await db.transaction(async (tx) => {
      // Insert show
      const [createdShow] = await tx
        .insert(shows)
        .values({
          title,
          description: description || null,
          date,
          time,
          venueId,
          seatMapId,
          imageUrl: imageUrl || null,
          durationMinutes: durationMinutes || 120,
          isActive: true,
        })
        .returning();
        
      console.log(`✅ Show created: ${createdShow.id}`);
      
      // Get all sections for this seat map
      const seatMapSections = await tx
        .select()
        .from(sections)
        .where(eq(sections.seatMapId, seatMapId));
        
      console.log(`🎫 Creating seats for ${seatMapSections.length} sections`);
      
      // Create seats for each section based on section configuration
      for (const section of seatMapSections) {
        const seatPattern = section.seatPattern as any;
        const rows = seatPattern.rows || 10;
        const cols = seatPattern.cols || 15;
        
        const seatsToCreate = [];
        
        // Generate seats for this section
        for (let row = 1; row <= rows; row++) {
          const rowLetter = String.fromCharCode(64 + row); // A, B, C, etc.
          
          for (let seatNum = 1; seatNum <= cols; seatNum++) {
            seatsToCreate.push({
              showId: createdShow.id,
              sectionId: section.id,
              rowLetter,
              seatNumber: seatNum,
              pricePence: section.basePricePence,
              status: 'available' as const,
              position: {}, // Will be calculated later if needed
              isAccessible: section.isAccessible || false,
            });
          }
        }
        
        // Insert seats in batches
        if (seatsToCreate.length > 0) {
          await tx.insert(seats).values(seatsToCreate);
          console.log(`✅ Created ${seatsToCreate.length} seats for section: ${section.name}`);
        }
      }
      
      return createdShow;
    });
    
    console.log(`🎉 Show creation completed: ${newShow.title}`);
    
    return NextResponse.json(newShow, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error creating show:', error);
    
    // Check for unique constraint violations or other specific errors
    if (error instanceof Error) {
      if (error.message.includes('unique')) {
        return NextResponse.json(
          { error: 'A show with similar details already exists' },
          { status: 409 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create show',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 