import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import crypto from 'crypto'
import { createReservations, getShowWithPricing } from '@/lib/db/queries'
import { db } from '@/lib/db/connection'
import { shows, seats } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil'
})

export async function POST(request: NextRequest) {
  try {
    console.log('💳 Creating PaymentIntent for native iOS SDK...')
    
    const body = await request.json()
    const { showId, specificSeatIds } = body
    
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

    // 🔄 Get actual seat UUIDs for development (same logic as checkout)
    let realSeatIds: string[]
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🛠️ DEV MODE: Getting real seat UUIDs for testing...')
      
      const availableSeats = await db
        .select({ id: seats.id })
        .from(seats)
        .where(eq(seats.showId, showId))
        .limit(specificSeatIds.length)
      
      realSeatIds = availableSeats.map(seat => seat.id)
      console.log(`✅ Using ${realSeatIds.length} real seat UUIDs for testing:`, realSeatIds.slice(0, 2))
    } else {
      // Production: Use proper hardcoded seat mapping (to be implemented)
      realSeatIds = specificSeatIds // Placeholder
    }

    if (realSeatIds.length === 0) {
      console.error('❌ No seats available for testing')
      return NextResponse.json({ 
        error: 'No seats available for testing',
        details: 'Could not find available seats in database'
      }, { status: 400 })
    }

    // Generate session token for this reservation
    const sessionToken = crypto.randomUUID()

    // Reserve the specific seats
    const reservationResult = await createReservations(
      realSeatIds,
      sessionToken,
      15 // 15 minutes expiration
    )

    if (!reservationResult || reservationResult.length === 0) {
      console.log('⚠️ Reservation failed: No results returned')
      return NextResponse.json(
        { error: 'Failed to reserve seats' },
        { status: 400 }
      )
    }

    console.log('✅ Reservation successful. Reserved seats:', reservationResult.length)

    // Get show information for pricing
    const shows = await getShowWithPricing(showId)
    const showData = shows[0]

    if (!showData) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // Calculate total amount in pence
    const totalAmount = specificSeatIds.length * showData.min_price * 100

    // Create PaymentIntent instead of checkout session
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'gbp',
      description: `${showData?.title || 'Show'} - ${specificSeatIds.length} ticket(s)`,
      metadata: {
        reservation_session_token: sessionToken,
        show_id: showId,
        seat_ids: specificSeatIds.join(','),
        client_type: 'native_ios',
        show_title: showData?.title || 'Unknown Show',
        seat_count: specificSeatIds.length.toString()
      },
      // Enable automatic payment methods for better user experience
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never' // Force native flow only
      }
    })

    console.log('✅ PaymentIntent created:', paymentIntent.id)
    console.log('💰 Amount:', `£${(totalAmount / 100).toFixed(2)}`)

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      reservationId: sessionToken,
      amount: totalAmount,
      currency: 'gbp',
      showTitle: showData?.title,
      seatCount: specificSeatIds.length,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
    })

  } catch (error) {
    console.error('❌ PaymentIntent creation failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create payment intent',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 