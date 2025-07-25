import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import crypto from 'crypto'

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

// Initialize Stripe only when needed (not during build time)
let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-06-30.basil'
    });
  }
  return stripe;
}

// Map show slugs to venue IDs
const SHOW_VENUE_MAPPING: Record<string, { venueId: string; showSlug: string }> = {
  'hamilton-victoria-palace': { venueId: 'victoria-palace', showSlug: 'hamilton' },
  'hamilton': { venueId: 'victoria-palace', showSlug: 'hamilton' },
  'lion-king-lyceum': { venueId: 'lyceum', showSlug: 'lion-king' },
  'phantom-opera': { venueId: 'opera-house', showSlug: 'phantom' }
}

export async function POST(request: NextRequest) {
  try {
    // Check if MongoDB is configured (support both Railway's MONGODB_URL and MONGODB_URI)
    if (!process.env.MONGODB_URI && !process.env.MONGODB_URL) {
      return NextResponse.json({ 
        success: false, 
        error: 'MongoDB not configured. Please set MONGODB_URI or MONGODB_URL environment variable.',
        details: 'This endpoint requires MongoDB to be configured.'
      }, { status: 503 })
    }

    // Dynamic import to prevent build-time connection
    const { seatMapService } = await import('@/lib/mongodb/seatmap-service')

    console.log('💳 Creating PaymentIntent with MongoDB seat translation...')
    
    const body = await request.json()
    const { showId, specificSeatIds } = body
    
    console.log('🎯 MongoDB Payment Intent: Processing seat request...')
    console.log('📍 Specific seat IDs:', specificSeatIds)
    
    if (!showId) {
      console.error('❌ Missing showId in request')
      return NextResponse.json({ error: 'Missing show ID' }, { status: 400 })
    }
    
    if (!Array.isArray(specificSeatIds) || specificSeatIds.length === 0) {
      console.error('❌ No seat IDs provided or invalid format:', specificSeatIds)
      return NextResponse.json({ error: 'No specific seat IDs provided' }, { status: 400 })
    }
    
    console.log('🎫 Creating PaymentIntent for show:', showId)
    console.log('🎯 Specific seat IDs to reserve:', specificSeatIds)

    // Get venue and show info from mapping
    const mapping = SHOW_VENUE_MAPPING[showId]
    if (!mapping) {
      console.error('❌ Unknown show ID:', showId)
      return NextResponse.json({ 
        error: 'Unknown show',
        details: `Show "${showId}" not supported yet`
      }, { status: 400 })
    }
    
    const { venueId, showSlug } = mapping
    console.log(`🏛️ Venue: ${venueId}, Show: ${showSlug}`)

    // 🔄 Translate iOS hardcoded seat IDs to MongoDB seat data
    console.log('🗺️ Translating hardcoded seat IDs using MongoDB...')
    
    try {
      const translations = await seatMapService.translateHardcodedSeats(
        venueId, 
        showSlug, 
        specificSeatIds
      )
      
      const validSeats = translations.filter(t => t.seat !== null)
      const invalidSeats = translations.filter(t => t.seat === null)
      
      console.log(`✅ Translated ${validSeats.length}/${specificSeatIds.length} hardcoded seat IDs`)
      
      if (validSeats.length === 0) {
        console.error('❌ No valid seats found for hardcoded IDs:', specificSeatIds)
        return NextResponse.json({
          error: 'Invalid seat selection',
          details: 'None of the selected seats could be found in the seat map',
          invalidSeats: invalidSeats.map(s => s.hardcodedId)
        }, { status: 400 })
      }
      
      if (invalidSeats.length > 0) {
        console.warn('⚠️ Some seats could not be translated:', invalidSeats.map(s => s.hardcodedId))
      }
      
      // Check seat availability
      const unavailableSeats = validSeats.filter(t => !t.seat!.isAvailable)
      if (unavailableSeats.length > 0) {
        console.error('❌ Some seats are not available:', unavailableSeats.map(s => s.hardcodedId))
        return NextResponse.json({
          error: 'Seats unavailable',
          details: 'Some selected seats are no longer available',
          unavailableSeats: unavailableSeats.map(s => s.hardcodedId)
        }, { status: 409 })
      }
      
      // Calculate total amount (prices are in pence in MongoDB)
      const totalAmount = validSeats.reduce((sum, t) => sum + t.seat!.price, 0)
      console.log(`💰 Total amount: ${totalAmount} pence (£${totalAmount / 100})`)
      
      // Reserve seats in MongoDB
      console.log('🔒 Reserving seats in MongoDB...')
      const reservationResult = await seatMapService.reserveSeats(
        venueId,
        showSlug,
        validSeats.map(s => s.hardcodedId)
      )
      
      if (!reservationResult.success) {
        console.error('❌ Seat reservation failed:', reservationResult.errors)
        return NextResponse.json({
          error: 'Reservation failed',
          details: reservationResult.errors.join(', ')
        }, { status: 409 })
      }
      
      console.log(`✅ Reserved ${reservationResult.reservedSeats.length} seats successfully`)
      
      // Create reservation ID for tracking
      const reservationId = crypto.randomUUID()
      
      // Create Stripe PaymentIntent
      console.log('💳 Creating Stripe PaymentIntent...')
      const stripeClient = getStripe()
      
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: totalAmount,
        currency: 'gbp',
        payment_method_types: ['card', 'apple_pay'],
        metadata: {
          showId,
          venueId,
          showSlug,
          seatIds: JSON.stringify(specificSeatIds),
          reservationId,
          seatCount: validSeats.length.toString(),
          reservedSeats: JSON.stringify(reservationResult.reservedSeats)
        },
        description: `${showSlug.charAt(0).toUpperCase() + showSlug.slice(1)} tickets - ${validSeats.length} seat(s)`,
        receipt_email: null, // Let Stripe collect this
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never'
        }
      })
      
      console.log(`✅ PaymentIntent created: ${paymentIntent.id}`)
      console.log(`🎟️ Reserved ${validSeats.length} seats for show: ${showSlug}`)
      
      // Return success response
      return NextResponse.json({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        reservationId,
        amount: totalAmount,
        currency: 'gbp',
        showTitle: showSlug.charAt(0).toUpperCase() + showSlug.slice(1),
        seatCount: validSeats.length,
        reservedSeats: reservationResult.reservedSeats,
        translations: validSeats.map(t => ({
          hardcodedId: t.hardcodedId,
          seatId: t.seat!.id,
          price: t.seat!.price
        })),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      })
      
    } catch (translationError) {
      console.error('❌ Seat translation error:', translationError)
      return NextResponse.json({
        error: 'Seat mapping failed',
        details: 'Could not translate hardcoded seat IDs to seat map data',
        technicalError: translationError instanceof Error ? translationError.message : 'Unknown error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ PaymentIntent creation failed:', error)
    
    return NextResponse.json({
      error: 'Payment setup failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 })
  }
} 