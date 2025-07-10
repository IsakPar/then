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

// ============================================================================
// RELATIONS
// ============================================================================

export const venuesRelations = relations(venues, ({ many, one }) => ({
  shows: many(shows),
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

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
export type BookingStatus = typeof bookings.status.enumValues[number];

export type BookingSeat = typeof bookingSeats.$inferSelect;
export type NewBookingSeat = typeof bookingSeats.$inferInsert; 