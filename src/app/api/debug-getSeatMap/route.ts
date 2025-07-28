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
    const { seatMapService } = await import('@/lib/mongodb/seatmap-service')
    
    console.log('🔍 Testing getSeatMap method...')
    
    const venueId = 'her-majestys-theatre'
    const showSlug = 'phantom-of-the-opera'
    
    console.log(`📍 Looking for venueId: "${venueId}", showSlug: "${showSlug}"`)
    
    // Check what collection the service is actually using
    console.log('🔍 Checking SeatMapService collection...')
    
    // Get the collection from seatMapService
    // @ts-ignore - accessing private method for debugging
    const serviceCollection = await seatMapService.getCollection()
    console.log('📋 SeatMapService collection name:', serviceCollection.collectionName)
    
    // Test the getSeatMap method directly
    const seatMap = await seatMapService.getSeatMap(venueId, showSlug)
    
    if (seatMap) {
      console.log('✅ getSeatMap found seat map!')
      console.log(`📊 Sections: ${Object.keys(seatMap.sections).length}`)
      
      return NextResponse.json({
        success: true,
        found: true,
        venueId,
        showSlug,
        sectionCount: Object.keys(seatMap.sections).length,
        sectionNames: Object.keys(seatMap.sections),
        layout: seatMap.layout,
        metadata: seatMap.metadata || null
      })
    } else {
      console.log('❌ getSeatMap returned null')
      
      // Try to debug the raw MongoDB query
      const { getMongoDb } = await import('@/lib/mongodb/connection')
      const db = await getMongoDb()
      
      // First check what collections exist
      const collections = await db.listCollections().toArray()
      const collectionNames = collections.map(c => c.name)
      console.log('🔍 Available collections:', collectionNames)
      
      const collection = db.collection('seat map')
      
      // Test if document exists
      const docExists = await collection.findOne({ venueId })
      console.log('📋 Document exists check:', !!docExists)
      
      // Check all documents in collection to see what venueIds exist
      const allDocs = await collection.find({}, { projection: { _id: 1, venueId: 1 } }).toArray()
      console.log('📋 All documents in collection:', allDocs.map(d => ({ _id: d._id, venueId: d.venueId })))
      
      // Try exact match search
      const exactMatch = await collection.findOne({ venueId: 'her-majestys-theatre' })
      console.log('🎯 Exact match search result:', !!exactMatch)
      
      if (docExists) {
        console.log('📄 Document _id:', docExists._id)
        console.log('📄 Document venueId:', docExists.venueId)
        console.log('📄 Shows keys:', Object.keys(docExists.shows || {}))
        
        // Try direct access
        const showData = docExists.shows?.[showSlug]
        console.log('🎭 Show data exists:', !!showData)
        
        if (showData) {
          console.log('📊 Show sections:', Object.keys(showData.sections || {}))
        }
      }
      
             return NextResponse.json({
         success: false,
         found: false,
         venueId,
         showSlug,
         documentExists: !!docExists,
         showDataExists: !!(docExists?.shows?.[showSlug]),
         availableShows: Object.keys(docExists?.shows || {}),
         serviceCollectionName: serviceCollection.collectionName,
         availableCollections: collectionNames,
         allDocuments: allDocs.map(d => ({ _id: d._id, venueId: d.venueId })),
         exactMatchFound: !!exactMatch,
         debug: 'getSeatMap method returned null'
       })
    }

  } catch (error) {
    console.error('❌ getSeatMap debug error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to debug getSeatMap',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 