import { NextRequest, NextResponse } from 'next/server'
import { AuthUtils, ValidationUtils, RateLimitUtils } from '@/lib/auth-utils'
import { SignJWT } from 'jose'
import { OAuth2Client } from 'google-auth-library'
import { randomBytes } from 'crypto'

// Types for social auth
interface SocialAuthRequest {
  provider: 'google' | 'apple';
  idToken: string;
  accessToken?: string;
  user: {
    email: string;
    name?: string;
    id: string;
  };
}

interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    emailVerified: boolean | null;
  };
  token?: string;
  error?: string;
}

// JWT secret and algorithm
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

export async function POST(request: NextRequest): Promise<NextResponse<AuthResponse>> {
  console.log('🚀 Social auth endpoint hit');
  
  try {
    // Rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    console.log('🌐 Client IP:', clientIP);
    
    if (RateLimitUtils.isRateLimited(`social-auth:${clientIP}`, 15, 15 * 60 * 1000)) {
      console.log('⚠️ Rate limited:', clientIP);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many authentication attempts. Please try again later.' 
        },
        { status: 429 }
      );
    }

    // Parse and validate request body
    let body: SocialAuthRequest;
    try {
      console.log('📝 Parsing request body...');
      body = await request.json();
      console.log('✅ Request body parsed:', { 
        provider: body.provider, 
        hasIdToken: !!body.idToken, 
        hasUser: !!body.user,
        userEmail: body.user?.email 
      });
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request format' 
        },
        { status: 400 }
      );
    }

    // Log environment check
    console.log('🔧 Environment check:', {
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV
    });

    // Validate request structure
    console.log('🔍 Validating request structure...');
    if (!body.provider || !body.idToken || !body.user) {
      console.error('❌ Missing required fields:', {
        hasProvider: !!body.provider,
        hasIdToken: !!body.idToken,
        hasUser: !!body.user
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: provider, idToken, and user are required' 
        },
        { status: 400 }
      );
    }

    if (!body.user.email || !body.user.id) {
      console.error('❌ Missing user fields:', {
        hasEmail: !!body.user.email,
        hasId: !!body.user.id
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required user fields: email and id are required' 
        },
        { status: 400 }
      );
    }

    if (body.provider !== 'google' && body.provider !== 'apple') {
      console.error('❌ Invalid provider:', body.provider);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid provider. Must be google or apple' 
        },
        { status: 400 }
      );
    }

    console.log('📱 Social auth request received:', {
      provider: body.provider,
      hasIdToken: !!body.idToken,
      hasUser: !!body.user,
      userEmail: body.user.email,
      isDevelopment: process.env.NODE_ENV === 'development'
    });

    console.log('📱 Processing social auth for:', {
      email: body.user.email,
      name: body.user.name,
      provider: body.provider
    });

    // Environment-specific token validation
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Development mode: Accepting mock token for testing');
    } else {
      // Production: Validate token with Google
      console.log('🔒 Production mode: Validating token with Google...');
      
      if (!process.env.GOOGLE_CLIENT_ID) {
        console.error('❌ GOOGLE_CLIENT_ID environment variable is required');
        throw new Error('GOOGLE_CLIENT_ID environment variable is required');
      }

      try {
        console.log('🔍 Verifying Google token...');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
          idToken: body.idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        console.log('✅ Google token verified for:', payload?.email);

        if (!payload) {
          throw new Error('Invalid token payload');
        }

        // Ensure the email matches
        if (payload.email !== body.user.email) {
          console.error('❌ Email mismatch:', { tokenEmail: payload.email, requestEmail: body.user.email });
          throw new Error('Token email does not match request email');
        }
      } catch (tokenError) {
        console.error('❌ Token verification failed:', tokenError);
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid authentication token' 
          },
          { status: 401 }
        );
      }
    }

    // Database operations
    console.log('💾 Starting database operations...');
    try {
      // Check if user exists
      console.log('🔍 Checking if user exists:', body.user.email);
      const existingUser = await AuthUtils.findUserByEmail(body.user.email);

             let dbUser;
       if (existingUser) {
         console.log('👤 User exists, updating...');
         dbUser = existingUser;
         
         // Update email verification status for social auth
         if (!dbUser.emailVerified) {
           console.log('📧 Updating email verification status...');
           await AuthUtils.markEmailVerified(body.user.email);
         }
       } else {
         console.log('👤 Creating new user...');
         
         dbUser = await AuthUtils.createUser(body.user.email, randomBytes(32).toString('hex'), body.user.name || body.user.email.split('@')[0], 'customer');
         console.log(`✅ Created new ${body.provider} user:`, dbUser.email);
       }

             // Generate JWT token
       console.log('🔑 Generating JWT token...');
       const token = await new SignJWT({
         sub: dbUser.id,
         userId: dbUser.id,
         email: dbUser.email,
         name: dbUser.name,
         role: dbUser.role,
       })
         .setProtectedHeader({ alg: 'HS256' })
         .setIssuedAt()
         .setExpirationTime('30d')
         .setIssuer('lastminutelive')
         .setAudience('lastminutelive-mobile')
         .sign(JWT_SECRET);

       console.log(`✅ Social auth successful for:`, dbUser.email);

       return NextResponse.json({
         success: true,
         message: 'Authentication successful',
         user: {
           id: dbUser.id,
           email: dbUser.email,
           name: dbUser.name,
           role: dbUser.role,
           emailVerified: !!dbUser.emailVerified // Convert Date to boolean
         },
         token
       });

    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error('💥 Social auth error:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('💥 Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred during social authentication' 
      },
      { status: 500 }
    );
  }
}

 