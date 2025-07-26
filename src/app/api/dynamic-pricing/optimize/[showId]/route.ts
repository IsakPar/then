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

    console.log(`💰 Optimizing pricing for show ${showId}`)

    // Import dynamic pricing engine
    const { dynamicPricingEngine } = await import('@/lib/services/dynamic-pricing-engine')
    
    // Get strategy from query params
    const { searchParams } = new URL(request.url)
    const strategyType = searchParams.get('strategy') || 'balanced'
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // Select pricing strategy
    let strategy
    switch (strategyType) {
      case 'aggressive':
        strategy = dynamicPricingEngine.getAggressiveStrategy()
        break
      case 'conservative':
        strategy = dynamicPricingEngine.getConservativeStrategy()
        break
      default:
        strategy = undefined // Use default balanced strategy
    }
    
    // Optimize pricing for entire show
    const optimizedPrices = await dynamicPricingEngine.optimizeShowPricing(showId, strategy)
    
    if (optimizedPrices.size === 0) {
      return NextResponse.json({
        error: 'No pricing optimization available',
        details: `Could not optimize pricing for show ${showId}. Check that show exists and has valid sections.`
      }, { status: 404 })
    }
    
    // Convert Map to object for JSON response
    const pricesArray = Array.from(optimizedPrices.entries()).map(([sectionId, optimizedPrice]) => ({
      sectionId,
      ...optimizedPrice
    }))
    
    console.log(`✅ Optimized pricing for ${pricesArray.length} sections`)
    
    // Calculate overall statistics
    const totalOriginalRevenue = pricesArray.reduce((sum, p) => sum + p.originalPrice, 0)
    const totalOptimizedRevenue = pricesArray.reduce((sum, p) => sum + p.optimizedPrice, 0)
    const overallLift = ((totalOptimizedRevenue - totalOriginalRevenue) / Math.max(totalOriginalRevenue, 1)) * 100
    
    return NextResponse.json({
      success: true,
      showId,
      strategy: strategyType,
      optimizedPrices: pricesArray,
      summary: {
        sectionsOptimized: pricesArray.length,
        totalOriginalRevenue,
        totalOptimizedRevenue,
        overallLift: Math.round(overallLift * 100) / 100, // Round to 2 decimal places
        averageConfidence: pricesArray.reduce((sum, p) => sum + p.reasoning.confidence, 0) / Math.max(pricesArray.length, 1),
        priceRange: {
          lowest: Math.min(...pricesArray.map(p => p.optimizedPrice)),
          highest: Math.max(...pricesArray.map(p => p.optimizedPrice))
        }
      },
      metadata: {
        optimizedAt: new Date().toISOString(),
        validUntil: pricesArray[0]?.validUntil || new Date(Date.now() + 15 * 60 * 1000),
        algorithm: 'DynamicPricingEngine',
        version: '1.0'
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('❌ Error optimizing pricing:', error)
    return NextResponse.json({
      error: 'Failed to optimize pricing',
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