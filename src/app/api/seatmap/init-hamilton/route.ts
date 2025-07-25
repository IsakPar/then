import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Check if MongoDB is configured (support both Railway's MONGODB_URL and MONGODB_URI)
    if (!process.env.MONGODB_URI && !process.env.MONGODB_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'MongoDB not configured. Please set MONGODB_URI or MONGODB_URL environment variable.',
        details: 'This endpoint requires MongoDB to be configured.'
      }, { status: 503 })
    }

    // Dynamic import to prevent build-time connection
    const { seatMapService } = await import('@/lib/mongodb/seatmap-service')

    const { show } = await request.json()
    
    console.log(`🎭 Initializing seat map for: ${show || 'Hamilton'}`)
    
    let success = false
    let message = ''
    
    if (show === 'phantom') {
      success = await seatMapService.initializePhantomSeatMap()
      message = success ? 
        '✅ Phantom of the Opera seat map initialized successfully' : 
        '❌ Failed to initialize Phantom seat map'
    } else {
      // Default to Hamilton
      success = await seatMapService.initializeHamiltonSeatMap()
      message = success ? 
        '✅ Hamilton seat map initialized successfully' : 
        '❌ Failed to initialize Hamilton seat map'
    }

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message,
        show: show || 'hamilton'
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message,
        show: show || 'hamilton'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Error in seat map initialization:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to initialize seat map',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check if MongoDB is configured (support both Railway's MONGODB_URL and MONGODB_URI)
    if (!process.env.MONGODB_URI && !process.env.MONGODB_URL) {
      return NextResponse.json({ 
        exists: false, 
        error: 'MongoDB not configured. Please set MONGODB_URI or MONGODB_URL environment variable.' 
      }, { status: 503 })
    }

    // Dynamic import to prevent build-time connection
    const { seatMapService } = await import('@/lib/mongodb/seatmap-service')

    const { searchParams } = new URL(request.url)
    const show = searchParams.get('show')
    
    console.log(`🔍 Checking seat map status for: ${show || 'Hamilton'}`)
    
    let venueId: string
    let showSlug: string
    
    if (show === 'phantom') {
      venueId = 'her-majestys-theatre'
      showSlug = 'phantom-of-the-opera'
    } else {
      venueId = 'victoria-palace-theatre'
      showSlug = 'hamilton'
    }
    
    const seatMap = await seatMapService.getSeatMap(venueId, showSlug)
    
    if (seatMap) {
      // Calculate total seats
      let totalSeats = 0
      const sectionCount = Object.keys(seatMap.sections).length
      
      Object.values(seatMap.sections).forEach(section => {
        totalSeats += section.seats.length
      })
      
      return NextResponse.json({
        exists: true,
        show: show || 'hamilton',
        venueId,
        showSlug,
        totalSeats,
        sectionCount,
        sections: Object.keys(seatMap.sections),
        metadata: seatMap.metadata || {}
      })
    } else {
      return NextResponse.json({
        exists: false,
        show: show || 'hamilton',
        venueId,
        showSlug,
        message: `${show === 'phantom' ? 'Phantom of the Opera' : 'Hamilton'} seat map not found`
      })
    }

  } catch (error) {
    console.error('❌ Error checking seat map:', error)
    return NextResponse.json({ 
      exists: false,
      error: 'Failed to check seat map',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 