import { getMongoDb } from './connection'
import { Collection } from 'mongodb'

// Detect build time to avoid MongoDB connection during static generation
const isBuildTime = typeof window === 'undefined' && !process.env.MONGODB_URI

/**
 * 🎯 MONGODB LAYOUT CACHE SERVICE
 * 
 * Pure layout cache - NO pricing, NO availability, NO booking logic
 * Only stores: coordinates, visual positioning, hardcoded seat IDs
 * PostgreSQL handles: pricing, availability, bookings, business logic
 */

// Layout-only interfaces (completely pricing-free)
export interface LayoutCacheDocument {
  _id: string
  venueId: string
  venueName: string
  address?: string
  shows: Record<string, ShowLayoutCache>
  createdAt?: Date
  updatedAt?: Date
}

export interface ShowLayoutCache {
  sections: Record<string, SectionLayoutCache>
  layout: VenueLayoutConfig
  metadata?: VenueMetadata
}

export interface SectionLayoutCache {
  id: string
  name: string
  displayName: string
  color: string           // Visual color for seat map rendering
  seats: SeatLayoutCache[]
  visualConfig: {
    startX: number
    startY: number
    rows: number
    seatsPerRow: number
    seatSpacing: number
    rowSpacing: number
  }
}

export interface SeatLayoutCache {
  id: string              // Internal MongoDB ID
  hardcodedId: string     // iOS hardcoded ID like "premium-A-1" 
  row: string | number
  number: number
  x: number              // Visual X coordinate
  y: number              // Visual Y coordinate
  isAccessible: boolean  // Accessibility info (structural, not booking-related)
  seatType: string       // Visual category (premium, standard, box, etc.)
  visualMetadata?: {
    level?: number       // Which floor/level (0=orchestra, 1=mezzanine, etc.)
    viewQuality?: string // Visual indicator only
  }
  // ❌ NO PRICING: price, isAvailable, bookingStatus - handled by PostgreSQL
}

export interface VenueLayoutConfig {
  width: number
  height: number
  scale: number
  levels?: number
  centerX?: number
  centerY?: number
  stageArea?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface VenueMetadata {
  totalSeats: number      // Count only (not booking logic)
  accessibleSeats: number
  levels: string[]
  openingYear?: number
  architect?: string
  notes?: string
}

export class LayoutCacheService {
  private collection: Collection<LayoutCacheDocument> | null = null
  
  constructor() {
    // Collection will be initialized when first used
  }

  private async getCollection(): Promise<Collection<LayoutCacheDocument>> {
    if (isBuildTime) {
      throw new Error('MongoDB Layout Cache not available during build time')
    }
    
    if (!this.collection) {
      const db = await getMongoDb()
      this.collection = db.collection<LayoutCacheDocument>('layout_cache')
      
      // Create indexes for fast layout lookups
      await this.collection.createIndex({ venueId: 1, 'shows': 1 })
      await this.collection.createIndex({ 'shows.sections.seats.hardcodedId': 1 })
    }
    return this.collection
  }

  /**
   * 🎯 Get pure layout data for venue/show
   * Returns ONLY visual positioning - no pricing/availability
   */
  async getLayoutCache(venueId: string, showSlug: string): Promise<ShowLayoutCache | null> {
    try {
      const collection = await this.getCollection()
      
      const result = await collection.findOne(
        { venueId },
        { projection: { [`shows.${showSlug}`]: 1 } }
      )
      
      return result?.shows?.[showSlug] || null
    } catch (error) {
      console.error('❌ Error fetching layout cache:', error)
      return null
    }
  }

