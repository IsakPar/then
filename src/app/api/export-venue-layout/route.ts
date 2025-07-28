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
  console.log('🔄 Converting MongoDB format to iOS format...')
  
  // Extract venue and layout info from MongoDB structure
  const showKeys = Object.keys(mongoSeatMap.shows || {})
  if (showKeys.length === 0) {
    throw new Error('No shows found in seat map data')
  }
  
  const showData = mongoSeatMap.shows[showKeys[0]]
  if (!showData.layout) {
    throw new Error('No layout found in show data')
  }
  
  const { width = 1000, height = 600, centerX = 500, centerY = 300, stageArea } = showData.layout
  
  // Convert MongoDB sections to iOS seats array
  const seats: any[] = []
  
  if (showData.sections) {
    Object.entries(showData.sections).forEach(([sectionId, section]: [string, any]) => {
      if (section.seats && Array.isArray(section.seats)) {
        section.seats.forEach((seat: any) => {
          seats.push({
            id: seat.hardcodedId || seat.id,
            sectionId: sectionId,
            row: seat.row,
            number: seat.number,
            position: {
              x: seat.x,
              y: seat.y
            },
            status: 'available',
            pricePence: seat.seatType === 'premium' ? 15000 : 
                       seat.seatType === 'box' ? 20000 : 
                       seat.seatType === 'grand' ? 25000 : 8500,
            accessibility: seat.isAccessible || false,
            seatType: seat.seatType || 'standard'
          })
        })
      }
    })
  }

  console.log(`✅ Converted ${seats.length} seats from ${Object.keys(showData.sections || {}).length} sections`)

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
    sectionLabels: generateSectionLabels(showData.sections || {}, width, height),
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
  
  if (sections && typeof sections === 'object') {
    Object.entries(sections).forEach(([sectionId, section]: [string, any]) => {
      if (section && section.seats && Array.isArray(section.seats)) {
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
      }
    })
  }
  
  return labels
} 