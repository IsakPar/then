// ============================================================================
// SHARED TYPES FOR MOBILE APP
// ============================================================================
// These types are derived from the main database schema but simplified for mobile use

export type SeatStatus = 'available' | 'reserved' | 'booked' | 'blocked';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired';

// ============================================================================
// CORE ENTITIES (Read-only for mobile app)
// ============================================================================

export interface Venue {
  id: string;
  name: string;
  slug: string;
  address?: string;
  description?: string;
}

export interface Show {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  durationMinutes?: number;
  imageUrl?: string;
  venue_name: string;
  location?: string;
  seatMapId: string;
  seat_pricing?: SeatPricing[];
  min_price?: number;
  max_price?: number;
  venue?: Venue; // Added for nested venue data from backend queries
}

export interface Section {
  id: string;
  name: string;
  displayName?: string;
  colorHex: string;
  basePricePence: number;
  isAccessible?: boolean;
  sortOrder?: number;
}

export interface Seat {
  id: string;
  showId: string;
  sectionId: string;
  row_letter: string;
  seat_number: number;
  pricePence: number;
  status: SeatStatus;
  position?: any; // SVG coordinates
  isAccessible?: boolean;
  notes?: string;
  section_name?: string;
  display_name?: string;
  color_hex?: string;
}

export interface SeatPricing {
  section_id: string;
  section_name: string;
  color_code: string;
  price: number;
  available_seats: number;
  total_seats: number;
}

// ============================================================================
// BOOKING & PAYMENT TYPES
// ============================================================================

export interface Booking {
  id: string;
  showId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: BookingStatus;
  totalAmountPence: number;
  validationCode: string;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingSeat {
  id: string;
  bookingId: string;
  seatId: string;
  pricePaidPence: number;
}

export interface Reservation {
  id: string;
  seatId: string;
  sessionToken: string;
  expiresAt: string;
  stripeCheckoutSessionId?: string;
}

// ============================================================================
// UI SPECIFIC TYPES
// ============================================================================

export interface SelectedSeat {
  databaseSeatId: string;
  categoryId: string;
  categoryName: string;
  price: number;
  section: string;
  row: number;
  seat: number;
  sectionType: string;
}

export interface SeatCategory {
  category_id: string;
  category_name: string;
  color_code: string;
  price: number;
  available_seats: number;
  sold_seats: number;
  description: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ShowWithAvailability extends Show {
  seatStats: {
    sectionId: string;
    sectionName: string;
    sectionColor: string;
    basePricePence: number;
    totalSeats: number;
    availableSeats: number;
    bookedSeats: number;
    reservedSeats: number;
  }[];
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
  reservationId: string;
  expiresAt: string;
  totalAmount: number;
  reservedSeats: number;
}

export interface PaymentSuccessResponse {
  payment_status: string;
  verification_code: string;
  show_details?: {
    id: string;
    title: string;
    date: string;
    time: string;
    venue_name: string;
    location: string;
  };
  seats?: {
    id: string;
    section_name: string;
    row: string;
    number: number;
    price_paid: number;
    section_color: string;
  }[];
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface CustomerDetails {
  name: string;
  email: string;
  phone?: string;
}

export interface SeatSelection {
  showId: string;
  selectedSeats: SelectedSeat[];
  totalPrice: number;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  email_verified: boolean;
  provider?: 'email' | 'google' | 'apple';
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export interface SocialAuthRequest {
  provider: 'google' | 'apple';
  idToken: string;
  accessToken?: string;
  user: {
    email: string;
    name?: string;
    id: string;
  };
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  error?: string;
  requiresEmailVerification?: boolean;
}

export interface EmailVerificationRequest {
  email: string;
}

export interface EmailVerificationResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface VerifyEmailTokenRequest {
  token: string;
  email: string;
}

export interface UserBooking extends Booking {
  show?: Show;
  seats?: BookingSeat[];
} 