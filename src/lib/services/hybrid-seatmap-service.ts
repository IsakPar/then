import { layoutCacheService, type SeatLayoutCache, type ShowLayoutCache } from '@/lib/mongodb/layout-cache-service'
import { db } from '@/lib/db/connection'
import { shows, seats, sections, bookings, bookingSeats } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'

/**
 * 🎯 HYBRID SEATMAP SERVICE
 * 
 * Merges MongoDB layout cache with PostgreSQL business data
 * MongoDB: Visual coordinates, seat positioning, hardcoded IDs
 * PostgreSQL: Pricing, availability, bookings, business logic
 * 
 * This is the SINGLE SOURCE OF TRUTH for seat map data across the application
 */

export interface HybridSeatData {
  // Layout data from MongoDB
  hardcodedId: string      // iOS hardcoded ID like "premium-A-1"
  layoutId: string         // MongoDB internal ID
  row: string | number
  number: number
  x: number               // Visual X coordinate
  y: number               // Visual Y coordinate
  isAccessible: boolean   // Structural accessibility
  seatType: string        // Visual category
  
  // Business data from PostgreSQL
  pricePence: number      // Current price in pence
  isAvailable: boolean    // Real-time availability
  isReserved: boolean     // Currently being held by someone
  bookingId?: string      // If booked, the booking ID
  reservedUntil?: Date    // If reserved, when reservation expires
  
  // Visual config
  color: string           // Section color
  level: number           // Floor level (0=orchestra, 1=mezzanine, etc.)
  viewQuality: string     // View quality indicator
}

export interface HybridSeatMapData {
  sections: Record<string, {
    id: string
    displayName: string
    color: string
    seats: HybridSeatData[]
    visualConfig: {
      startX: number
      startY: number
      rows: number
      seatsPerRow: number
      seatSpacing: number
      rowSpacing: number
    }
  }>
  layout: {
    width: number
    height: number
    scale: number
    levels?: number
    centerX?: number
    centerY?: number
    stageArea?: any
  }
  metadata?: {
    totalSeats: number
    availableSeats: number
    priceRange: { min: number; max: number }
    accessibleSeats: number
    levels: string[]
  }
}

export interface SeatPricingData {
  hardcodedId: string
  pricePence: number
  isAvailable: boolean
  isReserved: boolean
  bookingId?: string
  reservedUntil?: Date
}

export class HybridSeatMapService {
  /**
   * 🎯 Get complete hybrid seat map (layout + business data)
   */
  async getHybridSeatMap(showId: number, venueId: string, showSlug: string): Promise<HybridSeatMapData | null> {
    try {
      console.log(`🔄 Building hybrid seat map for show ${showId} (${showSlug})`)
      
      // Get layout data from MongoDB
      const layoutData = await layoutCacheService.getLayoutCache(venueId, showSlug)
      if (!layoutData) {
        console.error('❌ No layout data found in MongoDB cache')
        return null
      }
      
      // Get pricing/availability data from PostgreSQL
      const pricingData = await this.getPricingData(showId)
      
      // Merge data
      const hybridSeatMap = this.mergeLayoutWithPricing(layoutData, pricingData)
      
      console.log(`✅ Built hybrid seat map: ${hybridSeatMap.metadata?.totalSeats} seats, ${hybridSeatMap.metadata?.availableSeats} available`)
      
      return hybridSeatMap
    } catch (error) {
      console.error('❌ Error building hybrid seat map:', error)
      return null
    }
  }

