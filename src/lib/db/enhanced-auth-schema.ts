import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  date,
  time,
  pgEnum,
  unique,
  index,
  decimal,
} from 'drizzle-orm/pg-core';

// ============================================================================
// ENHANCED ENUMS FOR SMART AUTH SYSTEM
// ============================================================================

export const accountTypeEnum = pgEnum('account_type', [
  'guest',       // Guest users (email only, no password)
  'registered',  // Full users with password/social auth
  'premium'      // Premium users with extra features
]);

export const qrStatusEnum = pgEnum('qr_status', [
  'valid',       // Valid ticket, ready for entry
  'used',        // Already scanned and used
  'invalid',     // Corrupted or fake ticket
  'expired'      // Past event date or expired reservation
]);

export const qrValidationStatusEnum = pgEnum('qr_validation_status', [
  'admit',       // ✅ Green: Valid entry, allow access
  'wrong_date',  // ⚠️ Yellow: Valid ticket but wrong date
  'invalid',     // ❌ Red: Invalid/fake ticket
  'already_used' // 🚫 Gray: Already scanned and used
]);

// ============================================================================
// ENHANCED USER MANAGEMENT TABLES
// ============================================================================

// Enhanced users table with guest support
export const enhancedUsers = pgTable('enhanced_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash'), // nullable for guest accounts
  first_name: text('first_name'),
  last_name: text('last_name'),
  phone: text('phone'),
  account_type: accountTypeEnum('account_type').default('guest').notNull(),
  email_verified: boolean('email_verified').default(false),
  email_verification_token: text('email_verification_token'),
  reset_password_token: text('reset_password_token'),
  reset_password_expires: timestamp('reset_password_expires', { withTimezone: true }),
  auth_provider: text('auth_provider').default('email'), // 'email', 'google', 'apple'
  auth_provider_id: text('auth_provider_id'), // for social auth
  guest_session_id: text('guest_session_id'), // for guest account tracking
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  converted_at: timestamp('converted_at', { withTimezone: true }), // when guest became registered user
  last_login: timestamp('last_login', { withTimezone: true }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIndex: index('idx_enhanced_users_email').on(table.email),
  accountTypeIndex: index('idx_enhanced_users_account_type').on(table.account_type),
  guestSessionIndex: index('idx_enhanced_users_guest_session').on(table.guest_session_id),
}));

// Guest sessions tracking
export const guestSessions = pgTable('guest_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_token: text('session_token').notNull().unique(),
  email: text('email').notNull(),
  device_info: jsonb('device_info'), // device type, OS, app version
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  converted_at: timestamp('converted_at', { withTimezone: true }), // when became registered user
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => ({
  sessionTokenIndex: index('idx_guest_sessions_token').on(table.session_token),
  emailIndex: index('idx_guest_sessions_email').on(table.email),
  expiresIndex: index('idx_guest_sessions_expires').on(table.expires_at),
}));

// User sessions for registered users
export const userSessions = pgTable('user_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => enhancedUsers.id, { onDelete: 'cascade' }),
  session_token: text('session_token').notNull().unique(),
  device_info: jsonb('device_info'), // device type, OS, app version
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionTokenIndex: index('idx_user_sessions_token').on(table.session_token),
  userIndex: index('idx_user_sessions_user').on(table.user_id),
  expiresIndex: index('idx_user_sessions_expires').on(table.expires_at),
}));

// ============================================================================
// ENHANCED VENUES WITH APPLE MAPS SUPPORT
// ============================================================================

export const enhancedVenues = pgTable('enhanced_venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  address: text('address'),
  description: text('description'),
  // Apple Maps integration
  latitude: decimal('latitude', { precision: 10, scale: 8 }), // for Apple Maps
  longitude: decimal('longitude', { precision: 11, scale: 8 }), // for Apple Maps
  apple_maps_url: text('apple_maps_url'), // Pre-built Apple Maps URL
  parking_nearby: boolean('parking_nearby').default(false),
  accessibility_info: text('accessibility_info'),
  default_seat_map_id: uuid('default_seat_map_id'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIndex: index('idx_enhanced_venues_slug').on(table.slug),
  locationIndex: index('idx_enhanced_venues_location').on(table.latitude, table.longitude),
}));

// ============================================================================
// ENHANCED BOOKINGS WITH SMART AUTH SUPPORT
// ============================================================================

export const enhancedBookings = pgTable('enhanced_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => enhancedUsers.id, { onDelete: 'cascade' }),
  show_id: uuid('show_id').notNull(), // Will reference shows table
  booking_reference: text('booking_reference').notNull().unique(), // LML12345
  payment_intent_id: text('payment_intent_id'), // Stripe payment intent
  total_amount: integer('total_amount').notNull(), // in pence
  booking_status: text('booking_status').default('confirmed').notNull(),
  seats_count: integer('seats_count').notNull(),
  booking_date: timestamp('booking_date', { withTimezone: true }).defaultNow().notNull(),
  qr_code_data: text('qr_code_data'), // for venue entry
  qr_code_status: qrStatusEnum('qr_code_status').default('valid').notNull(),
  last_qr_check: timestamp('last_qr_check', { withTimezone: true }), // when QR was last validated
  venue_coordinates: jsonb('venue_coordinates'), // lat/lng for Apple Maps
  guest_session_id: text('guest_session_id'), // for guest bookings
  converted_to_user_id: uuid('converted_to_user_id'), // if guest account was converted
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  bookingRefIndex: index('idx_enhanced_bookings_ref').on(table.booking_reference),
  userIndex: index('idx_enhanced_bookings_user').on(table.user_id),
  showIndex: index('idx_enhanced_bookings_show').on(table.show_id),
  statusIndex: index('idx_enhanced_bookings_status').on(table.booking_status),
  guestSessionIndex: index('idx_enhanced_bookings_guest').on(table.guest_session_id),
  qrStatusIndex: index('idx_enhanced_bookings_qr_status').on(table.qr_code_status),
}));

