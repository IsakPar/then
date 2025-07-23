import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import crypto from 'crypto'
import { paymentReservationService } from '@/lib/services/PaymentReservationService'
import { createReservations, getShowWithPricing } from '@/lib/db/queries'
import { db } from '@/lib/db/connection'
import { shows, seats } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

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

    // 🚨 BULLETPROOF RESERVATION SYSTEM: Phase 1 - Create temporary reservation
    const sessionToken = request.headers.get('authorization')?.replace('Bearer ', '') || `guest_${Date.now()}`
    
    console.log('🎯 Creating bulletproof seat reservation...')
    const reservationResult = await paymentReservationService.createPaymentReservation(
      showId,
      specificSeatIds,
      sessionToken
    )

    if (!reservationResult.success) {
      console.error('❌ Failed to create seat reservation:', reservationResult.error)
      return NextResponse.json(
        { 
          error: reservationResult.error || 'Failed to reserve seats',
          conflictSeats: reservationResult.conflictSeats 
        },
        { status: 409 }
      )
    }

    const reservation = reservationResult.reservation!
    console.log(`✅ Seats reserved successfully: ${reservation.reservationId}`)
    console.log(`💰 Total amount: £${reservation.totalAmountPence / 100}`)

    // No need for legacy reservation - bulletproof system handles everything
    console.log('✅ Reservation successful. Reserved seats:', reservation.seatIds.length)

    // Get show information for pricing
    console.log('🎭 Getting show pricing info for:', showId)
    const shows = await getShowWithPricing()  // Get all shows for now
    const showData = shows[0]

    if (!showData) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // Use bulletproof reservation amount (already calculated)
    const totalAmount = reservation.totalAmountPence

    // Create PaymentIntent with reservation tracking
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: totalAmount,
      currency: 'gbp',
      description: `${showData?.title || 'Show'} - ${reservation.seatIds.length} ticket(s)`,
      metadata: {
        reservation_id: reservation.reservationId,
        reservation_session_token: sessionToken,
        show_id: showId,
        seat_ids: reservation.seatIds.join(','),
        client_type: 'native_ios',
        show_title: showData?.title || 'Unknown Show',
        seat_count: reservation.seatIds.length.toString(),
        expires_at: reservation.expiresAt
      },
      // Enable automatic payment methods for better user experience
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never' // Force native flow only
      }
    })

    // 🚨 BULLETPROOF RESERVATION SYSTEM: Phase 2 - Start payment process
    const paymentStartResult = await paymentReservationService.startPaymentProcess(
      reservation.reservationId,
      paymentIntent.id
    )

    if (!paymentStartResult.success) {
      console.error('❌ Failed to start payment process:', paymentStartResult.error)
      // Cancel the Stripe payment intent
      await getStripe().paymentIntents.cancel(paymentIntent.id)
      return NextResponse.json(
        { error: 'Failed to start payment process' },
        { status: 500 }
      )
    }

    console.log(`💳 Payment process started: ${paymentIntent.id} linked to reservation ${reservation.reservationId}`)

    console.log('✅ PaymentIntent created:', paymentIntent.id)
    console.log('💰 Amount:', `£${(totalAmount / 100).toFixed(2)}`)

    return NextResponse.json({
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      reservationId: reservation.reservationId,
      amount: totalAmount,
      currency: 'gbp',
      showTitle: showData?.title,
      seatCount: reservation.seatIds.length,
      expiresAt: reservation.expiresAt,
      seatIds: reservation.seatIds,
      sessionToken: sessionToken
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