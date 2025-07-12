import { Platform } from 'react-native';
import { SocialAuthRequest } from '../types';

// Conditionally import native modules
let GoogleSignin: any = null;
let statusCodes: any = null;
let appleAuth: any = null;

try {
  const googleSignin = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignin.GoogleSignin;
  statusCodes = googleSignin.statusCodes;
} catch (error) {
  console.warn('Google Sign-In not available in Expo Go');
}

try {
  const appleAuthModule = require('@invertase/react-native-apple-authentication');
  appleAuth = appleAuthModule.appleAuth;
} catch (error) {
  console.warn('Apple Authentication not available in Expo Go');
}

export interface SocialAuthResult {
  provider: 'google' | 'apple';
  idToken: string;
  accessToken?: string;
  user: {
    email: string;
    name?: string;
    id: string;
  };
}

class SocialAuthService {
  private isExpoGo: boolean;
  private isConfigured: boolean = false;

  constructor() {
    // Detect if running in Expo Go
    this.isExpoGo = !GoogleSignin || !appleAuth;
    
    // Configure Google Sign-In if available
    if (!this.isExpoGo && GoogleSignin) {
      this.configureGoogleSignIn();
    }
  }

  private configureGoogleSignIn() {
    try {
      // Get credentials from environment variables
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
      const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
      
      console.log('🔧 Configuring Google Sign-In...');
      console.log('🔧 Environment check:', {
        hasWebClientId: !!webClientId,
        hasIosClientId: !!iosClientId,
        isExpoGo: this.isExpoGo,
        platform: Platform.OS
      });

      if (!webClientId) {
        console.warn('⚠️ EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID not found in environment variables');
        console.warn('⚠️ Google Sign-In will use mock mode. See ENVIRONMENT_SETUP.md');
        return;
      }

      // Configure with proper credentials
      GoogleSignin.configure({
        webClientId: webClientId,
        iosClientId: iosClientId || undefined,
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: true,
        accountName: '',
        googleServicePlistPath: '',
        openIdRealm: '',
        profileImageSize: 120,
      });

      this.isConfigured = true;
      console.log('✅ Google Sign-In configured successfully');
      
    } catch (error) {
      console.error('❌ Google Sign-In configuration failed:', error);
      this.isConfigured = false;
    }
  }

