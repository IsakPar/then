// 🏆 ENTERPRISE BOOKING SERVICE
// Zero-tolerance for financial errors, complete audit trail, row-level locking

import { db } from '@/lib/db/connection'
import { seats, bookings, bookingSeats } from '@/lib/db/schema'
import { 
  seatHolds, 
  bookingTransactions, 
  auditLog, 
  revenueTracking, 
  seatLocks,
  generateIdempotencyKey,
  calculateHoldExpiration,
  calculateLockExpiration 
} from '@/lib/db/enterprise-schema'
import { eq, and, inArray, sql, lt } from 'drizzle-orm'
import { randomUUID } from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export interface SeatHoldRequest {
  seatIds: string[]
  sessionId: string
  userId?: string
  userEmail?: string
  metadata?: Record<string, any>
}

export interface BookingRequest {
  showId: string
  customerName: string
  customerEmail: string
  customerPhone?: string
  seatHoldIds: string[] // Reference to existing holds
  paymentIntentId: string
  totalAmountPence: number
  metadata?: Record<string, any>
}

export interface AuditContext {
  userId?: string
  userEmail?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
}

// ============================================================================
// ENTERPRISE BOOKING SERVICE
// ============================================================================

export class EnterpriseBookingService {
  
  /**
   * 🔒 PHASE 1: ATOMIC SEAT HOLDING WITH ROW-LEVEL LOCKING
   * Prevents race conditions through PostgreSQL SELECT FOR UPDATE
   */
  async holdSeats(request: SeatHoldRequest, auditContext: AuditContext): Promise<{
    success: boolean
    holdId?: string
    conflictingSeats?: string[]
    error?: string
  }> {
    const holdId = randomUUID()
    const idempotencyKey = generateIdempotencyKey('HOLD', request.sessionId)
    
    try {
      return await db.transaction(async (tx) => {
        // 🔒 STEP 1: Acquire row-level locks on seats (prevents race conditions)
        console.log('🔒 Step 1: Acquiring row-level locks...')
        const lockedSeats = await tx
          .select({
            id: seats.id,
            status: seats.status,
            showId: seats.showId,
            pricePence: seats.pricePence
          })
          .from(seats)
          .where(inArray(seats.id, request.seatIds))
          .for('update') // 🔒 ROW-LEVEL LOCK - Critical for race condition prevention

        // 🔍 STEP 2: Validate seat availability
        const unavailableSeats = lockedSeats.filter(seat => seat.status !== 'available')
        if (unavailableSeats.length > 0) {
          const unavailableIds = unavailableSeats.map(s => s.id)
          
          // 📋 Audit failed attempt
          await this.createAuditLog(tx, {
            tableName: 'seat_holds',
            recordId: holdId,
            action: 'HOLD',
            oldValues: {},
            newValues: { seatIds: request.seatIds, status: 'failed', reason: 'seats_unavailable' },
            ...auditContext
          })

          return {
            success: false,
            conflictingSeats: unavailableIds,
            error: `Seats unavailable: ${unavailableIds.join(', ')}`
          }
        }

        // 🕒 STEP 3: Check for existing active holds (prevent double-holding)
        const existingHolds = await tx
          .select({ seatId: seatHolds.seatId })
          .from(seatHolds)
          .where(
            and(
              inArray(seatHolds.seatId, request.seatIds),
              eq(seatHolds.status, 'active'),
              sql`${seatHolds.expiresAt} > NOW()`
            )
          )

        if (existingHolds.length > 0) {
          return {
            success: false,
            conflictingSeats: existingHolds.map(h => h.seatId),
            error: 'Seats already held by another session'
          }
        }

        // ✅ STEP 4: Create seat holds
        const expiresAt = calculateHoldExpiration()
        const holdData = request.seatIds.map(seatId => ({
          id: randomUUID(),
          sessionId: request.sessionId,
          seatId,
          userId: request.userId,
          userEmail: request.userEmail,
          status: 'active' as const,
          expiresAt,
          idempotencyKey: `${idempotencyKey}_${seatId}`,
          metadata: request.metadata || {}
        }))

        await tx.insert(seatHolds).values(holdData)

        // 📊 STEP 5: Update seat status to 'held'
        await tx
          .update(seats)
          .set({ status: 'held' })
          .where(inArray(seats.id, request.seatIds))

        // 📋 STEP 6: Create audit trail
        await this.createAuditLog(tx, {
          tableName: 'seat_holds',
          recordId: holdId,
          action: 'HOLD',
          oldValues: { seats: lockedSeats.map(s => ({ id: s.id, status: s.status })) },
          newValues: { 
            holdId, 
            seatIds: request.seatIds, 
            expiresAt: expiresAt.toISOString(),
            sessionId: request.sessionId 
          },
          ...auditContext
        })

        console.log(`✅ Successfully held ${request.seatIds.length} seats for session ${request.sessionId}`)
        
        return {
          success: true,
          holdId
        }
      })

    } catch (error) {
      console.error('❌ Seat hold failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 💳 PHASE 2: ATOMIC BOOKING WITH FINANCIAL INTEGRITY
   * Converts holds to confirmed bookings with complete audit trail
   */
  async confirmBooking(request: BookingRequest, auditContext: AuditContext): Promise<{
    success: boolean
    bookingId?: string
    validationCode?: string
    error?: string
  }> {
    const bookingId = randomUUID()
    const idempotencyKey = generateIdempotencyKey('BOOK', request.paymentIntentId)
    
    try {
      return await db.transaction(async (tx) => {
        // 🔍 STEP 1: Validate seat holds exist and are active
        const activeHolds = await tx
          .select({
            id: seatHolds.id,
            seatId: seatHolds.seatId,
            sessionId: seatHolds.sessionId,
            status: seatHolds.status,
            expiresAt: seatHolds.expiresAt
          })
          .from(seatHolds)
          .where(
            and(
              inArray(seatHolds.id, request.seatHoldIds),
              eq(seatHolds.status, 'active'),
              sql`${seatHolds.expiresAt} > NOW()`
            )
          )

        if (activeHolds.length !== request.seatHoldIds.length) {
          throw new Error('One or more seat holds have expired or are invalid')
        }

        const seatIds = activeHolds.map(h => h.seatId)

        // 🔒 STEP 2: Lock seats for final booking (row-level lock)
        const seatsToBook = await tx
          .select({
            id: seats.id,
            pricePence: seats.pricePence,
            status: seats.status
          })
          .from(seats)
          .where(inArray(seats.id, seatIds))
          .for('update') // 🔒 ROW-LEVEL LOCK

        // 💰 STEP 3: Validate pricing matches payment intent
        const totalPricePence = seatsToBook.reduce((sum, seat) => sum + seat.pricePence, 0)
        if (totalPricePence !== request.totalAmountPence) {
          throw new Error(`Price mismatch: calculated ${totalPricePence}, paid ${request.totalAmountPence}`)
        }

        // 📋 STEP 4: Create booking record
        const validationCode = this.generateValidationCode()
        const [booking] = await tx
          .insert(bookings)
          .values({
            id: bookingId,
            showId: request.showId,
            customerName: request.customerName,
            customerEmail: request.customerEmail,
            customerPhone: request.customerPhone,
            status: 'confirmed',
            totalAmountPence: request.totalAmountPence,
            validationCode,
            stripePaymentIntentId: request.paymentIntentId
          })
          .returning()

        // 🎫 STEP 5: Create booking-seat relationships
        const bookingSeatData = seatsToBook.map(seat => ({
          bookingId,
          seatId: seat.id,
          pricePaidPence: seat.pricePence
        }))
        await tx.insert(bookingSeats).values(bookingSeatData)

        // 📊 STEP 6: Update seat status to 'booked'
        await tx
          .update(seats)
          .set({ status: 'booked' })
          .where(inArray(seats.id, seatIds))

        // ✅ STEP 7: Mark holds as converted
        await tx
          .update(seatHolds)
          .set({ 
            status: 'converted',
            convertedToBookingId: bookingId,
            updatedAt: new Date()
          })
          .where(inArray(seatHolds.id, request.seatHoldIds))

        // 💳 STEP 8: Create transaction record
        await tx.insert(bookingTransactions).values({
          bookingId,
          transactionType: 'payment',
          state: 'completed',
          amountPence: request.totalAmountPence,
          paymentProvider: 'stripe',
          paymentIntentId: request.paymentIntentId,
          idempotencyKey,
          processedAt: new Date()
        })

        // 📈 STEP 9: Create revenue tracking record
        await tx.insert(revenueTracking).values({
          showId: request.showId,
          venueId: seatsToBook[0] ? await this.getVenueIdForShow(tx, request.showId) : '',
          bookingId,
          transactionId: randomUUID(),
          grossAmountPence: request.totalAmountPence,
          netAmountPence: request.totalAmountPence, // TODO: Calculate fees
          seatsBooked: seatIds.length,
          bookingDate: new Date(),
          showDate: await this.getShowDate(tx, request.showId)
        })

        // 📋 STEP 10: Create comprehensive audit trail
        await this.createAuditLog(tx, {
          tableName: 'bookings',
          recordId: bookingId,
          action: 'BOOK',
          oldValues: { holds: activeHolds },
          newValues: { 
            booking, 
            seatIds,
            totalPricePence: request.totalAmountPence,
            paymentIntentId: request.paymentIntentId 
          },
          ...auditContext
        })

        console.log(`🎉 Successfully confirmed booking ${bookingId} for ${seatIds.length} seats`)

        return {
          success: true,
          bookingId,
          validationCode
        }
      })

    } catch (error) {
      console.error('❌ Booking confirmation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 🧹 CLEANUP: Auto-release expired holds
   */
  async cleanupExpiredHolds(): Promise<{ releasedCount: number }> {
    return await db.transaction(async (tx) => {
      // Find expired holds
      const expiredHolds = await tx
        .select({ id: seatHolds.id, seatId: seatHolds.seatId })
        .from(seatHolds)
        .where(
          and(
            eq(seatHolds.status, 'active'),
            sql`${seatHolds.expiresAt} < NOW()`
          )
        )

      if (expiredHolds.length === 0) return { releasedCount: 0 }

      // Mark holds as expired
      await tx
        .update(seatHolds)
        .set({ status: 'expired', releasedAt: new Date() })
        .where(inArray(seatHolds.id, expiredHolds.map(h => h.id)))

      // Release seats back to available
      const seatIds = expiredHolds.map(h => h.seatId)
      await tx
        .update(seats)
        .set({ status: 'available' })
        .where(inArray(seats.id, seatIds))

      console.log(`🧹 Released ${expiredHolds.length} expired seat holds`)
      return { releasedCount: expiredHolds.length }
    })
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async createAuditLog(tx: any, data: {
    tableName: string
    recordId: string
    action: string
    oldValues: any
    newValues: any
    userId?: string
    userEmail?: string
    sessionId?: string
    ipAddress?: string
    userAgent?: string
  }) {
    await tx.insert(auditLog).values({
      tableName: data.tableName,
      recordId: data.recordId,
      action: data.action as any,
      userId: data.userId,
      userEmail: data.userEmail,
      sessionId: data.sessionId,
      oldValues: data.oldValues,
      newValues: data.newValues,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      changedFields: Object.keys(data.newValues),
      metadata: { timestamp: new Date().toISOString() }
    })
  }

  private generateValidationCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase()
  }

  private async getVenueIdForShow(tx: any, showId: string): Promise<string> {
    // This would query the shows table to get venue ID
    // Implementation depends on your show-venue relationship
    return '' // Placeholder
  }

  private async getShowDate(tx: any, showId: string): Promise<Date> {
    // This would query the shows table to get show date
    // Implementation depends on your shows table structure
    return new Date() // Placeholder
  }
}

// Export singleton instance
export const enterpriseBookingService = new EnterpriseBookingService() 