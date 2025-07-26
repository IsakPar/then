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

    console.log(`📊 Analyzing revenue optimization for show ${showId}`)

    // Import services
    const { dynamicPricingEngine } = await import('@/lib/services/dynamic-pricing-engine')
    const { hybridSeatMapService, HybridSeatMapService } = await import('@/lib/services/hybrid-seatmap-service')
    
    // Get venue/show mapping
    const mapping = HybridSeatMapService.getShowVenueMapping(showId)
    if (!mapping) {
      return NextResponse.json({
        error: 'Show not found',
        details: `No venue mapping found for show ID ${showId}`
      }, { status: 404 })
    }
    
    const { venueId, showSlug } = mapping

    // Get current show data
    const hybridSeatMap = await hybridSeatMapService.getHybridSeatMap(showId, venueId, showSlug)
    if (!hybridSeatMap) {
      return NextResponse.json({
        error: 'Show data not available',
        details: `Could not load show data for ${showId}`
      }, { status: 404 })
    }

    // Calculate current performance metrics
    const currentMetrics = calculateCurrentMetrics(hybridSeatMap)
    
    // Get optimized pricing scenarios
    const balancedPricing = await dynamicPricingEngine.optimizeShowPricing(showId)
    const aggressivePricing = await dynamicPricingEngine.optimizeShowPricing(showId, dynamicPricingEngine.getAggressiveStrategy())
    const conservativePricing = await dynamicPricingEngine.optimizeShowPricing(showId, dynamicPricingEngine.getConservativeStrategy())
    
    // Calculate revenue projections for each strategy
    const scenarios = {
      current: calculateRevenueProjection(hybridSeatMap, 'current'),
      balanced: calculateOptimizedProjection(hybridSeatMap, balancedPricing),
      aggressive: calculateOptimizedProjection(hybridSeatMap, aggressivePricing),
      conservative: calculateOptimizedProjection(hybridSeatMap, conservativePricing)
    }
    
    // Generate recommendations
    const recommendations = generateRecommendations(currentMetrics, scenarios)
    
    // Calculate potential uplift
    const bestScenario = getBestScenario(scenarios)
    const potentialUplift = ((bestScenario.projectedRevenue - scenarios.current.projectedRevenue) / Math.max(scenarios.current.projectedRevenue, 1)) * 100
    
    console.log(`📊 Revenue analysis complete: ${potentialUplift.toFixed(2)}% potential uplift`)

    return NextResponse.json({
      success: true,
      showId,
      venueId,
      showSlug,
      analysis: {
        currentMetrics,
        scenarios,
        recommendations,
        potentialUplift: Math.round(potentialUplift * 100) / 100,
        bestStrategy: bestScenario.strategy,
        confidenceScore: calculateConfidenceScore(currentMetrics, scenarios)
      },
      actionItems: generateActionItems(recommendations, bestScenario),
      metadata: {
        analyzedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
        dataPoints: Object.keys(hybridSeatMap.sections).length,
        algorithm: 'RevenueOptimizer',
        version: '1.0'
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=900', // Cache for 15 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('❌ Error analyzing revenue optimization:', error)
    return NextResponse.json({
      error: 'Failed to analyze revenue optimization',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper functions

function calculateCurrentMetrics(hybridSeatMap: any) {
  const sections = Object.values(hybridSeatMap.sections) as any[]
  
  let totalSeats = 0
  let availableSeats = 0
  let totalCurrentRevenue = 0
  let averagePrice = 0
  let premiumSectionOccupancy = 0
  let standardSectionOccupancy = 0
  
  for (const section of sections) {
    const sectionSeats = section.seats.length
    const sectionAvailable = section.seats.filter((s: any) => s.isAvailable).length
    const sectionOccupied = sectionSeats - sectionAvailable
    
    totalSeats += sectionSeats
    availableSeats += sectionAvailable
    
    // Calculate current revenue (for occupied seats)
    const sectionRevenue = section.seats
      .filter((s: any) => !s.isAvailable)
      .reduce((sum: number, s: any) => sum + s.pricePence, 0)
    totalCurrentRevenue += sectionRevenue
    
    // Track occupancy by section type
    const occupancyRate = sectionOccupied / Math.max(sectionSeats, 1)
    if (section.id.includes('premium') || section.id.includes('box')) {
      premiumSectionOccupancy += occupancyRate
    } else {
      standardSectionOccupancy += occupancyRate
    }
  }
  
  const occupiedSeats = totalSeats - availableSeats
  const occupancyRate = occupiedSeats / Math.max(totalSeats, 1)
  averagePrice = totalCurrentRevenue / Math.max(occupiedSeats, 1)
  
  return {
    totalSeats,
    availableSeats,
    occupiedSeats,
    occupancyRate: Math.round(occupancyRate * 100),
    currentRevenue: totalCurrentRevenue,
    averagePrice: Math.round(averagePrice),
    premiumOccupancy: Math.round((premiumSectionOccupancy / Math.max(sections.filter(s => s.id.includes('premium') || s.id.includes('box')).length, 1)) * 100),
    standardOccupancy: Math.round((standardSectionOccupancy / Math.max(sections.filter(s => !s.id.includes('premium') && !s.id.includes('box')).length, 1)) * 100),
    revenuePerSeat: Math.round(totalCurrentRevenue / Math.max(occupiedSeats, 1))
  }
}

function calculateRevenueProjection(hybridSeatMap: any, strategy: string) {
  const sections = Object.values(hybridSeatMap.sections) as any[]
  
  let projectedRevenue = 0
  let projectedSales = 0
  
  for (const section of sections) {
    const availableSeats = section.seats.filter((s: any) => s.isAvailable).length
    const currentPrice = section.seats[0]?.pricePence || 5000
    
    // Simple demand model based on occupancy and price
    const occupancyRate = 1 - (availableSeats / Math.max(section.seats.length, 1))
    let demandProbability = 0.7 // Base demand probability
    
    if (occupancyRate > 0.8) demandProbability = 0.9
    else if (occupancyRate > 0.6) demandProbability = 0.8
    else if (occupancyRate > 0.4) demandProbability = 0.7
    else if (occupancyRate > 0.2) demandProbability = 0.6
    else demandProbability = 0.5
    
    // Estimate sales based on demand probability
    const estimatedSales = Math.floor(availableSeats * demandProbability)
    projectedSales += estimatedSales
    projectedRevenue += estimatedSales * currentPrice
  }
  
  return {
    strategy,
    projectedRevenue,
    projectedSales,
    averageTicketPrice: projectedRevenue / Math.max(projectedSales, 1),
    confidence: 0.7
  }
}

function calculateOptimizedProjection(hybridSeatMap: any, optimizedPrices: Map<number, any>) {
  const sections = Object.values(hybridSeatMap.sections) as any[]
  
  let projectedRevenue = 0
  let projectedSales = 0
  
  for (const section of sections) {
    const availableSeats = section.seats.filter((s: any) => s.isAvailable).length
    const optimizedPrice = Array.from(optimizedPrices.values()).find(p => p.sectionId === section.id)?.optimizedPrice || section.seats[0]?.pricePence || 5000
    
    // Adjust demand based on price changes
    const originalPrice = section.seats[0]?.pricePence || 5000
    const priceRatio = optimizedPrice / Math.max(originalPrice, 1)
    
    // Simple price elasticity model
    const elasticity = -0.5 // Assuming moderate price sensitivity
    const demandAdjustment = Math.pow(priceRatio, elasticity)
    
    const occupancyRate = 1 - (availableSeats / Math.max(section.seats.length, 1))
    let baseDemandProbability = 0.7
    
    if (occupancyRate > 0.8) baseDemandProbability = 0.9
    else if (occupancyRate > 0.6) baseDemandProbability = 0.8
    else if (occupancyRate > 0.4) baseDemandProbability = 0.7
    else if (occupancyRate > 0.2) baseDemandProbability = 0.6
    else baseDemandProbability = 0.5
    
    const adjustedDemandProbability = Math.min(0.95, Math.max(0.1, baseDemandProbability * demandAdjustment))
    
    const estimatedSales = Math.floor(availableSeats * adjustedDemandProbability)
    projectedSales += estimatedSales
    projectedRevenue += estimatedSales * optimizedPrice
  }
  
  return {
    strategy: 'optimized',
    projectedRevenue,
    projectedSales,
    averageTicketPrice: projectedRevenue / Math.max(projectedSales, 1),
    confidence: 0.8
  }
}

function generateRecommendations(currentMetrics: any, scenarios: any) {
  const recommendations = []
  
  // Occupancy-based recommendations
  if (currentMetrics.occupancyRate < 50) {
    recommendations.push({
      type: 'pricing',
      priority: 'high',
      title: 'Consider Price Reduction',
      description: 'Low occupancy suggests prices may be too high. Consider conservative pricing strategy.',
      impact: 'medium',
      effort: 'low'
    })
  } else if (currentMetrics.occupancyRate > 85) {
    recommendations.push({
      type: 'pricing',
      priority: 'high',
      title: 'Implement Dynamic Pricing',
      description: 'High demand allows for premium pricing. Use aggressive strategy to maximize revenue.',
      impact: 'high',
      effort: 'low'
    })
  }
  
  // Section-specific recommendations
  if (currentMetrics.premiumOccupancy > currentMetrics.standardOccupancy + 20) {
    recommendations.push({
      type: 'inventory',
      priority: 'medium',
      title: 'Premium Section Optimization',
      description: 'Strong premium demand. Consider increasing premium section pricing.',
      impact: 'medium',
      effort: 'low'
    })
  }
  
  // Revenue optimization recommendations
  const bestScenario = getBestScenario(scenarios)
  if (bestScenario.projectedRevenue > scenarios.current.projectedRevenue * 1.1) {
    recommendations.push({
      type: 'strategy',
      priority: 'high',
      title: `Implement ${bestScenario.strategy} Pricing`,
      description: `Switch to ${bestScenario.strategy} pricing strategy for maximum revenue optimization.`,
      impact: 'high',
      effort: 'medium'
    })
  }
  
  return recommendations
}

function getBestScenario(scenarios: any) {
  const scenarioArray = Object.entries(scenarios).map(([key, value]) => ({
    strategy: key,
    ...(value as any)
  }))
  
  return scenarioArray.reduce((best, current) => 
    current.projectedRevenue > best.projectedRevenue ? current : best
  )
}

function calculateConfidenceScore(metrics: any, scenarios: any) {
  let confidence = 0.5 // Base confidence
  
  // Higher confidence with more data
  if (metrics.occupiedSeats > 100) confidence += 0.2
  if (metrics.occupancyRate > 30) confidence += 0.1
  if (metrics.occupancyRate < 90) confidence += 0.1 // Not oversold
  
  return Math.min(0.95, confidence)
}

function generateActionItems(recommendations: any[], bestScenario: any) {
  return [
    {
      action: `Switch to ${bestScenario.strategy} pricing strategy`,
      priority: 'immediate',
      expectedImpact: 'High revenue increase',
      implementation: 'Use dynamic pricing API endpoint'
    },
    {
      action: 'Monitor booking velocity',
      priority: 'ongoing',
      expectedImpact: 'Better pricing decisions',
      implementation: 'Track conversions and adjust pricing accordingly'
    },
    {
      action: 'A/B test pricing strategies',
      priority: 'medium-term',
      expectedImpact: 'Optimized long-term performance',
      implementation: 'Use A/B testing framework for price optimization'
    }
  ]
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