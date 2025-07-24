import { eq, desc, asc, and, inArray, count, sql, lt } from 'drizzle-orm';
import { db } from './connection';
import {
  shows,
  venues,
  seats,
  sections,
  seatMaps,
  reservations,
  bookings,
  bookingSeats,
  hardcodedSeatMappings,
  type SeatStatus,
  type NewReservation,
  type NewBooking,
  type NewSeat,
} from './schema';

// ============================================================================
// SECURITY VALIDATION UTILITIES - TODO [Phase 1]: XSS prevention and input sanitization
// ============================================================================

/**
 * Validate and sanitize UUID parameters to prevent injection attacks
 */
export function validateUUID(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new Error(`Invalid UUID format: ${id}`);
  }
  return id;
}

/**
 * Sanitize text input to prevent XSS attacks
 */
export function sanitizeText(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  
  // Remove HTML tags and encode special characters
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 1000); // Limit length to prevent DoS
}

/**
 * Validate email format with additional security checks
 */
export function validateEmail(email: string): string {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const sanitized = sanitizeText(email);
  
  if (!sanitized || !emailRegex.test(sanitized) || sanitized.length > 254) {
    throw new Error('Invalid email format');
  }
  
  return sanitized.toLowerCase();
}

/**
 * Validate seat coordinate ranges to prevent coordinate injection
 */
export function validateSeatCoordinates(x: number, y: number): { x: number; y: number } {
  if (typeof x !== 'number' || typeof y !== 'number') {
    throw new Error('Seat coordinates must be numbers');
  }
  
  if (!isFinite(x) || !isFinite(y)) {
    throw new Error('Seat coordinates must be finite numbers');
  }
  
  // Reasonable coordinate bounds for seat maps (0-10000 range)
  if (x < 0 || x > 10000 || y < 0 || y > 10000) {
    throw new Error('Seat coordinates out of valid range (0-10000)');
  }
  
  return { x: Math.round(x), y: Math.round(y) };
}

/**
 * Validate and sanitize venue/show names
 */
export function validateName(name: string | null | undefined, fieldName: string = 'name'): string {
  const sanitized = sanitizeText(name);
  
  if (!sanitized || sanitized.length < 1) {
    throw new Error(`${fieldName} is required`);
  }
  
  if (sanitized.length > 200) {
    throw new Error(`${fieldName} must be less than 200 characters`);
  }
  
  return sanitized;
}

/**
 * Rate limiting check for database operations
 */
const operationCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxOperations: number = 100, windowMs: number = 60000): void {
  const now = Date.now();
  const key = `${identifier}`;
  const current = operationCounts.get(key);
  
  if (!current || now > current.resetTime) {
    operationCounts.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }
  
  if (current.count >= maxOperations) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  current.count++;
}

// ============================================================================
// SHOW QUERIES
// ============================================================================

/**
 * Get all active shows
 */
export async function getActiveShows() {
  return await db
    .select({
      id: shows.id,
      title: shows.title,
      description: shows.description,
      date: shows.date,
      time: shows.time,
      imageUrl: shows.imageUrl,
      venueName: venues.name,
      venueAddress: venues.address,
      seatMapId: shows.seatMapId,
    })
    .from(shows)
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .where(
      and(
        eq(shows.isActive, true),
        sql`${shows.date} >= CURRENT_DATE`
      )
    )
    .orderBy(asc(shows.date), asc(shows.time))
    .limit(50);
}

/**
 * Get show by ID
 * TODO [Phase 1]: Added security validation for UUID parameter
 */
export async function getShowById(showId: string) {
  // Validate UUID format to prevent injection
  const validatedShowId = validateUUID(showId);
  
  const result = await db
    .select({
      id: shows.id,
      title: shows.title,
      description: shows.description,
      date: shows.date,
      time: shows.time,
      imageUrl: shows.imageUrl,
      venueName: venues.name,
      venueAddress: venues.address,
      seatMapId: shows.seatMapId,
    })
    .from(shows)
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .where(
      and(
        eq(shows.isActive, true),
        eq(shows.id, validatedShowId)
      )
    )
    .orderBy(asc(shows.date), asc(shows.time))
    .limit(1);

  return result[0] || null;
}

/**
 * Get show with seat availability summary
 */
export async function getShowWithAvailability(showId: string) {
  const showDetails = await getShowById(showId);
  if (!showDetails) return null;

  const seatStats = await db
    .select({
      sectionId: seats.sectionId,
      sectionName: sections.name,
      sectionColor: sections.colorHex,
      basePricePence: sections.basePricePence,
      totalSeats: count(seats.id),
      availableSeats: count(sql`CASE WHEN ${seats.status} = 'available' THEN 1 END`),
      bookedSeats: count(sql`CASE WHEN ${seats.status} = 'booked' THEN 1 END`),
      reservedSeats: count(sql`CASE WHEN ${seats.status} = 'reserved' THEN 1 END`),
    })
    .from(seats)
    .innerJoin(sections, eq(seats.sectionId, sections.id))
    .where(eq(seats.showId, showId))
    .groupBy(seats.sectionId, sections.name, sections.colorHex, sections.basePricePence)
    .orderBy(asc(sections.sortOrder));

  return {
    ...showDetails,
    seatStats,
  };
}

// ============================================================================
// SEAT QUERIES
// ============================================================================

/**
 * Get all seats for a show with section information
 */