// Individual booked seats
export const bookedSeats = pgTable('booked_seats', {
  id: uuid('id').primaryKey().defaultRandom(),
  booking_id: uuid('booking_id').notNull().references(() => enhancedBookings.id, { onDelete: 'cascade' }),
  section: text('section').notNull(),
  row_number: integer('row_number').notNull(),
  seat_number: integer('seat_number').notNull(),
  seat_price: integer('seat_price').notNull(), // in pence
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  bookingIndex: index('idx_booked_seats_booking').on(table.booking_id),
  seatLocationIndex: index('idx_booked_seats_location').on(table.section, table.row_number, table.seat_number),
}));

// ============================================================================
// QR CODE VALIDATION SYSTEM
// ============================================================================

export const qrValidations = pgTable('qr_validations', {
  id: uuid('id').primaryKey().defaultRandom(),
  booking_id: uuid('booking_id').notNull().references(() => enhancedBookings.id, { onDelete: 'cascade' }),
  qr_code_data: text('qr_code_data').notNull(),
  validation_status: qrValidationStatusEnum('validation_status').notNull(),
  validation_timestamp: timestamp('validation_timestamp', { withTimezone: true }).defaultNow().notNull(),
  venue_scanner_id: text('venue_scanner_id'), // which device/gate scanned it
  show_date: date('show_date').notNull(),
  attempted_entry_time: timestamp('attempted_entry_time', { withTimezone: true }),
  notes: text('notes'),
}, (table) => ({
  bookingIndex: index('idx_qr_validations_booking').on(table.booking_id),
  qrDataIndex: index('idx_qr_validations_qr_data').on(table.qr_code_data),
  statusIndex: index('idx_qr_validations_status').on(table.validation_status),
  timestampIndex: index('idx_qr_validations_timestamp').on(table.validation_timestamp),
}));

// ============================================================================
// OFFLINE TICKET STORAGE
// ============================================================================

export const localTickets = pgTable('local_tickets', {
  id: uuid('id').primaryKey(),
  user_id: uuid('user_id').notNull(),
  booking_data: jsonb('booking_data').notNull(), // complete ticket info
  qr_code_status: qrStatusEnum('qr_code_status').default('valid').notNull(),
  last_sync: timestamp('last_sync', { withTimezone: true }).defaultNow().notNull(),
  is_offline_available: boolean('is_offline_available').default(true),
  storage_size_bytes: integer('storage_size_bytes'), // for storage management
}, (table) => ({
  userIndex: index('idx_local_tickets_user').on(table.user_id),
  statusIndex: index('idx_local_tickets_status').on(table.qr_code_status),
  syncIndex: index('idx_local_tickets_sync').on(table.last_sync),
  offlineIndex: index('idx_local_tickets_offline').on(table.is_offline_available),
}));

// ============================================================================
// ENHANCED SHOWS WITH VENUE COORDINATES
// ============================================================================

export const enhancedShows = pgTable('enhanced_shows', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull().references(() => enhancedVenues.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  show_date: date('show_date').notNull(),
  show_time: time('show_time').notNull(),
  duration_minutes: integer('duration_minutes').default(120),
  image_url: text('image_url'),
  min_price: integer('min_price').notNull(), // in pence
  max_price: integer('max_price').notNull(), // in pence
  total_seats: integer('total_seats'),
  available_seats: integer('available_seats'),
  status: text('status').default('active').notNull(), // 'active', 'sold_out', 'cancelled'
  venue_coordinates: jsonb('venue_coordinates'), // cached from venue for easy access
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  venueIndex: index('idx_enhanced_shows_venue').on(table.venue_id),
  dateIndex: index('idx_enhanced_shows_date').on(table.show_date),
  statusIndex: index('idx_enhanced_shows_status').on(table.status),
  titleIndex: index('idx_enhanced_shows_title').on(table.title),
}));

// ============================================================================
// SEAT MAPS WITH VENUE COORDINATION DATA
// ============================================================================

export const enhancedSeatMaps = pgTable('enhanced_seat_maps', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_name: text('venue_name').notNull(),
  map_data: jsonb('map_data').notNull(), // seat coordinates, sections, etc.
  version: integer('version').default(1),
  is_active: boolean('is_active').default(true),
  venue_coordinates: jsonb('venue_coordinates'), // Apple Maps integration
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  venueIndex: index('idx_enhanced_seat_maps_venue').on(table.venue_name),
  activeIndex: index('idx_enhanced_seat_maps_active').on(table.is_active),
  versionIndex: index('idx_enhanced_seat_maps_version').on(table.version),
})); 