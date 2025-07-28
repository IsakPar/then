import { getMongoDb } from './connection'
import { Collection } from 'mongodb'

// Detect build time to avoid MongoDB connection during static generation
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build'

// Types for MongoDB seat map documents
export interface SeatMapDocument {
  _id: string
  venueId: string
  venueName: string
  address?: string
  shows: Record<string, ShowSeatMap>
  createdAt?: Date
  updatedAt?: Date
}

export interface ShowSeatMap {
  sections: Record<string, SeatSection>
  layout: {
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
  metadata?: {
    totalSeats: number
    accessibleSeats: number
    levels: string[]
    openingYear?: number
    architect?: string
    notes?: string
  }
}

export interface SeatSection {
  id: string
  name: string
  color: string
  seats: Seat[]
  layout: {
    startX: number
    startY: number
    rows: number
    seatsPerRow: number
    seatSpacing?: number
    rowSpacing?: number
  }
}

export interface Seat {
  id: string
  hardcodedId: string  // iOS hardcoded ID like "sideA-1-5"
  row: string | number
  number: number
  x: number
  y: number
  isAccessible: boolean
  isAvailable?: boolean  // Optional - managed by PostgreSQL
  price?: number        // Optional - managed by PostgreSQL
  seatType?: string
  metadata?: {
    level?: number
    viewQuality?: string
  }
}

export class SeatMapService {
  private collection: Collection<SeatMapDocument> | null = null
  
  constructor() {
    // Collection will be initialized when first used
  }

  private async getCollection(): Promise<Collection<SeatMapDocument>> {
    if (isBuildTime) {
      throw new Error('MongoDB service not available during build time')
    }
    
    if (!this.collection) {
      const db = await getMongoDb()
      this.collection = db.collection<SeatMapDocument>('seat map')
      
      // Create indexes for fast lookups
      await this.collection.createIndex({ venueId: 1, 'shows': 1 })
      await this.collection.createIndex({ 'shows.sections.seats.hardcodedId': 1 })
    }
    return this.collection
  }

  /**
   * Get seat map for a specific venue and show
   */
  async getSeatMap(venueId: string, showSlug: string): Promise<ShowSeatMap | null> {
    try {
      const collection = await this.getCollection()
      
      const result = await collection.findOne(
        { venueId },
        { projection: { [`shows.${showSlug}`]: 1 } }
      )
      
      return result?.shows?.[showSlug] || null
    } catch (error) {
      console.error('❌ Error fetching seat map:', error)
      return null
    }
  }

  /**
   * Translate iOS hardcoded seat IDs to MongoDB seat data
   * This is the key function that bridges iOS hardcoded seats to MongoDB
   */
  async translateHardcodedSeats(
    venueId: string, 
    showSlug: string, 
    hardcodedSeatIds: string[]
  ): Promise<{ hardcodedId: string; seat: Seat | null }[]> {
    try {
      const collection = await this.getCollection()
      
      console.log(`🔄 Translating ${hardcodedSeatIds.length} hardcoded seats for ${showSlug}`)
      console.log(`🎯 Hardcoded IDs:`, hardcodedSeatIds)
      
      const seatMap = await this.getSeatMap(venueId, showSlug)
      
      if (!seatMap) {
        console.warn(`⚠️ No seat map found for ${venueId}/${showSlug}`)
        return hardcodedSeatIds.map(id => ({ hardcodedId: id, seat: null }))
      }
      
      const results: { hardcodedId: string; seat: Seat | null }[] = []
      
      // Search through all sections for matching hardcoded IDs
      for (const hardcodedId of hardcodedSeatIds) {
        let foundSeat: Seat | null = null
        
        // Search all sections for this hardcoded ID
        for (const [sectionName, section] of Object.entries(seatMap.sections)) {
          const seat = section.seats.find(s => s.hardcodedId === hardcodedId)
          if (seat) {
            foundSeat = seat
            break
          }
        }
        
        if (foundSeat) {
          console.log(`✅ Found seat for ${hardcodedId}:`, foundSeat.id)
        } else {
          console.warn(`⚠️ No seat found for hardcoded ID: ${hardcodedId}`)
        }
        
        results.push({ hardcodedId, seat: foundSeat })
      }
      
      const foundCount = results.filter(r => r.seat !== null).length
      console.log(`📊 Translated ${foundCount}/${hardcodedSeatIds.length} hardcoded seats`)
      
      return results
    } catch (error) {
      console.error('❌ Error translating hardcoded seats:', error)
      return hardcodedSeatIds.map(id => ({ hardcodedId: id, seat: null }))
    }
  }