export async function getShowSeats(showId: string) {
  return await db
    .select({
      id: seats.id,
      row_letter: seats.rowLetter,
      seat_number: seats.seatNumber,
      price_pence: seats.pricePence,
      status: seats.status,
      position: seats.position,
      is_accessible: seats.isAccessible,
      notes: seats.notes,
      section_id: sections.id,
      section_name: sections.name,
      display_name: sections.displayName,
      color_hex: sections.colorHex,
    })
    .from(seats)
    .innerJoin(sections, eq(seats.sectionId, sections.id))
    .where(eq(seats.showId, showId))
    .orderBy(asc(sections.sortOrder), asc(seats.rowLetter), asc(seats.seatNumber));
}

/**
 * Get available seats for a show
 */
export async function getAvailableSeats(showId: string) {
  return await db
    .select()
    .from(seats)
    .where(
      and(
        eq(seats.showId, showId),
        eq(seats.status, 'available')
      )
    )
    .orderBy(asc(seats.rowLetter), asc(seats.seatNumber));
}

/**
 * Update seat status for both regular operations and real-time WebSocket updates
 */
export async function updateSeatStatus(
  seatId: string, 
  status: SeatStatus | 'available' | 'reserved' | 'booked' | 'selected'
): Promise<void> {
  try {
    await db
      .update(seats)
      .set({ 
        status: status as SeatStatus,
        updatedAt: sql`NOW()`
      })
      .where(eq(seats.id, seatId));
      
    console.log(`✅ Updated seat ${seatId} status to ${status}`);
  } catch (error) {
    console.error(`❌ Failed to update seat ${seatId} status:`, error);
    throw error;
  }
}

/**
 * Update multiple seats status
 */
export async function updateSeatsStatus(seatIds: string[], status: SeatStatus) {
  return await db
    .update(seats)
    .set({ status, updatedAt: sql`NOW()` })
    .where(inArray(seats.id, seatIds))
    .returning();
}

/**
 * Get show UUID by slug pattern (e.g., "hamilton-victoria-palace" -> actual UUID)
 */
export async function getShowUUIDBySlug(slug: string): Promise<string | null> {
  console.log(`🔍 Looking up show UUID for slug: ${slug}`);
  
  // For hamilton-victoria-palace, search for Hamilton at Victoria Palace
  if (slug === "hamilton-victoria-palace") {
    const result = await db
      .select({ id: shows.id, title: shows.title, venueName: venues.name })
      .from(shows)
      .innerJoin(venues, eq(shows.venueId, venues.id))
      .where(
        and(
          eq(shows.isActive, true),
          sql`LOWER(${shows.title}) LIKE '%hamilton%'`,
          sql`LOWER(${venues.name}) LIKE '%victoria%palace%'`
        )
      )
      .limit(1);
    
    if (result[0]) {
      console.log(`✅ Found Hamilton show: ${result[0].title} at ${result[0].venueName} (UUID: ${result[0].id})`);
      return result[0].id;
    }
  }
  
  // Generic slug-to-show mapping for other shows
  const parts = slug.split('-');
  if (parts.length >= 2) {
    const showPattern = parts[0]; // e.g., "hamilton", "lionking"
    const venuePattern = parts.slice(1).join('%'); // e.g., "victoria%palace"
    
    const result = await db
      .select({ id: shows.id, title: shows.title, venueName: venues.name })
      .from(shows)
      .innerJoin(venues, eq(shows.venueId, venues.id))
      .where(
        and(
          eq(shows.isActive, true),
          sql`LOWER(${shows.title}) LIKE ${'%' + showPattern + '%'}`,
          sql`LOWER(${venues.name}) LIKE ${'%' + venuePattern + '%'}`
        )
      )
      .limit(1);
    
    if (result[0]) {
      console.log(`✅ Found show: ${result[0].title} at ${result[0].venueName} (UUID: ${result[0].id})`);
      return result[0].id;
    }
  }
  
  console.warn(`⚠️ No show found for slug: ${slug}`);
  return null;
}

/**
 * Convert hardcoded seat IDs to real database UUIDs
 * This function handles the mapping between hardcoded seat map IDs (like "back-1-14") 
 * and actual database UUIDs for the Hamilton demo show
 * 
 * Updated to handle show slugs and convert them to UUIDs first
 */
export async function convertHardcodedSeatIds(
  showIdOrSlug: string,
  hardcodedSeatIds: string[]
): Promise<string[]> {
  if (hardcodedSeatIds.length === 0) return [];

  console.log(`🔄 Converting ${hardcodedSeatIds.length} hardcoded seat IDs for show ${showIdOrSlug}`);
  console.log(`🎯 Hardcoded IDs:`, hardcodedSeatIds);

  // Step 1: Convert show slug to UUID if needed
  let showUUID: string;
  
  // Check if the input is already a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(showIdOrSlug)) {
    showUUID = showIdOrSlug;
    console.log(`✅ Input is already a UUID: ${showUUID}`);
  } else {
    // Convert slug to UUID
    const foundUUID = await getShowUUIDBySlug(showIdOrSlug);
    if (!foundUUID) {
      console.error(`❌ Could not find show UUID for slug: ${showIdOrSlug}`);
      return [];
    }
    showUUID = foundUUID;
    console.log(`🗺️ Converted slug "${showIdOrSlug}" to UUID: ${showUUID}`);
  }

  // Step 2: Query hardcoded seat mappings using the UUID
  const mappings = await db
    .select({
      hardcodedSeatId: hardcodedSeatMappings.hardcodedSeatId,
      realSeatId: hardcodedSeatMappings.realSeatId,
    })
    .from(hardcodedSeatMappings)
    .where(
      and(
        eq(hardcodedSeatMappings.showId, showUUID),
        inArray(hardcodedSeatMappings.hardcodedSeatId, hardcodedSeatIds)
      )
    );

  console.log(`✅ Found ${mappings.length} mappings out of ${hardcodedSeatIds.length} requested`);

  // Warn about unmapped seats
  const mappedHardcodedIds = mappings.map(m => m.hardcodedSeatId);
  const unmappedIds = hardcodedSeatIds.filter(id => !mappedHardcodedIds.includes(id));
  if (unmappedIds.length > 0) {
    console.warn(`⚠️ No mappings found for these hardcoded seat IDs:`, unmappedIds);
  }

  const realSeatIds = mappings.map(m => m.realSeatId);
  console.log(`🎫 Converted to real seat UUIDs:`, realSeatIds);

  return realSeatIds;
}

