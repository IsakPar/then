import { 
  VenueAPIResponse, 
  VenueConfig, 
  SeatReservationRequest, 
  SeatReservationResponse, 
  BookingConfirmationRequest,
  BookingConfirmationResponse,
  VenueAPIError,
  VenueErrorCode,
  SeatAvailabilityUpdate,
  VenueIntegrationStatus,
  VenueSeat,
  SeatStatus,
  APIMetadata
} from '@/types/venue-api';
import fs from 'fs/promises';
import path from 'path';

/**
 * VenueAPISimulator - Simulates third-party venue APIs
 * 
 * This class provides a realistic simulation of how external venue APIs work,
 * including network delays, error scenarios, and different data sources.
 * It's designed to help develop and test venue integrations before connecting
 * to real venue systems.
 */
export class VenueAPISimulator {
  private venueSlug: string;
  private dataSource: "json_file" | "database" | "external_api";
  private config: VenueConfig | null = null;
  private seatMapData: VenueAPIResponse['seatMap'] | null = null;
  private availabilityCache: Map<string, Date> = new Map();
  
  constructor(venueSlug: string, dataSource: "json_file" | "database" | "external_api" = "json_file") {
    this.venueSlug = venueSlug;
    this.dataSource = dataSource;
  }

  // ============================================================================
  // CORE VENUE API METHODS
  // ============================================================================

  /**
   * Get venue information and basic details
   */
  async getVenueInfo(): Promise<VenueAPIResponse["venue"]> {
    await this.ensureConfigLoaded();
    await this.simulateNetworkDelay();
    
    this.throwRandomError("VENUE_NOT_FOUND", 0.01);
    
    if (!this.config) {
      throw this.createError("VENUE_NOT_FOUND", `Venue not found: ${this.venueSlug}`);
    }
    
    return this.config.venue;
  }

  /**
   * Get complete show seat map with availability
   */
  async getShowSeatMap(showId: string): Promise<VenueAPIResponse> {
    const startTime = Date.now();
    
    await this.ensureConfigLoaded();
    await this.ensureSeatMapLoaded();
    await this.simulateNetworkDelay();
    
    this.throwRandomError("SHOW_NOT_FOUND", 0.02);
    this.throwRandomError("DATA_SYNC_ERROR", 0.005);
    
    if (!this.config || !this.seatMapData) {
      throw this.createError("SHOW_NOT_FOUND", `Show or seat map not found: ${showId}`);
    }
    
    // Find the specific show
    const show = this.config.shows.find(s => s.id === showId);
    if (!show) {
      throw this.createError("SHOW_NOT_FOUND", `Show not found: ${showId}`);
    }
    
    // Generate realistic availability data
    const availability = await this.generateAvailabilityData(showId);
    
    // Apply dynamic pricing if configured
    const pricingWithDynamics = await this.applyDynamicPricing(
      this.seatMapData.pricing, 
      availability
    );
    
    // Update seat statuses with realistic patterns
    const seatsWithStatus = await this.updateSeatStatuses(
      this.seatMapData.seats, 
      availability
    );
    
    const response: VenueAPIResponse = {
      venue: this.config.venue,
      show,
      seatMap: {
        ...this.seatMapData,
        seats: seatsWithStatus,
        pricing: pricingWithDynamics
      },
      availability,
      booking_rules: this.config.booking_rules,
      _metadata: this.generateMetadata(startTime)
    };
    
    return response;
  }

