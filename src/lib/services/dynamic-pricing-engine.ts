import { db } from '@/lib/db/connection'
import { shows, seats, sections, bookings, bookingSeats } from '@/lib/db/schema'
import { eq, and, sql, gte, lte, desc } from 'drizzle-orm'

/**
 * 🎯 DYNAMIC PRICING ENGINE
 * 
 * Enterprise-grade pricing optimization system
 * - Time-based pricing (proximity to show, day of week, seasonality)
 * - Demand-based pricing (booking velocity, inventory levels)
 * - A/B testing framework for pricing strategies
 * - Revenue optimization algorithms
 * - Real-time price adjustments
 */

export interface PricingContext {
  showId: number
  sectionId: number
  basePrice: number
  showDate: Date
  showTime: string
  venueCapacity: number
  currentOccupancy: number
  historicalDemand?: DemandMetrics
  seasonality?: SeasonalityData
  specialEvents?: SpecialEvent[]
}

export interface DemandMetrics {
  bookingVelocity: number      // Bookings per hour
  priceElasticity: number      // How sensitive demand is to price changes
  competitorPricing: number    // Average competitor pricing
  waitlistSize: number         // People waiting for tickets
  socialMentions: number       // Social media buzz
  searchVolume: number         // Google search volume for show
}

export interface SeasonalityData {
  dayOfWeek: number           // 1-7 (Monday = 1)
  monthOfYear: number         // 1-12
  holidayPeriod: boolean      // Is it a holiday period?
  schoolHolidays: boolean     // Are schools on holiday?
  touristSeason: boolean      // Peak tourist season?
  weatherFactor: number       // Weather impact (-1 to 1)
}

export interface SpecialEvent {
  type: 'celebrity' | 'anniversary' | 'media' | 'award' | 'festival'
  impact: number              // Price multiplier (0.5 to 3.0)
  startDate: Date
  endDate: Date
  description: string
}

export interface PricingStrategy {
  id: string
  name: string
  description: string
  timeFactorWeight: number     // 0-1: How much time affects pricing
  demandFactorWeight: number   // 0-1: How much demand affects pricing
  seasonalityWeight: number    // 0-1: How much seasonality affects pricing
  minPriceMultiplier: number   // Minimum price as % of base (e.g., 0.7 = 70%)
  maxPriceMultiplier: number   // Maximum price as % of base (e.g., 3.0 = 300%)
  aggressiveness: number       // 0-1: How aggressively to adjust prices
}

export interface OptimizedPrice {
  originalPrice: number
  optimizedPrice: number
  adjustmentFactor: number
  reasoning: {
    timeFactor: number
    demandFactor: number
    seasonalityFactor: number
    specialEventFactor: number
    strategy: string
    confidence: number
  }
  validUntil: Date
  abTestGroup?: string
}

export class DynamicPricingEngine {
  
