import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debug: Testing Phantom MongoDB connection...')
    
    // Dynamic import to prevent build-time connection
    const { seatMapService } = await import('@/lib/mongodb/seatmap-service')
    
    // Test the exact same query that phantom-hybrid uses
    const result = await seatMapService.getSeatMap('her-majestys-theatre', 'phantom-of-the-opera')
    
    return NextResponse.json({
      success: !!result,
      message: result ? 'Phantom seat map found!' : 'Phantom seat map not found',
      data: result ? {
        sections: Object.keys(result.sections).length,
        totalSeats: result.metadata?.totalSeats,
        levels: result.metadata?.levels
      } : null,
      debug: {
        venueId: 'her-majestys-theatre',
        showSlug: 'phantom-of-the-opera',
        queryUsed: 'seatMapService.getSeatMap()',
        resultType: typeof result
      }
    })

  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        venueId: 'her-majestys-theatre',
        showSlug: 'phantom-of-the-opera'
      }
    }, { status: 500 })
  }
} 