  /**
   * Reserve specific seats for a limited time
   */
  async reserveSeats(
    request: SeatReservationRequest
  ): Promise<SeatReservationResponse> {
    await this.simulateNetworkDelay();
    
    this.throwRandomError("SEATS_UNAVAILABLE", 0.15); // Higher error rate for reservations
    this.throwRandomError("API_RATE_LIMITED", 0.02);
    
    const { show_id, seat_ids, reservation_timeout_minutes = 15 } = request;
    
    // Validate seats are available
    const seatMapResponse = await this.getShowSeatMap(show_id);
    const requestedSeats = seatMapResponse.seatMap.seats.filter(
      seat => seat_ids.includes(seat.id)
    );
    
    // Check availability
    const unavailableSeats = requestedSeats.filter(
      seat => seat.status !== "available"
    );
    
    if (unavailableSeats.length > 0) {
      throw this.createError(
        "SEATS_UNAVAILABLE", 
        `${unavailableSeats.length} seats are no longer available`,
        { unavailable_seat_ids: unavailableSeats.map(s => s.id) }
      );
    }
    
    // Generate reservation
    const reservationId = this.generateReservationId();
    const expiresAt = new Date(Date.now() + reservation_timeout_minutes * 60 * 1000);
    const sessionToken = this.generateSessionToken();
    
    // Calculate total price including fees
    const reservedSeats = requestedSeats.map(seat => {
      const sectionPricing = seatMapResponse.seatMap.pricing.find(
        p => p.section_id === seat.section_id
      );
      
      const fees = sectionPricing?.fees.booking_fee_pence || 250; // Default £2.50 fee
      
      return {
        seat_id: seat.id,
        section_name: seatMapResponse.seatMap.sections.find(s => s.id === seat.section_id)?.display_name || 'Unknown',
        row: seat.row,
        number: seat.number,
        price_pence: seat.price_pence,
        fees_pence: fees,
        expires_at: expiresAt.toISOString()
      };
    });
    
    const totalPrice = reservedSeats.reduce(
      (sum, seat) => sum + seat.price_pence + seat.fees_pence, 
      0
    );
    
    return {
      success: true,
      reservation_id: reservationId,
      expires_at: expiresAt.toISOString(),
      reserved_seats: reservedSeats,
      total_price_pence: totalPrice,
      session_token: sessionToken
    };
  }

  /**
   * Release held seats back to general availability
   */
  async releaseSeats(seatIds: string[]): Promise<void> {
    await this.simulateNetworkDelay(50, 200); // Faster operation
    
    this.throwRandomError("NETWORK_ERROR", 0.01);
    
    // In a real implementation, this would update the venue's seat status
    console.log(`🎫 Released ${seatIds.length} seats for venue ${this.venueSlug}`);
  }

  /**
   * Confirm booking after successful payment
   */
  async confirmBooking(
    request: BookingConfirmationRequest
  ): Promise<BookingConfirmationResponse> {
    await this.simulateNetworkDelay();
    
    this.throwRandomError("PAYMENT_FAILED", 0.05);
    this.throwRandomError("RESERVATION_EXPIRED", 0.1);
    
    const { reservation_id, payment_data, customer_info } = request;
    
    // Generate booking confirmation
    const bookingId = this.generateBookingId();
    const confirmationCode = this.generateConfirmationCode();
    
    // In a real implementation, you'd validate the reservation still exists
    // and payment matches the reserved amount
    
    const tickets = []; // Would be populated with actual ticket data
    
    return {
      success: true,
      booking_id: bookingId,
      confirmation_code: confirmationCode,
      tickets,
      total_paid_pence: payment_data.amount_paid_pence
    };
  }

  /**
   * Get current booking status
   */
  async getBookingStatus(bookingId: string): Promise<any> {
    await this.simulateNetworkDelay(100, 300);
    
    return {
      booking_id: bookingId,
      status: "confirmed",
      tickets_issued: true,
      entry_allowed: true
    };
  }

  // ============================================================================
  // REAL-TIME FEATURES
  // ============================================================================