/**
 * Auto-create missing seat mappings for a show when hardcoded IDs can't be resolved
 * This function serves as a safety net to ensure iOS app always works
 */
export async function autoCreateMissingSeatMappings(
  showIdOrSlug: string,
  hardcodedSeatIds: string[]
): Promise<number> {
  console.log('🔧 Auto-creating missing seat mappings...');
  
  // Convert show slug to UUID if needed
  let showUUID: string;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(showIdOrSlug)) {
    showUUID = showIdOrSlug;
  } else {
    const foundUUID = await getShowUUIDBySlug(showIdOrSlug);
    if (!foundUUID) {
      console.error(`❌ Could not find show UUID for slug: ${showIdOrSlug}`);
      return 0;
    }
    showUUID = foundUUID;
  }

  // Get all available seats for this show
  const availableSeats = await db
    .select({
      seatId: seats.id,
      sectionName: sections.name,
      sectionDisplayName: sections.displayName,
      rowLetter: seats.rowLetter,
      seatNumber: seats.seatNumber,
    })
    .from(seats)
    .innerJoin(sections, eq(seats.sectionId, sections.id))
    .where(eq(seats.showId, showUUID))
    .orderBy(seats.rowLetter, seats.seatNumber);

  if (availableSeats.length === 0) {
    console.error('❌ No seats found for show');
    return 0;
  }

  console.log(`📊 Found ${availableSeats.length} seats available for mapping`);

  // Get already mapped seat IDs to avoid duplicates
  const existingMappings = await db
    .select({ realSeatId: hardcodedSeatMappings.realSeatId })
    .from(hardcodedSeatMappings)
    .where(eq(hardcodedSeatMappings.showId, showUUID));

  const mappedSeatIds = new Set(existingMappings.map(m => m.realSeatId));
  const unmappedSeats = availableSeats.filter(seat => !mappedSeatIds.has(seat.seatId));

  console.log(`🎯 ${unmappedSeats.length} seats available for new mappings`);

  // Helper function to get seats for a section type
  const getSeatsForSection = (sectionNames: string[], count: number) => {
    const sectionSeats = unmappedSeats.filter(seat => 
      sectionNames.some(name => 
        seat.sectionName.toLowerCase().includes(name.toLowerCase()) ||
        seat.sectionDisplayName?.toLowerCase().includes(name.toLowerCase())
      )
    );
    return sectionSeats.slice(0, count);
  };

  const mappingsToCreate: Array<{showId: string, hardcodedSeatId: string, realSeatId: string}> = [];
  
  // Smart mapping strategy based on iOS hardcoded ID patterns
  for (const hardcodedId of hardcodedSeatIds) {
    // Skip if mapping already exists
    const existingMapping = await db
      .select()
      .from(hardcodedSeatMappings)
      .where(
        and(
          eq(hardcodedSeatMappings.showId, showUUID),
          eq(hardcodedSeatMappings.hardcodedSeatId, hardcodedId)
        )
      )
      .limit(1);

    if (existingMapping.length > 0) {
      continue; // Skip already mapped seats
    }

    // Determine section type from hardcoded ID
    let sectionSeats: any[] = [];
    
    if (hardcodedId.startsWith('premium-')) {
      sectionSeats = getSeatsForSection(['premium', 'orchestra', 'stalls'], 1);
    } else if (hardcodedId.startsWith('middle-')) {
      sectionSeats = getSeatsForSection(['mezzanine', 'dress', 'circle', 'middle'], 1);
    } else if (hardcodedId.startsWith('back-')) {
      sectionSeats = getSeatsForSection(['grand', 'upper', 'balcony'], 1);
    } else if (hardcodedId.startsWith('sideA-')) {
      sectionSeats = getSeatsForSection(['left', 'side', 'box'], 1);
    } else if (hardcodedId.startsWith('sideB-')) {
      sectionSeats = getSeatsForSection(['right', 'side', 'box'], 1);
    } else {
      // Fallback: use any available seat
      sectionSeats = unmappedSeats.slice(0, 1);
    }

    if (sectionSeats.length > 0) {
      const seat = sectionSeats[0];
      mappingsToCreate.push({
        showId: showUUID,
        hardcodedSeatId: hardcodedId,
        realSeatId: seat.seatId
      });
      
      // Remove from available seats to avoid duplicate mapping
      const seatIndex = unmappedSeats.findIndex(s => s.seatId === seat.seatId);
      if (seatIndex !== -1) {
        unmappedSeats.splice(seatIndex, 1);
      }
    }
  }

  if (mappingsToCreate.length === 0) {
    console.log('ℹ️ No new mappings needed');
    return 0;
  }

  // Insert new mappings
  console.log(`💾 Creating ${mappingsToCreate.length} new seat mappings...`);
  
  try {
    await db.insert(hardcodedSeatMappings).values(mappingsToCreate);
    console.log(`✅ Successfully created ${mappingsToCreate.length} new seat mappings`);
    return mappingsToCreate.length;
  } catch (error) {
    console.error('❌ Failed to create seat mappings:', error);
    return 0;
  }
}

