import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/connection'
import { shows, venues, seats, sections } from '@/lib/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ 
        success: false,
        system: 'hybrid',
        error: 'MongoDB not configured. Please set MONGODB_URI environment variable.',
        details: 'This endpoint requires MongoDB to be configured.'
      }, { status: 503 })
    }

    // Dynamic import to prevent build-time connection
    const { seatMapService } = await import('@/lib/mongodb/seatmap-service')

    const { hardcodedSeatIds, showDate, showTime } = await request.json()
    
    console.log('🎭 Phantom Hybrid API: Processing seat request...')
    console.log('📍 Hardcoded seat IDs:', hardcodedSeatIds)
    console.log('📅 Show date/time:', showDate, showTime)

    // Step 1: Get layout data from MongoDB
    console.log('📋 Step 1: Fetching layout from MongoDB...')
    const mongoSeatMap = await seatMapService.getSeatMap('her-majestys-theatre', 'phantom-of-the-opera')
    
    if (!mongoSeatMap) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phantom seat map not found in MongoDB',
        suggestion: 'Initialize the seat map first'
      }, { status: 404 })
    }

    // Step 2: Translate hardcoded IDs to layout data
    console.log('🔄 Step 2: Translating hardcoded IDs...')
    const translations = await seatMapService.translateHardcodedSeats(
      'her-majestys-theatre', 
      'phantom-of-the-opera', 
      hardcodedSeatIds
    )

    console.log(`✅ Found ${translations.length} seat translations`)

    // Step 3: Get PostgreSQL show and venue info
    console.log('🗄️ Step 3: Fetching show info from PostgreSQL...')
    const showInfo = await db
      .select({
        showId: shows.id,
        showTitle: shows.title,
        venueName: venues.name,
        venueAddress: venues.address
      })
      .from(shows)
      .innerJoin(venues, eq(shows.venueId, venues.id))
      .where(and(
        eq(shows.title, 'The Phantom of the Opera'),
        eq(venues.name, "Her Majesty's Theatre")
      ))
      .limit(1)

    if (showInfo.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phantom show not found in PostgreSQL',
        suggestion: 'Run the PostgreSQL setup script first'
      }, { status: 404 })
    }

    const { showId, showTitle, venueName, venueAddress } = showInfo[0]

    // Step 4: Create mapping from MongoDB seat data to PostgreSQL queries
    console.log('🔗 Step 4: Mapping seat sections to PostgreSQL...')
    const sectionMappings: Record<string, string> = {
      'premiumOrchestra': 'Premium Orchestra',
      'standardOrchestra': 'Standard Orchestra', 
      'sideBoxLeft': 'Side Box Left',
      'sideBoxRight': 'Side Box Right',
      'premiumCircle': 'Premium Dress Circle',
      'standardCircle': 'Standard Dress Circle',
      'circleBoxLeft': 'Circle Box Left',
      'circleBoxRight': 'Circle Box Right',
      'grandBoxes': 'Grand Boxes',
      'frontUpper': 'Front Upper Circle',
      'rearUpper': 'Rear Upper Circle',
      'upperBoxLeft': 'Upper Box Left',
      'upperBoxRight': 'Upper Box Right',
      'grandCircle': 'Grand Circle'
    }

    // Step 5: Get pricing and availability from PostgreSQL
    console.log('💰 Step 5: Fetching pricing/availability from PostgreSQL...')
    const hybridSeatData = []

    for (const translation of translations) {
      if (!translation.seat) {
        hybridSeatData.push({
          hardcodedId: translation.hardcodedId,
          found: false,
          error: 'Seat not found in MongoDB'
        })
        continue
      }

      const mongoSeat = translation.seat
      
      // Extract section ID from MongoDB seat ID (e.g., "premiumOrchestra_A_1" -> "premiumOrchestra")
      const sectionId = mongoSeat.id.split('_')[0]
      const postgresSection = sectionMappings[sectionId]
      
      if (!postgresSection) {
        hybridSeatData.push({
          hardcodedId: translation.hardcodedId,
          found: false,
          error: `Section mapping not found for: ${sectionId}`
        })
        continue
      }

      // Query PostgreSQL for pricing and availability
      const seatBusinessData = await db
        .select({
          seatId: seats.id,
          pricePence: seats.pricePence,
          status: seats.status,
          isAccessible: seats.isAccessible,
          rowLetter: seats.rowLetter,
          seatNumber: seats.seatNumber,
          sectionName: sections.name
        })
        .from(seats)
        .innerJoin(sections, eq(seats.sectionId, sections.id))
        .where(and(
          eq(seats.showId, showId),
          eq(sections.name, postgresSection),
          eq(seats.rowLetter, mongoSeat.row.toString()),
          eq(seats.seatNumber, mongoSeat.number)
        ))
        .limit(1)

      if (seatBusinessData.length === 0) {
        hybridSeatData.push({
          hardcodedId: translation.hardcodedId,
          found: false,
          error: `Seat not found in PostgreSQL: ${postgresSection} ${mongoSeat.row}${mongoSeat.number}`
        })
        continue
      }

      const businessData = seatBusinessData[0]

      // Combine MongoDB layout data with PostgreSQL business data
      hybridSeatData.push({
        hardcodedId: translation.hardcodedId,
        found: true,
        // Layout data from MongoDB
        layout: {
          x: mongoSeat.x,
          y: mongoSeat.y,
          sectionId: sectionId,
          sectionName: mongoSeat.metadata?.level !== undefined ? 
            `${postgresSection} (Level ${mongoSeat.metadata.level})` : postgresSection,
          sectionColor: mongoSeatMap.sections[sectionId]?.color,
          seatType: mongoSeat.seatType,
          viewQuality: mongoSeat.metadata?.viewQuality
        },
        // Business data from PostgreSQL
        business: {
          seatId: businessData.seatId,
          row: businessData.rowLetter,
          number: businessData.seatNumber,
          pricePence: businessData.pricePence,
          priceDisplay: `£${(businessData.pricePence / 100).toFixed(2)}`,
          status: businessData.status,
          isAvailable: businessData.status === 'available',
          isAccessible: businessData.isAccessible
        }
      })
    }

    // Step 6: Calculate summary
    const successfulMappings = hybridSeatData.filter(seat => seat.found)
    const totalPrice = successfulMappings.reduce((sum, seat) => 
      sum + (seat.business?.pricePence || 0), 0
    )

    console.log(`✅ Hybrid mapping complete: ${successfulMappings.length}/${hybridSeatData.length} seats found`)

    return NextResponse.json({
      success: true,
      system: 'hybrid',
      show: {
        id: showId,
        title: showTitle,
        venue: venueName,
        address: venueAddress,
        date: showDate,
        time: showTime
      },
      seats: hybridSeatData,
      summary: {
        requested: hardcodedSeatIds.length,
        found: successfulMappings.length,
        totalPricePence: totalPrice,
        totalPriceDisplay: `£${(totalPrice / 100).toFixed(2)}`,
        averagePriceDisplay: successfulMappings.length > 0 ? 
          `£${(totalPrice / successfulMappings.length / 100).toFixed(2)}` : '£0.00'
      },
      dataSources: {
        layout: 'MongoDB (her-majestys-theatre/phantom-of-the-opera)',
        pricing: 'PostgreSQL (shows/seats/sections)',
        availability: 'PostgreSQL (real-time)'
      }
    })

  } catch (error) {
    console.error('❌ Phantom Hybrid API error:', error)
    return NextResponse.json({ 
      success: false,
      system: 'hybrid',
      error: 'Hybrid seat mapping failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ 
        success: false,
        system: 'hybrid',
        error: 'MongoDB not configured. Please set MONGODB_URI environment variable.'
      }, { status: 503 })
    }

    // Dynamic import to prevent build-time connection
    const { seatMapService } = await import('@/lib/mongodb/seatmap-service')

    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')
    const level = searchParams.get('level')
    
    console.log('🎭 Phantom Hybrid API: Getting section overview...')

    // Get MongoDB layout data
    const mongoSeatMap = await seatMapService.getSeatMap('her-majestys-theatre', 'phantom-of-the-opera')
    
    if (!mongoSeatMap) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phantom seat map not found in MongoDB'
      }, { status: 404 })
    }

    // Get PostgreSQL show info
    const showInfo = await db
      .select({
        showId: shows.id,
        showTitle: shows.title
      })
      .from(shows)
      .innerJoin(venues, eq(shows.venueId, venues.id))
      .where(and(
        eq(shows.title, 'The Phantom of the Opera'),
        eq(venues.name, "Her Majesty's Theatre")
      ))
      .limit(1)

    if (showInfo.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phantom show not found in PostgreSQL'
      }, { status: 404 })
    }

    // Combine section data
    const hybridSections = []
    
    for (const [sectionId, sectionData] of Object.entries(mongoSeatMap.sections)) {
      // Filter by section or level if specified
      if (section && sectionId !== section) continue
      if (level && sectionData.seats[0]?.metadata?.level?.toString() !== level) continue

      // Get PostgreSQL availability summary
      const sectionMappings: Record<string, string> = {
        'premiumOrchestra': 'Premium Orchestra',
        'standardOrchestra': 'Standard Orchestra',
        'sideBoxLeft': 'Side Box Left',
        'sideBoxRight': 'Side Box Right',
        'premiumCircle': 'Premium Dress Circle',
        'standardCircle': 'Standard Dress Circle',
        'circleBoxLeft': 'Circle Box Left',
        'circleBoxRight': 'Circle Box Right',
        'grandBoxes': 'Grand Boxes',
        'frontUpper': 'Front Upper Circle',
        'rearUpper': 'Rear Upper Circle',
        'upperBoxLeft': 'Upper Box Left',
        'upperBoxRight': 'Upper Box Right',
        'grandCircle': 'Grand Circle'
      }

      const postgresSection = sectionMappings[sectionId]
      
      if (postgresSection) {
        const availabilityData = await db
          .select({
            totalSeats: db.count(),
            avgPrice: db.avg(seats.pricePence),
          })
          .from(seats)
          .innerJoin(sections, eq(seats.sectionId, sections.id))
          .where(and(
            eq(seats.showId, showInfo[0].showId),
            eq(sections.name, postgresSection)
          ))

        hybridSections.push({
          id: sectionId,
          name: sectionData.name,
          color: sectionData.color,
          level: sectionData.seats[0]?.metadata?.level || 0,
          layout: {
            totalSeats: sectionData.seats.length,
            rows: sectionData.layout.rows,
            seatsPerRow: sectionData.layout.seatsPerRow,
            coordinates: {
              startX: sectionData.layout.startX,
              startY: sectionData.layout.startY
            }
          },
          business: {
            postgresSection,
            totalSeats: availabilityData[0]?.totalSeats || 0,
            averagePricePence: Math.round(availabilityData[0]?.avgPrice || 0),
            averagePriceDisplay: `£${((availabilityData[0]?.avgPrice || 0) / 100).toFixed(2)}`
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      system: 'hybrid',
      show: {
        title: 'The Phantom of the Opera',
        venue: "Her Majesty's Theatre"
      },
      sections: hybridSections,
      totals: {
        sections: hybridSections.length,
        totalSeats: hybridSections.reduce((sum, s) => sum + s.layout.totalSeats, 0),
        levels: [...new Set(hybridSections.map(s => s.level))].sort()
      },
      dataSources: {
        layout: 'MongoDB',
        pricing: 'PostgreSQL',
        availability: 'PostgreSQL'
      }
    })

  } catch (error) {
    console.error('❌ Phantom section overview error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to get section overview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 