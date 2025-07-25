import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Debug: Testing seat map service step by step...')
    
    // Test MongoDB connection first
    const { connectToMongoDB } = await import('@/lib/mongodb/connection')
    const { db } = await connectToMongoDB()
    
    console.log('✅ Step 1: MongoDB connection successful')
    
    // Test basic collection creation without indexes
    const testCollection = db.collection('seatmaps_test')
    
    try {
      await testCollection.insertOne({ test: 'basic_document' })
      console.log('✅ Step 2: Basic collection creation successful')
    } catch (error) {
      console.error('❌ Step 2 failed:', error)
      throw error
    }
    
    // Test index creation
    try {
      console.log('🔧 Step 3: Testing index creation...')
      await testCollection.createIndex({ venueId: 1 })
      console.log('✅ Step 3a: Simple index creation successful')
      
      await testCollection.createIndex({ 'shows.sections.seats.hardcodedId': 1 })
      console.log('✅ Step 3b: Complex nested index creation successful')
    } catch (error) {
      console.error('❌ Step 3 failed (index creation):', error)
      return NextResponse.json({
        success: false,
        step_failed: 'index_creation',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Complex nested index creation failed'
      }, { status: 500 })
    }
    
    // Test seat map service instantiation
    try {
      console.log('🔧 Step 4: Testing SeatMapService...')
      const { seatMapService } = await import('@/lib/mongodb/seatmap-service')
      console.log('✅ Step 4a: SeatMapService import successful')
      
      // Try to get collection (this calls getCollection() which creates indexes)
      await seatMapService.getSeatMap('test-venue', 'test-show')
      console.log('✅ Step 4b: SeatMapService.getCollection() successful')
    } catch (error) {
      console.error('❌ Step 4 failed (SeatMapService):', error)
      return NextResponse.json({
        success: false,
        step_failed: 'seatmap_service',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'SeatMapService getCollection() failed'
      }, { status: 500 })
    }
    
    // Test Hamilton initialization manually
    try {
      console.log('🔧 Step 5: Testing Hamilton initialization...')
      const { seatMapService } = await import('@/lib/mongodb/seatmap-service')
      const result = await seatMapService.initializeHamiltonSeatMap()
      console.log(`✅ Step 5: Hamilton initialization result: ${result}`)
      
      if (!result) {
        throw new Error('Hamilton initialization returned false')
      }
    } catch (error) {
      console.error('❌ Step 5 failed (Hamilton init):', error)
      return NextResponse.json({
        success: false,
        step_failed: 'hamilton_initialization',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: 'Hamilton seat map initialization failed'
      }, { status: 500 })
    }
    
    // Cleanup test collection
    await testCollection.drop()
    
    return NextResponse.json({
      success: true,
      message: 'All steps completed successfully',
      steps_completed: [
        'mongodb_connection',
        'basic_collection_creation',
        'index_creation',
        'seatmap_service_instantiation',
        'hamilton_initialization'
      ]
    })
    
  } catch (error) {
    console.error('❌ Debug test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 