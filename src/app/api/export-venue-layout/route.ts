import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const venue = searchParams.get('venue') || 'phantom'
    const format = searchParams.get('format') || 'ios'
    
    console.log(`🎭 Exporting venue layout: ${venue} in ${format} format`)
    
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI && !process.env.MONGODB_URL && !process.env.MONGO_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'MongoDB not configured. Please set MONGODB_URI, MONGODB_URL, or MONGO_URL environment variable.' 
      }, { status: 503 })
    }

    // Dynamic import to prevent build-time connection
    const { seatMapService } = await import('@/lib/mongodb/seatmap-service')

    let venueId: string
    let showSlug: string
    let venueName: string
    
    if (venue === 'phantom') {
      venueId = 'her-majestys-theatre'
      showSlug = 'phantom-of-the-opera'
      venueName = "Her Majesty's Theatre"
    } else if (venue === 'hamilton') {
      venueId = 'victoria-palace-theatre'
      showSlug = 'hamilton'
      venueName = 'Victoria Palace Theatre'
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid venue. Use "phantom" or "hamilton"' 
      }, { status: 400 })
    }

    // Get MongoDB seat map
    const mongoSeatMap = await seatMapService.getSeatMap(venueId, showSlug)
    
    if (!mongoSeatMap) {
      return NextResponse.json({ 
        success: false, 
        error: `Seat map not found for ${venue}`,
        suggestion: 'Initialize the seat map first using /api/seatmap/init-hamilton'
      }, { status: 404 })
    }

    if (format === 'ios') {
      // Convert MongoDB format to iOS VenueLayout format
      const iosLayout = convertToIOSFormat(mongoSeatMap, venueName)
      
      // Return as downloadable JSON
      const response = NextResponse.json(iosLayout, { 
        headers: {
          'Content-Disposition': `attachment; filename="${venueId}-complete.json"`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log(`✅ Exported ${venue} venue layout with ${iosLayout.seats.length} seats`)
      return response
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Unsupported format. Use format=ios' 
    }, { status: 400 })

  } catch (error) {
    console.error('❌ Export venue layout error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to export venue layout',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function convertToIOSFormat(mongoSeatMap: any, venueName: string) {
  // Extract venue and layout info
  const layout = mongoSeatMap.shows[Object.keys(mongoSeatMap.shows)[0]]
  const { width, height, centerX, centerY, stageArea } = layout.layout
  
  // Convert MongoDB sections to iOS seats array
  const seats: any[] = []
  
  Object.entries(layout.sections).forEach(([sectionId, section]: [string, any]) => {
    section.seats.forEach((seat: any) => {
      seats.push({
        id: seat.id,
        sectionId: sectionId,
        row: seat.row,
        number: seat.number,
        position: {
          x: seat.position.x,
          y: seat.position.y
        },
        status: seat.availability || 'available',
        pricePence: seat.pricing?.pence || 8500,
        accessibility: seat.accessibility || false,
        seatType: seat.category || 'standard'
      })
    })
  })

  // Create iOS-compatible venue layout
  return {
    venue: {
      id: mongoSeatMap.venueId,
      name: venueName,
      viewport: {
        width,
        height
      }
    },
    stage: {
      id: 'main-stage',
      position: {
        x: stageArea?.x || centerX,
        y: stageArea?.y || 50
      },
      dimensions: {
        width: stageArea?.width || 400,
        height: stageArea?.height || 50
      },
      title: 'STAGE',
      backgroundColor: '#1A1A1A',
      borderColor: '#333333'
    },
    aisles: generateAisles(width, height, centerX, centerY),
    sectionLabels: generateSectionLabels(layout.sections, width, height),
    accessibilitySpots: [],
    seats
  }
}

function generateAisles(width: number, height: number, centerX: number, centerY: number) {
  return [
    {
      id: 'center-aisle',
      position: { x: centerX, y: centerY },
      dimensions: { width: 25, height: height * 0.6 },
      color: '#2A2A2A',
      opacity: 0.6,
      orientation: 'vertical'
    },
    {
      id: 'left-aisle',
      position: { x: centerX * 0.6, y: centerY },
      dimensions: { width: 35, height: height * 0.5 },
      color: '#2A2A2A',
      opacity: 0.4,
      orientation: 'vertical'
    },
    {
      id: 'right-aisle',
      position: { x: centerX * 1.4, y: centerY },
      dimensions: { width: 35, height: height * 0.5 },
      color: '#2A2A2A',
      opacity: 0.4,
      orientation: 'vertical'
    }
  ]
}

function generateSectionLabels(sections: any, width: number, height: number) {
  const labels: any[] = []
  let yOffset = 120
  
  Object.entries(sections).forEach(([sectionId, section]: [string, any]) => {
    const seatCount = section.seats.length
    const name = section.name || sectionId.replace(/([A-Z])/g, ' $1').trim()
    
    labels.push({
      id: `${sectionId}-label`,
      text: `${name.toUpperCase()} (${seatCount} seats)`,
      position: {
        x: width / 2,
        y: yOffset
      },
      fontSize: 16,
      colorHex: section.color || '#FFD700',
      fontWeight: 'bold',
      alignment: 'center'
    })
    
    yOffset += 200 // Space out labels vertically
  })
  
  return labels
} 