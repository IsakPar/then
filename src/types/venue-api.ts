// ============================================================================
// VENUE API TYPES - Third-Party Venue Integration Schema
// ============================================================================

/**
 * Core venue API response format for third-party venue integrations
 * This standardizes how external venues provide seat map and booking data
 */
export interface VenueAPIResponse {
  venue: VenueInfo;
  show: ShowInfo;
  seatMap: SeatMapLayout;
  availability: AvailabilityInfo;
  booking_rules: BookingRules;
  _metadata?: APIMetadata;
}

/**
 * Venue information and contact details
 */
export interface VenueInfo {
  id: string;
  name: string;
  slug: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  capacity: number;
  contact: {
    email: string;
    phone?: string;
    website?: string;
  };
  timezone?: string; // e.g., "Europe/London"
  venue_type?: "theater" | "arena" | "stadium" | "club" | "outdoor";
}

/**
 * Show/event information
 */
export interface ShowInfo {
  id: string;
  title: string;
  date: string; // ISO 8601 date
  time: string; // HH:MM format
  duration_minutes: number;
  description?: string;
  image_url?: string;
  genre?: string;
  age_restriction?: string;
  language?: string;
}

/**
 * Complete seat map layout and structure
 */
export interface SeatMapLayout {
  layout: LayoutConfig;
  sections: VenueSection[];
  seats: VenueSeat[];
  pricing: VenuePricing[];
  accessibility_features?: AccessibilityFeature[];
}

/**
 * Layout configuration and viewport settings
 */
export interface LayoutConfig {
  type: "curved" | "grid" | "custom" | "amphitheater";
  viewport: {
    width: number;
    height: number;
    scale?: number;
  };
  stage: {
    x: number;
    y: number;
    width: number;
    height: number;
    label?: string;
  };
  coordinate_system?: "svg" | "canvas" | "absolute";
  background_image?: string;
}

/**
 * Venue section definition
 */
export interface VenueSection {
  id: string;
  name: string;
  display_name: string;
  color_hex: string;
  capacity: number;
  accessibility_info?: string;
  pricing_tier: "premium" | "standard" | "budget" | "vip";
  level?: number; // Floor level (0 = ground, 1 = mezzanine, etc.)
  section_type?: "orchestra" | "balcony" | "box" | "standing" | "vip_lounge";
  view_quality?: "excellent" | "good" | "restricted" | "limited";
}

/**
 * Individual seat definition
 */
export interface VenueSeat {
  id: string;
  section_id: string;
  row: string;
  number: number;
  status: SeatStatus;
  position: {
    x: number;
    y: number;
  };
  accessibility: boolean;
  price_pence: number;
  hold_expires_at?: string; // ISO 8601 if reserved
  seat_type?: "standard" | "wheelchair" | "companion" | "aisle" | "premium";
  view_description?: string;
  notes?: string;
}

/**
 * Seat status enumeration
 */
export type SeatStatus = 
  | "available" 
  | "reserved" 
  | "sold" 
  | "blocked" 
  | "maintenance" 
  | "house_hold";

/**
 * Pricing information per section
 */
export interface VenuePricing {
  section_id: string;
  base_price_pence: number;
  fees: {
    booking_fee_pence: number;
    service_charge_pence: number;
    percentage_fee?: number; // e.g., 2.5 for 2.5%
    payment_processing_fee?: number;
  };
  availability_pricing?: {
    high_demand_multiplier?: number; // e.g., 1.2 for 20% markup
    last_minute_discount?: number; // e.g., 0.8 for 20% discount
    early_bird_discount?: number;
  };
  restrictions?: {
    min_age?: number;
    max_quantity?: number;
    requires_adult_supervision?: boolean;
  };
}

/**
 * Real-time availability information
 */
export interface AvailabilityInfo {
  last_updated: string; // ISO 8601
  cache_ttl: number; // seconds
  total_seats: number;
  available_seats: number;
  reserved_seats: number;
  sold_seats: number;
  blocked_seats?: number;
  availability_percentage: number; // 0-100
  high_demand?: boolean;
  selling_fast?: boolean; // True if < 20% available
}

/**
 * Booking rules and constraints
 */
export interface BookingRules {
  max_seats_per_booking: number;
  reservation_timeout_minutes: number;
  pricing_currency: "GBP" | "USD" | "EUR" | "CAD" | "AUD";
  requires_phone: boolean;
  allows_guest_booking: boolean;
  minimum_age?: number;
  group_booking_threshold?: number; // Seats count for group pricing
  cancellation_policy?: {
    allowed: boolean;
    deadline_hours?: number;
    fee_percentage?: number;
  };
  transfer_policy?: {
    allowed: boolean;
    deadline_hours?: number;
    fee_pence?: number;
  };
}

