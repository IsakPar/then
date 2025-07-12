import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User, LoginRequest, SignupRequest, SocialAuthRequest, EmailVerificationRequest, VerifyEmailTokenRequest } from '../types';
import apiClient from '../lib/api/client';

// Auth action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

// Initial auth state
const initialAuthState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

// Auth context type
interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginRequest) => Promise<void>;
  signup: (userData: SignupRequest) => Promise<void>;
  socialAuth: (socialData: SocialAuthRequest) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  sendEmailVerification: (email: string) => Promise<void>;
  verifyEmail: (token: string, email: string) => Promise<void>;
  resendEmailVerification: () => Promise<void>;
}

// Create auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      // Check for stored token and verify it with backend
      const response = await apiClient.verifyToken();
      
      if (response.success && response.user && response.token) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: response.user,
            token: response.token,
          },
        });
      } else {
        dispatch({ type: 'AUTH_FAILURE', payload: 'Token verification failed' });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      dispatch({ type: 'AUTH_FAILURE', payload: 'Authentication check failed' });
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await apiClient.login(credentials);
      
      if (response.success && response.user && response.token) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: response.user,
            token: response.token,
          },
        });
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const signup = async (userData: SignupRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await apiClient.signup(userData);
      
      if (response.success && response.user && response.token) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: response.user,
            token: response.token,
          },
        });
      } else {
        throw new Error(response.error || 'Signup failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const socialAuth = async (socialData: SocialAuthRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await apiClient.socialAuth(socialData);
      
      if (response.success && response.user && response.token) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: response.user,
            token: response.token,
          },
        });
      } else {
        throw new Error(response.error || 'Social authentication failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Social authentication failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const sendEmailVerification = async (email: string) => {
    try {
      await apiClient.sendEmailVerification({ email });
    } catch (error) {
      console.error('Send email verification error:', error);
      throw error;
    }
  };

  const verifyEmail = async (token: string, email: string) => {
    try {
      const response = await apiClient.verifyEmail({ token, email });
      
      if (response.success && response.user) {
        // Update the user in state with verified email status
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: response.user,
            token: state.token!, // Keep existing token
          },
        });
      } else {
        throw new Error(response.error || 'Email verification failed');
      }
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  const resendEmailVerification = async () => {
    try {
      if (!state.user?.email) {
        throw new Error('User email not available');
      }
      await apiClient.resendEmailVerification(state.user.email);
    } catch (error) {
      console.error('Resend email verification error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
      // Still dispatch logout even if API call fails
      dispatch({ type: 'LOGOUT' });
    }
  };

  const contextValue: AuthContextType = {
    state,
    login,
    signup,
    socialAuth,
    logout,
    checkAuthStatus,
    sendEmailVerification,
    verifyEmail,
    resendEmailVerification,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 