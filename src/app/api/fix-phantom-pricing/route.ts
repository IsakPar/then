import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/connection'
import { sections, seats, shows, seatMaps } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 Emergency Fix: Adding PostgreSQL sections and seats for Phantom...')
    
    // Get Phantom show details
    const phantomShow = await db.select({
      id: shows.id,
      title: shows.title,
      seatMapId: shows.seatMapId,
      venueId: shows.venueId
    })
    .from(shows)
    .where(eq(shows.title, "The Phantom of the Opera"))
    .limit(1)

    if (phantomShow.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Phantom show not found' 
      }, { status: 404 })
    }

    const { id: showId, seatMapId, venueId } = phantomShow[0]
    console.log(`✅ Found Phantom show: ${showId}, seatMapId: ${seatMapId}`)

    // Create Phantom sections with proper pricing
    const phantomSections = [
      { name: 'Premium Orchestra', displayName: 'Premium Orchestra', colorHex: '#8B0000', basePricePence: 9500, rows: 8, seatsPerRow: 24 }, // £95
      { name: 'Standard Orchestra', displayName: 'Standard Orchestra', colorHex: '#CD5C5C', basePricePence: 7500, rows: 12, seatsPerRow: 28 }, // £75
      { name: 'Side Box Left', displayName: 'Side Box Left', colorHex: '#4B0082', basePricePence: 8500, rows: 4, seatsPerRow: 8 }, // £85
      { name: 'Side Box Right', displayName: 'Side Box Right', colorHex: '#4B0082', basePricePence: 8500, rows: 4, seatsPerRow: 8 }, // £85
      { name: 'Premium Dress Circle', displayName: 'Premium Dress Circle', colorHex: '#B8860B', basePricePence: 8000, rows: 6, seatsPerRow: 26 }, // £80
      { name: 'Standard Dress Circle', displayName: 'Standard Dress Circle', colorHex: '#DAA520', basePricePence: 6000, rows: 8, seatsPerRow: 30 }, // £60
      { name: 'Circle Box Left', displayName: 'Circle Box Left', colorHex: '#9932CC', basePricePence: 7500, rows: 3, seatsPerRow: 6 }, // £75
      { name: 'Circle Box Right', displayName: 'Circle Box Right', colorHex: '#9932CC', basePricePence: 7500, rows: 3, seatsPerRow: 6 }, // £75
      { name: 'Grand Boxes', displayName: 'Grand Boxes', colorHex: '#800080', basePricePence: 12000, rows: 2, seatsPerRow: 12 }, // £120
      { name: 'Front Upper Circle', displayName: 'Front Upper Circle', colorHex: '#2E8B57', basePricePence: 4500, rows: 5, seatsPerRow: 32 }, // £45
      { name: 'Rear Upper Circle', displayName: 'Rear Upper Circle', colorHex: '#228B22', basePricePence: 3500, rows: 8, seatsPerRow: 34 }, // £35
      { name: 'Upper Box Left', displayName: 'Upper Box Left', colorHex: '#6A5ACD', basePricePence: 5000, rows: 3, seatsPerRow: 8 }, // £50
      { name: 'Upper Box Right', displayName: 'Upper Box Right', colorHex: '#6A5ACD', basePricePence: 5000, rows: 3, seatsPerRow: 8 }, // £50
      { name: 'Grand Circle', displayName: 'Grand Circle', colorHex: '#DC143C', basePricePence: 10000, rows: 4, seatsPerRow: 30 } // £100
    ]

    console.log(`🏗️ Creating ${phantomSections.length} sections for Phantom...`)

    // Create sections and seats in a transaction
    let totalSeatsCreated = 0
    let sectionsCreated = 0

    for (const sectionConfig of phantomSections) {
      // Create section
      const [newSection] = await db.insert(sections).values({
        seatMapId,
        name: sectionConfig.name,
        displayName: sectionConfig.displayName,
        colorHex: sectionConfig.colorHex,
        basePricePence: sectionConfig.basePricePence,
        isAccessible: ['Premium Orchestra', 'Standard Orchestra'].includes(sectionConfig.name), // Orchestra accessible
        sortOrder: sectionsCreated + 1
      }).returning({ id: sections.id })

      console.log(`✅ Created section: ${sectionConfig.name} (${newSection.id})`)
      sectionsCreated++

      // Create seats for this section
      const seatInserts = []
      for (let row = 0; row < sectionConfig.rows; row++) {
        const rowLetter = String.fromCharCode(65 + row) // A, B, C...
        
        for (let seatNum = 1; seatNum <= sectionConfig.seatsPerRow; seatNum++) {
          // Add some price variation (±£5) for premium sections
          let seatPrice = sectionConfig.basePricePence
          if (sectionConfig.name.includes('Premium') || sectionConfig.name.includes('Grand')) {
            // Premium seats have slight price variation
            const variation = Math.floor(Math.random() * 1000) - 500 // ±£5
            seatPrice = Math.max(sectionConfig.basePricePence + variation, sectionConfig.basePricePence - 500)
          }

          seatInserts.push({
            showId,
            sectionId: newSection.id,
            rowLetter,
            seatNumber: seatNum,
            pricePence: seatPrice,
            status: 'available' as const,
            isAccessible: row === 0 && [1, 2, sectionConfig.seatsPerRow - 1, sectionConfig.seatsPerRow].includes(seatNum),
            position: {
              x: 100 + (seatNum * 30),
              y: 100 + (row * 40)
            }
          })
        }
      }

      // Batch insert seats for this section
      await db.insert(seats).values(seatInserts)
      totalSeatsCreated += seatInserts.length
      console.log(`  ➕ Added ${seatInserts.length} seats to ${sectionConfig.name}`)
    }

    console.log(`🎉 Phantom fix complete!`)
    console.log(`  📊 Sections created: ${sectionsCreated}`)
    console.log(`  🎫 Total seats created: ${totalSeatsCreated}`)

    return NextResponse.json({
      success: true,
      message: '🎭 Phantom of the Opera pricing fixed!',
      details: {
        showId,
        seatMapId,
        sectionsCreated,
        totalSeatsCreated,
        priceRange: '£35 - £120',
        sections: phantomSections.map(s => ({
          name: s.name,
          price: `£${s.basePricePence / 100}`,
          seats: s.rows * s.seatsPerRow
        }))
      }
    })

  } catch (error) {
    console.error('❌ Phantom pricing fix failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fix Phantom pricing',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 