/**
 * Accessibility features available
 */
export interface AccessibilityFeature {
  type: "wheelchair" | "audio_description" | "sign_language" | "large_print" | "braille";
  description: string;
  sections_available: string[]; // Section IDs
  booking_notes?: string;
  contact_required?: boolean;
}

/**
 * API response metadata
 */
export interface APIMetadata {
  api_version: string;
  response_time_ms: number;
  data_source: "live" | "cached" | "fallback";
  cache_expires_at?: string;
  rate_limit?: {
    remaining: number;
    reset_at: string;
  };
}

// ============================================================================
// VENUE SIMULATOR TYPES
// ============================================================================

/**
 * Configuration for venue API simulation
 */
export interface VenueSimulationConfig {
  network_delay_ms: [number, number]; // [min, max]
  error_rate: number; // 0.0 to 1.0
  availability_update_interval: number; // milliseconds
  realistic_booking_patterns: boolean;
  simulate_high_demand: boolean;
  custom_responses?: {
    [endpoint: string]: any;
  };
}

/**
 * Venue configuration file structure
 */
export interface VenueConfig {
  venue: VenueInfo;
  shows: ShowInfo[];
  booking_rules: BookingRules;
  api_simulation: VenueSimulationConfig;
  data_sources: {
    seat_map_file?: string;
    pricing_file?: string;
    availability_source: "static" | "dynamic" | "external_api";
  };
}

// ============================================================================
// RESERVATION & BOOKING TYPES
// ============================================================================

/**
 * Seat reservation request
 */
export interface SeatReservationRequest {
  show_id: string;
  seat_ids: string[];
  customer_info?: {
    email?: string;
    phone?: string;
    name?: string;
  };
  reservation_timeout_minutes?: number;
}

/**
 * Seat reservation response
 */
export interface SeatReservationResponse {
  success: boolean;
  reservation_id: string;
  expires_at: string; // ISO 8601
  reserved_seats: ReservedSeat[];
  total_price_pence: number;
  session_token: string;
  error_message?: string;
}

/**
 * Reserved seat information
 */
export interface ReservedSeat {
  seat_id: string;
  section_name: string;
  row: string;
  number: number;
  price_pence: number;
  fees_pence: number;
  expires_at: string;
}

/**
 * Booking confirmation request
 */
export interface BookingConfirmationRequest {
  reservation_id: string;
  payment_data: {
    stripe_payment_intent_id: string;
    amount_paid_pence: number;
    currency: string;
  };
  customer_info: {
    name: string;
    email: string;
    phone?: string;
  };
}

/**
 * Booking confirmation response
 */
export interface BookingConfirmationResponse {
  success: boolean;
  booking_id: string;
  confirmation_code: string;
  tickets: ConfirmedTicket[];
  total_paid_pence: number;
  error_message?: string;
}

/**
 * Confirmed ticket information
 */
export interface ConfirmedTicket {
  ticket_id: string;
  seat_id: string;
  section_name: string;
  row: string;
  number: number;
  price_paid_pence: number;
  qr_code?: string;
  entry_instructions?: string;
}

// ============================================================================
// INTEGRATION TYPES
// ============================================================================

/**
 * Hybrid reservation (venue + internal system)
 */
export interface HybridReservation {
  venue_reservation_id: string;
  internal_reservation_ids: string[];
  expires_at: string;
  seats: ReservedSeat[];
  sync_status: "synced" | "partial" | "failed";
}

/**
 * Seat availability update
 */
export interface SeatAvailabilityUpdate {
  show_id: string;
  seat_id: string;
  old_status: SeatStatus;
  new_status: SeatStatus;
  updated_at: string;
  source: "venue_api" | "internal" | "sync";
}

/**
 * Venue integration status
 */
export interface VenueIntegrationStatus {
  venue_slug: string;
  status: "active" | "maintenance" | "offline" | "error";
  last_sync: string;
  data_source: "json_file" | "database" | "external_api";
  health_check: {
    api_responsive: boolean;
    data_fresh: boolean;
    sync_working: boolean;
    error_rate: number;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface VenueAPIError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  retry_after_seconds?: number;
}

export type VenueErrorCode = 
  | "VENUE_NOT_FOUND"
  | "SHOW_NOT_FOUND" 
  | "SEATS_UNAVAILABLE"
  | "RESERVATION_EXPIRED"
  | "INVALID_SEAT_SELECTION"
  | "PAYMENT_FAILED"
  | "API_RATE_LIMITED"
  | "VENUE_MAINTENANCE"
  | "DATA_SYNC_ERROR"
  | "NETWORK_ERROR"; 