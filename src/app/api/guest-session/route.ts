import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/db/connection';
import { guestSessions } from '@/lib/db/schema';

// Add response validation function
const validateResponse = (response: any) => {
  const requiredFields = [
    'user.id', 'user.email', 'user.accountType', 'user.authProvider',
    'user.isGuest', 'user.emailVerified', 'user.biometricEnabled', 
    'user.createdAt', 'sessionToken'
  ];
  
  for (const field of requiredFields) {
    const fieldPath = field.split('.');
    let value = response;
    
    for (const key of fieldPath) {
      if (value === null || value === undefined || !(key in value)) {
        throw new Error(`Missing required field: ${field}`);
      }
      value = value[key];
    }
    
    // Check for null/undefined values (but allow false, 0, empty string)
    if (value === null || value === undefined) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  return response;
};

export async function POST(request: NextRequest) {
  let body: any;
  
  try {
    console.log('🎭 Guest session creation endpoint hit');
    
    body = await request.json();
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
    
    // Set expiration to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save guest session to database
    const [savedGuestSession] = await db.insert(guestSessions).values({
      sessionToken: sessionToken,
      email: email,
      deviceInfo: deviceInfo || {},
      expiresAt: expiresAt
    }).returning();

    console.log(`💾 Guest session saved to database with ID: ${savedGuestSession.id}`);

    // Create complete response with all required fields for iOS app
    const response = {
      user: {
        id: guestUserId,
        email: email,
        firstName: null,
        lastName: null,
        accountType: "guest", // Must match iOS enum exactly
        authProvider: "guest", // Required field - was missing
        isGuest: true,
        emailVerified: false, // Required field - was missing
        biometricEnabled: false, // Required field - was missing
        createdAt: savedGuestSession.createdAt.toISOString() // Required field - was missing
      },
      sessionToken: sessionToken
    };

    // Validate response before returning
    const validatedResponse = validateResponse(response);

    console.log(`✅ Guest session created successfully for: ${email}`);
    console.log(`🔑 Session Token: ${sessionToken.substring(0, 20)}...`);

    return NextResponse.json(validatedResponse, { status: 200 });

  } catch (error) {
    // Enhanced error logging
    console.error('❌ Guest session creation error:', {
      error: error.message,
      stack: error.stack,
      requestBody: body || 'Failed to parse request body',
      timestamp: new Date().toISOString()
    });
    
    // Return structured error response
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
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