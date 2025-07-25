import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 Creating Phantom of the Opera show in PostgreSQL...')
    
    // Import database connection and schema
    const { db } = await import('@/lib/db/connection')
    const { shows, venues, seatMaps } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    
    // First, check if we have Her Majesty's Theatre venue
    const venue = await db.select()
      .from(venues)
      .where(eq(venues.name, "Her Majesty's Theatre"))
      .limit(1)
    
    let venueId
    if (venue.length === 0) {
      // Create Her Majesty's Theatre venue
      console.log('🏛️ Creating Her Majesty\'s Theatre venue...')
      const newVenue = await db.insert(venues).values({
        name: "Her Majesty's Theatre",
        slug: "her-majestys-theatre",
        address: "Haymarket, St. James's, London SW1Y 4QL, United Kingdom",
        description: "Historic West End theatre, home to The Phantom of the Opera since 1986"
      }).returning({ id: venues.id })
      
      venueId = newVenue[0].id
      console.log(`✅ Created venue with ID: ${venueId}`)
    } else {
      venueId = venue[0].id
      console.log(`✅ Found existing venue with ID: ${venueId}`)
    }
    
    // Check if we have a seatmap for Phantom
    const seatMap = await db.select()
      .from(seatMaps)
      .where(eq(seatMaps.name, "Her Majesty's Theatre - Phantom"))
      .limit(1)
    
    let seatMapId
    if (seatMap.length === 0) {
      // Create a basic seatmap entry (the actual layout is in MongoDB)
      console.log('🗺️ Creating Phantom seatmap entry...')
      const newSeatMap = await db.insert(seatMaps).values({
        venueId,
        name: "Her Majesty's Theatre - Phantom",
        description: "Phantom of the Opera seating layout with 14 sections across 4 levels",
        totalCapacity: 1252,
        layoutConfig: {
          type: 'mongodb_hybrid',
          mongoVenueId: 'her-majestys-theatre',
          mongoShowSlug: 'phantom-of-the-opera',
          levels: 4,
          sections: 14
        },
        svgViewbox: "0 0 1200 800",
        isActive: true
      }).returning({ id: seatMaps.id })
      
      seatMapId = newSeatMap[0].id
      console.log(`✅ Created seatmap with ID: ${seatMapId}`)
    } else {
      seatMapId = seatMap[0].id
      console.log(`✅ Found existing seatmap with ID: ${seatMapId}`)
    }
    
    // Check if Phantom show already exists
    const existingShow = await db.select()
      .from(shows)
      .where(eq(shows.title, "The Phantom of the Opera"))
      .limit(1)
    
    if (existingShow.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Phantom of the Opera show already exists",
        showId: existingShow[0].id,
        venueId,
        seatMapId
      })
    }
    
    // Create the Phantom show
    console.log('🎭 Creating Phantom of the Opera show...')
    const newShow = await db.insert(shows).values({
      venueId,
      seatMapId,
      title: "The Phantom of the Opera",
      description: "The world's most beloved musical returns to Her Majesty's Theatre. Experience the haunting love story that has captivated audiences for over 35 years with breathtaking music, lavish costumes, and spectacular staging.",
      date: "2025-08-15", // Future date for testing
      time: "19:30",
      durationMinutes: 150, // 2.5 hours with interval
      imageUrl: "/shows/phantom/poster.jpg",
      pricingConfig: {
        currency: "GBP",
        pricing_tiers: {
          "premium": { min: 85, max: 125 },
          "standard": { min: 45, max: 85 },
          "restricted": { min: 25, max: 45 }
        }
      },
      isActive: true
    }).returning({ 
      id: shows.id,
      title: shows.title,
      date: shows.date,
      time: shows.time 
    })
    
    const phantomShow = newShow[0]
    console.log(`✅ Created Phantom show with ID: ${phantomShow.id}`)
    
    // Get the complete show data for verification
    const completeShow = await db.select({
      showId: shows.id,
      title: shows.title,
      description: shows.description,
      date: shows.date,
      time: shows.time,
      imageUrl: shows.imageUrl,
      venueName: venues.name,
      venueAddress: venues.address,
      seatMapName: seatMaps.name,
      totalCapacity: seatMaps.totalCapacity
    })
    .from(shows)
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .innerJoin(seatMaps, eq(shows.seatMapId, seatMaps.id))
    .where(eq(shows.id, phantomShow.id))
    .limit(1)
    
    return NextResponse.json({
      success: true,
      message: "Phantom of the Opera show created successfully!",
      show: completeShow[0],
      details: {
        showId: phantomShow.id,
        venueId,
        seatMapId,
        mongodb_integration: {
          venue: 'her-majestys-theatre',
          show: 'phantom-of-the-opera',
          sections: 14,
          total_seats: 1252
        },
        next_steps: [
          'Upload poster image to /public/shows/phantom/poster.jpg',
          'Test /api/shows endpoint',
          'Verify frontend display',
          'Test iOS integration with MongoDB seat data'
        ]
      }
    })
    
  } catch (error) {
    console.error('❌ Phantom show creation failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create Phantom show',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    }, { status: 500 })
  }
} 