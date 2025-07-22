import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { jwtVerify } from 'jose'
import { AuthUtils, ValidationUtils } from '@/lib/auth-utils'
import { getCustomerBookings } from '@/lib/db/queries'
import { db } from '@/lib/db/connection'
import { bookings, shows, venues, bookingSeats, seats, sections } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

// JWT secret for mobile app authentication
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

/**
 * Get user bookings by user ID or email
 */
async function getUserBookingsById(userId: string) {
  return await db
    .select({
      id: bookings.id,
      showId: bookings.showId,
      userId: bookings.userId,
      customerName: bookings.customerName,
      customerEmail: bookings.customerEmail,
      customerPhone: bookings.customerPhone,
      status: bookings.status,
      totalAmountPence: bookings.totalAmountPence,
      validationCode: bookings.validationCode,
      stripePaymentIntentId: bookings.stripePaymentIntentId,
      stripeCheckoutSessionId: bookings.stripeCheckoutSessionId,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      show: {
        id: shows.id,
        title: shows.title,
        description: shows.description,
        date: shows.date,
        time: shows.time,
        imageUrl: shows.imageUrl,
      },
      venue: {
        id: venues.id,
        name: venues.name,
        address: venues.address,
      }
    })
    .from(bookings)
    .innerJoin(shows, eq(bookings.showId, shows.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(bookings.userId, userId))
    .orderBy(desc(bookings.createdAt));
}

async function getUserBookingsByEmail(email: string) {
  return await db
    .select({
      id: bookings.id,
      showId: bookings.showId,
      userId: bookings.userId,
      customerName: bookings.customerName,
      customerEmail: bookings.customerEmail,
      customerPhone: bookings.customerPhone,
      status: bookings.status,
      totalAmountPence: bookings.totalAmountPence,
      validationCode: bookings.validationCode,
      stripePaymentIntentId: bookings.stripePaymentIntentId,
      stripeCheckoutSessionId: bookings.stripeCheckoutSessionId,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
      updatedAt: bookings.updatedAt,
      show: {
        id: shows.id,
        title: shows.title,
        description: shows.description,
        date: shows.date,
        time: shows.time,
        imageUrl: shows.imageUrl,
      },
      venue: {
        id: venues.id,
        name: venues.name,
        address: venues.address,
      }
    })
    .from(bookings)
    .innerJoin(shows, eq(bookings.showId, shows.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(bookings.customerEmail, email))
    .orderBy(desc(bookings.createdAt));
}

export async function GET(request: NextRequest) {
  try {
    console.log('User bookings API called');
    
    const authHeader = request.headers.get('authorization') || '';
    
    if (authHeader.startsWith('Bearer ')) {
      console.log('Bearer token detected: Attempting JWT validation');
      
      const token = authHeader.substring(7);
      
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET, {
          issuer: 'lastminutelive',
          audience: 'lastminutelive-mobile',
        });

        const userId = payload.userId as string;
        const email = payload.email as string;

        if (!userId || !email || !ValidationUtils.isValidEmail(email)) {
          console.log('Invalid JWT payload or email');
          return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
        }

        const user = await AuthUtils.findUserByEmail(email);
        
        if (!user || user.id !== userId) {
          console.log('User not found or token mismatch');
          return NextResponse.json({ error: 'Invalid user or token' }, { status: 401 });
        }

        console.log('JWT validated for user:', user.email);

        const [userBookings, emailBookings] = await Promise.all([
          getUserBookingsById(user.id),
          getUserBookingsByEmail(user.email)
        ]);

        const allBookings = [...new Set([...userBookings, ...emailBookings])].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        console.log('Found', allBookings.length, 'bookings');
        return NextResponse.json(allBookings);
      } catch (error) {
        console.error('JWT verification failed:', error);
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
    }

    // Fallback to NextAuth for web requests
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log('No valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Valid session for user:', session.user.id);
    const bookings = await getUserBookingsById(session.user.id);
    return NextResponse.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}