#!/usr/bin/env node

// Create Hamilton Hardcoded Seat Mappings
// Maps iOS hardcoded seat IDs (like "premium-1-1") to real database UUIDs

const HAMILTON_SHOW_ID = 'd11e4d04-90f6-4157-a70f-ecfc63f18058';
const API_BASE = 'http://localhost:3001';

async function main() {
  console.log('🎭 Creating Hamilton hardcoded seat mappings...');
  
  try {
    // Fetch all database seats for Hamilton
    const response = await fetch(`${API_BASE}/api/shows/${HAMILTON_SHOW_ID}/seats`);
    const dbSeats = await response.json();
    
    console.log(`📊 Found ${dbSeats.length} database seats`);
    
    // Group database seats by section
    const seatsBySection = {};
    dbSeats.forEach(seat => {
      const section = seat.section_name;
      if (!seatsBySection[section]) {
        seatsBySection[section] = [];
      }
      seatsBySection[section].push(seat);
    });
    
    console.log('📂 Database sections:');
    Object.entries(seatsBySection).forEach(([section, seats]) => {
      console.log(`   ${section}: ${seats.length} seats`);
    });
    
    // Create mappings
    const mappings = [];
    
    // 1. Premium Orchestra (96 db seats) ↔ Premium hardcoded (use first 96)
    const premiumSeats = seatsBySection['Premium Orchestra'] || [];
    console.log(`\n🏆 Mapping Premium Orchestra (${premiumSeats.length} seats)...`);
    
    let hardcodedIndex = 0;
    for (let row = 1; row <= 10 && hardcodedIndex < premiumSeats.length; row++) {
      for (let seat = 1; seat <= 15 && hardcodedIndex < premiumSeats.length; seat++) {
        const hardcodedId = `premium-${row}-${seat}`;
        const dbSeat = premiumSeats[hardcodedIndex];
        
        mappings.push({
          showId: HAMILTON_SHOW_ID,
          hardcodedSeatId: hardcodedId,
          realSeatId: dbSeat.id
        });
        
        hardcodedIndex++;
      }
    }
    console.log(`   ✅ Mapped ${hardcodedIndex} premium seats`);
    
    // 2. Mezzanine (112 db seats) ↔ Middle hardcoded (use first 112)
    const mezzanineSeats = seatsBySection['Mezzanine'] || [];
    console.log(`\n🎭 Mapping Mezzanine (${mezzanineSeats.length} seats)...`);
    
    hardcodedIndex = 0;
    for (let row = 1; row <= 10 && hardcodedIndex < mezzanineSeats.length; row++) {
      for (let seat = 1; seat <= 15 && hardcodedIndex < mezzanineSeats.length; seat++) {
        const hardcodedId = `middle-${row}-${seat}`;
        const dbSeat = mezzanineSeats[hardcodedIndex];
        
        mappings.push({
          showId: HAMILTON_SHOW_ID,
          hardcodedSeatId: hardcodedId,
          realSeatId: dbSeat.id
        });
        
        hardcodedIndex++;
      }
    }
    console.log(`   ✅ Mapped ${hardcodedIndex} middle seats`);
    
    // 3. Balcony (96 db seats) ↔ Back hardcoded (use first 96)
    const balconySeats = seatsBySection['Balcony'] || [];
    console.log(`\n🎪 Mapping Balcony (${balconySeats.length} seats)...`);
    
    // Back section has varying row configurations
    const backRowConfigs = [
      { seats: 14, row: 1 },
      { seats: 13, row: 2 },
      { seats: 12, row: 3 },
      { seats: 11, row: 4 },
      { seats: 10, row: 5 },
      { seats: 9, row: 6 },
      { seats: 9, row: 7 },
      { seats: 8, row: 8 },
      { seats: 8, row: 9 },
      { seats: 8, row: 10 }
    ];
    
    hardcodedIndex = 0;
    for (const rowConfig of backRowConfigs) {
      if (hardcodedIndex >= balconySeats.length) break;
      
      for (let seat = 1; seat <= rowConfig.seats && hardcodedIndex < balconySeats.length; seat++) {
        const hardcodedId = `back-${rowConfig.row}-${seat}`;
        const dbSeat = balconySeats[hardcodedIndex];
        
        mappings.push({
          showId: HAMILTON_SHOW_ID,
          hardcodedSeatId: hardcodedId,
          realSeatId: dbSeat.id
        });
        
        hardcodedIndex++;
      }
    }
    console.log(`   ✅ Mapped ${hardcodedIndex} back seats`);
    
    console.log(`\n🎉 Created ${mappings.length} total mappings`);
    
    // Save mappings to JSON file for inspection
    const fs = require('fs');
    fs.writeFileSync('hamilton-seat-mappings.json', JSON.stringify(mappings, null, 2));
    console.log('💾 Saved mappings to hamilton-seat-mappings.json');
    
    // Insert mappings into database using bulk insert API
    console.log('\n📤 Inserting mappings into database...');
    
    const insertResponse = await fetch(`${API_BASE}/api/debug-db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'bulk-insert-mappings',
        mappings: mappings
      })
    });
    
    if (insertResponse.ok) {
      const result = await insertResponse.json();
      console.log('✅ Successfully inserted mappings:', result);
    } else {
      console.log('⚠️ Database insert failed, but mappings saved to file');
      console.log('📋 Manual insert SQL:');
      console.log('INSERT INTO hardcoded_seat_mappings (show_id, hardcoded_seat_id, real_seat_id) VALUES');
      
      const sqlValues = mappings.slice(0, 5).map(m => 
        `('${m.showId}', '${m.hardcodedSeatId}', '${m.realSeatId}')`
      ).join(',\n  ');
      
      console.log(`  ${sqlValues}`);
      console.log(`  ... (${mappings.length - 5} more rows)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main(); 