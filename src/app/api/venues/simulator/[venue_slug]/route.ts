import { NextRequest, NextResponse } from 'next/server';
import { VenueAPISimulator } from '@/lib/venue-simulator/VenueAPISimulator';
import { VenueAdapter } from '@/lib/venue-integration/VenueAdapter';
import { VenueAPIError } from '@/types/venue-api';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

/**
 * Venue Simulator API - Simulates third-party venue APIs
 * 
 * This endpoint provides a complete simulation of how external venue APIs
 * would work, including realistic delays, error scenarios, and data formats.
 * 
 * Supported operations:
 * - GET /api/venues/simulator/[venue_slug] - Get venue info
 * - GET /api/venues/simulator/[venue_slug]?show_id=X - Get show seat map
 * - GET /api/venues/simulator/[venue_slug]?action=health - Health check
 * - GET /api/venues/simulator/[venue_slug]?action=status - Integration status
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ venue_slug: string }> }
) {
  try {
    const { venue_slug } = await params;
    const { searchParams } = new URL(request.url);
    const showId = searchParams.get('show_id');
    const action = searchParams.get('action');
    
    console.log(`🎭 Venue API simulation request: ${venue_slug}, action: ${action || 'default'}, show: ${showId || 'none'}`);
    
    // Initialize venue simulator
    const simulator = new VenueAPISimulator(venue_slug, 'json_file');
    
    try {
      // Handle different types of requests
      switch (action) {
        case 'health':
          return await handleHealthCheck(simulator, venue_slug);
          
        case 'status':
          return await handleStatusCheck(simulator, venue_slug);
          
        case 'sync':
          return await handleSyncRequest(simulator, venue_slug, showId);
          
        default:
          if (showId) {
            return await handleShowSeatMapRequest(simulator, venue_slug, showId);
          } else {
            return await handleVenueInfoRequest(simulator, venue_slug);
          }
      }
      
    } catch (error) {
      return handleVenueAPIError(error, venue_slug);
    }
    
  } catch (error) {
    console.error('🚨 Venue simulator API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        venue_slug: 'unknown'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle venue information requests
 */
