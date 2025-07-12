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

  constructor() {
    // Detect if running in Expo Go
    this.isExpoGo = !GoogleSignin || !appleAuth;
    
    if (!this.isExpoGo && GoogleSignin) {
      this.configureGoogleSignIn();
    }
  }

  private configureGoogleSignIn() {
    if (GoogleSignin) {
      GoogleSignin.configure({
        webClientId: 'YOUR_WEB_CLIENT_ID', // This will need to be configured
        iosClientId: 'YOUR_IOS_CLIENT_ID', // This will need to be configured
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: true,
      });
    }
  }

  async signInWithGoogle(): Promise<SocialAuthResult> {
    if (this.isExpoGo || !GoogleSignin) {
      // Simulate successful auth for Expo Go testing
      console.log('🔵 Simulating Google Sign-In for Expo Go...');
      return {
        provider: 'google',
        idToken: 'mock-id-token',
        accessToken: 'mock-access-token',
        user: {
          email: 'test@example.com',
          name: 'Test User',
          id: 'mock-google-id',
        },
      };
    }

    try {
      console.log('🔵 Starting Google Sign-In...');
      
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Sign in
      const userInfo = await GoogleSignin.signIn();
      
      // Access tokens from the response
      const tokens = await GoogleSignin.getTokens();
      
      if (!tokens.idToken) {
        throw new Error('No ID token received from Google');
      }

      console.log('🔵 Google Sign-In successful:', userInfo.data?.user?.email);

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
      console.error('🔵 Google Sign-In error:', error);
      
      if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Google Sign-In was cancelled');
      } else if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Google Sign-In is already in progress');
      } else if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available');
      } else {
        throw new Error('Google Sign-In failed');
      }
    }
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
        idToken: 'mock-apple-id-token',
        user: {
          email: 'test@icloud.com',
          name: 'Apple Test User',
          id: 'mock-apple-id',
        },
      };
    }

    try {
      console.log('🍎 Starting Apple Sign-In...');

      // Check if Apple Sign-In is available (use isSupported instead)
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
      
      if (appleAuth && error.code === appleAuth.Error.CANCELED) {
        throw new Error('Apple Sign-In was cancelled');
      } else if (appleAuth && error.code === appleAuth.Error.FAILED) {
        throw new Error('Apple Sign-In failed');
      } else if (appleAuth && error.code === appleAuth.Error.INVALID_RESPONSE) {
        throw new Error('Invalid response from Apple Sign-In');
      } else if (appleAuth && error.code === appleAuth.Error.NOT_HANDLED) {
        throw new Error('Apple Sign-In not handled');
      } else if (appleAuth && error.code === appleAuth.Error.UNKNOWN) {
        throw new Error('Unknown Apple Sign-In error');
      } else {
        throw new Error('Apple Sign-In failed');
      }
    }
  }

  async signOut() {
    if (this.isExpoGo) {
      console.log('🔓 Simulating sign-out for Expo Go');
      return;
    }

    try {
      // Sign out from Google
      if (GoogleSignin) {
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

  /**
   * Convert social auth result to API request format
   */
  convertToApiRequest(result: SocialAuthResult): SocialAuthRequest {
    return {
      provider: result.provider,
      idToken: result.idToken,
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  /**
   * Check if running in Expo Go (for development)
   */
  isRunningInExpoGo(): boolean {
    return this.isExpoGo;
  }
}

export const socialAuthService = new SocialAuthService();
export default socialAuthService; 