  /**
   * 🔄 Translate iOS hardcoded seat IDs to layout coordinates
   * Returns ONLY positioning data - PostgreSQL provides pricing/availability
   */
  async translateHardcodedSeatsToLayout(
    venueId: string, 
    showSlug: string, 
    hardcodedSeatIds: string[]
  ): Promise<{ hardcodedId: string; layoutData: SeatLayoutCache | null }[]> {
    try {
      const collection = await this.getCollection()
      
      console.log(`🗺️ Translating ${hardcodedSeatIds.length} hardcoded seats to layout coordinates`)
      
      const layoutCache = await this.getLayoutCache(venueId, showSlug)
      
      if (!layoutCache) {
        console.warn(`⚠️ No layout cache found for ${venueId}/${showSlug}`)
        return hardcodedSeatIds.map(id => ({ hardcodedId: id, layoutData: null }))
      }
      
      const results: { hardcodedId: string; layoutData: SeatLayoutCache | null }[] = []
      
      // Search through all sections for matching hardcoded IDs
      for (const hardcodedId of hardcodedSeatIds) {
        let foundSeat: SeatLayoutCache | null = null
        
        // Search all sections for this hardcoded ID
        for (const [sectionName, section] of Object.entries(layoutCache.sections)) {
          const seat = section.seats.find(s => s.hardcodedId === hardcodedId)
          if (seat) {
            foundSeat = seat
            break
          }
        }
        
        if (foundSeat) {
          console.log(`✅ Found layout for ${hardcodedId}: (${foundSeat.x}, ${foundSeat.y})`)
        } else {
          console.warn(`⚠️ No layout found for hardcoded ID: ${hardcodedId}`)
        }
        
        results.push({ hardcodedId, layoutData: foundSeat })
      }
      
      const foundCount = results.filter(r => r.layoutData !== null).length
      console.log(`📊 Translated ${foundCount}/${hardcodedSeatIds.length} hardcoded seats to layout coordinates`)
      
      return results
    } catch (error) {
      console.error('❌ Error translating hardcoded seats to layout:', error)
      return hardcodedSeatIds.map(id => ({ hardcodedId: id, layoutData: null }))
    }
  }

  /**
   * 🎨 Get complete visual seat map for rendering
   * Returns layout + visual config only - no business logic
   */
  async getVisualSeatMap(venueId: string, showSlug: string): Promise<{
    sections: Record<string, SectionLayoutCache>
    layout: VenueLayoutConfig
    metadata?: VenueMetadata
  } | null> {
    try {
      const layoutCache = await this.getLayoutCache(venueId, showSlug)
      
      if (!layoutCache) {
        return null
      }
      
      return {
        sections: layoutCache.sections,
        layout: layoutCache.layout,
        metadata: layoutCache.metadata
      }
    } catch (error) {
      console.error('❌ Error getting visual seat map:', error)
      return null
    }
  }

