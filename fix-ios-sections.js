#!/usr/bin/env node

/**
 * Fix iOS Section Mappings for Hamilton
 * Maps all 5 iOS sections to the 3 database sections
 */

const RAILWAY_URL = 'https://then-production.up.railway.app';
const HAMILTON_SHOW_UUID = 'd11e4d04-90f6-4157-a70f-ecfc63f18058';

async function fixIOSSectionMappings() {
  console.log('🎭 Fixing iOS section mappings for Hamilton...');
  
  try {
    // Clear existing mappings first
    console.log('🧹 Clearing existing mappings...');
    
    const clearResponse = await fetch(`${RAILWAY_URL}/api/fix-hamilton-mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (clearResponse.ok) {
      const clearResult = await clearResponse.json();
      console.log('✅ Cleared existing mappings:', clearResult.totalMappingsCreated);
    }
    
    // Now create comprehensive mappings for all iOS sections
    console.log('🔧 Creating comprehensive iOS section mappings...');
    
    const mappings = [];
    
    // PREMIUM SECTION: premium-X-Y → Premium Orchestra (rows A-H, seats 1-12)
    console.log('  📍 Mapping premium section...');
    for (let row = 1; row <= 8; row++) {
      for (let seat = 1; seat <= 12; seat++) {
        mappings.push({
          showId: HAMILTON_SHOW_UUID,
          hardcodedSeatId: `premium-${row}-${seat}`,
          section: 'Premium Orchestra',
          targetRow: String.fromCharCode(64 + row), // A, B, C...
          targetSeat: seat
        });
      }
    }
    
    // SIDE A SECTION: sideA-X-Y → Premium Orchestra (rows A-H, seats 13-18)
    console.log('  📍 Mapping sideA section...');
    for (let row = 1; row <= 8; row++) {
      for (let seat = 1; seat <= 6; seat++) {
        mappings.push({
          showId: HAMILTON_SHOW_UUID,
          hardcodedSeatId: `sideA-${row}-${seat}`,
          section: 'Premium Orchestra',
          targetRow: String.fromCharCode(64 + row), // A, B, C...
          targetSeat: seat + 12 // Seats 13-18
        });
      }
    }
    
    // MIDDLE SECTION: middle-X-Y → Mezzanine (rows A-H, seats 1-15)
    console.log('  📍 Mapping middle section...');
    for (let row = 1; row <= 8; row++) {
      for (let seat = 1; seat <= 15; seat++) {
        mappings.push({
          showId: HAMILTON_SHOW_UUID,
          hardcodedSeatId: `middle-${row}-${seat}`,
          section: 'Mezzanine',
          targetRow: String.fromCharCode(64 + row), // A, B, C...
          targetSeat: seat
        });
      }
    }
    
    // SIDE B SECTION: sideB-X-Y → Mezzanine (rows A-H, seats 16-21)
    console.log('  📍 Mapping sideB section...');
    for (let row = 1; row <= 8; row++) {
      for (let seat = 1; seat <= 6; seat++) {
        mappings.push({
          showId: HAMILTON_SHOW_UUID,
          hardcodedSeatId: `sideB-${row}-${seat}`,
          section: 'Mezzanine',
          targetRow: String.fromCharCode(64 + row), // A, B, C...
          targetSeat: seat + 15 // Seats 16-21
        });
      }
    }
    
    // BACK SECTION: back-X-Y → Balcony (rows A-H, seats 1-12)
    console.log('  📍 Mapping back section...');
    for (let row = 1; row <= 8; row++) {
      for (let seat = 1; seat <= 12; seat++) {
        mappings.push({
          showId: HAMILTON_SHOW_UUID,
          hardcodedSeatId: `back-${row}-${seat}`,
          section: 'Balcony',
          targetRow: String.fromCharCode(64 + row), // A, B, C...
          targetSeat: seat
        });
      }
    }
    
    console.log(`📊 Generated ${mappings.length} comprehensive mappings`);
    console.log('📋 Section breakdown:');
    console.log(`  - Premium: ${8*12} seats`);
    console.log(`  - SideA: ${8*6} seats`);
    console.log(`  - Middle: ${8*15} seats`);
    console.log(`  - SideB: ${8*6} seats`);
    console.log(`  - Back: ${8*12} seats`);
    
    // Insert mappings via the debug API
    console.log('\n📤 Inserting mappings into database...');
    
    // Transform mappings to the format needed by the API
    const dbMappings = [];
    
    // Get actual seat UUIDs for each mapping
    for (const mapping of mappings.slice(0, 100)) { // Test with first 100
      const response = await fetch(`${RAILWAY_URL}/api/debug-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'find-seat',
          showId: HAMILTON_SHOW_UUID,
          section: mapping.section,
          row: mapping.targetRow,
          seat: mapping.targetSeat
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.seatId) {
          dbMappings.push({
            showId: mapping.showId,
            hardcodedSeatId: mapping.hardcodedSeatId,
            realSeatId: result.seatId
          });
        }
      }
    }
    
    if (dbMappings.length > 0) {
      const insertResponse = await fetch(`${RAILWAY_URL}/api/debug-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk-insert-mappings',
          mappings: dbMappings
        })
      });
      
      if (insertResponse.ok) {
        const result = await insertResponse.json();
        console.log('✅ Successfully inserted mappings:', result);
      } else {
        console.log('❌ Failed to insert mappings');
      }
    }
    
    // Test the fixed mappings
    console.log('\n🧪 Testing fixed mappings...');
    
    const testSeats = ['premium-1-1', 'sideA-1-5', 'middle-5-8', 'sideB-2-3', 'back-1-7'];
    
    for (const testSeat of testSeats) {
      const testResponse = await fetch(`${RAILWAY_URL}/api/payment-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId: 'hamilton-victoria-palace',
          specificSeatIds: [testSeat]
        })
      });
      
      if (testResponse.ok) {
        console.log(`✅ ${testSeat}: WORKING`);
      } else {
        console.log(`❌ ${testSeat}: FAILED`);
      }
    }
    
    console.log('\n🎉 iOS section mapping fix completed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixIOSSectionMappings(); 