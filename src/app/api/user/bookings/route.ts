import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getUserBookings } from '@/lib/auth'

// Mock user ID for development
const MOCK_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_TOKEN = 'mock-jwt-token-for-development';

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

    // Handle mock authentication in development mode
    if (isDevelopment && authHeader.startsWith('Bearer ')) {
      console.log('🔧 Development mode: Using mock user (auth disabled for testing)');
      
      try {
        const bookings = await getUserBookings(MOCK_USER_ID);
        console.log('🔧 Development mode: Found', bookings.length, 'bookings for mock user');
        return NextResponse.json(bookings);
      } catch (error) {
        console.error('🔧 Development mode: Error getting mock user bookings:', error);
        return NextResponse.json(
          { error: 'Error fetching mock user bookings' },
          { status: 500 }
        );
      }
    }

    // Normal NextAuth.js authentication flow
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('❌ No valid session found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('✅ Valid session found for user:', session.user.id);

    // Get user's bookings
    const bookings = await getUserBookings(session.user.id)

    return NextResponse.json(bookings)

  } catch (error) {
    console.error('Error fetching user bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 