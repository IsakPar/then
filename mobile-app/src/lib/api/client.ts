// ============================================================================
// MOBILE APP API CLIENT
// ============================================================================
// Connects to the shared backend API from the Next.js web app

import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Show, 
  Seat, 
  CheckoutSessionResponse, 
  PaymentSuccessResponse,
  ApiResponse,
  LoginRequest,
  SignupRequest,
  SocialAuthRequest,
  AuthResponse,
  User,
  UserBooking,
  EmailVerificationRequest,
  EmailVerificationResponse,
  VerifyEmailTokenRequest
} from '../../types';
import { config } from '../../config';



class ApiClient {
  private baseUrl: string;

  constructor() {
    // Get API URL from app.json configuration or environment variable
    const configApiUrl = Constants.expoConfig?.extra?.apiUrl;
    const envApiUrl = process.env.EXPO_PUBLIC_API_URL;
    
    // Default to Railway production backend, fallback to localhost for development
    this.baseUrl = envApiUrl || configApiUrl || 'https://then-production.up.railway.app';
    
    console.log('API Client initialized with baseUrl:', this.baseUrl);
  }



  /**
   * Get booking confirmation details after successful payment
   */
  async getBookingConfirmation(sessionId: string): Promise<PaymentSuccessResponse> {
    return this.request<PaymentSuccessResponse>(
      `/api/checkout/success?session_id=${sessionId}`
    );
  }

  // ============================================================================
  // AUTHENTICATION ENDPOINTS
  // ============================================================================

  /**
   * Set authentication token for requests
   */
  private authToken: string | null = null;

  /**
   * Set the auth token for API requests
   */
  setAuthToken(token: string | null) {
    this.authToken = token;
  }

