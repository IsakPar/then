// 🏆 ENTERPRISE FINANCIAL INTEGRITY SCHEMA
// World-class booking system with zero tolerance for financial errors

import { pgTable, uuid, text, timestamp, integer, boolean, jsonb, index, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================================
// ENUMS FOR TRANSACTION STATES
// ============================================================================

export const seatHoldStatusEnum = pgEnum('seat_hold_status', [
  'active',      // Currently held (15 min timer)
  'expired',     // Timer expired, seats released
  'converted',   // Successfully converted to booking
  'cancelled'    // Manually cancelled
])

export const auditActionEnum = pgEnum('audit_action', [
  'CREATE', 'UPDATE', 'DELETE', 'HOLD', 'RELEASE', 'BOOK', 'CANCEL', 'REFUND'
])

export const transactionStateEnum = pgEnum('transaction_state', [
  'initiated',   // Transaction started
  'processing',  // Payment in progress
  'completed',   // Successfully completed
  'failed',      // Payment failed
  'refunded',    // Money returned
  'disputed'     // Under investigation
])

// ============================================================================
// SEAT HOLDS - 15 MINUTE RESERVATION SYSTEM
// ============================================================================

export const seatHolds = pgTable('seat_holds', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull(), // User session or payment intent ID
  seatId: uuid('seat_id').notNull(), // Reference to seats table
  userId: text('user_id'), // Optional - for logged in users
  userEmail: text('user_email'), // For guest bookings
  status: seatHoldStatusEnum('status').default('active').notNull(),
  heldAt: timestamp('held_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // heldAt + 15 minutes
  releasedAt: timestamp('released_at', { withTimezone: true }),
  convertedToBookingId: uuid('converted_to_booking_id'), // Links to successful booking
  idempotencyKey: text('idempotency_key').unique(), // Prevent duplicate holds
  metadata: jsonb('metadata').default({}), // Payment intent data, etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIndex: index('idx_seat_holds_session').on(table.sessionId),
  seatIndex: index('idx_seat_holds_seat').on(table.seatId),
  statusIndex: index('idx_seat_holds_status').on(table.status),
  expiresIndex: index('idx_seat_holds_expires').on(table.expiresAt),
  idempotencyIndex: index('idx_seat_holds_idempotency').on(table.idempotencyKey),
}))

// ============================================================================
// BOOKING TRANSACTIONS - COMPLETE AUDIT TRAIL
// ============================================================================

export const bookingTransactions = pgTable('booking_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  bookingId: uuid('booking_id').notNull(), // Reference to main booking
  transactionType: text('transaction_type').notNull(), // 'payment', 'refund', 'adjustment'
  state: transactionStateEnum('state').default('initiated').notNull(),
  amountPence: integer('amount_pence').notNull(),
  currency: text('currency').default('GBP').notNull(),
  paymentProvider: text('payment_provider'), // 'stripe', 'paypal', etc.
  paymentIntentId: text('payment_intent_id').unique(),
  paymentMethodId: text('payment_method_id'),
  idempotencyKey: text('idempotency_key').unique().notNull(), // Prevent duplicate transactions
  failureReason: text('failure_reason'),
  providerResponse: jsonb('provider_response').default({}),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  refundedAt: timestamp('refunded_at', { withTimezone: true }),
  disputedAt: timestamp('disputed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  bookingIndex: index('idx_booking_transactions_booking').on(table.bookingId),
  stateIndex: index('idx_booking_transactions_state').on(table.state),
  paymentIntentIndex: index('idx_booking_transactions_payment_intent').on(table.paymentIntentId),
  idempotencyIndex: index('idx_booking_transactions_idempotency').on(table.idempotencyKey),
  providerIndex: index('idx_booking_transactions_provider').on(table.paymentProvider),
}))