  /**
   * 🔄 Translate iOS hardcoded seat IDs to complete seat data
   */
  async translateHardcodedSeatsToHybridData(
    showId: number,
    venueId: string, 
    showSlug: string, 
    hardcodedSeatIds: string[]
  ): Promise<{ hardcodedId: string; seatData: HybridSeatData | null }[]> {
    try {
      console.log(`🔄 Translating ${hardcodedSeatIds.length} hardcoded seats to hybrid data`)
      
      // Get layout translations from MongoDB
      const layoutTranslations = await layoutCacheService.translateHardcodedSeatsToLayout(
        venueId, 
        showSlug, 
        hardcodedSeatIds
      )
      
      // Get pricing data from PostgreSQL
      const pricingData = await this.getPricingData(showId)
      const pricingMap = new Map(pricingData.map(p => [p.hardcodedId, p]))
      
      // Merge data for each seat
      const results = layoutTranslations.map(({ hardcodedId, layoutData }) => {
        if (!layoutData) {
          return { hardcodedId, seatData: null }
        }
        
        const pricing = pricingMap.get(hardcodedId)
        if (!pricing) {
          console.warn(`⚠️ No pricing data found for ${hardcodedId}`)
          return { hardcodedId, seatData: null }
        }
        
        const hybridSeat: HybridSeatData = {
          // Layout data from MongoDB
          hardcodedId: layoutData.hardcodedId,
          layoutId: layoutData.id,
          row: layoutData.row,
          number: layoutData.number,
          x: layoutData.x,
          y: layoutData.y,
          isAccessible: layoutData.isAccessible,
          seatType: layoutData.seatType,
          
          // Business data from PostgreSQL
          pricePence: pricing.pricePence,
          isAvailable: pricing.isAvailable,
          isReserved: pricing.isReserved,
          bookingId: pricing.bookingId,
          reservedUntil: pricing.reservedUntil,
          
          // Visual config from layout metadata
          color: '#8B0000', // Will be set from section data
          level: layoutData.visualMetadata?.level || 0,
          viewQuality: layoutData.visualMetadata?.viewQuality || 'good'
        }
        
        return { hardcodedId, seatData: hybridSeat }
      })
      
      const foundCount = results.filter(r => r.seatData !== null).length
      console.log(`✅ Translated ${foundCount}/${hardcodedSeatIds.length} hardcoded seats to hybrid data`)
      
      return results
    } catch (error) {
      console.error('❌ Error translating hardcoded seats to hybrid data:', error)
      return hardcodedSeatIds.map(id => ({ hardcodedId: id, seatData: null }))
    }
  }

  /**
   * 💰 Get pricing and availability data from PostgreSQL
   */
  private async getPricingData(showId: number): Promise<SeatPricingData[]> {
    try {
      console.log(`📊 Fetching pricing data for show ${showId}`)
      
      // Query seats with their current status
      const seatRows = await db
        .select({
          hardcodedId: sql<string>`CONCAT(${sections.name}, '-', ${seats.rowLetter}, '-', ${seats.seatNumber})`,
          pricePence: seats.pricePence,
          status: seats.status,
          seatId: seats.id
        })
        .from(seats)
        .innerJoin(sections, eq(seats.sectionId, sections.id))
        .where(eq(seats.showId, showId.toString()))
      
      console.log(`📊 Found ${seatRows.length} seats in PostgreSQL`)
      
      // Build pricing data (simplified for now - full booking logic will be added later)
      const pricingData: SeatPricingData[] = seatRows.map(seat => {
        return {
          hardcodedId: seat.hardcodedId,
          pricePence: seat.pricePence,
          isAvailable: seat.status === 'available',
          isReserved: false, // Simplified for now
          bookingId: undefined,
          reservedUntil: undefined
        }
      })
      
      console.log(`💰 Processed pricing for ${pricingData.length} seats`)
      console.log(`📊 Available: ${pricingData.filter(p => p.isAvailable).length}`)
      console.log(`🔒 Reserved: ${pricingData.filter(p => p.isReserved).length}`)
      console.log(`✅ Booked: ${pricingData.filter(p => p.bookingId && !p.isReserved).length}`)
      
      return pricingData
    } catch (error) {
      console.error('❌ Error fetching pricing data:', error)
      return []
    }
  }

