import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('📤 JSON Upload to MongoDB - Starting...')
    
    // Check MongoDB connection
    if (!process.env.MONGODB_URI && !process.env.MONGODB_URL && !process.env.MONGO_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'MongoDB not configured' 
      }, { status: 503 })
    }

    // Get JSON data from request
    const jsonData = await request.json()
    console.log('📄 Received JSON data:', Object.keys(jsonData))
    
    if (!jsonData || typeof jsonData !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON data provided'
      }, { status: 400 })
    }

    // Connect to MongoDB
    const { connectToMongoDB } = await import('@/lib/mongodb/connection')
    const { db } = await connectToMongoDB()
    console.log('✅ MongoDB connection established')
    
    // Get collection name from request or default to 'seatmaps'
    const collectionName = jsonData.collection || 'seatmaps'
    const collection = db.collection(collectionName)
    console.log(`📂 Using collection: ${collectionName}`)
    
    // Create indexes if it's the seatmaps collection
    if (collectionName === 'seatmaps') {
      try {
        await collection.createIndex({ venueId: 1 })
        await collection.createIndex({ 'shows.sections.seats.hardcodedId': 1 })
        console.log('✅ Seatmaps indexes created')
      } catch (error) {
        console.log('📝 Index creation result:', error)
      }
    }
    
    // Remove the collection field from data if it exists
    const dataToInsert = { ...jsonData }
    delete dataToInsert.collection
    
    // Determine operation type
    const operation = jsonData.operation || 'upsert'
    let result
    
    if (operation === 'insert') {
      // Direct insert
      result = await collection.insertOne(dataToInsert)
      console.log('✅ Document inserted')
    } else if (operation === 'replace' && dataToInsert._id) {
      // Replace with upsert
      const { _id, ...docData } = dataToInsert
      result = await collection.replaceOne(
        { _id } as any,
        { _id, ...docData },
        { upsert: true }
      )
      console.log('✅ Document replaced/upserted')
    } else {
      // Default: insert with auto-generated ID
      result = await collection.insertOne(dataToInsert)
      console.log('✅ Document inserted with auto ID')
    }
    
    // Verify insertion
    const documentId = result.insertedId || dataToInsert._id
    let verification = null
    
    if (documentId) {
      verification = await collection.findOne({ _id: documentId } as any)
    }
    
    // Get updated collection stats
    const collectionCount = await collection.countDocuments()
    const collections = await db.listCollections().toArray()
    
    console.log(`✅ Upload complete - ${collectionCount} documents in ${collectionName}`)
    
    return NextResponse.json({
      success: true,
      message: `JSON data successfully uploaded to ${collectionName}`,
      details: {
        collection: collectionName,
        operation,
        result: {
          acknowledged: result.acknowledged,
          insertedId: result.insertedId?.toString(),
          matchedCount: (result as any).matchedCount || 0,
          modifiedCount: (result as any).modifiedCount || 0,
          upsertedCount: (result as any).upsertedCount || 0
        },
        verification: verification ? 'Document verified in database' : 'Verification failed',
        database_stats: {
          collection_document_count: collectionCount,
          total_collections: collections.length,
          all_collections: collections.map(c => c.name)
        }
      }
    })
    
  } catch (error) {
    console.error('❌ JSON upload failed:', error)
    return NextResponse.json({
      success: false,
      error: 'JSON upload failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Simple endpoint to check MongoDB collections
    const { connectToMongoDB } = await import('@/lib/mongodb/connection')
    const { db } = await connectToMongoDB()
    
    const collections = await db.listCollections().toArray()
    const stats = await db.stats()
    
    const collectionDetails = await Promise.all(
      collections.map(async (col) => {
        const count = await db.collection(col.name).countDocuments()
        return {
          name: col.name,
          documentCount: count
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB status check',
      database: {
        name: db.databaseName,
        collections: collectionDetails,
        total_collections: collections.length,
        database_size: stats.dataSize,
        storage_size: stats.storageSize
      }
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'MongoDB check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 