  /**
   * 🎯 Calculate optimized price for a seat/section
   */
  async calculateOptimizedPrice(
    context: PricingContext,
    strategy?: PricingStrategy
  ): Promise<OptimizedPrice> {
    try {
      console.log(`💰 Calculating optimized price for show ${context.showId}, section ${context.sectionId}`)
      
      // Use default strategy if none provided
      const pricingStrategy = strategy || this.getDefaultStrategy()
      
      // Calculate individual factors
      const timeFactor = this.calculateTimeFactor(context)
      const demandFactor = await this.calculateDemandFactor(context)
      const seasonalityFactor = this.calculateSeasonalityFactor(context)
      const specialEventFactor = this.calculateSpecialEventFactor(context)
      
      // Weighted combination based on strategy
      const adjustmentFactor = (
        timeFactor * pricingStrategy.timeFactorWeight +
        demandFactor * pricingStrategy.demandFactorWeight +
        seasonalityFactor * pricingStrategy.seasonalityWeight +
        specialEventFactor * 0.1 // Special events are bonus
      ) / (
        pricingStrategy.timeFactorWeight + 
        pricingStrategy.demandFactorWeight + 
        pricingStrategy.seasonalityWeight
      )
      
      // Apply aggressiveness factor
      const finalAdjustment = 1 + (adjustmentFactor - 1) * pricingStrategy.aggressiveness
      
      // Ensure within min/max bounds
      const boundedAdjustment = Math.max(
        pricingStrategy.minPriceMultiplier,
        Math.min(pricingStrategy.maxPriceMultiplier, finalAdjustment)
      )
      
      const optimizedPrice = Math.round(context.basePrice * boundedAdjustment)
      
      // Calculate confidence based on data quality
      const confidence = this.calculateConfidence(context)
      
      console.log(`💰 Price optimization: ${context.basePrice}p → ${optimizedPrice}p (${(boundedAdjustment * 100).toFixed(1)}%)`)
      
      return {
        originalPrice: context.basePrice,
        optimizedPrice,
        adjustmentFactor: boundedAdjustment,
        reasoning: {
          timeFactor,
          demandFactor,
          seasonalityFactor,
          specialEventFactor,
          strategy: pricingStrategy.name,
          confidence
        },
        validUntil: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        abTestGroup: await this.getABTestGroup(context.showId)
      }
    } catch (error) {
      console.error('❌ Error calculating optimized price:', error)
      
      // Fallback to original price
      return {
        originalPrice: context.basePrice,
        optimizedPrice: context.basePrice,
        adjustmentFactor: 1.0,
        reasoning: {
          timeFactor: 1.0,
          demandFactor: 1.0,
          seasonalityFactor: 1.0,
          specialEventFactor: 1.0,
          strategy: 'fallback',
          confidence: 0.0
        },
        validUntil: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      }
    }
  }

  /**
   * ⏰ Calculate time-based pricing factor
   */
  private calculateTimeFactor(context: PricingContext): number {
    const now = new Date()
    const showDate = new Date(context.showDate)
    const daysUntilShow = (showDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    
    // Time-based pricing curve
    if (daysUntilShow > 60) {
      return 0.8 // Early bird discount
    } else if (daysUntilShow > 30) {
      return 0.9 // Advance booking discount
    } else if (daysUntilShow > 14) {
      return 1.0 // Standard pricing
    } else if (daysUntilShow > 7) {
      return 1.1 // Week before premium
    } else if (daysUntilShow > 3) {
      return 1.2 // Last week premium
    } else if (daysUntilShow > 1) {
      return 1.4 // Last few days premium
    } else if (daysUntilShow > 0) {
      return 1.6 // Day of show premium
    } else {
      return 0.5 // After show (shouldn't happen)
    }
  }

  /**
   * 📈 Calculate demand-based pricing factor
   */
  private async calculateDemandFactor(context: PricingContext): Promise<number> {
    try {
      // Get current occupancy rate
      const occupancyRate = context.currentOccupancy / context.venueCapacity
      
      // Get recent booking velocity (bookings in last 24 hours)
      const recentBookings = await this.getRecentBookingVelocity(context.showId)
      
      // Base demand factor on occupancy
      let demandFactor = 1.0
      
      if (occupancyRate > 0.9) {
        demandFactor = 1.8 // Almost sold out - high premium
      } else if (occupancyRate > 0.8) {
        demandFactor = 1.5 // Nearly sold out
      } else if (occupancyRate > 0.7) {
        demandFactor = 1.3 // Selling well
      } else if (occupancyRate > 0.5) {
        demandFactor = 1.1 // Moderate demand
      } else if (occupancyRate > 0.3) {
        demandFactor = 1.0 // Standard demand
      } else if (occupancyRate > 0.1) {
        demandFactor = 0.9 // Low demand
      } else {
        demandFactor = 0.8 // Very low demand
      }
      
      // Adjust based on booking velocity
      if (recentBookings > 10) {
        demandFactor *= 1.2 // High velocity
      } else if (recentBookings < 2) {
        demandFactor *= 0.9 // Low velocity
      }
      
      return demandFactor
    } catch (error) {
      console.error('❌ Error calculating demand factor:', error)
      return 1.0 // Default to no adjustment
    }
  }

  /**
   * 🗓️ Calculate seasonality-based pricing factor
   */
  private calculateSeasonalityFactor(context: PricingContext): number {
    if (!context.seasonality) return 1.0
    
    const s = context.seasonality
    let seasonalityFactor = 1.0
    
    // Day of week adjustments
    if (s.dayOfWeek === 6 || s.dayOfWeek === 7) { // Saturday/Sunday
      seasonalityFactor *= 1.2
    } else if (s.dayOfWeek === 5) { // Friday
      seasonalityFactor *= 1.1
    } else if (s.dayOfWeek === 1) { // Monday
      seasonalityFactor *= 0.9
    }
    
    // Holiday period adjustments
    if (s.holidayPeriod) {
      seasonalityFactor *= 1.3
    }
    
    if (s.schoolHolidays) {
      seasonalityFactor *= 1.1
    }
    
    if (s.touristSeason) {
      seasonalityFactor *= 1.15
    }
    
    // Weather factor
    seasonalityFactor *= (1 + s.weatherFactor * 0.1)
    
    return seasonalityFactor
  }

  /**
   * 🎭 Calculate special event pricing factor
   */
  private calculateSpecialEventFactor(context: PricingContext): number {
    if (!context.specialEvents || context.specialEvents.length === 0) {
      return 1.0
    }
    
    const now = new Date()
    let maxImpact = 1.0
    
    for (const event of context.specialEvents) {
      if (now >= event.startDate && now <= event.endDate) {
        maxImpact = Math.max(maxImpact, event.impact)
      }
    }
    
    return maxImpact
  }

  /**
   * 📊 Get recent booking velocity
   */
  private async getRecentBookingVelocity(showId: number): Promise<number> {
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      const recentBookings = await db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .innerJoin(bookingSeats, eq(bookings.id, bookingSeats.bookingId))
        .innerJoin(seats, eq(bookingSeats.seatId, seats.id))
        .where(
          and(
            eq(seats.showId, showId.toString()),
            gte(bookings.createdAt, twentyFourHoursAgo),
            eq(bookings.status, 'confirmed')
          )
        )
      
      return recentBookings[0]?.count || 0
    } catch (error) {
      console.error('❌ Error getting booking velocity:', error)
      return 0
    }
  }

