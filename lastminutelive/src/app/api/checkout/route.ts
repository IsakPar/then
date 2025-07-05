import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Payment system not configured. Please add Stripe keys to .env.local' },
        { status: 500 }
      )
    }

    const { showId, quantity = 1 } = await request.json()

    if (!showId) {
      return NextResponse.json({ error: 'Show ID is required' }, { status: 400 })
    }

    // Get show details from database
    const { data: show, error } = await supabase
      .from('shows')
      .select(`
        id, name, price, tickets_sold, total_tickets,
        venues!inner(name)
      `)
      .eq('id', showId)
      .single()

    if (error || !show) {
      return NextResponse.json({ error: 'Show not found' }, { status: 404 })
    }

    // Check if tickets are available
    const availableTickets = show.total_tickets - show.tickets_sold
    if (availableTickets < quantity) {
      return NextResponse.json({ 
        error: `Only ${availableTickets} tickets available` 
      }, { status: 400 })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: show.name,
              description: `${show.venues.name} - Live Show`,
            },
            unit_amount: show.price, // Already in pence from database
          },
          quantity,
        },
      ],
      success_url: `${request.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/?cancelled=true`,
      metadata: {
        showId: show.id,
        quantity: quantity.toString(),
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 