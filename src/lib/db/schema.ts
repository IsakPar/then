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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS
// ============================================================================

export const seatStatusEnum = pgEnum('seat_status', [
  'available',
  'reserved', 
  'booked',
  'blocked'
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'pending',
  'confirmed',
  'cancelled',
  'expired'
]);

export const authProviderEnum = pgEnum('auth_provider', [
  'email',
  'google',
  'apple',
  'github'
]);

export const userRoleEnum = pgEnum('user_role', [
  'customer',
  'admin',
  'venue'
]);

// ============================================================================
// AUTH TABLES (NextAuth.js compatible)
// ============================================================================

// Users table - main user records
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  passwordHash: text('password_hash'), // For email/password authentication
  role: userRoleEnum('role').default('customer').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIndex: index('idx_users_email').on(table.email),
}));

// Accounts table - OAuth provider accounts linked to users
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'oauth' | 'email' | 'credentials'
  provider: authProviderEnum('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueProvider: unique().on(table.provider, table.providerAccountId),
  userIndex: index('idx_accounts_user').on(table.userId),
}));

// Sessions table - active user sessions
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionTokenIndex: index('idx_sessions_token').on(table.sessionToken),
  userIndex: index('idx_sessions_user').on(table.userId),
  expiresIndex: index('idx_sessions_expires').on(table.expires),
}));

// Verification tokens table - for email verification, password reset, etc.
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(), // email address
  token: text('token').notNull(),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  compositePrimary: unique().on(table.identifier, table.token),
  tokenIndex: index('idx_verification_tokens_token').on(table.token),
  expiresIndex: index('idx_verification_tokens_expires').on(table.expires),
}));

// User-Venue linking table - for venue staff management
export const userVenues = pgTable('user_venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  venueId: uuid('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('manager'), // 'manager' | 'staff'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueUserVenue: unique().on(table.userId, table.venueId),
  userIndex: index('idx_user_venues_user_id').on(table.userId),
  venueIndex: index('idx_user_venues_venue_id').on(table.venueId),
}));

// ============================================================================
// CORE TABLES
// ============================================================================

// Venues (Theater locations)
export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  address: text('address'),
  description: text('description'),
  defaultSeatMapId: uuid('default_seat_map_id'), // Will reference seat_maps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Seat Maps (CMS-friendly layout storage)
export const seatMaps = pgTable('seat_maps', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  layoutConfig: jsonb('layout_config').notNull(), // Complete seat map configuration
  totalCapacity: integer('total_capacity').notNull().default(0),
  svgViewbox: text('svg_viewbox').default('0 0 1200 800'), // SVG viewport for rendering
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Shows (Events with seat maps)
export const shows = pgTable('shows', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id').notNull().references(() => venues.id, { onDelete: 'cascade' }),
  seatMapId: uuid('seat_map_id').notNull().references(() => seatMaps.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  description: text('description'),
  date: date('date').notNull(),
  time: time('time').notNull(),
  durationMinutes: integer('duration_minutes').default(120),
  imageUrl: text('image_url'),
  pricingConfig: jsonb('pricing_config').default({}), // Base prices, discounts, etc.
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Sections (Pricing zones within seat maps)
export const sections = pgTable('sections', {
  id: uuid('id').primaryKey().defaultRandom(),
  seatMapId: uuid('seat_map_id').notNull().references(() => seatMaps.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // "Premium Orchestra", "Balcony", etc.
  displayName: text('display_name'), // For public display
  colorHex: text('color_hex').default('#3B82F6'), // Section color for UI
  basePricePence: integer('base_price_pence').notNull(), // Price in pence (e.g., 5000 = £50.00)
  seatPattern: jsonb('seat_pattern').notNull().default({}), // Row/seat layout config
  positionConfig: jsonb('position_config').default({}), // SVG positioning data
  isAccessible: boolean('is_accessible').default(false), // Wheelchair accessible
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueName: unique().on(table.seatMapId, table.name),
}));

// Individual Seats (Bookable units)
export const seats = pgTable('seats', {
  id: uuid('id').primaryKey().defaultRandom(),
  showId: uuid('show_id').notNull().references(() => shows.id, { onDelete: 'cascade' }),
  sectionId: uuid('section_id').notNull().references(() => sections.id, { onDelete: 'cascade' }),
  rowLetter: text('row_letter').notNull(), // "A", "B", "C", etc.
  seatNumber: integer('seat_number').notNull(), // 1, 2, 3, etc.
  pricePence: integer('price_pence').notNull(), // Can override section base price
  status: seatStatusEnum('status').default('available').notNull(),
  position: jsonb('position').default({}), // SVG coordinates {"x": 100, "y": 200}
  isAccessible: boolean('is_accessible').default(false),
  notes: text('notes'), // Special requirements, blocked reason, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueSeat: unique().on(table.showId, table.sectionId, table.rowLetter, table.seatNumber),
  showStatus: index('idx_seats_show_status').on(table.showId, table.status),
  sectionSeats: index('idx_seats_section').on(table.sectionId, table.rowLetter, table.seatNumber),
}));

// Reservations (15-minute seat holds during checkout)
export const reservations = pgTable('reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  seatId: uuid('seat_id').notNull().references(() => seats.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull(), // Browser session identifier
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  stripeCheckoutSessionId: text('stripe_checkout_session_id'), // Link to Stripe session
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueSeat: unique().on(table.seatId), // One reservation per seat
  expiration: index('idx_reservations_expires').on(table.expiresAt),
  session: index('idx_reservations_session').on(table.sessionToken),
}));