  /**
   * Get auth token from AsyncStorage
   */
  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  /**
   * Store auth token in AsyncStorage
   */
  async storeToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', token);
      this.setAuthToken(token);
    } catch (error) {
      console.error('Error storing token:', error);
      throw error;
    }
  }

  /**
   * Remove auth token from AsyncStorage
   */
  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('authToken');
      this.setAuthToken(null);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  /**
   * Login user
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    console.log('🔐 Logging in user:', credentials.email);
    try {
      const response = await this.request<AuthResponse>('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      
      if (response.success && response.token) {
        await this.storeToken(response.token);
      }
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async signup(userData: SignupRequest): Promise<AuthResponse> {
    console.log('📝 Signing up user:', userData.email);
    try {
      const response = await this.request<AuthResponse>('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      
      if (response.success && response.token) {
        await this.storeToken(response.token);
      }
      
      return response;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    console.log('🔓 Logging out user');
    await this.removeToken();
  }

  /**
   * Verify current token and get user data
   */
  async verifyToken(): Promise<AuthResponse> {
    const token = await this.getStoredToken();
    if (!token) {
      console.log('🔐 No stored token found');
      return { success: false, error: 'No token found' };
    }

    console.log('🔐 Verifying token, length:', token.length);

    try {
      const response = await this.request<AuthResponse>('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('🔐 Token verification response:', { 
        success: response.success, 
        hasUser: !!response.user,
        hasToken: !!response.token,
        error: response.error 
      });
      
      // Store the token if verification was successful and token was refreshed
      if (response.success && response.token && response.token !== token) {
        console.log('🔐 Storing refreshed token');
        await this.storeToken(response.token);
      }
      
      return response;
    } catch (error) {
      console.error('🔐 Token verification error:', error);
      console.log('🔐 Removing invalid token from storage');
      await this.removeToken(); // Remove invalid token
      return { success: false, error: 'Token verification failed' };
    }
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(): Promise<UserBooking[]> {
    // Always verify token before making the request
    const verifyResponse = await this.verifyToken();
    if (!verifyResponse.success || !verifyResponse.token) {
      throw new Error('Authentication required - please log in again');
    }

    // Use the verified/refreshed token
    return this.request<UserBooking[]>('/api/user/bookings', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${verifyResponse.token}`,
      },
    });
  }

  /**
   * Login user with social authentication
   */
  async socialAuth(socialData: SocialAuthRequest): Promise<AuthResponse> {
    console.log('🔐 Social login with provider:', socialData.provider);
    console.log('🔐 Social auth request data:', JSON.stringify(socialData, null, 2));
    
    try {
      const response = await this.request<AuthResponse>('/api/auth/social', {
        method: 'POST',
        body: JSON.stringify(socialData),
      });
      
      if (response.success && response.token) {
        await this.storeToken(response.token);
      }
      
      return response;
    } catch (error) {
      console.error('Social auth error:', error);
      console.error('Social auth request that failed:', JSON.stringify(socialData, null, 2));
      
      // Add more detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      throw error;
    }
  }

  /**
   * Send email verification
   */
  async sendEmailVerification(emailData: EmailVerificationRequest): Promise<EmailVerificationResponse> {
    console.log('📧 Sending email verification to:', emailData.email);
    try {
      return await this.request<EmailVerificationResponse>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify(emailData),
      });
    } catch (error) {
      console.error('Send email verification error:', error);
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(verificationData: VerifyEmailTokenRequest): Promise<AuthResponse> {
    console.log('✅ Verifying email with token');
    try {
      const params = new URLSearchParams({
        email: verificationData.email,
        token: verificationData.token,
      });
      
      return await this.request<AuthResponse>(`/api/auth/verify-email?${params}`, {
        method: 'GET',
      });
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<EmailVerificationResponse> {
    console.log('🔄 Resending email verification to:', email);
    try {
      return await this.request<EmailVerificationResponse>('/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      throw error;
    }
  }

  /**
   * Override request method to include auth token
   */
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Add auth token if available
    const token = this.authToken || await this.getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-mobile-app': 'true',
      'User-Agent': 'LastMinuteLive-Mobile-App',
      ...options.headers as Record<string, string>,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    try {
      const response = await fetch(url, {
        headers,
        ...options,
      });

      if (!response.ok) {
        // Try to get the error message from the response body
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // If we can't parse the error response, use the status text
          console.warn('Could not parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ============================================================================
  // DATA TRANSFORMATION HELPERS
  // ============================================================================

  /**
   * Transform API show data to match mobile app interface
   */
  private transformShowData(apiShow: any): Show {
    // Handle image URLs - convert relative paths to full URLs
    let imageUrl = apiShow.image_url || apiShow.imageUrl;
    if (imageUrl && !imageUrl.startsWith('http')) {
      // If it's a relative path, prepend the base URL
      imageUrl = `${this.baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    }

    return {
      id: apiShow.id,
      title: apiShow.title,
      description: apiShow.description,
      date: apiShow.date,
      time: apiShow.time,
      durationMinutes: apiShow.duration_minutes || apiShow.durationMinutes,
      imageUrl: imageUrl,
      venue_name: apiShow.venue_name,
      location: apiShow.location || apiShow.address,
      seatMapId: apiShow.seatMapId || apiShow.seat_map_id,
      seat_pricing: apiShow.seat_pricing,
      min_price: apiShow.min_price,
      max_price: apiShow.max_price,
    };
  }

  /**
   * Transform API seat data to match mobile app interface
   */
  private transformSeatData(apiSeat: any): Seat {
    return {
      id: apiSeat.id,
      showId: apiSeat.show_id || apiSeat.showId,
      sectionId: apiSeat.section_id || apiSeat.sectionId,
      row_letter: apiSeat.row_letter,
      seat_number: apiSeat.seat_number,
      pricePence: apiSeat.price_pence || apiSeat.pricePence,
      status: apiSeat.status,
      position: apiSeat.position,
      isAccessible: apiSeat.is_accessible || apiSeat.isAccessible,
      notes: apiSeat.notes,
      section_name: apiSeat.section_name,
      display_name: apiSeat.display_name,
      color_hex: apiSeat.color_hex,
    };
  }

  // ============================================================================
  // SHOW ENDPOINTS
  // ============================================================================

  /**
   * Get all active shows
   */
  async getShows(): Promise<Show[]> {
    console.log('🎭 Fetching shows from API...');
    
    try {
      const rawShows = await this.request<any[]>('/api/shows');
      console.log('🎭 Raw API response:', rawShows.length, 'shows');
      console.log('🎭 Sample show data:', rawShows[0]);
      
      const transformedShows = rawShows.map(show => this.transformShowData(show));
      console.log('🎭 Transformed shows:', transformedShows.length, 'shows');
      console.log('🎭 Sample transformed show:', transformedShows[0]);
      
      // Add mock shows for display (matching web app)
      const mockShows: Show[] = [
        {
          id: 'mock-chicago',
          title: 'Chicago',
          description: 'The longest-running American musical on Broadway',
          date: '2025-07-16',
          time: '19:30',
          durationMinutes: 150,
          imageUrl: `${this.baseUrl}/chicago.jpeg`,
          venue_name: 'Ambassador Theatre',
          location: 'West Street, London WC2H 9ND',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 55,
          max_price: 95,
        },
        {
          id: 'mock-lionking',
          title: 'The Lion King',
          description: 'Disney\'s award-winning musical spectacular',
          date: '2025-07-16',
          time: '19:30',
          durationMinutes: 150,
          imageUrl: `${this.baseUrl}/lionking.jpeg`,
          venue_name: 'Lyceum Theatre',
          location: 'Wellington Street, London WC2E 7RQ',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 65,
          max_price: 125,
        },
        {
          id: 'mock-mamamia',
          title: 'Mamma Mia!',
          description: 'The ultimate feel-good musical',
          date: '2025-07-17',
          time: '19:30',
          durationMinutes: 140,
          imageUrl: `${this.baseUrl}/mamamia.jpeg`,
          venue_name: 'Novello Theatre',
          location: 'Aldwych, London WC2B 4LD',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 45,
          max_price: 85,
        },
        {
          id: 'mock-phantom',
          title: 'The Phantom of the Opera',
          description: 'Andrew Lloyd Webber\'s Gothic romance',
          date: '2025-07-17',
          time: '19:30',
          durationMinutes: 165,
          imageUrl: `${this.baseUrl}/phantom.jpg`,
          venue_name: 'His Majesty\'s Theatre',
          location: 'Haymarket, London SW1Y 4QL',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 70,
          max_price: 110,
        },
        {
          id: 'mock-wicked',
          title: 'Wicked',
          description: 'The untold story of the Witches of Oz',
          date: '2025-07-18',
          time: '19:30',
          durationMinutes: 165,
          imageUrl: `${this.baseUrl}/wicked.jpeg`,
          venue_name: 'Apollo Victoria Theatre',
          location: 'Wilton Road, London SW1V 1LG',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 60,
          max_price: 115,
        },
        {
          id: 'mock-harry',
          title: 'Harry Potter and the Cursed Child',
          description: 'The eighth Harry Potter story',
          date: '2025-07-18',
          time: '19:00',
          durationMinutes: 320,
          imageUrl: `${this.baseUrl}/harry.jpeg`,
          venue_name: 'Palace Theatre',
          location: 'Shaftesbury Avenue, London W1D 5AY',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 80,
          max_price: 150,
        }
      ];
      
      // Combine real shows with mock shows
      const allShows = [...transformedShows, ...mockShows];
      console.log('🎭 Total shows (real + mock):', allShows.length);
      
      return allShows;
    } catch (error) {
      console.error('🎭 Error fetching shows, returning mock shows only:', error);
      
      // If API fails, return mock shows only
      const mockShows: Show[] = [
        {
          id: 'mock-chicago',
          title: 'Chicago',
          description: 'The longest-running American musical on Broadway',
          date: '2025-07-16',
          time: '19:30',
          durationMinutes: 150,
          imageUrl: `${this.baseUrl}/chicago.jpeg`,
          venue_name: 'Ambassador Theatre',
          location: 'West Street, London WC2H 9ND',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 55,
          max_price: 95,
        },
        {
          id: 'mock-lionking',
          title: 'The Lion King',
          description: 'Disney\'s award-winning musical spectacular',
          date: '2025-07-16',
          time: '19:30',
          durationMinutes: 150,
          imageUrl: `${this.baseUrl}/lionking.jpeg`,
          venue_name: 'Lyceum Theatre',
          location: 'Wellington Street, London WC2E 7RQ',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 65,
          max_price: 125,
        },
        {
          id: 'mock-mamamia',
          title: 'Mamma Mia!',
          description: 'The ultimate feel-good musical',
          date: '2025-07-17',
          time: '19:30',
          durationMinutes: 140,
          imageUrl: `${this.baseUrl}/mamamia.jpeg`,
          venue_name: 'Novello Theatre',
          location: 'Aldwych, London WC2B 4LD',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 45,
          max_price: 85,
        },
        {
          id: 'mock-phantom',
          title: 'The Phantom of the Opera',
          description: 'Andrew Lloyd Webber\'s Gothic romance',
          date: '2025-07-17',
          time: '19:30',
          durationMinutes: 165,
          imageUrl: `${this.baseUrl}/phantom.jpg`,
          venue_name: 'His Majesty\'s Theatre',
          location: 'Haymarket, London SW1Y 4QL',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 70,
          max_price: 110,
        },
        {
          id: 'mock-wicked',
          title: 'Wicked',
          description: 'The untold story of the Witches of Oz',
          date: '2025-07-18',
          time: '19:30',
          durationMinutes: 165,
          imageUrl: `${this.baseUrl}/wicked.jpeg`,
          venue_name: 'Apollo Victoria Theatre',
          location: 'Wilton Road, London SW1V 1LG',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 60,
          max_price: 115,
        },
        {
          id: 'mock-harry',
          title: 'Harry Potter and the Cursed Child',
          description: 'The eighth Harry Potter story',
          date: '2025-07-18',
          time: '19:00',
          durationMinutes: 320,
          imageUrl: `${this.baseUrl}/harry.jpeg`,
          venue_name: 'Palace Theatre',
          location: 'Shaftesbury Avenue, London W1D 5AY',
          seatMapId: 'mock-seatmap',
          seat_pricing: [],
          min_price: 80,
          max_price: 150,
        }
      ];
      
      return mockShows;
    }
  }

  /**
   * Get a specific show by ID with pricing information
   */
  async getShow(showId: string): Promise<Show> {
    console.log('🎭 Fetching show:', showId);
    const rawShow = await this.request<any>(`/api/shows?id=${showId}`);
    console.log('🎭 Raw show data:', rawShow);
    
    const transformedShow = this.transformShowData(rawShow);
    console.log('🎭 Transformed show:', transformedShow);
    
    return transformedShow;
  }

  /**
   * Get seat map data for a show
   */
  async getShowSeatMap(showId: string): Promise<any> {
    console.log('🗺️ Fetching seat map for show:', showId);
    const seatMapData = await this.request<any>(`/api/shows/${showId}/seatmap`);
    console.log('🗺️ Seat map data:', seatMapData);
    return seatMapData;
  }

  /**
   * Get all seats for a show
   */
  async getShowSeats(showId: string): Promise<Seat[]> {
    console.log('🎫 Fetching seats for show:', showId);
    const rawSeats = await this.request<any[]>(`/api/shows/${showId}/seats`);
    console.log('🎫 Raw seats data:', rawSeats.length, 'seats');
    
    const transformedSeats = rawSeats.map(seat => this.transformSeatData(seat));
    console.log('🎫 Transformed seats:', transformedSeats.length, 'seats');
    
    return transformedSeats;
  }

  // ============================================================================
  // BOOKING & PAYMENT ENDPOINTS
  // ============================================================================

  /**
   * Reserve specific seats and create Stripe checkout session
   */
  async reserveSeats(
    showId: string, 
    specificSeatIds: string[]
  ): Promise<CheckoutSessionResponse> {
    console.log('🧾 Reserving seats for show:', showId, 'seats:', specificSeatIds.length);
    console.log('📱 Using WebView for payment flow');
    
    return this.request<CheckoutSessionResponse>('/api/seat-checkout', {
      method: 'POST',
      body: JSON.stringify({
        showId,
        specificSeatIds,
        // No urlScheme needed for WebView - backend will detect mobile app and use web URLs
      }),
    });
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Format price from pence to pounds
   */
  formatPrice(pence: number): string {
    return `£${(pence / 100).toFixed(2)}`;
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format time for display
   */
  formatTime(timeString: string): string {
    return timeString; // Already in HH:MM format from database
  }

  /**
   * Check if show is today or tomorrow (for "last minute" filtering)
   */
  isLastMinute(dateString: string): boolean {
    const showDate = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const showDateOnly = showDate.toDateString();
    const todayOnly = today.toDateString();
    const tomorrowOnly = tomorrow.toDateString();
    
    return showDateOnly === todayOnly || showDateOnly === tomorrowOnly;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient; 