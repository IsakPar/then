import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI && !process.env.MONGODB_URL && !process.env.MONGO_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'MongoDB not configured' 
      }, { status: 503 })
    }

    const { connectToMongoDB } = await import('@/lib/mongodb/connection')
    const { db } = await connectToMongoDB()
    
    // Test basic operations
    const testCollection = db.collection('connection_test')
    
    // Write test
    const writeResult = await testCollection.insertOne({
      test: 'mongodb_connection_test',
      timestamp: new Date(),
      environment: 'production'
    })
    
    // Read test  
    const readResult = await testCollection.findOne({
      _id: writeResult.insertedId
    })
    
    // Cleanup
    await testCollection.deleteOne({
      _id: writeResult.insertedId
    })
    
    // Test collection listing
    const collections = await db.listCollections().toArray()
    
    return NextResponse.json({
      success: true,
      message: 'MongoDB read/write operations successful',
      tests: {
        connection: '✅ Connected',
        write: '✅ Insert successful',
        read: readResult ? '✅ Read successful' : '❌ Read failed',
        cleanup: '✅ Delete successful',
        database: db.databaseName,
        collections: collections.length
      },
      mongodb_info: {
        database_name: db.databaseName,
        collection_count: collections.length,
        collections: collections.map(c => c.name)
      }
    })
    
  } catch (error) {
    console.error('❌ MongoDB test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'MongoDB test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'list_collections') {
      const { connectToMongoDB } = await import('@/lib/mongodb/connection')
      const { db } = await connectToMongoDB()
      
      const collections = await db.listCollections().toArray()
      const stats = await db.stats()
      
      return NextResponse.json({
        success: true,
        database_name: db.databaseName,
        collections: collections.map(c => c.name),
        collection_count: collections.length,
        database_stats: {
          collections: stats.collections,
          dataSize: stats.dataSize,
          storageSize: stats.storageSize
        }
      })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    }, { status: 400 })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 