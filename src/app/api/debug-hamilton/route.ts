import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🎭 Debug: Testing Hamilton seat map initialization...')
    
    // Test MongoDB connection
    const { connectToMongoDB } = await import('@/lib/mongodb/connection')
    const { db } = await connectToMongoDB()
    console.log('✅ MongoDB connection successful')
    
    // Get SeatMapService
    const { seatMapService } = await import('@/lib/mongodb/seatmap-service')
    console.log('✅ SeatMapService imported')
    
    // Test collection access directly
    try {
      const collection = db.collection('seatmaps')
      console.log('✅ Seatmaps collection accessed')
      
      // Test basic document insert
      const testDoc = {
        _id: 'test-venue',
        venueId: 'test-venue',
        venueName: 'Test Venue',
        shows: {
          'test-show': {
            sections: {
              testSection: {
                id: 'testSection',
                name: 'Test Section',
                color: '#FF0000',
                seats: [{
                  id: 'test_A_1',
                  hardcodedId: 'test-A-1',
                  row: 'A',
                  number: 1,
                  x: 100,
                  y: 100,
                  isAccessible: false
                }],
                layout: {
                  rows: 1,
                  seatsPerRow: 1,
                  startX: 100,
                  startY: 100,
                  seatSpacing: 30,
                  rowSpacing: 40
                }
              }
            },
            layout: {
              width: 1000,
              height: 600,
              scale: 1.0
            }
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      const insertResult = await collection.replaceOne(
        { _id: 'test-venue' },
        testDoc,
        { upsert: true }
      )
      
      console.log('✅ Test document insert result:', insertResult)
      
    } catch (error) {
      console.error('❌ Direct collection test failed:', error)
      return NextResponse.json({
        success: false,
        step_failed: 'direct_collection_test',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
    
    // Now test Hamilton initialization with detailed logging
    console.log('🎭 Testing Hamilton initialization with detailed logging...')
    
    try {
      // Manual Hamilton seat map creation
      const venueId = 'victoria-palace-theatre'
      const showSlug = 'hamilton'
      
      console.log(`📍 Venue ID: ${venueId}, Show: ${showSlug}`)
      
      // Test generateSectionSeats function
      console.log('🔧 Testing seat generation...')
      
      const hamiltonSeatMap = {
        _id: venueId,
        venueId,
        venueName: "Victoria Palace Theatre",
        shows: {
          [showSlug]: {
            sections: {
              orchestra: {
                id: 'orchestra',
                name: 'Orchestra',
                color: '#FFD700',
                seats: [{
                  id: 'orchestra_A_1',
                  hardcodedId: 'orchestra-A-1',
                  row: 'A',
                  number: 1,
                  x: 100,
                  y: 100,
                  isAccessible: false,
                  seatType: 'standard'
                }],
                layout: {
                  rows: 1,
                  seatsPerRow: 1,
                  startX: 100,
                  startY: 100,
                  seatSpacing: 30,
                  rowSpacing: 40
                }
              }
            },
            layout: {
              width: 1000,
              height: 600,
              scale: 1.0
            }
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
      
      console.log('✅ Hamilton seat map data structure created')
      
      // Test actual insertion
      const collection = db.collection('seatmaps')
      const result = await collection.replaceOne(
        { _id: venueId },
        hamiltonSeatMap,
        { upsert: true }
      )
      
      console.log('✅ Hamilton seat map inserted:', result)
      
      // Verify the data was inserted
      const inserted = await collection.findOne({ _id: venueId })
      console.log('✅ Hamilton seat map verified:', inserted ? 'Found' : 'Not found')
      
      return NextResponse.json({
        success: true,
        message: 'Hamilton seat map successfully created manually',
        result: {
          matched: result.matchedCount,
          modified: result.modifiedCount,
          upserted: result.upsertedCount,
          verified: !!inserted
        }
      })
      
    } catch (error) {
      console.error('❌ Manual Hamilton creation failed:', error)
      return NextResponse.json({
        success: false,
        step_failed: 'manual_hamilton_creation',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Debug Hamilton failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug Hamilton failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 