// ============================================================================
// RESERVATION QUERIES
// ============================================================================

/**
 * Create seat reservations for checkout
 */
export async function createReservations(
  seatIds: string[],
  sessionToken: string,
  expirationMinutes: number = 15,
  stripeSessionId?: string
) {
  const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
  
  return await db.transaction(async (tx) => {
    // 🔍 Check for existing reservations first
    const existingReservations = await tx
      .select({ seatId: reservations.seatId })
      .from(reservations)
      .where(inArray(reservations.seatId, seatIds));

    if (existingReservations.length > 0) {
      const conflictSeatIds = existingReservations.map(r => r.seatId);
      console.log('❌ Reservation conflict detected for seats:', conflictSeatIds);
      
      // Clean up expired reservations for these specific seats
      const now = new Date();
      const expiredForTheseSeats = await tx
        .delete(reservations)
        .where(
          and(
            inArray(reservations.seatId, conflictSeatIds),
            lt(reservations.expiresAt, now)
          )
        )
        .returning();

      if (expiredForTheseSeats.length > 0) {
        console.log(`🧹 Cleaned up ${expiredForTheseSeats.length} expired reservations`);
        
        // Update seats back to available
        const expiredSeatIds = expiredForTheseSeats.map(r => r.seatId);
        await tx
          .update(seats)
          .set({ status: 'available' })
          .where(inArray(seats.id, expiredSeatIds));
      }

      // Check again for still-active reservations
      const stillReserved = await tx
        .select({ seatId: reservations.seatId })
        .from(reservations)
        .where(inArray(reservations.seatId, seatIds));

      if (stillReserved.length > 0) {
        const unavailableSeats = stillReserved.map(r => r.seatId);
        throw new Error(`Seats still reserved by another user: ${unavailableSeats.join(', ')}`);
      }
    }

    // Update seats to reserved status (only available ones)
    const updatedSeats = await tx
      .update(seats)
      .set({ status: 'reserved' })
      .where(
        and(
          inArray(seats.id, seatIds),
          eq(seats.status, 'available')
        )
      )
      .returning();

    if (updatedSeats.length !== seatIds.length) {
      const updatedSeatIds = updatedSeats.map(s => s.id);
      const unavailableSeats = seatIds.filter(id => !updatedSeatIds.includes(id));
      throw new Error(`Some seats are no longer available: ${unavailableSeats.join(', ')}`);
    }

    // Create reservations
    const reservationData: NewReservation[] = seatIds.map(seatId => ({
      seatId,
      sessionToken,
      expiresAt,
      stripeCheckoutSessionId: stripeSessionId,
    }));

    return await tx
      .insert(reservations)
      .values(reservationData)
      .returning();
  });
}

/**
 * Get reservations by session token
 */
export async function getReservationsBySession(sessionToken: string) {
  return await db
    .select({
      reservation: reservations,
      seat: seats,
    })
    .from(reservations)
    .innerJoin(seats, eq(reservations.seatId, seats.id))
    .where(eq(reservations.sessionToken, sessionToken));
}

/**
 * Clean up expired reservations
 */
export async function cleanupExpiredReservations() {
  return await db.transaction(async (tx) => {
    // Get expired reservations
    const expiredReservations = await tx
      .select({ seatId: reservations.seatId })
      .from(reservations)
      .where(lt(reservations.expiresAt, sql`NOW()`));

    if (expiredReservations.length === 0) return { cleaned: 0 };

    const expiredSeatIds = expiredReservations.map(r => r.seatId);

    // Release seats back to available
    await tx
      .update(seats)
      .set({ status: 'available' })
      .where(inArray(seats.id, expiredSeatIds));

    // Delete expired reservations
    const deleted = await tx
      .delete(reservations)
      .where(lt(reservations.expiresAt, sql`NOW()`))
      .returning();

    return { cleaned: deleted.length };
  });
}

// ============================================================================
// BOOKING QUERIES
// ============================================================================

/**
 * Create a new booking with seats
 */
export async function createBooking(
  bookingData: Omit<NewBooking, 'id' | 'createdAt' | 'updatedAt'>,
  seatIds: string[]
) {
  return await db.transaction(async (tx) => {
    // Create booking (validation code will be auto-generated by trigger)
    const [booking] = await tx
      .insert(bookings)
      .values(bookingData)
      .returning();

    // Get seat details for pricing
    const seatDetails = await tx
      .select({
        id: seats.id,
        pricePence: seats.pricePence,
      })
      .from(seats)
      .where(inArray(seats.id, seatIds));

    // Create booking-seat relationships
    const bookingSeatData = seatDetails.map(seat => ({
      bookingId: booking.id,
      seatId: seat.id,
      pricePaidPence: seat.pricePence,
    }));

    await tx.insert(bookingSeats).values(bookingSeatData);

    // Update seats to booked status
    await tx
      .update(seats)
      .set({ status: 'booked' })
      .where(inArray(seats.id, seatIds));

    // Remove any reservations for these seats
    await tx
      .delete(reservations)
      .where(inArray(reservations.seatId, seatIds));

    return booking;
  });
}

