import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { paymentReservationService } from '@/lib/services/PaymentReservationService'

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

/**
 * 🚨 BULLETPROOF PAYMENT CONFIRMATION API
 * 
 * This endpoint handles Stripe payment confirmations and finalizes bookings.
 * It implements Phase 3 of the bulletproof reservation system.
 * 
 * Flow:
 * 1. Verify Stripe payment success
 * 2. Confirm payment in reservation system
 * 3. Finalize booking in database
 * 4. Send confirmation email
 * 5. Release temporary locks
 */

export async function POST(request: NextRequest) {
  try {
    console.log('💳 Payment confirmation endpoint hit')

    const body = await request.json()
    const { 
      paymentIntentId, 
      reservationId, 
      customerEmail, 
      customerName 
    } = body

    // Validate required fields
    if (!paymentIntentId || !reservationId || !customerEmail) {
      console.error('❌ Missing required fields:', { paymentIntentId, reservationId, customerEmail })
      return NextResponse.json(
        { error: 'Missing required fields: paymentIntentId, reservationId, customerEmail' },
        { status: 400 }
      )
    }

    console.log(`🎯 Confirming payment: ${paymentIntentId} for reservation: ${reservationId}`)

    // Step 1: Verify payment with Stripe
    const stripe = getStripe()
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    if (paymentIntent.status !== 'succeeded') {
      console.error(`❌ Payment not successful. Status: ${paymentIntent.status}`)
      return NextResponse.json(
        { error: `Payment not successful. Status: ${paymentIntent.status}` },
        { status: 400 }
      )
    }

    console.log(`✅ Stripe payment verified: ${paymentIntentId} - Status: ${paymentIntent.status}`)

    // Step 2: 🚨 BULLETPROOF RESERVATION SYSTEM: Phase 3 - Confirm payment
    const confirmationResult = await paymentReservationService.confirmPayment(
      reservationId,
      paymentIntentId,
      customerEmail,
      customerName || customerEmail.split('@')[0]
    )

    if (!confirmationResult.success) {
      console.error('❌ Failed to confirm payment in reservation system:', confirmationResult.error)
      
      // This is critical - payment succeeded in Stripe but failed in our system
      // We should not refund automatically but rather log for manual review
      console.error(`🚨 CRITICAL: Payment ${paymentIntentId} succeeded in Stripe but failed to confirm in our system`)
      console.error(`🚨 Manual review required for reservation ${reservationId}`)
      
      return NextResponse.json(
        { 
          error: 'Payment processing error - manual review required',
          paymentIntentId,
          reservationId,
          requiresManualReview: true
        },
        { status: 500 }
      )
    }

    const confirmedReservation = confirmationResult.reservation!
    console.log(`✅ Payment confirmed successfully: ${paymentIntentId}`)
    console.log(`🎫 Booking finalized for ${customerEmail}`)

    // Step 3: Return success response with booking details
    return NextResponse.json({
      success: true,
      paymentIntentId,
      reservationId: confirmedReservation.reservationId,
      bookingReference: confirmedReservation.reservationId,
      customerEmail,
      customerName,
      showId: confirmedReservation.showId,
      seatCount: confirmedReservation.seatIds.length,
      totalAmountPence: confirmedReservation.totalAmountPence,
      currency: 'gbp',
      seats: confirmedReservation.reservedSeats,
      status: 'confirmed',
      confirmedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Payment confirmation failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Payment confirmation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * 🚨 STRIPE WEBHOOK HANDLER
 * 
 * Alternative endpoint for Stripe webhooks to automatically confirm payments.
 * This provides additional reliability by confirming payments even if the client
 * doesn't call the confirmation endpoint.
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('🎣 Stripe webhook handler triggered')

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')
    
    if (!signature) {
      console.error('❌ No Stripe signature found')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('❌ No webhook secret configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }

    // Verify webhook signature
    const stripe = getStripe()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log(`🎣 Webhook event: ${event.type}`)

    // Handle payment intent succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      const reservationId = paymentIntent.metadata.reservation_id

      if (!reservationId) {
        console.log('⚠️ No reservation ID in payment intent metadata - skipping webhook processing')
        return NextResponse.json({ received: true })
      }

      console.log(`🎯 Auto-confirming payment via webhook: ${paymentIntent.id}`)

      // Auto-confirm payment using metadata
      const customerEmail = paymentIntent.receipt_email || 'customer@example.com'
      const customerName = paymentIntent.metadata.customer_name || customerEmail.split('@')[0]

      const confirmationResult = await paymentReservationService.confirmPayment(
        reservationId,
        paymentIntent.id,
        customerEmail,
        customerName
      )

      if (confirmationResult.success) {
        console.log(`✅ Auto-confirmed payment via webhook: ${paymentIntent.id}`)
      } else {
        console.error(`❌ Auto-confirmation failed via webhook: ${confirmationResult.error}`)
      }
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Webhook processing failed:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
} 