  /**
   * 🧪 Get A/B test group for pricing experiment
   */
  private async getABTestGroup(showId: number): Promise<string | undefined> {
    // Simple A/B test: 50% get standard pricing, 50% get optimized pricing
    const hash = showId % 2
    return hash === 0 ? 'control' : 'optimized'
  }

  /**
   * 📊 Calculate confidence in pricing decision
   */
  private calculateConfidence(context: PricingContext): number {
    let confidence = 0.5 // Base confidence
    
    // More confidence with historical data
    if (context.historicalDemand) {
      confidence += 0.2
    }
    
    // More confidence with seasonality data
    if (context.seasonality) {
      confidence += 0.15
    }
    
    // More confidence for shows closer to date (more predictable)
    const daysUntilShow = (new Date(context.showDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    if (daysUntilShow < 7) {
      confidence += 0.15
    }
    
    return Math.min(1.0, confidence)
  }

  /**
   * 🎯 Get default pricing strategy
   */
  private getDefaultStrategy(): PricingStrategy {
    return {
      id: 'balanced',
      name: 'Balanced Revenue Optimization',
      description: 'Balances time-based and demand-based factors for optimal revenue',
      timeFactorWeight: 0.4,
      demandFactorWeight: 0.5,
      seasonalityWeight: 0.1,
      minPriceMultiplier: 0.7,
      maxPriceMultiplier: 2.5,
      aggressiveness: 0.7
    }
  }

  /**
   * 🚀 Get aggressive pricing strategy for high-demand shows
   */
  getAggressiveStrategy(): PricingStrategy {
    return {
      id: 'aggressive',
      name: 'Aggressive Revenue Maximization',
      description: 'Maximizes revenue through aggressive demand-based pricing',
      timeFactorWeight: 0.2,
      demandFactorWeight: 0.7,
      seasonalityWeight: 0.1,
      minPriceMultiplier: 0.8,
      maxPriceMultiplier: 4.0,
      aggressiveness: 0.9
    }
  }

  /**
   * 🕊️ Get conservative pricing strategy for new shows
   */
  getConservativeStrategy(): PricingStrategy {
    return {
      id: 'conservative',
      name: 'Conservative Market Entry',
      description: 'Conservative pricing to build audience and minimize risk',
      timeFactorWeight: 0.5,
      demandFactorWeight: 0.3,
      seasonalityWeight: 0.2,
      minPriceMultiplier: 0.8,
      maxPriceMultiplier: 1.5,
      aggressiveness: 0.3
    }
  }

  /**
   * 🔄 Batch optimize prices for entire show
   */
  async optimizeShowPricing(showId: number, strategy?: PricingStrategy): Promise<Map<number, OptimizedPrice>> {
    try {
      console.log(`🎯 Optimizing pricing for entire show ${showId}`)
      
      // Get all sections for the show
      const showSections = await db
        .select({
          sectionId: sections.id,
          sectionName: sections.name,
          basePrice: sections.basePricePence,
          totalSeats: sql<number>`COUNT(${seats.id})`,
          availableSeats: sql<number>`SUM(CASE WHEN ${seats.status} = 'available' THEN 1 ELSE 0 END)`
        })
        .from(sections)
        .innerJoin(seats, eq(sections.id, seats.sectionId))
        .where(eq(seats.showId, showId.toString()))
        .groupBy(sections.id, sections.name, sections.basePricePence)
      
      // Get show details
      const show = await db
        .select()
        .from(shows)
        .where(eq(shows.id, showId.toString()))
        .limit(1)
      
      if (!show[0]) {
        throw new Error(`Show ${showId} not found`)
      }
      
      const showData = show[0]
      const optimizedPrices = new Map<number, OptimizedPrice>()
      
      // Calculate total venue capacity
      const totalCapacity = showSections.reduce((sum, section) => sum + section.totalSeats, 0)
      const totalOccupied = showSections.reduce((sum, section) => sum + (section.totalSeats - section.availableSeats), 0)
      
      // Optimize each section
      for (const section of showSections) {
        const context: PricingContext = {
          showId,
          sectionId: section.sectionId,
          basePrice: section.basePrice,
          showDate: showData.date,
          showTime: showData.time,
          venueCapacity: totalCapacity,
          currentOccupancy: totalOccupied,
          seasonality: this.generateSeasonalityData(showData.date),
          // TODO: Add historical demand and special events data
        }
        
        const optimizedPrice = await this.calculateOptimizedPrice(context, strategy)
        optimizedPrices.set(section.sectionId, optimizedPrice)
      }
      
      console.log(`✅ Optimized pricing for ${optimizedPrices.size} sections`)
      return optimizedPrices
    } catch (error) {
      console.error('❌ Error optimizing show pricing:', error)
      return new Map()
    }
  }

  /**
   * 🗓️ Generate seasonality data for a show date
   */
  private generateSeasonalityData(showDate: Date): SeasonalityData {
    const dayOfWeek = showDate.getDay() || 7 // Convert Sunday from 0 to 7
    const monthOfYear = showDate.getMonth() + 1
    
    // Simple seasonality rules (can be enhanced with real data)
    const holidayPeriod = monthOfYear === 12 || monthOfYear === 1 // December/January
    const schoolHolidays = monthOfYear === 7 || monthOfYear === 8 || monthOfYear === 12 // Summer + Christmas
    const touristSeason = monthOfYear >= 6 && monthOfYear <= 8 // Summer months
    const weatherFactor = monthOfYear >= 5 && monthOfYear <= 9 ? 0.1 : -0.1 // Better weather = slight boost
    
    return {
      dayOfWeek,
      monthOfYear,
      holidayPeriod,
      schoolHolidays,
      touristSeason,
      weatherFactor
    }
  }
}

// Export singleton instance
export const dynamicPricingEngine = new DynamicPricingEngine() 