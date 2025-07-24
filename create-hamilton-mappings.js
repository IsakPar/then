#!/usr/bin/env node

// Create Hamilton Hardcoded Seat Mappings
// Maps iOS hardcoded seat IDs to real database UUIDs

const HAMILTON_SHOW_ID = 'd11e4d04-90f6-4157-a70f-ecfc63f18058';
const API_BASE = 'https://then-production.up.railway.app';

async function fetchHamiltonSeats() {
  console.log('🎭 Fetching Hamilton seats from production database...');
  
  const response = await fetch(`${API_BASE}/api/shows/${HAMILTON_SHOW_ID}/seats`);
  if (!response.ok) {
    throw new Error(`Failed to fetch seats: ${response.status}`);
  }
  
  const seats = await response.json();
  console.log(`📊 Found ${seats.length} total seats`);
  
  // Group seats by section
  const seatsBySection = {};
  seats.forEach(seat => {
    const section = seat.section_name;
    if (!seatsBySection[section]) {
      seatsBySection[section] = [];
    }
    seatsBySection[section].push(seat);
  });
  
  console.log('📂 Sections found:');
  Object.entries(seatsBySection).forEach(([section, sectionSeats]) => {
    console.log(`   ${section}: ${sectionSeats.length} seats`);
  });
  
  return seatsBySection;
}

function createMappings(seatsBySection) {
  const mappings = [];
  
  // 1. PREMIUM SECTION -> Premium Orchestra
  const premiumSeats = seatsBySection['Premium Orchestra'] || [];
  console.log(`\n🏆 Mapping Premium section (${premiumSeats.length} seats)...`);
  
  let seatIndex = 0;
  for (let row = 1; row <= 10 && seatIndex < premiumSeats.length; row++) {
    for (let seat = 1; seat <= 15 && seatIndex < premiumSeats.length; seat++) {
      const hardcodedId = `premium-${row}-${seat}`;
      const dbSeat = premiumSeats[seatIndex];
      
      mappings.push({
        showId: HAMILTON_SHOW_ID,
        hardcodedSeatId: hardcodedId,
        realSeatId: dbSeat.id
      });
      
      seatIndex++;
    }
  }
  console.log(`   ✅ Mapped ${seatIndex} premium seats`);
  
  // 2. MIDDLE SECTION -> Mezzanine
  const middleSeats = seatsBySection['Mezzanine'] || [];
  console.log(`\n🎯 Mapping Middle section (${middleSeats.length} seats)...`);
  
  seatIndex = 0;
  for (let row = 1; row <= 10 && seatIndex < middleSeats.length; row++) {
    for (let seat = 1; seat <= 15 && seatIndex < middleSeats.length; seat++) {
      const hardcodedId = `middle-${row}-${seat}`;
      const dbSeat = middleSeats[seatIndex];
      
      mappings.push({
        showId: HAMILTON_SHOW_ID,
        hardcodedSeatId: hardcodedId,
        realSeatId: dbSeat.id
      });
      
      seatIndex++;
    }
  }
  console.log(`   ✅ Mapped ${seatIndex} middle seats`);
  
  // 3. BACK SECTION -> Balcony (variable seats per row)
  const backSeats = seatsBySection['Balcony'] || [];
  console.log(`\n🎭 Mapping Back section (${backSeats.length} seats)...`);
  
  seatIndex = 0;
  const backRowSeats = [14, 13, 12, 11, 10, 9, 9, 8, 8, 8]; // iOS layout
  
  for (let row = 1; row <= backRowSeats.length && seatIndex < backSeats.length; row++) {
    const seatsInRow = backRowSeats[row - 1];
    for (let seat = 1; seat <= seatsInRow && seatIndex < backSeats.length; seat++) {
      const hardcodedId = `back-${row}-${seat}`;
      const dbSeat = backSeats[seatIndex];
      
      mappings.push({
        showId: HAMILTON_SHOW_ID,
        hardcodedSeatId: hardcodedId,
        realSeatId: dbSeat.id
      });
      
      seatIndex++;
    }
  }
  console.log(`   ✅ Mapped ${seatIndex} back seats`);
  
  // 4. SIDE A SECTION -> Use remaining Premium Orchestra seats
  const remainingPremium = premiumSeats.slice(Math.min(150, premiumSeats.length));
  console.log(`\n↖️ Mapping SideA section (${remainingPremium.length} seats)...`);
  
  seatIndex = 0;
  for (let row = 1; row <= 5 && seatIndex < remainingPremium.length; row++) {
    for (let seat = 1; seat <= 5 && seatIndex < remainingPremium.length; seat++) {
      const hardcodedId = `sideA-${row}-${seat}`;
      const dbSeat = remainingPremium[seatIndex];
      
      mappings.push({
        showId: HAMILTON_SHOW_ID,
        hardcodedSeatId: hardcodedId,
        realSeatId: dbSeat.id
      });
      
      seatIndex++;
    }
  }
  console.log(`   ✅ Mapped ${seatIndex} sideA seats`);
  
  // 5. SIDE B SECTION -> Use remaining Mezzanine seats  
  const remainingMezzanine = middleSeats.slice(Math.min(150, middleSeats.length));
  console.log(`\n↗️ Mapping SideB section (${remainingMezzanine.length} seats)...`);
  
  seatIndex = 0;
  for (let row = 1; row <= 5 && seatIndex < remainingMezzanine.length; row++) {
    for (let seat = 1; seat <= 5 && seatIndex < remainingMezzanine.length; seat++) {
      const hardcodedId = `sideB-${row}-${seat}`;
      const dbSeat = remainingMezzanine[seatIndex];
      
      mappings.push({
        showId: HAMILTON_SHOW_ID,
        hardcodedSeatId: hardcodedId,
        realSeatId: dbSeat.id
      });
      
      seatIndex++;
    }
  }
  console.log(`   ✅ Mapped ${seatIndex} sideB seats`);
  
  return mappings;
}

async function insertMappings(mappings) {
  console.log(`\n📤 Inserting ${mappings.length} mappings into production database...`);
  
  const response = await fetch(`${API_BASE}/api/debug-db`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'bulk-insert-mappings',
      mappings: mappings
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to insert mappings: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  console.log('✅ Database response:', result);
  return result;
}

async function main() {
  try {
    console.log('🚀 Creating Hamilton hardcoded seat mappings for iOS app...\n');
    
    // Step 1: Fetch all Hamilton seats
    const seatsBySection = await fetchHamiltonSeats();
    
    // Step 2: Create hardcoded mappings
    const mappings = createMappings(seatsBySection);
    
    // Step 3: Insert into database
    const result = await insertMappings(mappings);
    
    console.log(`\n🎉 SUCCESS! Created ${mappings.length} hardcoded seat mappings`);
    console.log('🔗 iOS app seat IDs (premium-1-1, sideA-1-1, etc.) now map to real database UUIDs');
    console.log('💳 Hamilton payments should now work correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main(); 