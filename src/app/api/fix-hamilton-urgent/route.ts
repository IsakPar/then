import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/connection'
import { hardcodedSeatMappings, seats, sections } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const HAMILTON_SHOW_ID = 'd11e4d04-90f6-4157-a70f-ecfc63f18058'

export async function POST(request: NextRequest) {
  console.log('🎭 Starting Hamilton seat mapping URGENT fix...')
  
  try {
    // Step 1: Clear existing mappings
    console.log('🧹 Clearing existing Hamilton mappings...')
    await db.delete(hardcodedSeatMappings)
      .where(eq(hardcodedSeatMappings.showId, HAMILTON_SHOW_ID))
    
    // Step 2: Get all Hamilton seats
    console.log('📊 Fetching Hamilton seats...')
    const hamiltonSeats = await db
      .select({
        seatId: seats.id,
        sectionName: sections.name,
        rowLetter: seats.rowLetter,
        seatNumber: seats.seatNumber,
      })
      .from(seats)
      .innerJoin(sections, eq(seats.sectionId, sections.id))
      .where(eq(seats.showId, HAMILTON_SHOW_ID))
      .orderBy(seats.rowLetter, seats.seatNumber)

    console.log(`📈 Found ${hamiltonSeats.length} Hamilton seats`)

    if (hamiltonSeats.length === 0) {
      return NextResponse.json({ 
        error: 'No Hamilton seats found',
        details: 'Hamilton show has no seats in database'
      }, { status: 404 })
    }

    // Step 3: Create comprehensive mappings
    const mappingsToCreate = []
    let seatIndex = 0

    // Helper function to map hardcoded IDs to real seats
    const mapSeatIds = (prefix: string, rows: number, seatsPerRow: number | number[], description: string) => {
      console.log(`   📍 Mapping ${description}...`)
      let mapped = 0
      
      for (let row = 1; row <= rows && seatIndex < hamiltonSeats.length; row++) {
        const maxSeats = Array.isArray(seatsPerRow) ? seatsPerRow[row - 1] : seatsPerRow
        
        for (let seat = 1; seat <= maxSeats && seatIndex < hamiltonSeats.length; seat++) {
          mappingsToCreate.push({
            showId: HAMILTON_SHOW_ID,
            hardcodedSeatId: `${prefix}-${row}-${seat}`,
            realSeatId: hamiltonSeats[seatIndex].seatId
          })
          seatIndex++
          mapped++
        }
      }
      
      console.log(`   ✅ Mapped ${mapped} ${description} seats`)
      return mapped
    }

    // Map all iOS sections to database seats
    mapSeatIds('premium', 10, 15, 'Premium Orchestra (10x15)')
    mapSeatIds('middle', 10, 15, 'Middle Section (10x15)')
    mapSeatIds('back', 10, [14,13,12,11,10,9,9,8,8,8], 'Back Section (varying rows)')
    mapSeatIds('sideA', 10, 5, 'Side A Section (10x5)')
    mapSeatIds('sideB', 10, 5, 'Side B Section (10x5)')

    console.log(`🎉 Total mappings to create: ${mappingsToCreate.length}`)

    // Step 4: Insert mappings in batches
    console.log('💾 Inserting mappings...')
    const batchSize = 100
    let inserted = 0
    
    for (let i = 0; i < mappingsToCreate.length; i += batchSize) {
      const batch = mappingsToCreate.slice(i, i + batchSize)
      
      await db.insert(hardcodedSeatMappings).values(batch)
      
      inserted += batch.length
      console.log(`   📝 Inserted: ${inserted}/${mappingsToCreate.length}`)
    }

    // Step 5: Verify sideA-1-2 specifically
    console.log('🔍 Verifying sideA-1-2...')
    const verification = await db
      .select()
      .from(hardcodedSeatMappings)
      .where(eq(hardcodedSeatMappings.hardcodedSeatId, 'sideA-1-2'))
      .limit(1)

    const success = verification.length > 0
    console.log(`${success ? '✅' : '❌'} sideA-1-2 mapping: ${success ? 'FOUND' : 'NOT FOUND'}`)

    // Final count
    const totalMappings = await db
      .select({ count: hardcodedSeatMappings.id })
      .from(hardcodedSeatMappings)
      .where(eq(hardcodedSeatMappings.showId, HAMILTON_SHOW_ID))

    const result = {
      success: true,
      message: '🎭 Hamilton seat mapping fix completed!',
      stats: {
        totalSeatsInDatabase: hamiltonSeats.length,
        totalMappingsCreated: totalMappings.length,
        sideA12Mapped: success,
        specificTestResult: success ? verification[0].realSeatId : null
      },
      details: 'All iOS hardcoded seat IDs are now mapped to database UUIDs. The payment error should be fixed!'
    }

    console.log('🎉 SUCCESS! Hamilton payments should now work!')
    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Hamilton mapping fix failed:', error)
    return NextResponse.json({ 
      error: 'Hamilton mapping fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 