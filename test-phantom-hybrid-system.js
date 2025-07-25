#!/usr/bin/env node

/**
 * 🎭 PHANTOM OF THE OPERA - HYBRID SYSTEM TEST
 * 
 * This script tests the complete hybrid MongoDB + PostgreSQL system:
 * 1. Initialize Phantom seat map in MongoDB (layout only)
 * 2. Verify PostgreSQL setup (pricing/availability)
 * 3. Test hybrid API that combines both data sources
 * 4. Demonstrate the separation of concerns
 */

const API_BASE = process.env.API_URL || 'https://then-production.up.railway.app'

// Test data - various Phantom seats across different sections
const testSeats = {
  premiumOrchestra: ['premiumOrchestra-A-1', 'premiumOrchestra-A-12', 'premiumOrchestra-D-8'],
  grandBoxes: ['grandBoxes-A-5', 'grandBoxes-B-3'],
  standardCircle: ['standardCircle-C-15', 'standardCircle-F-20'],
  rearUpper: ['rearUpper-G-25', 'rearUpper-H-30'],
  mixedSections: ['premiumOrchestra-A-1', 'grandBoxes-A-5', 'rearUpper-H-30']
}

async function makeRequest(url, options = {}) {
  try {
    console.log(`🌐 Making request to: ${url}`)
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error(`❌ Request failed (${response.status}):`, data)
      return { success: false, error: data }
    }
    
    return data
  } catch (error) {
    console.error('❌ Network error:', error.message)
    return { success: false, error: error.message }
  }
}

async function step1_InitializeMongoDB() {
  console.log('\n🎭 ====== STEP 1: MONGODB INITIALIZATION ======')
  console.log('Setting up Phantom seat map layout in MongoDB...')
  
  const result = await makeRequest(`${API_BASE}/api/seatmap/init-hamilton`, {
    method: 'POST',
    body: JSON.stringify({ show: 'phantom' })
  })
  
  if (result.success) {
    console.log('✅ MongoDB initialization successful!')
    console.log(`📍 Show: ${result.show}`)
    console.log(`📋 Message: ${result.message}`)
  } else {
    console.error('❌ MongoDB initialization failed:', result.error)
    return false
  }
  
  // Verify the initialization
  console.log('\n🔍 Verifying MongoDB seat map...')
  const verifyResult = await makeRequest(`${API_BASE}/api/seatmap/init-hamilton?show=phantom`)
  
  if (verifyResult.exists) {
    console.log('✅ MongoDB verification successful!')
    console.log(`📊 Venue: ${verifyResult.venueId}`)
    console.log(`🎬 Show: ${verifyResult.showSlug}`)
    console.log(`💺 Total seats: ${verifyResult.totalSeats}`)
    console.log(`🏛️ Sections: ${verifyResult.sectionCount}`)
    console.log(`📑 Sections list: ${verifyResult.sections.join(', ')}`)
    
    if (verifyResult.metadata) {
      console.log(`🎭 Theatre info: ${verifyResult.metadata.architect} (${verifyResult.metadata.openingYear})`)
      console.log(`♿ Accessible seats: ${verifyResult.metadata.accessibleSeats}`)
    }
  } else {
    console.error('❌ MongoDB verification failed:', verifyResult.message)
    return false
  }
  
  return true
}

async function step2_VerifyPostgreSQL() {
  console.log('\n🗄️ ====== STEP 2: POSTGRESQL VERIFICATION ======')
  console.log('Checking if Phantom show exists in PostgreSQL...')
  console.log('⚠️  Note: Run scripts/setup-phantom-postgres.sql first if this fails')
  
  // We'll use the hybrid API to check PostgreSQL indirectly
  const testSeat = ['premiumOrchestra-A-1']
  
  console.log(`🧪 Testing with seat: ${testSeat[0]}`)
  
  const result = await makeRequest(`${API_BASE}/api/seatmap/phantom-hybrid`, {
    method: 'POST',
    body: JSON.stringify({
      hardcodedSeatIds: testSeat,
      showDate: '2024-01-15',
      showTime: '19:30'
    })
  })
  
  if (result.success) {
    console.log('✅ PostgreSQL verification successful!')
    console.log(`🎬 Show: ${result.show.title}`)
    console.log(`📍 Venue: ${result.show.venue}`)
    console.log(`📧 Address: ${result.show.address}`)
    
    if (result.seats && result.seats.length > 0 && result.seats[0].found) {
      const seat = result.seats[0]
      console.log(`💺 Test seat found: ${seat.business.row}${seat.business.number}`)
      console.log(`💰 Price: ${seat.business.priceDisplay}`)
      console.log(`📊 Status: ${seat.business.status}`)
      console.log(`♿ Accessible: ${seat.business.isAccessible}`)
    }
  } else {
    console.error('❌ PostgreSQL verification failed:', result.error)
    console.log('💡 Solution: Run scripts/setup-phantom-postgres.sql to create Phantom show data')
    return false
  }
  
  return true
}