  /**
   * 🔄 Merge MongoDB layout with PostgreSQL pricing data
   */
  private mergeLayoutWithPricing(
    layoutData: ShowLayoutCache, 
    pricingData: SeatPricingData[]
  ): HybridSeatMapData {
    const pricingMap = new Map(pricingData.map(p => [p.hardcodedId, p]))
    
    let totalSeats = 0
    let availableSeats = 0
    let minPrice = Infinity
    let maxPrice = 0
    let accessibleSeats = 0
    
    const hybridSections: Record<string, any> = {}
    
    // Process each section
    for (const [sectionId, section] of Object.entries(layoutData.sections)) {
      const hybridSeats: HybridSeatData[] = []
      
      // Process each seat in the section
      for (const layoutSeat of section.seats) {
        const pricing = pricingMap.get(layoutSeat.hardcodedId)
        
        if (pricing) {
          const hybridSeat: HybridSeatData = {
            // Layout data from MongoDB
            hardcodedId: layoutSeat.hardcodedId,
            layoutId: layoutSeat.id,
            row: layoutSeat.row,
            number: layoutSeat.number,
            x: layoutSeat.x,
            y: layoutSeat.y,
            isAccessible: layoutSeat.isAccessible,
            seatType: layoutSeat.seatType,
            
            // Business data from PostgreSQL
            pricePence: pricing.pricePence,
            isAvailable: pricing.isAvailable,
            isReserved: pricing.isReserved,
            bookingId: pricing.bookingId,
            reservedUntil: pricing.reservedUntil,
            
            // Visual config
            color: section.color,
            level: layoutSeat.visualMetadata?.level || 0,
            viewQuality: layoutSeat.visualMetadata?.viewQuality || 'good'
          }
          
          hybridSeats.push(hybridSeat)
          
          // Update statistics
          totalSeats++
          if (hybridSeat.isAvailable) availableSeats++
          if (hybridSeat.isAccessible) accessibleSeats++
          if (hybridSeat.pricePence < minPrice) minPrice = hybridSeat.pricePence
          if (hybridSeat.pricePence > maxPrice) maxPrice = hybridSeat.pricePence
        }
      }
      
      hybridSections[sectionId] = {
        id: section.id,
        displayName: section.displayName,
        color: section.color,
        seats: hybridSeats,
        visualConfig: section.visualConfig
      }
    }
    
    return {
      sections: hybridSections,
      layout: layoutData.layout,
      metadata: {
        totalSeats,
        availableSeats,
        priceRange: { 
          min: minPrice === Infinity ? 0 : minPrice, 
          max: maxPrice 
        },
        accessibleSeats,
        levels: layoutData.metadata?.levels || []
      }
    }
  }

  /**
   * 🔒 Reserve seats using enterprise booking system
   * TODO: Implement with enterprise booking service
   */
  async reserveSeats(
    showId: number,
    hardcodedSeatIds: string[],
    customerEmail: string,
    sessionId: string
  ): Promise<{
    success: boolean
    reservedSeats: string[]
    errors: string[]
    reservationExpiry?: Date
  }> {
    try {
      console.log(`🔒 Reserving ${hardcodedSeatIds.length} seats for ${customerEmail}`)
      
      // TODO: Use the enterprise booking service for atomic reservation
      // const { enterpriseBookingService } = await import('@/lib/services/enterprise-booking-service')
      
      // For now, return a placeholder response
      console.log(`⚠️ Seat reservation not yet implemented - placeholder response`)
      return {
        success: true,
        reservedSeats: hardcodedSeatIds,
        errors: [],
        reservationExpiry: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
      }
    } catch (error) {
      console.error('❌ Error reserving seats:', error)
      return {
        success: false,
        reservedSeats: [],
        errors: [`Reservation failed: ${error}`]
      }
    }
  }

  /**
   * 🎯 Get show mapping for venue/show detection
   */
  static getShowVenueMapping(showId: number): { venueId: string; showSlug: string } | null {
    // This maps show IDs to their MongoDB venue/show identifiers
    const mapping: Record<number, { venueId: string; showSlug: string }> = {
      1: { venueId: 'victoria-palace-theatre', showSlug: 'hamilton' },
      2: { venueId: 'her-majestys-theatre', showSlug: 'phantom-of-the-opera' }
    }
    
    return mapping[showId] || null
  }
}

// Export singleton instance
export const hybridSeatMapService = new HybridSeatMapService() 