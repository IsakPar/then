import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 Creating Phantom of the Opera seat map in MongoDB...')
    
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI && !process.env.MONGODB_URL && !process.env.MONGO_URL) {
      return NextResponse.json({
        success: false,
        error: 'MongoDB not configured. Please set MONGODB_URI environment variable.'
      }, { status: 503 })
    }

    // Dynamic import to prevent build-time connection
    const { seatMapService } = await import('@/lib/mongodb/seatmap-service')

    // Initialize the Phantom seat map
    const result = await seatMapService.initializePhantomSeatMap()
    
    if (result) {
      console.log('✅ Phantom seat map created successfully!')
      
      // Test if we can retrieve it
      const testRetrieve = await seatMapService.getSeatMap('her-majestys-theatre', 'phantom-of-the-opera')
      
      return NextResponse.json({
        success: true,
        message: '🎭 Phantom of the Opera seat map created successfully!',
        details: {
          venueId: 'her-majestys-theatre',
          showSlug: 'phantom-of-the-opera',
          totalSeats: testRetrieve?.shows?.['phantom-of-the-opera']?.metadata?.totalSeats || 1252,
          sections: testRetrieve ? Object.keys(testRetrieve.shows['phantom-of-the-opera'].sections).length : 0,
          levels: 4,
          venue: "Her Majesty's Theatre",
          address: "Haymarket, St. James's, London SW1Y 4QL"
        },
        nextSteps: [
          'Test /api/seatmap/phantom-hybrid endpoint',
          'Verify iOS app can load Phantom show',
          'Test seat selection and booking flow'
        ]
      })
    } else {
      console.error('❌ Failed to create Phantom seat map')
      return NextResponse.json({
        success: false,
        error: 'Failed to create Phantom seat map',
        suggestion: 'Check MongoDB connection and permissions'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Phantom seat map creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create Phantom seat map',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 