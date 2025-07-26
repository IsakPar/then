import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { showId: string } }
) {
  try {
    const showId = parseInt(params.showId)
    
    if (isNaN(showId)) {
      return NextResponse.json({
        error: 'Invalid show ID',
        details: 'Show ID must be a valid number'
      }, { status: 400 })
    }

    console.log(`🔄 Building hybrid seat map for show ${showId}`)

    // Import hybrid service
    const { hybridSeatMapService, HybridSeatMapService } = await import('@/lib/services/hybrid-seatmap-service')
    
    // Get venue/show mapping for MongoDB lookup
    const mapping = HybridSeatMapService.getShowVenueMapping(showId)
    if (!mapping) {
      return NextResponse.json({
        error: 'Show not found',
        details: `No venue mapping found for show ID ${showId}`
      }, { status: 404 })
    }
    
    const { venueId, showSlug } = mapping
    console.log(`🏛️ Venue: ${venueId}, Show: ${showSlug}`)

    // Get hybrid seat map (MongoDB layout + PostgreSQL pricing)
    const hybridSeatMap = await hybridSeatMapService.getHybridSeatMap(showId, venueId, showSlug)
    
    if (!hybridSeatMap) {
      return NextResponse.json({
        error: 'Seat map not available',
        details: `Could not build hybrid seat map for show ${showId}. Check that both MongoDB layout cache and PostgreSQL pricing data exist.`
      }, { status: 404 })
    }

    console.log(`✅ Built hybrid seat map: ${hybridSeatMap.metadata?.totalSeats} seats, ${hybridSeatMap.metadata?.availableSeats} available`)

    // Return complete hybrid data
    return NextResponse.json({
      success: true,
      showId,
      venueId,
      showSlug,
      seatMap: hybridSeatMap,
      metadata: {
        totalSeats: hybridSeatMap.metadata?.totalSeats || 0,
        availableSeats: hybridSeatMap.metadata?.availableSeats || 0,
        priceRange: hybridSeatMap.metadata?.priceRange || { min: 0, max: 0 },
        accessibleSeats: hybridSeatMap.metadata?.accessibleSeats || 0,
        levels: hybridSeatMap.metadata?.levels || [],
        dataSource: 'hybrid-mongodb-postgresql',
        generatedAt: new Date().toISOString()
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60', // Cache for 1 minute
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('❌ Error building hybrid seat map:', error)
    return NextResponse.json({
      error: 'Failed to build hybrid seat map',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Add OPTIONS for CORS support
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 