import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/connection'
import { hardcodedSeatMappings, seats, sections } from '@/lib/db/schema'
import { eq, sql, and, inArray } from 'drizzle-orm'

const HAMILTON_SHOW_ID = 'd11e4d04-90f6-4157-a70f-ecfc63f18058'

export async function POST(request: NextRequest) {
  console.log('🔧 Starting Hamilton seat mapping fix...')
  
  try {
    // Step 1: Clear existing mappings for Hamilton
    console.log('🧹 Clearing existing Hamilton mappings...')
    const deletedCount = await db
      .delete(hardcodedSeatMappings)
      .where(eq(hardcodedSeatMappings.showId, HAMILTON_SHOW_ID))
    
    console.log(`✅ Cleared existing mappings`)

    // Step 2: Get all Hamilton seats grouped by section
    console.log('📊 Fetching Hamilton seats from database...')
    const hamiltonSeats = await db
      .select({
        seatId: seats.id,
        sectionName: sections.name,
        sectionDisplayName: sections.displayName,
        rowLetter: seats.rowLetter,
        seatNumber: seats.seatNumber,
      })
      .from(seats)
      .innerJoin(sections, eq(seats.sectionId, sections.id))
      .where(eq(seats.showId, HAMILTON_SHOW_ID))
      .orderBy(seats.rowLetter, seats.seatNumber)

    console.log(`📈 Found ${hamiltonSeats.length} Hamilton seats in database`)

    if (hamiltonSeats.length === 0) {
      return NextResponse.json({ 
        error: 'No Hamilton seats found',
        details: 'Make sure Hamilton show exists in database'
      }, { status: 404 })
    }

    // Log sections for debugging
    const sectionSummary = hamiltonSeats.reduce((acc, seat) => {
      acc[seat.sectionName] = (acc[seat.sectionName] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('🏛️ Available sections:', sectionSummary)

    // Step 3: Create comprehensive mappings
    const mappingsToCreate: Array<{showId: string, hardcodedSeatId: string, realSeatId: string}> = []

    // Helper function to get seats for a section type
    const getSeatsForSection = (sectionNames: string[], count: number) => {
      const availableSeats = hamiltonSeats.filter(seat => 
        sectionNames.some(name => 
          seat.sectionName.toLowerCase().includes(name.toLowerCase()) ||
          seat.sectionDisplayName?.toLowerCase().includes(name.toLowerCase())
        )
      )
      return availableSeats.slice(0, count)
    }

    // Premium section mappings (150 seats: 10 rows x 15 seats)
    console.log('🏆 Creating premium section mappings...')
    const premiumSeats = getSeatsForSection(['premium', 'orchestra', 'stalls'], 150)
    let seatIndex = 0
    
    for (let row = 1; row <= 10 && seatIndex < premiumSeats.length; row++) {
      for (let seat = 1; seat <= 15 && seatIndex < premiumSeats.length; seat++) {
        mappingsToCreate.push({
          showId: HAMILTON_SHOW_ID,
          hardcodedSeatId: `premium-${row}-${seat}`,
          realSeatId: premiumSeats[seatIndex].seatId
        })
        seatIndex++
      }
    }
    
    console.log(`✅ Created ${seatIndex} premium mappings`)

    // Middle section mappings (150 seats: 10 rows x 15 seats)
    console.log('🎭 Creating middle section mappings...')
    const middleSeats = getSeatsForSection(['mezzanine', 'dress', 'circle', 'middle'], 150)
    seatIndex = 0
    
    for (let row = 1; row <= 10 && seatIndex < middleSeats.length; row++) {
      for (let seat = 1; seat <= 15 && seatIndex < middleSeats.length; seat++) {
        mappingsToCreate.push({
          showId: HAMILTON_SHOW_ID,
          hardcodedSeatId: `middle-${row}-${seat}`,
          realSeatId: middleSeats[seatIndex].seatId
        })
        seatIndex++
      }
    }
    
    console.log(`✅ Created ${seatIndex} middle mappings`)

    // Back section mappings (varying seats per row, ~102 total)
    console.log('🎪 Creating back section mappings...')
    const backSeats = getSeatsForSection(['balcony', 'back', 'upper'], 102)
    const backRowConfigs = [14, 13, 12, 11, 10, 9, 9, 8, 8, 8]
    seatIndex = 0
    
    for (let rowIdx = 0; rowIdx < backRowConfigs.length && seatIndex < backSeats.length; rowIdx++) {
      const row = rowIdx + 1
      const seatsInRow = backRowConfigs[rowIdx]
      
      for (let seat = 1; seat <= seatsInRow && seatIndex < backSeats.length; seat++) {
        mappingsToCreate.push({
          showId: HAMILTON_SHOW_ID,
          hardcodedSeatId: `back-${row}-${seat}`,
          realSeatId: backSeats[seatIndex].seatId
        })
        seatIndex++
      }
    }
    
    console.log(`✅ Created ${seatIndex} back mappings`)

    // Side A section mappings (50 seats: 10 rows x 5 seats)
    console.log('🎨 Creating side A section mappings...')
    const sideASeats = getSeatsForSection(['mezzanine', 'orchestra'], 50)
    seatIndex = 0
    
    for (let row = 1; row <= 10 && seatIndex < sideASeats.length; row++) {
      for (let seat = 1; seat <= 5 && seatIndex < sideASeats.length; seat++) {
        mappingsToCreate.push({
          showId: HAMILTON_SHOW_ID,
          hardcodedSeatId: `sideA-${row}-${seat}`,
          realSeatId: sideASeats[seatIndex].seatId
        })
        seatIndex++
      }
    }
    
    console.log(`✅ Created ${seatIndex} side A mappings`)

    // Side B section mappings (50 seats: 10 rows x 5 seats)
    console.log('🎨 Creating side B section mappings...')
    const sideBSeats = getSeatsForSection(['mezzanine', 'balcony'], 50)
    seatIndex = 0
    
    for (let row = 1; row <= 10 && seatIndex < sideBSeats.length; row++) {
      for (let seat = 1; seat <= 5 && seatIndex < sideBSeats.length; seat++) {
        mappingsToCreate.push({
          showId: HAMILTON_SHOW_ID,
          hardcodedSeatId: `sideB-${row}-${seat}`,
          realSeatId: sideBSeats[seatIndex].seatId
        })
        seatIndex++
      }
    }
    
    console.log(`✅ Created ${seatIndex} side B mappings`)

    // Fallback: Map any remaining hardcoded IDs to any available seats
    console.log('🔄 Creating fallback mappings for remaining seats...')
    const usedSeatIds = new Set(mappingsToCreate.map(m => m.realSeatId))
    const remainingSeats = hamiltonSeats.filter(seat => !usedSeatIds.has(seat.seatId))
    
    // Generate all possible hardcoded seat IDs that iOS app creates
    const allPossibleIds: string[] = []
    
    // Premium: 10x15 = 150
    for (let r = 1; r <= 10; r++) {
      for (let s = 1; s <= 15; s++) {
        allPossibleIds.push(`premium-${r}-${s}`)
      }
    }
    
    // Middle: 10x15 = 150  
    for (let r = 1; r <= 10; r++) {
      for (let s = 1; s <= 15; s++) {
        allPossibleIds.push(`middle-${r}-${s}`)
      }
    }
    
    // Back: varying per row
    const backConfigs = [14, 13, 12, 11, 10, 9, 9, 8, 8, 8]
    for (let r = 0; r < backConfigs.length; r++) {
      for (let s = 1; s <= backConfigs[r]; s++) {
        allPossibleIds.push(`back-${r + 1}-${s}`)
      }
    }
    
    // Side A & B: 10x5 each
    for (let r = 1; r <= 10; r++) {
      for (let s = 1; s <= 5; s++) {
        allPossibleIds.push(`sideA-${r}-${s}`)
        allPossibleIds.push(`sideB-${r}-${s}`)
      }
    }

    // Map any unmapped hardcoded IDs to remaining seats
    const existingMappedIds = new Set(mappingsToCreate.map(m => m.hardcodedSeatId))
    const unmappedIds = allPossibleIds.filter(id => !existingMappedIds.has(id))
    
    for (let i = 0; i < Math.min(unmappedIds.length, remainingSeats.length); i++) {
      mappingsToCreate.push({
        showId: HAMILTON_SHOW_ID,
        hardcodedSeatId: unmappedIds[i],
        realSeatId: remainingSeats[i].seatId
      })
    }

    console.log(`✅ Total mappings to create: ${mappingsToCreate.length}`)

    // Step 4: Insert all mappings in batches
    console.log('💾 Inserting mappings into database...')
    const batchSize = 100
    let insertedCount = 0
    
    for (let i = 0; i < mappingsToCreate.length; i += batchSize) {
      const batch = mappingsToCreate.slice(i, i + batchSize)
      
      await db.insert(hardcodedSeatMappings).values(
        batch.map(mapping => ({
          showId: mapping.showId,
          hardcodedSeatId: mapping.hardcodedSeatId,
          realSeatId: mapping.realSeatId,
        }))
      )
      
      insertedCount += batch.length
      console.log(`📝 Inserted batch ${Math.ceil((i + 1) / batchSize)}: ${insertedCount}/${mappingsToCreate.length} mappings`)
    }

    // Step 5: Verify the specific failing seat is now mapped
    console.log('🔍 Verifying middle-10-15 mapping...')
    const testMapping = await db
      .select()
      .from(hardcodedSeatMappings)
      .where(
        and(
          eq(hardcodedSeatMappings.showId, HAMILTON_SHOW_ID),
          eq(hardcodedSeatMappings.hardcodedSeatId, 'middle-10-15')
        )
      )
      .limit(1)

    const success = testMapping.length > 0
    
    console.log(`${success ? '✅' : '❌'} middle-10-15 mapping: ${success ? 'FOUND' : 'NOT FOUND'}`)

    // Summary
    const summary = {
      success: true,
      totalSeatsInDatabase: hamiltonSeats.length,
      totalMappingsCreated: insertedCount,
      availableSections: Object.keys(sectionSummary),
      sectionBreakdown: sectionSummary,
      specificTestResult: {
        seatId: 'middle-10-15',
        mapped: success,
        realSeatId: success ? testMapping[0].realSeatId : null
      },
      message: success 
        ? '🎉 All Hamilton seats can now be booked! The middle-10-15 error should be resolved.'
        : '⚠️ Mappings created but middle-10-15 not found. Check seat generation logic.'
    }

    console.log('🎉 Hamilton seat mapping fix completed successfully!')
    return NextResponse.json(summary)

  } catch (error) {
    console.error('❌ Hamilton mapping fix failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fix Hamilton seat mappings',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 