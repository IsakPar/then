import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI && !process.env.MONGODB_URL && !process.env.MONGO_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'MongoDB not configured. Please set MONGODB_URI environment variable.',
        details: 'Layout cache requires MongoDB to be configured.'
      }, { status: 503 })
    }

    // Dynamic import to prevent build-time connection
    const { layoutCacheService } = await import('@/lib/mongodb/layout-cache-service')

    const { show } = await request.json()
    
    console.log(`🗺️ Initializing layout cache for: ${show || 'all shows'}`)
    
    let results: { show: string; success: boolean; message: string }[] = []
    
    if (!show || show === 'all') {
      // Initialize both shows
      console.log('🎭 Initializing layout cache for all shows...')
      
      // Hamilton
      const hamiltonSuccess = await layoutCacheService.initializeHamiltonLayoutCache()
      results.push({
        show: 'hamilton',
        success: hamiltonSuccess,
        message: hamiltonSuccess ? 
          '✅ Hamilton layout cache initialized successfully' : 
          '❌ Failed to initialize Hamilton layout cache'
      })
      
      // Phantom
      const phantomSuccess = await layoutCacheService.initializePhantomLayoutCache()
      results.push({
        show: 'phantom-of-the-opera',
        success: phantomSuccess,
        message: phantomSuccess ? 
          '✅ Phantom layout cache initialized successfully' : 
          '❌ Failed to initialize Phantom layout cache'
      })
      
    } else if (show === 'phantom' || show === 'phantom-of-the-opera') {
      // Initialize Phantom only
      const success = await layoutCacheService.initializePhantomLayoutCache()
      results.push({
        show: 'phantom-of-the-opera',
        success,
        message: success ? 
          '✅ Phantom layout cache initialized successfully' : 
          '❌ Failed to initialize Phantom layout cache'
      })
      
    } else if (show === 'hamilton') {
      // Initialize Hamilton only
      const success = await layoutCacheService.initializeHamiltonLayoutCache()
      results.push({
        show: 'hamilton',
        success,
        message: success ? 
          '✅ Hamilton layout cache initialized successfully' : 
          '❌ Failed to initialize Hamilton layout cache'
      })
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'Unknown show',
        details: `Show "${show}" not supported. Supported shows: hamilton, phantom-of-the-opera, all`
      }, { status: 400 })
    }

    const allSucceeded = results.every(r => r.success)
    const successCount = results.filter(r => r.success).length

    console.log(`🎯 Layout cache initialization complete: ${successCount}/${results.length} successful`)

    return NextResponse.json({
      success: allSucceeded,
      message: allSucceeded ? 
        `✅ All layout caches initialized successfully (${successCount}/${results.length})` :
        `⚠️ Partial success: ${successCount}/${results.length} layout caches initialized`,
      results,
      statistics: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount
      }
    }, { 
      status: allSucceeded ? 200 : 207  // 207 = Multi-Status for partial success
    })

  } catch (error) {
    console.error('❌ Error initializing layout cache:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize layout cache',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Add CORS support for development/testing
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
} 