/**
 * Get booking by validation code
 */
export async function getBookingByValidationCode(validationCode: string) {
  const result = await db
    .select({
      booking: bookings,
      show: shows,
      venue: venues,
    })
    .from(bookings)
    .innerJoin(shows, eq(bookings.showId, shows.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .where(eq(bookings.validationCode, validationCode))
    .limit(1);

  if (!result[0]) return null;

  // Get booked seats
  const bookedSeats = await db
    .select({
      seat: seats,
      section: sections,
      pricePaid: bookingSeats.pricePaidPence,
    })
    .from(bookingSeats)
    .innerJoin(seats, eq(bookingSeats.seatId, seats.id))
    .innerJoin(sections, eq(seats.sectionId, sections.id))
    .where(eq(bookingSeats.bookingId, result[0].booking.id));

  return {
    ...result[0],
    seats: bookedSeats,
  };
}

/**
 * Get customer's bookings
 */
export async function getCustomerBookings(customerEmail: string) {
  return await db
    .select({
      booking: bookings,
      show: shows,
      venue: venues,
      seatCount: count(bookingSeats.id),
    })
    .from(bookings)
    .innerJoin(shows, eq(bookings.showId, shows.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .leftJoin(bookingSeats, eq(bookings.id, bookingSeats.bookingId))
    .where(eq(bookings.customerEmail, customerEmail))
    .groupBy(bookings.id, shows.id, venues.id)
    .orderBy(desc(bookings.createdAt));
}

// ============================================================================
// ADMIN QUERIES
// ============================================================================

/**
 * Get show statistics for admin dashboard
 */
export async function getShowStatistics(showId: string) {
  const stats = await db
    .select({
      totalSeats: count(seats.id),
      availableSeats: count(sql`CASE WHEN ${seats.status} = 'available' THEN 1 END`),
      reservedSeats: count(sql`CASE WHEN ${seats.status} = 'reserved' THEN 1 END`),
      bookedSeats: count(sql`CASE WHEN ${seats.status} = 'booked' THEN 1 END`),
      blockedSeats: count(sql`CASE WHEN ${seats.status} = 'blocked' THEN 1 END`),
    })
    .from(seats)
    .where(eq(seats.showId, showId));

  return stats[0] || {
    totalSeats: 0,
    availableSeats: 0,
    reservedSeats: 0,
    bookedSeats: 0,
    blockedSeats: 0,
  };
}

/**
 * Get shows with pricing information
 */
export async function getShowWithPricing(showId?: string) {
  
  // Get all shows or specific show
  const baseQuery = db
    .select({
      id: shows.id,
      title: shows.title,
      description: shows.description,
      date: shows.date,
      time: shows.time,
      imageUrl: shows.imageUrl,
      venue_name: venues.name,
      address: venues.address,
      location: venues.address, // Alias for compatibility
      seatMapId: shows.seatMapId,
    })
    .from(shows)
    .innerJoin(venues, eq(shows.venueId, venues.id));

  // Build query conditionally based on parameters
  const showsWithVenue = showId 
    ? await baseQuery
        .where(and(eq(shows.isActive, true), eq(shows.id, showId)))
        .limit(1)
    : await baseQuery
        .where(and(
          eq(shows.isActive, true),
          sql`${shows.date} >= CURRENT_DATE`
        ))
        .orderBy(asc(shows.date), asc(shows.time))
        .limit(50);

  if (showsWithVenue.length === 0) {
    return [];
  }

  const result = [];
  
  for (const show of showsWithVenue) {
    // Get seat pricing data for this show
    const seatPricing = await db
      .select({
        section_id: sections.id,
        section_name: sections.name,
        color_code: sections.colorHex,
        price: sql<number>`${sections.basePricePence} / 100.0`,
        available_seats: sql<number>`COUNT(CASE WHEN ${seats.status} = 'available' THEN 1 END)`,
        total_seats: sql<number>`COUNT(${seats.id})`,
      })
      .from(sections)
      .innerJoin(seats, eq(seats.sectionId, sections.id))
      .where(and(
        eq(sections.seatMapId, show.seatMapId),
        eq(seats.showId, show.id)
      ))
      .groupBy(sections.id, sections.name, sections.colorHex, sections.basePricePence);

    // Ensure pricing data is returned as numbers
    const formattedSeatPricing = seatPricing.map(pricing => ({
      ...pricing,
      price: Number(pricing.price),
      available_seats: Number(pricing.available_seats),
      total_seats: Number(pricing.total_seats)
    }));

    // Get min/max prices
    const priceStats = await db
      .select({
        min_price: sql<number>`MIN(${sections.basePricePence}) / 100.0`,
        max_price: sql<number>`MAX(${sections.basePricePence}) / 100.0`,
      })
      .from(sections)
      .where(eq(sections.seatMapId, show.seatMapId));

    result.push({
      ...show,
      seat_pricing: formattedSeatPricing,
      min_price: Number(priceStats[0]?.min_price) || 0,
      max_price: Number(priceStats[0]?.max_price) || 0,
    });
  }

  return result;
}

/**
 * Reserve seats for a show (mimics the reserve_seats function)
 */
export async function reserveSeats(
  showId: string,
  sectionBookings: Array<{ section_id: string; quantity: string }>,
  sessionToken?: string
) {
  return await db.transaction(async (tx) => {
    const reservationId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    try {
      const bookingDetails = [];
      
      for (const booking of sectionBookings) {
        const quantity = parseInt(booking.quantity);
        
        // Get available seats in this section
        const availableSeats = await tx
          .select()
          .from(seats)
          .innerJoin(sections, eq(seats.sectionId, sections.id))
          .where(
            and(
              eq(seats.showId, showId),
              eq(sections.id, booking.section_id),
              eq(seats.status, 'available')
            )
          )
          .limit(quantity);

        if (availableSeats.length < quantity) {
          throw new Error(`Not enough available seats in section`);
        }

        // Reserve the seats
        const seatIds = availableSeats.map(seat => seat.seats.id);
        await tx
          .update(seats)
          .set({ status: 'reserved' })
          .where(inArray(seats.id, seatIds));

        // Create reservation records
        for (const seatId of seatIds) {
          await tx.insert(reservations).values({
            seatId,
            sessionToken: sessionToken || reservationId,
            expiresAt,
            stripeCheckoutSessionId: null,
          });
        }

        // Get section details for response
        const section = availableSeats[0].sections;
        bookingDetails.push({
          section_id: section.id,
          section_name: section.name,
          quantity,
          unit_price: section.basePricePence,
          total_price: section.basePricePence * quantity,
        });
      }

      return [
        {
          success: true,
          reservation_id: reservationId,
          expires_at: expiresAt.toISOString(),
          booking_details: bookingDetails,
        },
      ];
    } catch (error) {
      throw error;
    }
  });
}

/**
 * Confirm seat reservations (mimics the confirm_seat_reservations function)
 */
export async function confirmSeatReservations(
  reservationId: string,
  customerEmail: string,
  customerName: string,
  stripePaymentIntentId: string,
  userId?: string | null
) {
  console.log(`🎫 confirmSeatReservations called with:`, {
    reservationId,
    customerEmail,
    customerName,
    stripePaymentIntentId,
    userId
  });

  return await db.transaction(async (tx) => {
    try {
      console.log(`🎫 Step 1: Looking for reserved seats with sessionToken: ${reservationId}`);

      // Get reserved seats for this reservation
      const reservedSeats = await tx
        .select({
          seatId: reservations.seatId,
          seat: seats,
        })
        .from(reservations)
        .innerJoin(seats, eq(reservations.seatId, seats.id))
        .where(eq(reservations.sessionToken, reservationId));

      console.log(`🎫 Step 1 Result: Found ${reservedSeats.length} reserved seats:`, reservedSeats);

      if (reservedSeats.length === 0) {
        console.log(`❌ No reserved seats found for sessionToken: ${reservationId}`);
        return [{ success: false, message: 'No reserved seats found' }];
      }

      // Step 1.5: If no userId provided, try to find user by email
      let finalUserId = userId;
      if (!finalUserId && customerEmail) {
        console.log(`🎫 Step 1.5: Looking up user by email: ${customerEmail}`);
        try {
          const { users } = await import('./schema');
          const userResult = await tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, customerEmail))
            .limit(1);
          
          if (userResult.length > 0) {
            finalUserId = userResult[0].id;
            console.log(`🎫 Step 1.5 Result: Found user ${finalUserId} for email ${customerEmail}`);
          } else {
            console.log(`🎫 Step 1.5 Result: No user found for email ${customerEmail}, creating guest booking`);
          }
        } catch (userLookupError) {
          console.log(`🎫 Step 1.5 Error: Failed to lookup user, proceeding as guest:`, userLookupError);
        }
      }

      console.log(`🎫 Step 2: Creating booking for ${reservedSeats.length} seats`);

      // Create booking - let database auto-generate the ID
      const validationCode = Math.random().toString(36).substring(2, 15).toUpperCase();
      
      console.log(`🎫 Step 2: Generated validationCode: ${validationCode}`);

      const bookingData = {
        showId: reservedSeats[0].seat.showId,
        userId: finalUserId || null,
        customerEmail,
        customerName,
        validationCode,
        status: 'confirmed' as const,
        totalAmountPence: reservedSeats.reduce((sum, rs) => sum + rs.seat.pricePence, 0),
        stripePaymentIntentId,
        notes: null,
      };

      console.log(`🎫 Step 2: Creating booking with data:`, bookingData);

      const createdBooking = await tx.insert(bookings).values(bookingData).returning();
      console.log(`🎫 Step 2 Result: Booking created:`, createdBooking);

      if (!createdBooking || createdBooking.length === 0) {
        throw new Error('Failed to create booking - no booking returned');
      }

      const bookingId = createdBooking[0].id;
      console.log(`🎫 Step 2: Using bookingId: ${bookingId}`);

      console.log(`🎫 Step 3: Creating booking_seats records and updating seat status`);

      // Create booking_seats records and update seat status
      for (const { seatId, seat } of reservedSeats) {
        console.log(`🎫 Step 3a: Processing seat ${seatId}`);

        await tx.insert(bookingSeats).values({
          bookingId,
          seatId,
          pricePaidPence: seat.pricePence,
        });

        console.log(`🎫 Step 3b: Created booking_seat record for ${seatId}`);

        const updateResult = await tx
          .update(seats)
          .set({ status: 'booked' })
          .where(eq(seats.id, seatId))
          .returning();

        console.log(`🎫 Step 3c: Updated seat ${seatId} to booked:`, updateResult);
      }

      console.log(`🎫 Step 4: Cleaning up reservations`);

      // Clean up reservations
      const deletedReservations = await tx
        .delete(reservations)
        .where(eq(reservations.sessionToken, reservationId))
        .returning();

      console.log(`🎫 Step 4 Result: Deleted ${deletedReservations.length} reservations`);

      console.log(`🎫 Step 5: Sending booking confirmation email`);

      // Send booking confirmation email
      try {
        // Get show and venue details for email
        const showDetails = await tx
          .select({
            show: shows,
            venue: venues,
          })
          .from(shows)
          .innerJoin(venues, eq(shows.venueId, venues.id))
          .where(eq(shows.id, reservedSeats[0].seat.showId))
          .limit(1);

        if (showDetails.length > 0) {
          const { show, venue } = showDetails[0];
          
          // Format seat information
          const seatInfo = reservedSeats.map(rs => 
            `${rs.seat.rowLetter}${rs.seat.seatNumber}`
          ).join(', ');

          // Format show date and time
          const showDate = show.date ? new Date(show.date).toLocaleDateString('en-GB') : 'TBA';
          const showTime = show.time || '19:30';

          // Import email service
          const { emailService } = await import('../email');
          
          // Send booking confirmation email
          const emailSent = await emailService.sendBookingConfirmation(
            customerEmail,
            customerName,
            show.title,
            showDate,
            showTime,
            venue.name,
            validationCode,
            seatInfo
          );

          if (emailSent) {
            console.log(`📧 Booking confirmation email sent successfully to ${customerEmail}`);
          } else {
            console.log(`⚠️ Failed to send booking confirmation email to ${customerEmail}`);
          }
        } else {
          console.log(`⚠️ Could not find show details for booking confirmation email`);
        }
      } catch (emailError) {
        console.error(`💥 Error sending booking confirmation email:`, emailError);
        // Don't fail the entire booking process if email fails
      }

      const result = {
        success: true,
        message: 'Seats confirmed successfully',
        confirmed_count: reservedSeats.length,
        verification_code: validationCode,
      };

      console.log(`🎉 confirmSeatReservations SUCCESS:`, result);

      return [result];

    } catch (error) {
      console.error(`💥 confirmSeatReservations ERROR:`, error);
      throw error;
    }
  });
} 

// ============================================================================
// VENUE QUERIES
// ============================================================================

/**
 * Get all venues
 */
export async function getAllVenues() {
  return await db
    .select()
    .from(venues)
    .orderBy(desc(venues.createdAt));
}

/**
 * Get venue by ID
 */
export async function getVenueById(venueId: string) {
  const result = await db
    .select()
    .from(venues)
    .where(eq(venues.id, venueId))
    .limit(1);

  return result[0] || null;
}

/**
 * Get venue by slug
 */
export async function getVenueBySlug(slug: string) {
  const result = await db
    .select()
    .from(venues)
    .where(eq(venues.slug, slug))
    .limit(1);

  return result[0] || null;
}

/**
 * Create a new venue
 */
export async function createVenue(venueData: Omit<typeof venues.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>) {
  const result = await db
    .insert(venues)
    .values(venueData)
    .returning();

  return result[0];
}

/**
 * Update venue
 */
export async function updateVenue(venueId: string, updateData: Partial<Omit<typeof venues.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>>) {
  const result = await db
    .update(venues)
    .set({ ...updateData, updatedAt: sql`NOW()` })
    .where(eq(venues.id, venueId))
    .returning();

  return result[0] || null;
}

/**
 * Delete venue (will cascade delete shows)
 */
export async function deleteVenue(venueId: string) {
  const result = await db
    .delete(venues)
    .where(eq(venues.id, venueId))
    .returning();

  return result[0] || null;
}

/**
 * Get venues with show counts
 */
export async function getVenuesWithShowCounts() {
  return await db
    .select({
      venue: venues,
      showCount: count(shows.id),
      activeShowCount: count(sql`CASE WHEN ${shows.isActive} = true AND ${shows.date} >= CURRENT_DATE THEN 1 END`),
    })
    .from(venues)
    .leftJoin(shows, eq(venues.id, shows.venueId))
    .groupBy(venues.id)
    .orderBy(desc(venues.createdAt));
}

/**
 * Get shows for a specific venue
 */
export async function getVenueShows(venueId: string) {
  return await db
    .select({
      id: shows.id,
      title: shows.title,
      description: shows.description,
      date: shows.date,
      time: shows.time,
      imageUrl: shows.imageUrl,
      isActive: shows.isActive,
      createdAt: shows.createdAt,
    })
    .from(shows)
    .where(eq(shows.venueId, venueId))
    .orderBy(desc(shows.date), desc(shows.time));
}

/**
 * Get all available seat maps for show creation
 */
export async function getAvailableSeatMaps() {
  return await db
    .select({
      id: seatMaps.id,
      name: seatMaps.name,
      description: seatMaps.description,
      totalCapacity: seatMaps.totalCapacity,
      layoutConfig: seatMaps.layoutConfig,
      svgViewbox: seatMaps.svgViewbox,
      createdAt: seatMaps.createdAt,
    })
    .from(seatMaps)
    .orderBy(desc(seatMaps.createdAt));
}

/**
 * Get venue statistics (total shows, bookings, etc.)
 */
export async function getVenueStatistics(venueId: string) {
  console.log(`📊 Calculating statistics for venue: ${venueId}`);
  
  // First, get basic show counts
  const showStats = await db
    .select({
      totalShows: count(shows.id),
      activeShows: count(sql`CASE WHEN ${shows.isActive} = true AND ${shows.date} >= CURRENT_DATE THEN 1 END`),
    })
    .from(shows)
    .where(eq(shows.venueId, venueId));

  // Then, get booking statistics separately for better accuracy
  const bookingStats = await db
    .select({
      totalBookings: count(bookings.id),
      totalRevenue: sql<number>`COALESCE(SUM(${bookings.totalAmountPence}), 0)`,
    })
    .from(bookings)
    .innerJoin(shows, eq(bookings.showId, shows.id))
    .where(
      and(
        eq(shows.venueId, venueId),
        eq(bookings.status, 'confirmed')
      )
    );

  const finalStats = {
    totalShows: showStats[0]?.totalShows || 0,
    activeShows: showStats[0]?.activeShows || 0,
    totalBookings: bookingStats[0]?.totalBookings || 0,
    totalRevenue: bookingStats[0]?.totalRevenue || 0,
  };

  console.log(`📊 Venue statistics calculated:`, finalStats);
  
  return finalStats;
}

/**
 * Get venue bookings for ticket verification and management
 */
export async function getVenueBookings(venueId: string, options?: {
  date?: string;
  limit?: number;
  status?: 'confirmed' | 'cancelled';
}) {
  const { date, limit = 100, status } = options || {};

  // Build where conditions
  const conditions = [eq(shows.venueId, venueId)];
  
  if (date) {
    conditions.push(eq(shows.date, date));
  }
  
  if (status) {
    conditions.push(eq(bookings.status, status));
  }

  const results = await db
    .select({
      booking: bookings,
      show: {
        id: shows.id,
        title: shows.title,
        date: shows.date,
        time: shows.time,
      },
      seatCount: count(bookingSeats.id),
    })
    .from(bookings)
    .innerJoin(shows, eq(bookings.showId, shows.id))
    .leftJoin(bookingSeats, eq(bookings.id, bookingSeats.bookingId))
    .where(and(...conditions))
    .groupBy(bookings.id, shows.id)
    .orderBy(desc(shows.date), desc(shows.time), desc(bookings.createdAt))
    .limit(limit);

  return results;
}

/**
 * Get today's bookings for a venue (for door list)
 */
export async function getTodaysVenueBookings(venueId: string) {
  const today = new Date().toISOString().split('T')[0]; // Get YYYY-MM-DD format
  
  console.log(`📅 Looking for bookings on date: ${today} for venue: ${venueId}`);
  
  const bookings = await getVenueBookings(venueId, {
    date: today,
    status: 'confirmed'
  });
  
  console.log(`📅 Found ${bookings.length} bookings for today`);
  
  // If no bookings for today, let's also check upcoming bookings (next 7 days) for demo purposes
  if (bookings.length === 0) {
    console.log('📅 No bookings for today, checking recent bookings instead...');
    const recentBookings = await getVenueBookings(venueId, {
      status: 'confirmed',
      limit: 20
    });
    console.log(`📅 Found ${recentBookings.length} recent bookings total`);
    return recentBookings;
  }
  
  return bookings;
}

/**
 * Validate a ticket by verification code for a specific venue
 */
export async function validateVenueTicket(venueId: string, validationCode: string) {
  const result = await db
    .select({
      booking: bookings,
      show: {
        id: shows.id,
        title: shows.title,
        date: shows.date,
        time: shows.time,
        venueName: venues.name,
      },
      seats: count(bookingSeats.id),
    })
    .from(bookings)
    .innerJoin(shows, eq(bookings.showId, shows.id))
    .innerJoin(venues, eq(shows.venueId, venues.id))
    .leftJoin(bookingSeats, eq(bookings.id, bookingSeats.bookingId))
    .where(
      and(
        eq(venues.id, venueId),
        eq(bookings.validationCode, validationCode),
        eq(bookings.status, 'confirmed')
      )
    )
    .groupBy(bookings.id, shows.id, venues.id)
    .limit(1);

  return result[0] || null;
}

/**
 * Get venue bookings with detailed seat information
 */
export async function getVenueBookingsWithSeats(venueId: string, showId?: string) {
  // Build where conditions
  const conditions = [eq(shows.venueId, venueId)];
  
  if (showId) {
    conditions.push(eq(shows.id, showId));
  }

  return await db
    .select({
      booking: bookings,
      show: shows,
      seat: seats,
      section: sections,
      pricePaid: bookingSeats.pricePaidPence,
    })
    .from(bookings)
    .innerJoin(shows, eq(bookings.showId, shows.id))
    .innerJoin(bookingSeats, eq(bookings.id, bookingSeats.bookingId))
    .innerJoin(seats, eq(bookingSeats.seatId, seats.id))
    .innerJoin(sections, eq(seats.sectionId, sections.id))
    .where(and(...conditions))
    .orderBy(desc(bookings.createdAt), asc(seats.rowLetter), asc(seats.seatNumber));
} 