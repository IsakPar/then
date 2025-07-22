import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('🎭 Guest session creation endpoint hit');
    
    const body = await request.json();
    const { email, deviceInfo } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log(`👤 Creating guest session for: ${email}`);
    console.log(`📱 Device Info:`, deviceInfo);

    // Generate guest user ID and session token
    const guestUserId = `guest_${randomUUID()}`;
    const sessionToken = `guest_session_${randomUUID()}`;

    // Create guest user object
    const guestUser = {
      id: guestUserId,
      email: email,
      firstName: null,
      lastName: null,
      accountType: 'guest',
      authProvider: 'guest',
      isGuest: true,
      emailVerified: false,
      biometricEnabled: false,
      createdAt: new Date().toISOString()
    };

    // Response matching iOS app's GuestResponse model
    const response = {
      user: {
        id: guestUser.id,
        email: guestUser.email,
        firstName: guestUser.firstName,
        lastName: guestUser.lastName,
        accountType: guestUser.accountType,
        isGuest: guestUser.isGuest
      },
      sessionToken: sessionToken
    };

    console.log(`✅ Guest session created successfully for: ${email}`);
    console.log(`🔑 Session Token: ${sessionToken.substring(0, 20)}...`);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Guest session creation error:', error);
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