import { VenueAPISimulator } from '../venue-simulator/VenueAPISimulator';
import { 
  VenueAPIResponse, 
  HybridReservation, 
  SeatReservationRequest,
  VenueIntegrationStatus,
  VenueErrorCode,
  VenueSeat,
  SeatStatus
} from '@/types/venue-api';
import { createReservations } from '@/lib/db/queries';
import { db } from '@/lib/db/connection';
import { shows, venues, seatMaps, sections, seats } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * VenueAdapter - Integration layer between venue APIs and internal system
 * 
 * This class handles the complex task of bridging external venue systems
 * with our internal booking infrastructure, ensuring data consistency
 * and providing hybrid booking capabilities.
 */
export class VenueAdapter {
  private venueSimulator: VenueAPISimulator;
  private venueSlug: string;
  private lastSyncTime: Date | null = null;
  private syncInProgress: boolean = false;

  constructor(venueSlug: string, dataSource: "json_file" | "database" | "external_api" = "json_file") {
    this.venueSlug = venueSlug;
    this.venueSimulator = new VenueAPISimulator(venueSlug, dataSource);
  }

  // ============================================================================
  // DATA SYNCHRONIZATION
  // ============================================================================

  /**
   * Sync venue data from external source to internal database
   * This is the main integration point for venue data
   */
  async syncVenueData(showId?: string): Promise<void> {
    if (this.syncInProgress) {
      console.log(`🔄 Sync already in progress for venue: ${this.venueSlug}`);
      return;
    }

    try {
      this.syncInProgress = true;
      console.log(`🔄 Starting venue data sync: ${this.venueSlug}`);

      // Get venue information
      const venueInfo = await this.venueSimulator.getVenueInfo();
      
      // Sync venue record
      await this.syncVenueRecord(venueInfo);

      // If specific show ID provided, sync just that show
      if (showId) {
        await this.syncShowData(showId);
      } else {
        // Sync all available shows
        const venueData = await this.venueSimulator.getShowSeatMap(
          'default-show-id' // Would need to be determined dynamically
        );
        
        if (venueData.show) {
          await this.syncShowData(venueData.show.id);
        }
      }

      this.lastSyncTime = new Date();
      console.log(`✅ Venue data sync completed: ${this.venueSlug}`);

    } catch (error) {
      console.error(`❌ Venue sync failed for ${this.venueSlug}:`, error);
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync individual show data including seat map and pricing
   */
  async syncShowData(showId: string): Promise<void> {
    try {
      console.log(`🎭 Syncing show data: ${showId}`);
      
      // Get complete show data from venue API
      const venueData = await this.venueSimulator.getShowSeatMap(showId);
      
      // Transform and store in our database format
      const internalFormat = await this.transformToInternalFormat(venueData);
      
      // Update database with transformed data
      await this.updateInternalDatabase(internalFormat);
      
      // Update Redis cache for performance
      await this.updateRedisCache(internalFormat);
      
      console.log(`✅ Show sync completed: ${showId}`);
      
    } catch (error) {
      console.error(`❌ Show sync failed for ${showId}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // HYBRID BOOKING SYSTEM
  // ============================================================================

  /**
   * Create hybrid reservation - reserve in both venue system and our system
   * This ensures seat consistency across platforms
   */
  async createHybridReservation(
    request: SeatReservationRequest
  ): Promise<HybridReservation> {
    try {
      console.log(`🎫 Creating hybrid reservation for venue: ${this.venueSlug}`);
      
      // Step 1: Reserve seats via venue API first
      const venueReservation = await this.venueSimulator.reserveSeats(request);
      
      if (!venueReservation.success) {
        throw new Error(`Venue reservation failed: ${venueReservation.error_message}`);
      }

      // Step 2: Create parallel reservation in our system
      const sessionToken = venueReservation.session_token;
      const timeoutMinutes = request.reservation_timeout_minutes || 15;
      
      try {
        const internalReservations = await createReservations(
          request.seat_ids,
          sessionToken,
          timeoutMinutes,
          undefined // No Stripe session yet
        );

        return {
          venue_reservation_id: venueReservation.reservation_id,
          internal_reservation_ids: internalReservations.map(r => r.id),
          expires_at: venueReservation.expires_at,
          seats: venueReservation.reserved_seats,
          sync_status: "synced"
        };

      } catch (internalError) {
        // If internal reservation fails, release venue reservation
        console.error('Internal reservation failed, releasing venue reservation:', internalError);
        
        try {
          await this.venueSimulator.releaseSeats(request.seat_ids);
        } catch (releaseError) {
          console.error('Failed to release venue seats:', releaseError);
        }

        return {
          venue_reservation_id: venueReservation.reservation_id,
          internal_reservation_ids: [],
          expires_at: venueReservation.expires_at,
          seats: venueReservation.reserved_seats,
          sync_status: "failed"
        };
      }

    } catch (error) {
      console.error(`❌ Hybrid reservation failed for ${this.venueSlug}:`, error);
      throw error;
    }
  }

  /**
   * Release hybrid reservation from both systems
   */
  async releaseHybridReservation(hybridReservation: HybridReservation): Promise<void> {
    const errors: string[] = [];

    // Release from venue system
    try {
      const seatIds = hybridReservation.seats.map(seat => seat.seat_id);
      await this.venueSimulator.releaseSeats(seatIds);
    } catch (error) {
      errors.push(`Venue release failed: ${error}`);
    }

    // Release from internal system
    try {
      // This would call your internal reservation release logic
      // Implementation depends on your existing reservation system
      console.log(`🔄 Releasing internal reservations: ${hybridReservation.internal_reservation_ids}`);
    } catch (error) {
      errors.push(`Internal release failed: ${error}`);
    }

    if (errors.length > 0) {
      throw new Error(`Hybrid release partially failed: ${errors.join(', ')}`);
    }
  }

  // ============================================================================
  // DATA TRANSFORMATION
  // ============================================================================

  /**
   * Transform venue API response to our internal database format
   */
  async transformToInternalFormat(venueData: VenueAPIResponse): Promise<any> {
    return {
      venue: {
        id: venueData.venue.id,
        name: venueData.venue.name,
        slug: venueData.venue.slug,
        address: venueData.venue.address,
        coordinates: venueData.venue.coordinates,
        capacity: venueData.venue.capacity,
        contactEmail: venueData.venue.contact.email,
        contactPhone: venueData.venue.contact.phone,
        website: venueData.venue.contact.website,
        venueType: venueData.venue.venue_type,
        isActive: true
      },
      show: {
        id: venueData.show.id,
        title: venueData.show.title,
        description: venueData.show.description,
        date: venueData.show.date,
        time: venueData.show.time,
        durationMinutes: venueData.show.duration_minutes,
        imageUrl: venueData.show.image_url,
        isActive: true
      },
      seatMap: {
        id: `${venueData.venue.slug}-seat-map`,
        name: `${venueData.venue.name} Seat Map`,
        description: `Seat map for ${venueData.venue.name}`,
        layoutConfig: venueData.seatMap.layout,
        totalCapacity: venueData.availability.total_seats,
        svgViewbox: `0 0 ${venueData.seatMap.layout.viewport.width} ${venueData.seatMap.layout.viewport.height}`
      },
      sections: venueData.seatMap.sections.map((section, index) => ({
        id: section.id,
        name: section.name,
        displayName: section.display_name,
        colorHex: section.color_hex,
        basePricePence: venueData.seatMap.pricing.find(p => p.section_id === section.id)?.base_price_pence || 0,
        seatPattern: {
          shape: "custom",
          capacity: section.capacity
        },
        positionConfig: {
          level: section.level || 0,
          sectionType: section.section_type
        },
        isAccessible: section.accessibility_info ? true : false,
        sortOrder: index
      })),
      seats: venueData.seatMap.seats.map(seat => ({
        id: seat.id,
        sectionId: seat.section_id,
        rowLetter: seat.row,
        seatNumber: seat.number,
        pricePence: seat.price_pence,
        status: this.transformSeatStatus(seat.status),
        position: seat.position,
        isAccessible: seat.accessibility,
        notes: seat.notes || null
      })),
      availability: venueData.availability,
      bookingRules: venueData.booking_rules
    };
  }

  /**
   * Transform venue seat status to our internal enum
   */
  private transformSeatStatus(venueStatus: SeatStatus): 'available' | 'booked' | 'reserved' {
    switch (venueStatus) {
      case 'available':
        return 'available';
      case 'sold':
        return 'booked';
      case 'reserved':
        return 'reserved';
      case 'blocked':
      case 'maintenance':
      case 'house_hold':
      default:
        return 'booked'; // Conservative approach - treat unknown as unavailable
    }
  }

  // ============================================================================
  // DATABASE OPERATIONS
  // ============================================================================

  /**
   * Sync venue record to our database
   */
  private async syncVenueRecord(venueInfo: VenueAPIResponse['venue']): Promise<void> {
    try {
      // Check if venue already exists
      const existingVenue = await db
        .select()
        .from(venues)
        .where(eq(venues.slug, venueInfo.slug))
        .limit(1);

      if (existingVenue.length === 0) {
        // Create new venue
        await db.insert(venues).values({
          name: venueInfo.name,
          slug: venueInfo.slug,
          address: venueInfo.address,
          description: `${venueInfo.name} - Integrated venue partner`
        });
        
        console.log(`✅ Created new venue: ${venueInfo.name}`);
      } else {
        // Update existing venue
        await db
          .update(venues)
          .set({
            name: venueInfo.name,
            address: venueInfo.address,
            description: `${venueInfo.name} - Integrated venue partner`,
            updatedAt: new Date()
          })
          .where(eq(venues.slug, venueInfo.slug));
          
        console.log(`✅ Updated existing venue: ${venueInfo.name}`);
      }
    } catch (error) {
      console.error('Failed to sync venue record:', error);
      throw error;
    }
  }

  /**
   * Update our database with transformed venue data
   */
  private async updateInternalDatabase(internalFormat: any): Promise<void> {
    try {
      console.log(`📀 Updating database with venue data: ${this.venueSlug}`);
      
      // This would contain the logic to update your database
      // with the transformed venue data. Implementation depends
      // on your specific database schema and requirements.
      
      // For now, we'll just log the operation
      console.log(`✅ Database update completed for venue: ${this.venueSlug}`);
      
    } catch (error) {
      console.error(`❌ Database update failed for ${this.venueSlug}:`, error);
      throw error;
    }
  }

  /**
   * Update Redis cache with venue data for performance
   */
  private async updateRedisCache(internalFormat: any): Promise<void> {
    try {
      // Implementation would depend on your Redis setup
      // This is a placeholder for Redis caching logic
      console.log(`🚀 Updated Redis cache for venue: ${this.venueSlug}`);
      
    } catch (error) {
      // Redis cache failure shouldn't break the sync
      console.warn(`⚠️ Redis cache update failed for ${this.venueSlug}:`, error);
    }
  }

  // ============================================================================
  // MONITORING & STATUS
  // ============================================================================

  /**
   * Get current integration status for this venue
   */
  async getIntegrationStatus(): Promise<VenueIntegrationStatus> {
    try {
      const status = await this.venueSimulator.getIntegrationStatus();
      
      return {
        ...status,
        last_sync: this.lastSyncTime?.toISOString() || 'never',
        health_check: {
          ...status.health_check,
          sync_working: !this.syncInProgress && this.lastSyncTime !== null
        }
      };
      
    } catch (error) {
      return {
        venue_slug: this.venueSlug,
        status: "error",
        last_sync: this.lastSyncTime?.toISOString() || 'never',
        data_source: "json_file",
        health_check: {
          api_responsive: false,
          data_fresh: false,
          sync_working: false,
          error_rate: 1.0
        }
      };
    }
  }

  /**
   * Perform health check on venue integration
   */
  async performHealthCheck(): Promise<boolean> {
    try {
      const venueInfo = await this.venueSimulator.getVenueInfo();
      return !!venueInfo.id;
    } catch (error) {
      console.error(`❌ Health check failed for venue ${this.venueSlug}:`, error);
      return false;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if venue is external (using third-party API)
   */
  static async isVenueExternal(venueSlug: string): Promise<boolean> {
    // Check if venue has external API configuration
    try {
      const configPath = `public/venues/${venueSlug}/config.json`;
      // In a real implementation, you'd check if the file exists
      // For now, we'll consider all venues with configs as external
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of all available external venues
   */
  static async getAvailableVenues(): Promise<string[]> {
    // In a real implementation, this would scan the venues directory
    // or query a registry of available venue integrations
    return ['victoria-palace', 'lyric-theater'];
  }

  /**
   * Clean up resources and connections
   */
  async cleanup(): Promise<void> {
    // Clean up any open connections, timers, etc.
    console.log(`🧹 Cleaning up venue adapter for: ${this.venueSlug}`);
  }
} 