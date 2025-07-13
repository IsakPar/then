import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { jwtVerify } from 'jose'
import { AuthUtils, ValidationUtils } from '@/lib/auth-utils'
import { getCustomerBookings } from '@/lib/db/queries'
import { db } from '@/lib/db/connection'
import { bookings, shows, venues, bookingSeats, seats, sections } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'

// Mock user ID for development
const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_TOKEN = 'mock-jwt-token-for-development';

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
    console.log('📱 User bookings API called');
    
    // Check if this is a mobile app request in development mode
    const userAgent = request.headers.get('user-agent') || '';
    const authHeader = request.headers.get('authorization') || '';
    const isMobileApp = userAgent.includes('LastMinuteLive-Mobile-App') || request.headers.get('x-mobile-app') === 'true';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    console.log('📱 Request details:', {
      userAgent,
      authHeader: authHeader.substring(0, 20) + '...',
      isMobileApp,
      isDevelopment
    });

    // Handle JWT token authentication (for mobile app)
    if (authHeader.startsWith('Bearer ') && isMobileApp) {
      console.log('🔐 Mobile app detected: Validating JWT token');
      
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      try {
        // Verify JWT token
        const { payload } = await jwtVerify(token, JWT_SECRET, {
          issuer: 'lastminutelive',
          audience: 'lastminutelive-mobile',
        });

        // Extract user info from payload
        const userId = payload.userId as string;
        const email = payload.email as string;

        if (!userId || !email) {
          console.log('❌ Invalid JWT token payload');
          return NextResponse.json(
            { error: 'Invalid authentication token' },
            { status: 401 }
          );
        }

        // Validate email format
        if (!ValidationUtils.isValidEmail(email)) {
          console.log('❌ Invalid email in JWT token');
          return NextResponse.json(
            { error: 'Invalid email in token' },
            { status: 401 }
          );
        }

        // Get fresh user data from database
        const user = await AuthUtils.findUserByEmail(email);
        
        if (!user || user.id !== userId) {
          console.log('❌ User not found or JWT token mismatch');
          return NextResponse.json(
            { error: 'User not found or token mismatch' },
            { status: 401 }
          );
        }

        console.log('✅ JWT token validated for user:', user.email);

        // Get user's bookings using both user ID and email (to catch guest bookings)
        const [userBookings, emailBookings] = await Promise.all([
          getUserBookingsById(user.id),
          getUserBookingsByEmail(user.email)
        ]);

        // Combine and deduplicate bookings
        const allBookings = [...userBookings];
        emailBookings.forEach(emailBooking => {
          if (!allBookings.find(b => b.id === emailBooking.id)) {
            allBookings.push(emailBooking);
          }
        });

        // Sort by creation date descending
        allBookings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        console.log('✅ Found', allBookings.length, 'bookings for user:', user.email);
        
        return NextResponse.json(allBookings);

      } catch (jwtError) {
        console.error('❌ JWT token verification failed:', jwtError);
        return NextResponse.json(
          { error: 'Invalid or expired authentication token' },
          { status: 401 }
        );
      }
    }

    // Handle mock authentication in development mode (fallback)
    if (isDevelopment && authHeader.startsWith('Bearer ')) {
      console.log('🔧 Development mode: Using mock user (auth disabled for testing)');
      
      try {
        const mockBookings = await getUserBookingsById(MOCK_USER_ID);
        console.log('🔧 Development mode: Found', mockBookings.length, 'bookings for mock user');
        return NextResponse.json(mockBookings);
      } catch (error) {
        console.error('🔧 Development mode: Error getting mock user bookings:', error);
        return NextResponse.json(
          { error: 'Error fetching mock user bookings' },
          { status: 500 }
        );
      }
    }

    // Normal NextAuth.js authentication flow (for web app)
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('❌ No valid session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('✅ Valid NextAuth session found for user:', session.user.id);

    // Get user's bookings for web app
    const sessionUserBookings = await getUserBookingsById(session.user.id);
    return NextResponse.json(sessionUserBookings);

  } catch (error) {
    console.error('Error fetching user bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 