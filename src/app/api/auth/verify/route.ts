import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { AuthUtils, ValidationUtils } from '@/lib/auth-utils';

interface VerifyResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    emailVerified: Date | null;
  };
  token?: string;
  error?: string;
}

// JWT secret and algorithm
const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret');

export async function GET(request: NextRequest): Promise<NextResponse<VerifyResponse>> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No authentication token provided' 
        },
        { status: 401 }
      );
    }

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
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid token payload' 
          },
          { status: 401 }
        );
      }

      // Validate email format
      if (!ValidationUtils.isValidEmail(email)) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid email in token' 
          },
          { status: 401 }
        );
      }

      // Get fresh user data from database
      const user = await AuthUtils.findUserByEmail(email);
      
      if (!user || user.id !== userId) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'User not found or token mismatch' 
          },
          { status: 401 }
        );
      }

      // Return success response with user data
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        token, // Return the same token
      }, { status: 200 });

    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid or expired token' 
        },
        { status: 401 }
      );
    }

  } catch (error) {
    console.error('Token verification error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An internal error occurred' 
      },
      { status: 500 }
    );
  }
} 