// ============================================================================
// AUDIT LOG - IMMUTABLE RECORD OF ALL CHANGES
// ============================================================================

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  tableName: text('table_name').notNull(), // 'seats', 'bookings', 'seat_holds', etc.
  recordId: text('record_id').notNull(), // ID of the record that changed
  action: auditActionEnum('action').notNull(),
  userId: text('user_id'), // Who made the change
  userEmail: text('user_email'),
  sessionId: text('session_id'),
  oldValues: jsonb('old_values').default({}), // Before state
  newValues: jsonb('new_values').default({}), // After state
  changedFields: text('changed_fields').array(), // List of fields that changed
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').default({}), // Context data
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tableRecordIndex: index('idx_audit_log_table_record').on(table.tableName, table.recordId),
  userIndex: index('idx_audit_log_user').on(table.userId),
  actionIndex: index('idx_audit_log_action').on(table.action),
  timestampIndex: index('idx_audit_log_timestamp').on(table.timestamp),
  sessionIndex: index('idx_audit_log_session').on(table.sessionId),
}))

// ============================================================================
// REVENUE TRACKING - REAL-TIME FINANCIAL METRICS
// ============================================================================

export const revenueTracking = pgTable('revenue_tracking', {
  id: uuid('id').primaryKey().defaultRandom(),
  showId: uuid('show_id').notNull(),
  venueId: uuid('venue_id').notNull(),
  bookingId: uuid('booking_id').notNull(),
  transactionId: uuid('transaction_id').notNull(),
  grossAmountPence: integer('gross_amount_pence').notNull(), // Before fees
  netAmountPence: integer('net_amount_pence').notNull(), // After fees
  platformFeePence: integer('platform_fee_pence').default(0),
  venueFeePence: integer('venue_fee_pence').default(0),
  paymentProcessingFeePence: integer('payment_processing_fee_pence').default(0),
  seatsBooked: integer('seats_booked').notNull(),
  bookingDate: timestamp('booking_date', { withTimezone: true }).notNull(),
  showDate: timestamp('show_date', { withTimezone: true }).notNull(),
  isRefunded: boolean('is_refunded').default(false),
  refundAmountPence: integer('refund_amount_pence').default(0),
  refundedAt: timestamp('refunded_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  showIndex: index('idx_revenue_tracking_show').on(table.showId),
  venueIndex: index('idx_revenue_tracking_venue').on(table.venueId),
  bookingDateIndex: index('idx_revenue_tracking_booking_date').on(table.bookingDate),
  showDateIndex: index('idx_revenue_tracking_show_date').on(table.showDate),
  refundIndex: index('idx_revenue_tracking_refund').on(table.isRefunded),
}))

// ============================================================================
// SEAT LOCK REGISTRY - PREVENT RACE CONDITIONS
// ============================================================================

export const seatLocks = pgTable('seat_locks', {
  id: uuid('id').primaryKey().defaultRandom(),
  seatId: uuid('seat_id').notNull().unique(), // One lock per seat
  sessionId: text('session_id').notNull(),
  operation: text('operation').notNull(), // 'hold', 'book', 'release'
  lockedAt: timestamp('locked_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // Auto-release after 30 seconds
  processId: text('process_id'), // For debugging deadlocks
  metadata: jsonb('metadata').default({}),
}, (table) => ({
  seatIndex: index('idx_seat_locks_seat').on(table.seatId),
  sessionIndex: index('idx_seat_locks_session').on(table.sessionId),
  expiresIndex: index('idx_seat_locks_expires').on(table.expiresAt),
}))

// ============================================================================
// RELATIONS
// ============================================================================

export const seatHoldsRelations = relations(seatHolds, ({ one }) => ({
  // Will link to seats table when integrated
}))

export const bookingTransactionsRelations = relations(bookingTransactions, ({ one }) => ({
  // Will link to bookings table when integrated
}))

export const revenueTrackingRelations = relations(revenueTracking, ({ one }) => ({
  // Will link to shows, venues, bookings when integrated
}))

// ============================================================================
// HELPER FUNCTIONS FOR FINANCIAL INTEGRITY
// ============================================================================

// Generate idempotency key
export function generateIdempotencyKey(operation: string, entityId: string, timestamp?: Date): string {
  const time = timestamp || new Date()
  return `${operation}_${entityId}_${time.getTime()}`
}

// Calculate seat hold expiration (15 minutes from now)
export function calculateHoldExpiration(): Date {
  return new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
}

// Calculate lock expiration (30 seconds from now)
export function calculateLockExpiration(): Date {
  return new Date(Date.now() + 30 * 1000) // 30 seconds
} 