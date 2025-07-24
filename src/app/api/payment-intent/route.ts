import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import crypto from 'crypto'
import { createReservations, getShowWithPricing, convertHardcodedSeatIds } from '@/lib/db/queries'
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

    // 🔄 Map hardcoded seat IDs to real database UUIDs
    let realSeatIds: string[]
    
    console.log('🗺️ Converting hardcoded seat IDs to database UUIDs...')
    
    try {
      // Use the proper hardcoded seat mapping system
      realSeatIds = await convertHardcodedSeatIds(showId, specificSeatIds)
      console.log(`✅ Mapped ${specificSeatIds.length} hardcoded IDs to ${realSeatIds.length} database UUIDs`)
      
      if (realSeatIds.length === 0) {
        console.error('❌ No valid seat mappings found for Hamilton hardcoded IDs')
        console.error('💡 Make sure hardcoded_seat_mappings table is populated for show:', showId)
        return NextResponse.json({ 
          error: 'Invalid seat selection',
          details: 'The selected seats could not be mapped to valid database records. Please refresh and try again.'
        }, { status: 400 })
      }
      
      if (realSeatIds.length !== specificSeatIds.length) {
        console.warn(`⚠️ Mapping incomplete: ${specificSeatIds.length} requested → ${realSeatIds.length} mapped`)
        console.warn('🎯 Unmapped seats:', specificSeatIds.filter((_, i) => i >= realSeatIds.length))
      }
      
    } catch (mappingError) {
      console.error('❌ Seat mapping failed:', mappingError)
      return NextResponse.json({ 
        error: 'Seat mapping failed',
        details: 'Unable to process seat selection. Please try again.'
      }, { status: 500 })
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

    // 🧹 CRITICAL: Clean up expired reservations before creating new ones
    try {
      console.log('🧹 Cleaning up expired reservations...')
      const { cleanupExpiredReservations } = await import('@/lib/db/queries')
      const cleanupResult = await cleanupExpiredReservations()
      console.log(`✅ Cleaned up ${cleanupResult.cleaned} expired reservations`)
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup failed (non-critical):', cleanupError)
    }

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
    console.log('🎭 Getting show pricing info for:', showId)
    const shows = await getShowWithPricing()  // Get all shows for now
    const showData = shows[0]

    if (!showData) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // Calculate total amount in pence
    const totalAmount = specificSeatIds.length * showData.min_price * 100

    // Create PaymentIntent instead of checkout session
    const paymentIntent = await getStripe().paymentIntents.create({
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