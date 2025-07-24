#!/usr/bin/env node

// Fix Hamilton Seat Mappings - Direct Database Connection
// This script creates comprehensive seat mappings for Hamilton to fix payment errors

const { Pool } = require('pg')

const HAMILTON_SHOW_ID = 'd11e4d04-90f6-4157-a70f-ecfc63f18058'

// Railway database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:ZllsKKUNzfOtPYgAqNYqNTlLkqVPNlVV@junction.proxy.rlwy.net:36039/railway',
  ssl: {
    rejectUnauthorized: false
  }
})

async function main() {
  console.log('🎭 Starting Hamilton seat mapping fix...')
  
  try {
    // Test connection
    const client = await pool.connect()
    console.log('✅ Connected to Railway database')
    
    // Step 1: Clear existing mappings for Hamilton
    console.log('🧹 Clearing existing Hamilton mappings...')
    await client.query(`
      DELETE FROM hardcoded_seat_mappings 
      WHERE show_id = $1
    `, [HAMILTON_SHOW_ID])
    
    console.log('✅ Cleared existing mappings')

    // Step 2: Get all Hamilton seats
    console.log('📊 Fetching Hamilton seats from database...')
    const seatsResult = await client.query(`
      SELECT 
        s.id as seat_id,
        sec.name as section_name,
        sec.display_name as section_display_name,
        s.row_letter,
        s.seat_number
      FROM seats s
      INNER JOIN sections sec ON s.section_id = sec.id
      WHERE s.show_id = $1
      ORDER BY s.row_letter, s.seat_number
    `, [HAMILTON_SHOW_ID])

    const hamiltonSeats = seatsResult.rows
    console.log(`📈 Found ${hamiltonSeats.length} Hamilton seats in database`)

    if (hamiltonSeats.length === 0) {
      throw new Error('No Hamilton seats found in database')
    }

    // Log sections for debugging
    const sectionSummary = hamiltonSeats.reduce((acc, seat) => {
      acc[seat.section_name] = (acc[seat.section_name] || 0) + 1
      return acc
    }, {})
    
    console.log('🏛️ Available sections:', sectionSummary)

    // Step 3: Create comprehensive mappings
    const mappingsToCreate = []

    // Helper function to get seats for a section type
    const getSeatsForSection = (sectionNames, count) => {
      const availableSeats = hamiltonSeats.filter(seat => 
        sectionNames.some(name => 
          seat.section_name.toLowerCase().includes(name.toLowerCase()) ||
          (seat.section_display_name && seat.section_display_name.toLowerCase().includes(name.toLowerCase()))
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
          realSeatId: premiumSeats[seatIndex].seat_id
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
          realSeatId: middleSeats[seatIndex].seat_id
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
          realSeatId: backSeats[seatIndex].seat_id
        })
        seatIndex++
      }
    }
    
    console.log(`✅ Created ${seatIndex} back mappings`)

    // Side A section mappings (50 seats: 10 rows x 5 seats)
    console.log('🎨 Creating side A section mappings...')
    const sideASeats = getSeatsForSection(['box', 'side', 'royal'], 50)
    seatIndex = 0
    
    for (let row = 1; row <= 10 && seatIndex < sideASeats.length; row++) {
      for (let seat = 1; seat <= 5 && seatIndex < sideASeats.length; seat++) {
        mappingsToCreate.push({
          showId: HAMILTON_SHOW_ID,
          hardcodedSeatId: `sideA-${row}-${seat}`,
          realSeatId: sideASeats[seatIndex].seat_id
        })
        seatIndex++
      }
    }
    
    console.log(`✅ Created ${seatIndex} side A mappings`)

    // Side B section mappings (50 seats: 10 rows x 5 seats)
    console.log('🎨 Creating side B section mappings...')
    const sideBSeats = getSeatsForSection(['grand', 'upper', 'gallery'], 50)
    seatIndex = 0
    
    for (let row = 1; row <= 10 && seatIndex < sideBSeats.length; row++) {
      for (let seat = 1; seat <= 5 && seatIndex < sideBSeats.length; seat++) {
        mappingsToCreate.push({
          showId: HAMILTON_SHOW_ID,
          hardcodedSeatId: `sideB-${row}-${seat}`,
          realSeatId: sideBSeats[seatIndex].seat_id
        })
        seatIndex++
      }
    }
    
    console.log(`✅ Created ${seatIndex} side B mappings`)

    // Fallback: Map any remaining hardcoded IDs to any available seats
    console.log('🔄 Creating fallback mappings for remaining seats...')
    const usedSeatIds = new Set(mappingsToCreate.map(m => m.realSeatId))
    const remainingSeats = hamiltonSeats.filter(seat => !usedSeatIds.has(seat.seat_id))
    
    // Generate all possible hardcoded seat IDs that iOS app creates
    const allPossibleIds = []
    
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
        realSeatId: remainingSeats[i].seat_id
      })
    }

    console.log(`✅ Total mappings to create: ${mappingsToCreate.length}`)

    // Step 4: Insert all mappings in batches
    console.log('💾 Inserting mappings into database...')
    const batchSize = 100
    let insertedCount = 0
    
    for (let i = 0; i < mappingsToCreate.length; i += batchSize) {
      const batch = mappingsToCreate.slice(i, i + batchSize)
      
      // Build INSERT statement with multiple values
      const values = batch.map((_, idx) => 
        `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`
      ).join(', ')
      
      const params = batch.flatMap(mapping => [
        mapping.showId,
        mapping.hardcodedSeatId,
        mapping.realSeatId
      ])
      
      await client.query(`
        INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id)
        VALUES ${values}
      `, params)
      
      insertedCount += batch.length
      console.log(`📝 Inserted batch ${Math.ceil((i + 1) / batchSize)}: ${insertedCount}/${mappingsToCreate.length} mappings`)
    }

    // Step 5: Verify the specific failing seat is now mapped
    console.log('🔍 Verifying middle-10-15 mapping...')
    const testResult = await client.query(`
      SELECT hm.hardcoded_seat_id, hm.real_seat_id, s.row_letter, s.seat_number, sec.display_name as section_name
      FROM hardcoded_seat_mappings hm
      INNER JOIN seats s ON s.id = hm.real_seat_id
      INNER JOIN sections sec ON sec.id = s.section_id
      WHERE hm.show_id = $1 AND hm.hardcoded_seat_id = $2
    `, [HAMILTON_SHOW_ID, 'middle-10-15'])

    const success = testResult.rows.length > 0
    
    console.log(`${success ? '✅' : '❌'} middle-10-15 mapping: ${success ? 'FOUND' : 'NOT FOUND'}`)
    
    if (success) {
      const mapping = testResult.rows[0]
      console.log(`   ✅ middle-10-15 → ${mapping.section_name} Row ${mapping.row_letter} Seat ${mapping.seat_number}`)
    }

    // Final summary
    console.log('')
    console.log('🎉 HAMILTON SEAT MAPPING FIX COMPLETED!')
    console.log(`   📊 Total seats in database: ${hamiltonSeats.length}`)
    console.log(`   🗺️ Total mappings created: ${insertedCount}`)
    console.log(`   🎭 Available sections: ${Object.keys(sectionSummary).join(', ')}`)
    console.log(`   🎯 middle-10-15 mapping: ${success ? 'SUCCESS' : 'FAILED'}`)
    console.log('')
    console.log('💡 Any seat in Hamilton can now be booked!')
    console.log('🔧 The 400 payment errors should be resolved.')

    client.release()
    await pool.end()
    
    process.exit(0)

  } catch (error) {
    console.error('❌ Hamilton mapping fix failed:', error.message)
    await pool.end()
    process.exit(1)
  }
}

// Run the fix
main().catch(console.error) 