  async signInWithGoogle(): Promise<SocialAuthResult> {
    // Check if we're in Expo Go or missing configuration
    if (this.isExpoGo || !GoogleSignin || !this.isConfigured) {
      return this.simulateGoogleSignIn();
    }

    try {
      console.log('🔵 Starting real Google Sign-In...');
      
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Sign in
      const userInfo = await GoogleSignin.signIn();
      
      // Get tokens
      const tokens = await GoogleSignin.getTokens();
      
      if (!tokens.idToken) {
        throw new Error('No ID token received from Google');
      }

      console.log('🔵 Real Google Sign-In successful:', userInfo.data?.user?.email);

      return {
        provider: 'google',
        idToken: tokens.idToken,
        accessToken: tokens.accessToken || undefined,
        user: {
          email: userInfo.data?.user?.email || '',
          name: userInfo.data?.user?.name || undefined,
          id: userInfo.data?.user?.id || '',
        },
      };
      
    } catch (error: any) {
      console.error('🔵 Real Google Sign-In error:', error);
      
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google Sign-In was cancelled');
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Google Sign-In is already in progress');
      } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available');
      } else {
        throw new Error('Google Sign-In failed: ' + (error.message || 'Unknown error'));
      }
    }
  }

  private simulateGoogleSignIn(): SocialAuthResult {
    console.log('🔵 Simulating Google Sign-In for development...');
    
    // Check if we should connect to local backend for testing
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const isLocalBackend = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');
    
    if (isLocalBackend) {
      console.log('🔧 Using mock authentication for local development');
    } else {
      console.warn('⚠️ Mock authentication detected with production backend!');
      console.warn('⚠️ This will fail. Please set up real Google OAuth credentials.');
      console.warn('⚠️ See GOOGLE_OAUTH_SETUP.md and ENVIRONMENT_SETUP.md for instructions.');
    }
    
    // Generate more realistic mock data
    const mockUser = {
      provider: 'google' as const,
      idToken: 'mock-id-token-' + Date.now(),
      accessToken: 'mock-access-token-' + Date.now(),
      user: {
        email: 'demo@lastminutelive.com',
        name: 'Demo User',
        id: 'mock-google-id-' + Date.now(),
      },
    };
    
    console.log('🔵 Mock Google Sign-In completed:', mockUser.user.email);
    return mockUser;
  }

  async signInWithApple(): Promise<SocialAuthResult> {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In is only available on iOS');
    }

    if (this.isExpoGo || !appleAuth) {
      // Simulate successful auth for Expo Go testing
      console.log('🍎 Simulating Apple Sign-In for Expo Go...');
      return {
        provider: 'apple',
        idToken: 'mock-apple-id-token-' + Date.now(),
        user: {
          email: 'demo.apple@lastminutelive.com',
          name: 'Apple Demo User',
          id: 'mock-apple-id-' + Date.now(),
        },
      };
    }

    try {
      console.log('🍎 Starting Apple Sign-In...');

      // Check if Apple Sign-In is available
      if (!appleAuth.isSupported) {
        throw new Error('Apple Sign-In is not available on this device');
      }

      // Perform the sign-in request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Ensure we have the required data
      if (!appleAuthRequestResponse.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      console.log('🍎 Apple Sign-In successful:', appleAuthRequestResponse.email);

      // Construct full name from components
      const fullName = appleAuthRequestResponse.fullName
        ? `${appleAuthRequestResponse.fullName.givenName || ''} ${appleAuthRequestResponse.fullName.familyName || ''}`.trim()
        : undefined;

      return {
        provider: 'apple',
        idToken: appleAuthRequestResponse.identityToken,
        user: {
          email: appleAuthRequestResponse.email || '',
          name: fullName,
          id: appleAuthRequestResponse.user,
        },
      };
    } catch (error: any) {
      console.error('🍎 Apple Sign-In error:', error);
      throw new Error('Apple Sign-In failed: ' + (error.message || 'Unknown error'));
    }
  }

  convertToApiRequest(result: SocialAuthResult): SocialAuthRequest {
    console.log('🔄 Converting social auth result to API request:', {
      provider: result.provider,
      hasIdToken: !!result.idToken,
      hasAccessToken: !!result.accessToken,
      userEmail: result.user.email
    });

    const apiRequest: SocialAuthRequest = {
      provider: result.provider,
      idToken: result.idToken,
      accessToken: result.accessToken,
      user: {
        email: result.user.email,
        name: result.user.name,
        id: result.user.id,
      },
    };

    console.log('🔄 Converted API request:', {
      provider: apiRequest.provider,
      hasIdToken: !!apiRequest.idToken,
      hasAccessToken: !!apiRequest.accessToken,
      userEmail: apiRequest.user.email
    });

    return apiRequest;
  }

  async signOut() {
    if (this.isExpoGo) {
      console.log('🔓 Simulating sign-out for Expo Go');
      return;
    }

    try {
      // Sign out from Google
      if (GoogleSignin && this.isConfigured) {
        const currentUser = await GoogleSignin.getCurrentUser();
        if (currentUser) {
          await GoogleSignin.signOut();
          console.log('🔵 Signed out from Google');
        }
      }

      // Note: Apple doesn't have a sign-out method, but we can revoke credentials
      if (Platform.OS === 'ios') {
        // Apple credential state is handled automatically
        console.log('🍎 Apple credentials cleared');
      }
    } catch (error) {
      console.error('Social sign-out error:', error);
      // Continue with sign-out even if there are errors
    }
  }

  // Helper method to check configuration status
  getConfigurationStatus() {
    return {
      isExpoGo: this.isExpoGo,
      isConfigured: this.isConfigured,
      hasWebClientId: !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      hasIosClientId: !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      platform: Platform.OS,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    };
  }
}

// Export singleton instance
export const socialAuthService = new SocialAuthService();
export default socialAuthService; 