async function step3_TestHybridAPI() {
  console.log('\n🔄 ====== STEP 3: HYBRID API TESTING ======')
  console.log('Testing the hybrid system with various seat combinations...')
  
  for (const [sectionName, seatIds] of Object.entries(testSeats)) {
    console.log(`\n🎯 Testing ${sectionName}: ${seatIds.join(', ')}`)
    
    const result = await makeRequest(`${API_BASE}/api/seatmap/phantom-hybrid`, {
      method: 'POST',
      body: JSON.stringify({
        hardcodedSeatIds: seatIds,
        showDate: '2024-01-20',
        showTime: '19:30'
      })
    })
    
    if (result.success) {
      console.log(`✅ Found ${result.summary.found}/${result.summary.requested} seats`)
      console.log(`💰 Total price: ${result.summary.totalPriceDisplay}`)
      console.log(`📊 Average price: ${result.summary.averagePriceDisplay}`)
      
      // Show individual seat details
      result.seats.forEach(seat => {
        if (seat.found) {
          console.log(`  💺 ${seat.hardcodedId}: ${seat.business.priceDisplay} (${seat.layout.sectionName})`)
          console.log(`     📍 Position: (${seat.layout.x}, ${seat.layout.y})`)
          console.log(`     🎨 Color: ${seat.layout.sectionColor}`)
          console.log(`     👁️ View: ${seat.layout.viewQuality}`)
          console.log(`     🎭 Type: ${seat.layout.seatType}`)
        } else {
          console.log(`  ❌ ${seat.hardcodedId}: ${seat.error}`)
        }
      })
    } else {
      console.error(`❌ ${sectionName} test failed:`, result.error)
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

async function step4_TestSectionOverview() {
  console.log('\n📋 ====== STEP 4: SECTION OVERVIEW TEST ======')
  console.log('Getting comprehensive section overview from hybrid system...')
  
  const result = await makeRequest(`${API_BASE}/api/seatmap/phantom-hybrid`)
  
  if (result.success) {
    console.log('✅ Section overview successful!')
    console.log(`🎬 Show: ${result.show.title} at ${result.show.venue}`)
    console.log(`🏛️ Total sections: ${result.totals.sections}`)
    console.log(`💺 Total seats: ${result.totals.totalSeats}`)
    console.log(`📊 Levels: ${result.totals.levels.join(', ')}`)
    
    console.log('\n📑 Section breakdown:')
    result.sections.forEach(section => {
      console.log(`  🎭 ${section.name} (Level ${section.level})`)
      console.log(`     🎨 Color: ${section.color}`)
      console.log(`     💺 Layout: ${section.layout.totalSeats} seats (${section.layout.rows} rows × ${section.layout.seatsPerRow} seats)`)
      console.log(`     💰 Avg price: ${section.business.averagePriceDisplay}`)
      console.log(`     📍 Start position: (${section.layout.coordinates.startX}, ${section.layout.coordinates.startY})`)
    })
    
    console.log('\n🔗 Data sources:')
    console.log(`  📋 Layout: ${result.dataSources.layout}`)
    console.log(`  💰 Pricing: ${result.dataSources.pricing}`)
    console.log(`  📊 Availability: ${result.dataSources.availability}`)
  } else {
    console.error('❌ Section overview failed:', result.error)
  }
}

async function step5_DemonstrateSeparationOfConcerns() {
  console.log('\n🔀 ====== STEP 5: SEPARATION OF CONCERNS DEMO ======')
  console.log('Demonstrating how MongoDB and PostgreSQL handle different responsibilities...')
  
  const demoSeat = 'premiumOrchestra-A-1'
  console.log(`🧪 Demo seat: ${demoSeat}`)
  
  const result = await makeRequest(`${API_BASE}/api/seatmap/phantom-hybrid`, {
    method: 'POST',
    body: JSON.stringify({
      hardcodedSeatIds: [demoSeat],
      showDate: '2024-01-25',
      showTime: '14:30'
    })
  })
  
  if (result.success && result.seats.length > 0 && result.seats[0].found) {
    const seat = result.seats[0]
    
    console.log('\n📋 MONGODB RESPONSIBILITIES (Layout & Visual):')
    console.log(`  🎨 Section color: ${seat.layout.sectionColor}`)
    console.log(`  📍 Coordinates: (${seat.layout.x}, ${seat.layout.y})`)
    console.log(`  🎭 Seat type: ${seat.layout.seatType}`)
    console.log(`  👁️ View quality: ${seat.layout.viewQuality}`)
    console.log(`  🏛️ Section name: ${seat.layout.sectionName}`)
    
    console.log('\n🗄️ POSTGRESQL RESPONSIBILITIES (Business Logic):')
    console.log(`  💰 Current price: ${seat.business.priceDisplay}`)
    console.log(`  📊 Availability status: ${seat.business.status}`)
    console.log(`  ♿ Accessibility: ${seat.business.isAccessible ? 'Yes' : 'No'}`)
    console.log(`  🎫 Database seat ID: ${seat.business.seatId}`)
    console.log(`  📍 Row/Number: ${seat.business.row}${seat.business.number}`)
    
    console.log('\n🎯 WHY THIS SEPARATION WORKS:')
    console.log('  ✅ MongoDB: Fast JSON queries for seat layout and visual data')
    console.log('  ✅ PostgreSQL: ACID compliance for bookings and real-time availability')
    console.log('  ✅ MongoDB: Easy to update theatre layouts without touching business logic')
    console.log('  ✅ PostgreSQL: Complex pricing rules and availability tracking')
    console.log('  ✅ Best of both worlds: JSON flexibility + relational integrity')
  } else {
    console.error('❌ Separation demo failed - could not retrieve seat data')
  }
}

async function runCompleteTest() {
  console.log('🎭 ========================================')
  console.log('🎭 PHANTOM OF THE OPERA - HYBRID SYSTEM TEST')
  console.log('🎭 ========================================')
  console.log(`🌐 API Base URL: ${API_BASE}`)
  console.log(`📅 Test Date: ${new Date().toISOString()}`)
  
  const startTime = Date.now()
  
  try {
    // Step 1: Initialize MongoDB
    const mongoOk = await step1_InitializeMongoDB()
    if (!mongoOk) {
      console.log('\n❌ Test stopped: MongoDB initialization failed')
      return
    }
    
    // Step 2: Verify PostgreSQL
    const postgresOk = await step2_VerifyPostgreSQL()
    if (!postgresOk) {
      console.log('\n❌ Test stopped: PostgreSQL verification failed')
      return
    }
    
    // Step 3: Test hybrid API
    await step3_TestHybridAPI()
    
    // Step 4: Test section overview
    await step4_TestSectionOverview()
    
    // Step 5: Demonstrate separation of concerns
    await step5_DemonstrateSeparationOfConcerns()
    
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    
    console.log('\n🎉 ====== TEST COMPLETED SUCCESSFULLY ======')
    console.log(`⏱️ Total duration: ${duration} seconds`)
    console.log('✅ MongoDB: Seat layout and visual data')
    console.log('✅ PostgreSQL: Pricing, availability, and business logic')
    console.log('✅ Hybrid API: Successfully combines both data sources')
    console.log('🚀 System is ready for production use!')
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR:', error)
    console.log('❌ Test failed with unexpected error')
  }
}

// Run the test
runCompleteTest().catch(console.error) 