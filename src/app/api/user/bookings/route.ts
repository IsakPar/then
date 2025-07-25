import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/connection'
import { bookings, shows, venues, bookingSeats, seats } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // Get user email from query params or headers for now
    // TODO: Replace with proper authentication when auth system is implemented
    const userEmail = request.nextUrl.searchParams.get('email') || 
                     request.headers.get('x-user-email');

    if (!userEmail) {
      return NextResponse.json({ 
        error: 'User email required',
        message: 'Please provide email as query parameter: ?email=user@example.com'
      }, { status: 400 });
    }

    console.log(`🎫 Fetching bookings for user: ${userEmail}`);

    // Fetch user's booking history with show and venue details
    const userBookings = await db.select({
      id: bookings.id,
      showTitle: shows.title,
      venueName: venues.name,
      venueAddress: venues.address,
      showDate: shows.date,
      showTime: shows.time,
      totalAmountPence: bookings.totalAmountPence,
      validationCode: bookings.validationCode,
      status: bookings.status,
      createdAt: bookings.createdAt,
      showId: bookings.showId,
      venueId: shows.venueId,
      customerName: bookings.customerName
    })
    .from(bookings)
    .innerJoin(shows, eq(bookings.showId, shows.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(bookings.customerEmail, userEmail))
    .orderBy(desc(bookings.createdAt));

    console.log(`✅ Found ${userBookings.length} bookings for ${userEmail}`);

    // For each booking, get the associated seats
    const bookingsWithSeats = await Promise.all(
      userBookings.map(async (booking) => {
        const bookingSeatsData = await db.select({
          seatRow: seats.rowLetter,
          seatNumber: seats.seatNumber,
          pricePaid: bookingSeats.pricePaidPence
        })
        .from(bookingSeats)
        .innerJoin(seats, eq(bookingSeats.seatId, seats.id))
        .where(eq(bookingSeats.bookingId, booking.id));

        return {
          ...booking,
          seats: bookingSeatsData.map(seat => `${seat.seatRow}-${seat.seatNumber}`)
        };
      })
    );

    // Format the response for iOS consumption
    const formattedBookings = bookingsWithSeats.map(booking => ({
      id: booking.id,
      show: {
        id: booking.showId,
        title: booking.showTitle,
        date: booking.showDate,
        time: booking.showTime
      },
      venue: {
        id: booking.venueId,
        name: booking.venueName,
        address: booking.venueAddress
      },
      seats: booking.seats,
      pricing: {
        totalPence: booking.totalAmountPence,
        totalDisplay: `£${(booking.totalAmountPence / 100).toFixed(2)}`
      },
      qrCode: booking.validationCode, // Using validation code as QR code data
      status: booking.status,
      bookingDate: booking.createdAt,
      customerName: booking.customerName
    }));

    return NextResponse.json({
      success: true,
      userEmail,
      bookings: formattedBookings,
      summary: {
        totalBookings: formattedBookings.length,
        upcomingBookings: formattedBookings.filter(b => new Date(b.show.date) > new Date()).length,
        totalSpent: formattedBookings.reduce((sum, b) => sum + b.pricing.totalPence, 0)
      }
    });

  } catch (error) {
    console.error('❌ Error fetching user bookings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user bookings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add CORS headers for iOS app
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-user-email',
    },
  });
}