import { NextRequest, NextResponse } from 'next/server';
import { emailService } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      to,
      userName,
      showTitle,
      showDate,
      showTime,
      venue,
      bookingReference,
      seatInfo,
      totalAmount
    } = body;

    // Validate required fields
    if (!to || !userName || !showTitle || !bookingReference || !seatInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`📧 Sending booking confirmation email to: ${to}`);
    console.log(`🎭 Show: ${showTitle} on ${showDate} at ${showTime}`);
    console.log(`🎫 Seats: ${seatInfo}`);
    console.log(`💰 Total: £${totalAmount / 100}`);

    // Send booking confirmation email using Mailjet
    const success = await emailService.sendBookingConfirmation(
      to,
      userName,
      showTitle,
      showDate,
      showTime,
      venue,
      bookingReference,
      seatInfo
    );

    if (success) {
      console.log(`✅ Booking confirmation email sent successfully to: ${to}`);
      return NextResponse.json({ success: true });
    } else {
      console.error(`❌ Failed to send booking confirmation email to: ${to}`);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('📧 Booking confirmation email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 