  /**
   * 📝 Initialize Hamilton layout cache (pricing-free)
   */
  async initializeHamiltonLayoutCache(): Promise<boolean> {
    try {
      const collection = await this.getCollection()
      
      console.log('🎭 Initializing Hamilton layout cache (pricing-free)...')
      
      const venueId = 'victoria-palace-theatre'
      const showSlug = 'hamilton'
      
      const hamiltonLayoutCache: LayoutCacheDocument = {
        _id: venueId,
        venueId,
        venueName: "Victoria Palace Theatre", 
        shows: {
          [showSlug]: {
            sections: {
              orchestra: this.generateSectionLayout('orchestra', 'Orchestra', '#FFD700', 15, 20),
              mezzanine: this.generateSectionLayout('mezzanine', 'Mezzanine', '#CD853F', 8, 18),
              balcony: this.generateSectionLayout('balcony', 'Balcony', '#DDA0DD', 10, 16),
              sideA: this.generateSectionLayout('sideA', 'Side A', '#98FB98', 5, 8),
              sideB: this.generateSectionLayout('sideB', 'Side B', '#87CEEB', 5, 8)
            },
            layout: {
              width: 1000,
              height: 600,
              scale: 1.0
            }
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Insert or update the layout cache
      await this.collection.replaceOne(
        { _id: venueId },
        hamiltonLayoutCache,
        { upsert: true }
      )

      console.log('✅ Hamilton layout cache initialized successfully')
      return true

    } catch (error) {
      console.error('❌ Error initializing Hamilton layout cache:', error)
      return false
    }
  }

  /**
   * 📝 Initialize Phantom layout cache (pricing-free)
   */
  async initializePhantomLayoutCache(): Promise<boolean> {
    try {
      console.log('🎭 Initializing Phantom layout cache (pricing-free)...')
      
      const venueId = 'her-majestys-theatre'
      const showSlug = 'phantom-of-the-opera'
      
      const phantomLayoutCache: LayoutCacheDocument = {
        _id: venueId,
        venueId,
        venueName: "Her Majesty's Theatre",
        address: "Haymarket, St. James's, London SW1Y 4QL",
        shows: {
          [showSlug]: {
            sections: {
              // ORCHESTRA LEVEL (Level 0)
              premiumOrchestra: this.generateSectionLayout(
                'premiumOrchestra', 
                'Premium Orchestra', 
                '#8B0000', 
                8, 24,
                { startX: 200, startY: 400, seatSpacing: 35, rowSpacing: 45 }
              ),
              standardOrchestra: this.generateSectionLayout(
                'standardOrchestra', 
                'Standard Orchestra', 
                '#CD5C5C',
                12, 28,
                { startX: 150, startY: 760, seatSpacing: 32, rowSpacing: 42 }
              ),
              sideBoxLeft: this.generateSectionLayout(
                'sideBoxLeft', 
                'Side Box Left', 
                '#4B0082',
                4, 8,
                { startX: 50, startY: 500, seatSpacing: 40, rowSpacing: 50 }
              ),
              sideBoxRight: this.generateSectionLayout(
                'sideBoxRight', 
                'Side Box Right', 
                '#4B0082',
                4, 8,
                { startX: 1100, startY: 500, seatSpacing: 40, rowSpacing: 50 }
              ),

              // DRESS CIRCLE LEVEL (Level 1) 
              premiumCircle: this.generateSectionLayout(
                'premiumCircle', 
                'Premium Dress Circle', 
                '#B8860B',
                6, 26,
                { startX: 180, startY: 300, seatSpacing: 34, rowSpacing: 44 }
              ),
              standardCircle: this.generateSectionLayout(
                'standardCircle', 
                'Standard Dress Circle', 
                '#DAA520',
                8, 30,
                { startX: 160, startY: 564, seatSpacing: 32, rowSpacing: 42 }
              ),
              circleBoxLeft: this.generateSectionLayout(
                'circleBoxLeft', 
                'Circle Box Left', 
                '#9932CC',
                3, 6,
                { startX: 70, startY: 350, seatSpacing: 38, rowSpacing: 48 }
              ),
              circleBoxRight: this.generateSectionLayout(
                'circleBoxRight', 
                'Circle Box Right', 
                '#9932CC',
                3, 6,
                { startX: 1080, startY: 350, seatSpacing: 38, rowSpacing: 48 }
              ),
              grandBoxes: this.generateSectionLayout(
                'grandBoxes', 
                'Grand Boxes', 
                '#800080',
                2, 12,
                { startX: 400, startY: 200, seatSpacing: 45, rowSpacing: 55 }
              ),

              // UPPER CIRCLE LEVEL (Level 2)
              frontUpper: this.generateSectionLayout(
                'frontUpper', 
                'Front Upper Circle', 
                '#2E8B57',
                5, 32,
                { startX: 140, startY: 250, seatSpacing: 30, rowSpacing: 40 }
              ),
              rearUpper: this.generateSectionLayout(
                'rearUpper', 
                'Rear Upper Circle', 
                '#228B22',
                8, 34,
                { startX: 130, startY: 450, seatSpacing: 29, rowSpacing: 38 }
              ),
              upperBoxLeft: this.generateSectionLayout(
                'upperBoxLeft', 
                'Upper Box Left', 
                '#6A5ACD',
                3, 8,
                { startX: 60, startY: 300, seatSpacing: 36, rowSpacing: 46 }
              ),
              upperBoxRight: this.generateSectionLayout(
                'upperBoxRight', 
                'Upper Box Right', 
                '#6A5ACD',
                3, 8,
                { startX: 1090, startY: 300, seatSpacing: 36, rowSpacing: 46 }
              ),

              // BALCONY LEVEL (Level 3)
              grandCircle: this.generateSectionLayout(
                'grandCircle', 
                'Grand Circle', 
                '#DC143C',
                4, 30,
                { startX: 150, startY: 200, seatSpacing: 33, rowSpacing: 43 }
              )
            },
            layout: {
              width: 1200,
              height: 800,
              scale: 1.0,
              levels: 4,
              centerX: 600,
              centerY: 400,
              stageArea: {
                x: 350,
                y: 50,
                width: 500,
                height: 100
              }
            },
            metadata: {
              totalSeats: 1648, // Calculated count
              accessibleSeats: 24,
              levels: ['Orchestra', 'Dress Circle', 'Upper Circle', 'Balcony'],
              openingYear: 1897,
              architect: 'Charles J. Phipps',
              notes: 'Historic theatre, home of Phantom of the Opera since 1986'
            }
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Calculate actual total seats
      let totalSeats = 0
      Object.values(phantomLayoutCache.shows[showSlug].sections).forEach(section => {
        totalSeats += section.seats.length
      })
      phantomLayoutCache.shows[showSlug].metadata!.totalSeats = totalSeats

      console.log(`🎭 Generated ${totalSeats} seat coordinates across ${Object.keys(phantomLayoutCache.shows[showSlug].sections).length} sections`)

      // Insert or update the layout cache
      await this.collection.replaceOne(
        { _id: venueId },
        phantomLayoutCache,
        { upsert: true }
      )

      console.log('✅ Phantom layout cache initialized successfully')
      return true

    } catch (error) {
      console.error('❌ Error initializing Phantom layout cache:', error)
      return false
    }
  }

  /**
   * 🏗️ Generate section layout data (completely pricing-free)
   */
  private generateSectionLayout(
    sectionId: string, 
    displayName: string, 
    color: string, 
    rows: number, 
    seatsPerRow: number,
    layout?: {
      startX: number
      startY: number  
      seatSpacing: number
      rowSpacing: number
    }
  ): SectionLayoutCache {
    const seats: SeatLayoutCache[] = []
    const defaultLayout = { startX: 100, startY: 100, seatSpacing: 30, rowSpacing: 40 }
    const { startX, startY, seatSpacing, rowSpacing } = layout || defaultLayout

    for (let row = 0; row < rows; row++) {
      const rowLetter = String.fromCharCode(65 + row) // A, B, C, etc.
      
      for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
        // Accessibility is structural (not booking-related)
        const isAccessible = (
          row === 0 && [1, 2, seatsPerRow - 1, seatsPerRow].includes(seatNum)
        ) || (
          row === rows - 1 && [1, 2, seatsPerRow - 1, seatsPerRow].includes(seatNum)
        )

        seats.push({
          id: `${sectionId}_${rowLetter}_${seatNum}`,
          hardcodedId: `${sectionId}-${rowLetter}-${seatNum}`,
          row: rowLetter,
          number: seatNum,
          x: startX + (seatNum - 1) * seatSpacing,
          y: startY + row * rowSpacing,
          isAccessible,
          seatType: sectionId.includes('premium') ? 'premium' : 
                   sectionId.includes('box') ? 'box' : 
                   sectionId.includes('grand') ? 'grand' : 'standard',
          visualMetadata: {
            level: sectionId.includes('Orchestra') ? 0 : 
                   sectionId.includes('Circle') ? 1 :
                   sectionId.includes('Upper') ? 2 : 3,
            viewQuality: sectionId.includes('premium') ? 'excellent' :
                        sectionId.includes('standard') ? 'good' :
                        sectionId.includes('rear') ? 'fair' : 'very-good'
          }
          // ✅ PURE LAYOUT DATA - no pricing, availability, or booking logic
        })
      }
    }

    return {
      id: sectionId,
      name: sectionId,
      displayName,
      color,
      seats,
      visualConfig: {
        rows,
        seatsPerRow,
        startX,
        startY,
        seatSpacing,
        rowSpacing
      }
    }
  }
}

// Export singleton instance
export const layoutCacheService = new LayoutCacheService() 