// Bookings (Customer orders)
export const bookings = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  showId: uuid('show_id').notNull().references(() => shows.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }), // Link to authenticated user (optional for guest bookings)
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone'),
  status: bookingStatusEnum('status').default('pending').notNull(),
  totalAmountPence: integer('total_amount_pence').notNull(),
  validationCode: text('validation_code').notNull().unique(), // 8-char code for entry
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeCheckoutSessionId: text('stripe_checkout_session_id'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Booking Seats (Many-to-many: bookings ↔ seats)
export const bookingSeats = pgTable('booking_seats', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  seatId: uuid('seat_id').notNull().references(() => seats.id, { onDelete: 'cascade' }),
  pricePaidPence: integer('price_paid_pence').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueBookingSeat: unique().on(table.bookingId, table.seatId),
  uniqueSeat: unique().on(table.seatId), // One booking per seat
}));

// Hardcoded Seat Mappings (Maps hardcoded seat IDs to real database UUIDs)
export const hardcodedSeatMappings = pgTable('hardcoded_seat_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  showId: uuid('show_id').notNull().references(() => shows.id, { onDelete: 'cascade' }),
  hardcodedSeatId: text('hardcoded_seat_id').notNull(), // e.g., "back-1-14"
  realSeatId: uuid('real_seat_id').notNull().references(() => seats.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  uniqueMapping: unique().on(table.showId, table.hardcodedSeatId),
  showHardcodedId: index('idx_mappings_show_hardcoded').on(table.showId, table.hardcodedSeatId),
}));

// ============================================================================
// RELATIONS
// ============================================================================

export const venuesRelations = relations(venues, ({ many, one }) => ({
  shows: many(shows),
  userVenues: many(userVenues), // Staff who can manage this venue
  defaultSeatMap: one(seatMaps, {
    fields: [venues.defaultSeatMapId],
    references: [seatMaps.id],
  }),
}));

export const seatMapsRelations = relations(seatMaps, ({ many }) => ({
  sections: many(sections),
  shows: many(shows),
}));

export const showsRelations = relations(shows, ({ one, many }) => ({
  venue: one(venues, {
    fields: [shows.venueId],
    references: [venues.id],
  }),
  seatMap: one(seatMaps, {
    fields: [shows.seatMapId],
    references: [seatMaps.id],
  }),
  seats: many(seats),
  bookings: many(bookings),
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  seatMap: one(seatMaps, {
    fields: [sections.seatMapId],
    references: [seatMaps.id],
  }),
  seats: many(seats),
}));

export const seatsRelations = relations(seats, ({ one, many }) => ({
  show: one(shows, {
    fields: [seats.showId],
    references: [shows.id],
  }),
  section: one(sections, {
    fields: [seats.sectionId],
    references: [sections.id],
  }),
  reservation: one(reservations),
  bookingSeats: many(bookingSeats),
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  seat: one(seats, {
    fields: [reservations.seatId],
    references: [seats.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  show: one(shows, {
    fields: [bookings.showId],
    references: [shows.id],
  }),
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  bookingSeats: many(bookingSeats),
}));

export const bookingSeatsRelations = relations(bookingSeats, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingSeats.bookingId],
    references: [bookings.id],
  }),
  seat: one(seats, {
    fields: [bookingSeats.seatId],
    references: [seats.id],
  }),
}));

// ============================================================================
// AUTH RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  bookings: many(bookings),
  userVenues: many(userVenues), // Venues this user can manage
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const userVenuesRelations = relations(userVenues, ({ one }) => ({
  user: one(users, {
    fields: [userVenues.userId],
    references: [users.id],
  }),
  venue: one(venues, {
    fields: [userVenues.venueId],
    references: [venues.id],
  }),
}));

// ============================================================================
// GUEST SESSION TABLES
// ============================================================================

// Guest sessions tracking for temporary users
export const guestSessions = pgTable('guest_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionToken: text('session_token').notNull().unique(),
  email: text('email').notNull(),
  deviceInfo: jsonb('device_info'), // device type, OS, app version
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  convertedAt: timestamp('converted_at', { withTimezone: true }), // when became registered user
  convertedUserId: uuid('converted_user_id').references(() => users.id, { onDelete: 'set null' }),
}, (table) => ({
  sessionTokenIndex: index('idx_guest_sessions_token').on(table.sessionToken),
  emailIndex: index('idx_guest_sessions_email').on(table.email),
  expiresIndex: index('idx_guest_sessions_expires').on(table.expiresAt),
}));

export const guestSessionsRelations = relations(guestSessions, ({ one }) => ({
  convertedUser: one(users, {
    fields: [guestSessions.convertedUserId],
    references: [users.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;

export type SeatMap = typeof seatMaps.$inferSelect;
export type NewSeatMap = typeof seatMaps.$inferInsert;

export type Show = typeof shows.$inferSelect;
export type NewShow = typeof shows.$inferInsert;

export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;

export type Seat = typeof seats.$inferSelect;
export type NewSeat = typeof seats.$inferInsert;
export type SeatStatus = typeof seats.status.enumValues[number];

export type GuestSession = typeof guestSessions.$inferSelect;
export type NewGuestSession = typeof guestSessions.$inferInsert;

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingStatus = typeof bookings.status.enumValues[number];

export type BookingSeat = typeof bookingSeats.$inferSelect;
export type NewBookingSeat = typeof bookingSeats.$inferInsert; 

export type HardcodedSeatMapping = typeof hardcodedSeatMappings.$inferSelect;
export type NewHardcodedSeatMapping = typeof hardcodedSeatMappings.$inferInsert;

// Auth types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;

export type UserVenue = typeof userVenues.$inferSelect;
export type NewUserVenue = typeof userVenues.$inferInsert;

export type AuthProvider = typeof accounts.provider.enumValues[number];
export type UserRole = typeof users.role.enumValues[number]; 