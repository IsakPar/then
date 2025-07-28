import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI && !process.env.MONGODB_URL && !process.env.MONGO_URL) {
      return NextResponse.json({ 
        error: 'MongoDB not configured' 
      }, { status: 503 })
    }

    // Dynamic import to prevent build-time connection
    const { getMongoDb } = await import('@/lib/mongodb/connection')
    
    const db = await getMongoDb()
    
    // List all collections
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map(c => c.name)
    
    console.log('🔍 MongoDB Collections found:', collectionNames)
    
    // Check if 'seat map' collection exists and get sample data
    let seatMapData = null
    let seatmapsData = null
    
    if (collectionNames.includes('seat map')) {
      const seatMapCollection = db.collection('seat map')
      const count = await seatMapCollection.countDocuments()
      const sample = await seatMapCollection.findOne()
      seatMapData = { count, sample }
      console.log('✅ Found "seat map" collection with', count, 'documents')
    }
    
    if (collectionNames.includes('seatmaps')) {
      const seatmapsCollection = db.collection('seatmaps')
      const count = await seatmapsCollection.countDocuments()
      const sample = await seatmapsCollection.findOne()
      seatmapsData = { count, sample }
      console.log('✅ Found "seatmaps" collection with', count, 'documents')
    }
    
    return NextResponse.json({
      success: true,
      collections: collectionNames,
      seatMapCollectionData: seatMapData,
      seatmapsCollectionData: seatmapsData,
      debug: {
        lookingFor: 'her-majestys-theatre document with phantom-of-the-opera show'
      }
    })

  } catch (error) {
    console.error('❌ MongoDB debug error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to debug MongoDB',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 