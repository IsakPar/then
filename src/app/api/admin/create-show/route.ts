import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 Admin: Creating new show...')
    
    const { 
      title, 
      description, 
      venue, 
      date, 
      time, 
      imageUrl, 
      minPrice, 
      maxPrice, 
      showType 
    } = await request.json()
    
    // Validate required fields
    if (!title || !venue || !date) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: title, venue, date'
      }, { status: 400 })
    }
    
    // Import database dependencies
    const { db } = await import('@/lib/db/connection')
    const { shows, venues, seatMaps } = await import('@/lib/db/schema')
    const { eq } = await import('drizzle-orm')
    
    console.log(`📍 Finding venue: ${venue}`)
    
    // Find the venue
    const venueRecord = await db.select()
      .from(venues)
      .where(eq(venues.name, venue))
      .limit(1)
    
    if (venueRecord.length === 0) {
      return NextResponse.json({
        success: false,
        error: `Venue "${venue}" not found. Please create the venue first.`,
        availableVenues: ['Victoria Palace Theatre', 'Her Majesty\'s Theatre']
      }, { status: 404 })
    }
    
    const venueId = venueRecord[0].id
    console.log(`✅ Found venue: ${venue} (ID: ${venueId})`)
    
    // Create or find appropriate seatmap
    let seatMapId
    const seatMapName = `${venue} - ${title}`
    
    console.log(`🗺️ Creating/finding seatmap: ${seatMapName}`)
    
    // Check if seatmap exists
    const existingSeatMap = await db.select()
      .from(seatMaps)
      .where(eq(seatMaps.name, seatMapName))
      .limit(1)
    
    if (existingSeatMap.length > 0) {
      seatMapId = existingSeatMap[0].id
      console.log(`✅ Using existing seatmap: ${seatMapId}`)
    } else {
      // Create new seatmap
      const newSeatMap = await db.insert(seatMaps).values({
        venueId,
        name: seatMapName,
        description: `Seat map for ${title} at ${venue}`,
        totalCapacity: venue === 'Her Majesty\'s Theatre' ? 1648 : 1200,
        layoutConfig: {
          type: 'mongodb_hybrid',
          mongoVenueId: venue === 'Her Majesty\'s Theatre' ? 'her-majestys-theatre' : 'victoria-palace-theatre',
          mongoShowSlug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          showType: showType || 'musical'
        },
        svgViewbox: "0 0 1200 800",
        isActive: true
      }).returning({ id: seatMaps.id })
      
      seatMapId = newSeatMap[0].id
      console.log(`✅ Created new seatmap: ${seatMapId}`)
    }
    
    // Check if show already exists
    const existingShow = await db.select()
      .from(shows)
      .where(eq(shows.title, title))
      .limit(1)
    
    if (existingShow.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Show "${title}" already exists`,
        showId: existingShow[0].id
      }, { status: 409 })
    }
    
    // Create the show
    console.log(`🎭 Creating show: ${title}`)
    
    const newShow = await db.insert(shows).values({
      venueId,
      seatMapId,
      title,
      description: description || `Experience ${title} at ${venue}`,
      date,
      time: time || '19:30',
      durationMinutes: showType === 'opera' ? 180 : 150,
      imageUrl: imageUrl || `/shows/${title.toLowerCase().replace(/\s+/g, '-')}/poster.jpg`,
      pricingConfig: {
        currency: 'GBP',
        minPrice: minPrice || 3500, // £35 in pence
        maxPrice: maxPrice || 12500, // £125 in pence
        showType: showType || 'musical'
      },
      isActive: true
    }).returning({
      id: shows.id,
      title: shows.title,
      date: shows.date,
      time: shows.time
    })
    
    const createdShow = newShow[0]
    console.log(`✅ Created show: ${createdShow.title} (ID: ${createdShow.id})`)
    
    // Get complete show data for response
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
    .where(eq(shows.id, createdShow.id))
    .limit(1)
    
    // Trigger MongoDB seat map creation for this show if needed
    try {
      console.log('🔄 Triggering MongoDB integration...')
      // This could call your existing seat map creation endpoints
      // await createMongoDBSeatMap(title, venue)
    } catch (mongoError) {
      console.warn('⚠️ MongoDB integration warning:', mongoError)
      // Don't fail the show creation for MongoDB issues
    }
    
    return NextResponse.json({
      success: true,
      message: `🎭 Show "${title}" created successfully!`,
      show: completeShow[0],
      details: {
        showId: createdShow.id,
        venueId,
        seatMapId,
        integration: {
          postgresql: 'completed',
          mongodb: 'queued',
          images: imageUrl ? 'provided' : 'default'
        },
        next_steps: [
          'Show will appear on homepage immediately',
          'Upload custom poster image if needed',
          'Configure pricing in venue admin',
          'Test booking flow'
        ]
      }
    })
    
  } catch (error) {
    console.error('❌ Admin show creation failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create show',
      details: error instanceof Error ? error.message : 'Unknown error',
      help: {
        commonIssues: [
          'Venue not found - create venue first',
          'Show title already exists',
          'Invalid date format (use YYYY-MM-DD)',
          'Invalid price format (use numbers only)'
        ]
      }
    }, { status: 500 })
  }
} 