  /**
   * Reserve seats for booking
   */
  async reserveSeats(
    venueId: string,
    showSlug: string,
    hardcodedSeatIds: string[]
  ): Promise<{ success: boolean; reservedSeats: string[]; errors: string[] }> {
    try {
      const collection = await this.getCollection()
      
      console.log(`🔒 Reserving ${hardcodedSeatIds.length} seats for ${showSlug}`)
      
      // Translate hardcoded IDs to seat data
      const translations = await this.translateHardcodedSeats(venueId, showSlug, hardcodedSeatIds)
      const validSeats = translations.filter(t => t.seat !== null)
      
      if (validSeats.length === 0) {
        return {
          success: false,
          reservedSeats: [],
          errors: ['No valid seats found for reservation']
        }
      }
      
      // Check if all seats are available
      const unavailableSeats = validSeats.filter(t => !t.seat!.isAvailable)
      if (unavailableSeats.length > 0) {
        return {
          success: false,
          reservedSeats: [],
          errors: [`Seats unavailable: ${unavailableSeats.map(s => s.hardcodedId).join(', ')}`]
        }
      }
      
      // Mark seats as unavailable (reserved)
      const updatePromises = validSeats.map(({ hardcodedId }) =>
        collection.updateOne(
          { 
            venueId,
            [`shows.${showSlug}.sections.seats.hardcodedId`]: hardcodedId
          },
          { 
            $set: { 
              [`shows.${showSlug}.sections.$[section].seats.$[seat].isAvailable`]: false 
            }
          },
          {
            arrayFilters: [
              { 'section.seats.hardcodedId': hardcodedId },
              { 'seat.hardcodedId': hardcodedId }
            ]
          }
        )
      )
      
      await Promise.all(updatePromises)
      
      console.log(`✅ Reserved ${validSeats.length} seats successfully`)
      
      return {
        success: true,
        reservedSeats: validSeats.map(s => s.hardcodedId),
        errors: []
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
   * Initialize Hamilton seat map data
   * This sets up the MongoDB document with hardcoded iOS seat mappings
   */
  async initializeHamiltonSeatMap(): Promise<boolean> {
    try {
      const collection = await this.getCollection()
      
      console.log('🎭 Initializing Hamilton seat map...')
      
      const venueId = 'victoria-palace-theatre'
      const showSlug = 'hamilton'
      
      const hamiltonSeatMap: SeatMapDocument = {
        _id: venueId,
        venueId,
        venueName: "Victoria Palace Theatre", 
        shows: {
          [showSlug]: {
            sections: {
              orchestra: this.generateSectionSeats('orchestra', 'Orchestra', '#FFD700', 15, 20, 0),
              mezzanine: this.generateSectionSeats('mezzanine', 'Mezzanine', '#CD853F', 8, 18, 0),
              balcony: this.generateSectionSeats('balcony', 'Balcony', '#DDA0DD', 10, 16, 0),
              sideA: this.generateSectionSeats('sideA', 'Side A', '#98FB98', 5, 8, 0),
              sideB: this.generateSectionSeats('sideB', 'Side B', '#87CEEB', 5, 8, 0)
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

      // Insert or update the seat map
      await this.collection.replaceOne(
        { _id: venueId },
        hamiltonSeatMap,
        { upsert: true }
      )

      console.log('✅ Hamilton seat map initialized successfully')
      return true

    } catch (error) {
      console.error('❌ Error initializing Hamilton seat map:', error)
      return false
    }
  }

  async initializePhantomSeatMap(): Promise<boolean> {
    try {
      console.log('🎭 Initializing Phantom of the Opera seat map...')
      
      const venueId = 'her-majestys-theatre'
      const showSlug = 'phantom-of-the-opera'
      
      // Create comprehensive Phantom seat map with 4 levels and 14 sections
      const phantomSeatMap: SeatMapDocument = {
        _id: venueId,
        venueId,
        venueName: "Her Majesty's Theatre",
        address: "Haymarket, St. James's, London SW1Y 4QL",
        shows: {
          [showSlug]: {
            sections: {
              // ORCHESTRA LEVEL (Level 0)
              premiumOrchestra: this.generateSectionSeats(
                'premiumOrchestra', 
                'Premium Orchestra', 
                '#8B0000', // Deep red for premium
                8, 24, 0, // 8 rows, 24 seats per row, no base price
                { startX: 200, startY: 400, seatSpacing: 35, rowSpacing: 45 }
              ),
              standardOrchestra: this.generateSectionSeats(
                'standardOrchestra', 
                'Standard Orchestra', 
                '#CD5C5C', // Indian red 
                12, 28, 0,
                { startX: 150, startY: 760, seatSpacing: 32, rowSpacing: 42 }
              ),
              sideBoxLeft: this.generateSectionSeats(
                'sideBoxLeft', 
                'Side Box Left', 
                '#4B0082', // Indigo for boxes
                4, 8, 0,
                { startX: 50, startY: 500, seatSpacing: 40, rowSpacing: 50 }
              ),
              sideBoxRight: this.generateSectionSeats(
                'sideBoxRight', 
                'Side Box Right', 
                '#4B0082',
                4, 8, 0,
                { startX: 1100, startY: 500, seatSpacing: 40, rowSpacing: 50 }
              ),

              // DRESS CIRCLE LEVEL (Level 1) 
              premiumCircle: this.generateSectionSeats(
                'premiumCircle', 
                'Premium Dress Circle', 
                '#B8860B', // Dark goldenrod
                6, 26, 0,
                { startX: 180, startY: 300, seatSpacing: 34, rowSpacing: 44 }
              ),
              standardCircle: this.generateSectionSeats(
                'standardCircle', 
                'Standard Dress Circle', 
                '#DAA520', // Goldenrod
                8, 30, 0,
                { startX: 160, startY: 564, seatSpacing: 32, rowSpacing: 42 }
              ),
              circleBoxLeft: this.generateSectionSeats(
                'circleBoxLeft', 
                'Circle Box Left', 
                '#9932CC', // Dark orchid
                3, 6, 0,
                { startX: 70, startY: 350, seatSpacing: 38, rowSpacing: 48 }
              ),
              circleBoxRight: this.generateSectionSeats(
                'circleBoxRight', 
                'Circle Box Right', 
                '#9932CC',
                3, 6, 0,
                { startX: 1080, startY: 350, seatSpacing: 38, rowSpacing: 48 }
              ),
              grandBoxes: this.generateSectionSeats(
                'grandBoxes', 
                'Grand Boxes', 
                '#800080', // Purple for grand boxes
                2, 12, 0,
                { startX: 400, startY: 200, seatSpacing: 45, rowSpacing: 55 }
              ),

              // UPPER CIRCLE LEVEL (Level 2)
              frontUpper: this.generateSectionSeats(
                'frontUpper', 
                'Front Upper Circle', 
                '#2E8B57', // Sea green
                5, 32, 0,
                { startX: 140, startY: 250, seatSpacing: 30, rowSpacing: 40 }
              ),
              rearUpper: this.generateSectionSeats(
                'rearUpper', 
                'Rear Upper Circle', 
                '#228B22', // Forest green
                8, 34, 0,
                { startX: 130, startY: 450, seatSpacing: 29, rowSpacing: 38 }
              ),
              upperBoxLeft: this.generateSectionSeats(
                'upperBoxLeft', 
                'Upper Box Left', 
                '#6A5ACD', // Slate blue
                3, 8, 0,
                { startX: 60, startY: 300, seatSpacing: 36, rowSpacing: 46 }
              ),
              upperBoxRight: this.generateSectionSeats(
                'upperBoxRight', 
                'Upper Box Right', 
                '#6A5ACD',
                3, 8, 0,
                { startX: 1090, startY: 300, seatSpacing: 36, rowSpacing: 46 }
              ),

              // BALCONY LEVEL (Level 3)
              grandCircle: this.generateSectionSeats(
                'grandCircle', 
                'Grand Circle', 
                '#DC143C', // Crimson for top level
                4, 30, 0,
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
              totalSeats: 1252, // Will be calculated
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
      Object.values(phantomSeatMap.shows[showSlug].sections).forEach(section => {
        totalSeats += section.seats.length
      })
      phantomSeatMap.shows[showSlug].metadata.totalSeats = totalSeats

      console.log(`🎭 Generated ${totalSeats} seats across ${Object.keys(phantomSeatMap.shows[showSlug].sections).length} sections`)

      // Insert or update the seat map
      await this.collection.replaceOne(
        { _id: venueId },
        phantomSeatMap,
        { upsert: true }
      )

      console.log('✅ Phantom of the Opera seat map initialized successfully')
      return true

    } catch (error) {
      console.error('❌ Error initializing Phantom seat map:', error)
      return false
    }
  }

  private generateSectionSeats(
    sectionId: string, 
    displayName: string, 
    color: string, 
    rows: number, 
    seatsPerRow: number, 
    basePrice: number, // Keep for compatibility but won't use
    layout?: {
      startX: number
      startY: number  
      seatSpacing: number
      rowSpacing: number
    }
  ): SeatSection {
    const seats: Seat[] = []
    const defaultLayout = { startX: 100, startY: 100, seatSpacing: 30, rowSpacing: 40 }
    const { startX, startY, seatSpacing, rowSpacing } = layout || defaultLayout

    for (let row = 0; row < rows; row++) {
      const rowLetter = String.fromCharCode(65 + row) // A, B, C, etc.
      
      for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
        // Enhanced accessibility logic - more realistic distribution
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
          // NO PRICING DATA - purely layout information
          metadata: {
            level: sectionId.includes('Orchestra') ? 0 : 
                   sectionId.includes('Circle') ? 1 :
                   sectionId.includes('Upper') ? 2 : 3,
            viewQuality: sectionId.includes('premium') ? 'excellent' :
                        sectionId.includes('standard') ? 'good' :
                        sectionId.includes('rear') ? 'fair' : 'very-good'
          }
        })
      }
    }

    return {
      id: sectionId,
      name: displayName,
      color,
      seats,
      layout: {
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
export const seatMapService = new SeatMapService() 