  /**
   * Subscribe to real-time availability updates
   */
  async subscribeToAvailabilityUpdates(
    showId: string,
    callback: (update: SeatAvailabilityUpdate) => void
  ): Promise<void> {
    if (!this.config?.api_simulation.availability_update_interval) return;
    
    const interval = setInterval(async () => {
      try {
        // Generate realistic seat status changes
        const updates = await this.generateSeatStatusUpdates(showId);
        updates.forEach(callback);
      } catch (error) {
        console.error('Error generating seat updates:', error);
      }
    }, this.config.api_simulation.availability_update_interval);
    
    // Store interval for cleanup (would need proper cleanup in real implementation)
    console.log(`🔄 Started availability updates for show ${showId}`);
  }

  /**
   * Get venue integration health status
   */
  async getIntegrationStatus(): Promise<VenueIntegrationStatus> {
    await this.simulateNetworkDelay(50, 150);
    
    const isConfigLoaded = !!this.config;
    const lastSync = new Date().toISOString();
    
    return {
      venue_slug: this.venueSlug,
      status: isConfigLoaded ? "active" : "error",
      last_sync: lastSync,
      data_source: this.dataSource,
      health_check: {
        api_responsive: true,
        data_fresh: Date.now() - (this.availabilityCache.get('last_update')?.getTime() || 0) < 300000, // 5 minutes
        sync_working: true,
        error_rate: this.config?.api_simulation.error_rate || 0
      }
    };
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async ensureConfigLoaded(): Promise<void> {
    if (this.config) return;
    
    try {
      switch (this.dataSource) {
        case "json_file":
          await this.loadConfigFromFile();
          break;
        case "database":
          await this.loadConfigFromDatabase();
          break;
        case "external_api":
          await this.loadConfigFromExternalAPI();
          break;
      }
    } catch (error) {
      throw this.createError("VENUE_NOT_FOUND", `Failed to load venue config: ${this.venueSlug}`);
    }
  }

  private async loadConfigFromFile(): Promise<void> {
    const configPath = path.join(process.cwd(), 'public', 'venues', this.venueSlug, 'config.json');
    
    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configData);
    } catch (error) {
      throw new Error(`Config file not found: ${configPath}`);
    }
  }

  private async loadConfigFromDatabase(): Promise<void> {
    // Would load from your database
    throw new Error("Database loading not implemented yet");
  }

  private async loadConfigFromExternalAPI(): Promise<void> {
    // Would call external venue API
    throw new Error("External API loading not implemented yet");
  }

  private async ensureSeatMapLoaded(): Promise<void> {
    if (this.seatMapData) return;
    
    const seatMapPath = path.join(
      process.cwd(), 
      'public', 
      'venues', 
      this.venueSlug, 
      'seat-map.json'
    );
    
    try {
      const seatMapJson = await fs.readFile(seatMapPath, 'utf-8');
      this.seatMapData = JSON.parse(seatMapJson);
    } catch (error) {
      throw new Error(`Seat map file not found: ${seatMapPath}`);
    }
  }

  private async simulateNetworkDelay(minMs = 100, maxMs = 500): Promise<void> {
    if (!this.config?.api_simulation) return;
    
    const [min, max] = this.config.api_simulation.network_delay_ms;
    const delay = Math.random() * (maxMs || max - (minMs || min)) + (minMs || min);
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private throwRandomError(errorCode: VenueErrorCode, probability: number): void {
    if (!this.config?.api_simulation) return;
    
    const shouldError = Math.random() < (this.config.api_simulation.error_rate * probability);
    if (shouldError) {
      throw this.createError(errorCode, `Simulated error: ${errorCode}`);
    }
  }

  private createError(code: VenueErrorCode, message: string, details?: any): VenueAPIError {
    return {
      code,
      message,
      details,
      retryable: ["NETWORK_ERROR", "API_RATE_LIMITED", "DATA_SYNC_ERROR"].includes(code),
      retry_after_seconds: code === "API_RATE_LIMITED" ? 60 : undefined
    };
  }

  private async generateAvailabilityData(showId: string) {
    const totalSeats = this.seatMapData?.seats.length || 0;
    const soldPercentage = 0.3 + Math.random() * 0.4; // 30-70% sold
    const reservedPercentage = 0.05 + Math.random() * 0.1; // 5-15% reserved
    
    const soldSeats = Math.floor(totalSeats * soldPercentage);
    const reservedSeats = Math.floor(totalSeats * reservedPercentage);
    const availableSeats = totalSeats - soldSeats - reservedSeats;
    
    return {
      last_updated: new Date().toISOString(),
      cache_ttl: 300, // 5 minutes
      total_seats: totalSeats,
      available_seats: availableSeats,
      reserved_seats: reservedSeats,
      sold_seats: soldSeats,
      availability_percentage: Math.round((availableSeats / totalSeats) * 100),
      high_demand: availableSeats < totalSeats * 0.2, // Less than 20% available
      selling_fast: availableSeats < totalSeats * 0.15 // Less than 15% available
    };
  }

  private async applyDynamicPricing(pricing: any[], availability: any) {
    // Apply high demand pricing
    if (availability.high_demand) {
      return pricing.map(p => ({
        ...p,
        base_price_pence: Math.round(p.base_price_pence * (p.availability_pricing?.high_demand_multiplier || 1.2))
      }));
    }
    
    return pricing;
  }

  private async updateSeatStatuses(seats: VenueSeat[], availability: any): Promise<VenueSeat[]> {
    const totalSeats = seats.length;
    const statusDistribution = {
      sold: availability.sold_seats,
      reserved: availability.reserved_seats,
      available: availability.available_seats
    };
    
    // Randomly assign statuses based on availability data
    const shuffledSeats = [...seats].sort(() => Math.random() - 0.5);
    let soldCount = 0;
    let reservedCount = 0;
    
    return shuffledSeats.map(seat => {
      let status: SeatStatus = "available";
      
      if (soldCount < statusDistribution.sold) {
        status = "sold";
        soldCount++;
      } else if (reservedCount < statusDistribution.reserved) {
        status = "reserved";
        reservedCount++;
        // Add expiry for reserved seats
        return {
          ...seat,
          status,
          hold_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
        };
      }
      
      return { ...seat, status };
    });
  }

  private async generateSeatStatusUpdates(showId: string): Promise<SeatAvailabilityUpdate[]> {
    // Generate 1-3 random seat status changes
    const updateCount = Math.floor(Math.random() * 3) + 1;
    const updates: SeatAvailabilityUpdate[] = [];
    
    for (let i = 0; i < updateCount; i++) {
      const seatId = `seat-${Math.random().toString(36).substring(2, 15)}`;
      const statusChanges: SeatStatus[] = ["available", "reserved", "sold"];
      const oldStatus = statusChanges[Math.floor(Math.random() * statusChanges.length)];
      let newStatus = statusChanges[Math.floor(Math.random() * statusChanges.length)];
      
      // Ensure status actually changes
      while (newStatus === oldStatus) {
        newStatus = statusChanges[Math.floor(Math.random() * statusChanges.length)];
      }
      
      updates.push({
        show_id: showId,
        seat_id: seatId,
        old_status: oldStatus,
        new_status: newStatus,
        updated_at: new Date().toISOString(),
        source: "venue_api"
      });
    }
    
    return updates;
  }

  private generateMetadata(startTime: number): APIMetadata {
    return {
      api_version: "1.0.0",
      response_time_ms: Date.now() - startTime,
      data_source: this.availabilityCache.has('last_update') ? "cached" : "live",
      cache_expires_at: new Date(Date.now() + 300000).toISOString(), // 5 minutes
      rate_limit: {
        remaining: Math.floor(Math.random() * 100) + 50,
        reset_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
      }
    };
  }

  private generateReservationId(): string {
    return `res_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateSessionToken(): string {
    return `st_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateBookingId(): string {
    return `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  private generateConfirmationCode(): string {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  }
} 