async function handleVenueInfoRequest(
  simulator: VenueAPISimulator,
  venueSlug: string
): Promise<NextResponse> {
  console.log(`📍 Getting venue info for: ${venueSlug}`);
  
  const venueInfo = await simulator.getVenueInfo();
  
  return NextResponse.json({
    success: true,
    data: venueInfo,
    _metadata: {
      endpoint: 'venue_info',
      venue_slug: venueSlug,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Handle show seat map requests
 */
async function handleShowSeatMapRequest(
  simulator: VenueAPISimulator,
  venueSlug: string,
  showId: string
): Promise<NextResponse> {
  console.log(`🗺️ Getting seat map for show: ${showId} at venue: ${venueSlug}`);
  
  const seatMapData = await simulator.getShowSeatMap(showId);
  
  return NextResponse.json({
    success: true,
    data: seatMapData,
    _metadata: {
      endpoint: 'show_seat_map',
      venue_slug: venueSlug,
      show_id: showId,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Handle health check requests
 */
async function handleHealthCheck(
  simulator: VenueAPISimulator,
  venueSlug: string
): Promise<NextResponse> {
  console.log(`💊 Health check for venue: ${venueSlug}`);
  
  const adapter = new VenueAdapter(venueSlug);
  const isHealthy = await adapter.performHealthCheck();
  
  return NextResponse.json({
    success: true,
    healthy: isHealthy,
    venue_slug: venueSlug,
    timestamp: new Date().toISOString(),
    checks: {
      api_responsive: isHealthy,
      config_loaded: isHealthy,
      data_accessible: isHealthy
    }
  });
}

/**
 * Handle integration status requests
 */
async function handleStatusCheck(
  simulator: VenueAPISimulator,
  venueSlug: string
): Promise<NextResponse> {
  console.log(`📊 Status check for venue: ${venueSlug}`);
  
  const adapter = new VenueAdapter(venueSlug);
  const status = await adapter.getIntegrationStatus();
  
  return NextResponse.json({
    success: true,
    data: status,
    _metadata: {
      endpoint: 'integration_status',
      venue_slug: venueSlug,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Handle data sync requests
 */
async function handleSyncRequest(
  simulator: VenueAPISimulator,
  venueSlug: string,
  showId?: string | null
): Promise<NextResponse> {
  console.log(`🔄 Sync request for venue: ${venueSlug}, show: ${showId || 'all'}`);
  
  const adapter = new VenueAdapter(venueSlug);
  
  try {
    await adapter.syncVenueData(showId || undefined);
    
    return NextResponse.json({
      success: true,
      message: `Venue data synced successfully for ${venueSlug}`,
      venue_slug: venueSlug,
      show_id: showId,
      synced_at: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown sync error',
      venue_slug: venueSlug
    }, { status: 500 });
  }
}

/**
 * Handle venue API errors with proper error codes and responses
 */
function handleVenueAPIError(
  error: unknown,
  venueSlug: string
): NextResponse {
  console.error(`❌ Venue API error for ${venueSlug}:`, error);
  
  // Handle VenueAPIError specifically
  if (error && typeof error === 'object' && 'code' in error) {
    const venueError = error as VenueAPIError;
    
    const statusMap: Record<string, number> = {
      'VENUE_NOT_FOUND': 404,
      'SHOW_NOT_FOUND': 404,
      'SEATS_UNAVAILABLE': 409,
      'RESERVATION_EXPIRED': 410,
      'INVALID_SEAT_SELECTION': 400,
      'PAYMENT_FAILED': 402,
      'API_RATE_LIMITED': 429,
      'VENUE_MAINTENANCE': 503,
      'DATA_SYNC_ERROR': 502,
      'NETWORK_ERROR': 502
    };
    
    const status = statusMap[venueError.code] || 500;
    
    return NextResponse.json({
      success: false,
      error: venueError.code,
      message: venueError.message,
      details: venueError.details,
      retryable: venueError.retryable,
      retry_after_seconds: venueError.retry_after_seconds,
      venue_slug: venueSlug,
      timestamp: new Date().toISOString()
    }, { 
      status,
      headers: venueError.retry_after_seconds ? {
        'Retry-After': venueError.retry_after_seconds.toString()
      } : undefined
    });
  }
  
  // Handle generic errors
  return NextResponse.json({
    success: false,
    error: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    venue_slug: venueSlug,
    timestamp: new Date().toISOString()
  }, { status: 500 });
}

/**
 * POST endpoint for venue operations (reservations, bookings, etc.)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ venue_slug: string }> }
) {
  try {
    const { venue_slug } = await params;
    const body = await request.json();
    const { action } = body;
    
    console.log(`📝 Venue POST request: ${venue_slug}, action: ${action}`);
    
    const simulator = new VenueAPISimulator(venue_slug, 'json_file');
    
    switch (action) {
      case 'reserve_seats':
        return await handleSeatReservation(simulator, venue_slug, body);
        
      case 'release_seats':
        return await handleSeatRelease(simulator, venue_slug, body);
        
      case 'confirm_booking':
        return await handleBookingConfirmation(simulator, venue_slug, body);
        
      default:
        return NextResponse.json({
          success: false,
          error: 'INVALID_ACTION',
          message: `Unknown action: ${action}`,
          supported_actions: ['reserve_seats', 'release_seats', 'confirm_booking']
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('🚨 Venue POST API error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Handle seat reservation requests
 */
async function handleSeatReservation(
  simulator: VenueAPISimulator,
  venueSlug: string,
  body: any
): Promise<NextResponse> {
  try {
    const reservation = await simulator.reserveSeats(body);
    
    return NextResponse.json({
      success: true,
      data: reservation,
      _metadata: {
        endpoint: 'reserve_seats',
        venue_slug: venueSlug,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    return handleVenueAPIError(error, venueSlug);
  }
}

/**
 * Handle seat release requests
 */
async function handleSeatRelease(
  simulator: VenueAPISimulator,
  venueSlug: string,
  body: any
): Promise<NextResponse> {
  try {
    await simulator.releaseSeats(body.seat_ids || []);
    
    return NextResponse.json({
      success: true,
      message: 'Seats released successfully',
      venue_slug: venueSlug,
      released_seats: body.seat_ids?.length || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return handleVenueAPIError(error, venueSlug);
  }
}

/**
 * Handle booking confirmation requests
 */
async function handleBookingConfirmation(
  simulator: VenueAPISimulator,
  venueSlug: string,
  body: any
): Promise<NextResponse> {
  try {
    const confirmation = await simulator.confirmBooking(body);
    
    return NextResponse.json({
      success: true,
      data: confirmation,
      _metadata: {
        endpoint: 'confirm_booking',
        venue_slug: venueSlug,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    return handleVenueAPIError(error, venueSlug);
  }
} 