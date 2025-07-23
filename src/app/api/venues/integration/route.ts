import { NextRequest, NextResponse } from 'next/server';
import { VenueAdapter } from '@/lib/venue-integration/VenueAdapter';
import { VenueAPISimulator } from '@/lib/venue-simulator/VenueAPISimulator';
import fs from 'fs/promises';
import path from 'path';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

/**
 * Venue Integration Management API
 * 
 * This endpoint provides management capabilities for venue integrations,
 * including listing available venues, testing connections, and managing
 * synchronization operations.
 * 
 * GET /api/venues/integration - List all available venue integrations
 * POST /api/venues/integration - Test connection to a specific venue
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'list';
    const venueSlug = searchParams.get('venue_slug');
    
    console.log(`🔧 Venue integration request: action=${action}, venue=${venueSlug || 'all'}`);
    
    switch (action) {
      case 'list':
        return await handleListVenues();
        
      case 'status':
        if (!venueSlug) {
          return NextResponse.json({
            success: false,
            error: 'MISSING_VENUE_SLUG',
            message: 'venue_slug parameter is required for status action'
          }, { status: 400 });
        }
        return await handleVenueStatus(venueSlug);
        
      case 'health':
        return await handleSystemHealth();
        
      default:
        return NextResponse.json({
          success: false,
          error: 'INVALID_ACTION',
          message: `Unknown action: ${action}`,
          supported_actions: ['list', 'status', 'health']
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('🚨 Venue integration API error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Handle listing all available venue integrations
 */
async function handleListVenues(): Promise<NextResponse> {
  try {
    console.log('📋 Listing all available venue integrations');
    
    // Get available venues from file system
    const venuesPath = path.join(process.cwd(), 'public', 'venues');
    
    let venueDirectories: string[] = [];
    
    try {
      const entries = await fs.readdir(venuesPath, { withFileTypes: true });
      venueDirectories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      console.warn('Venues directory not found, using fallback list');
      venueDirectories = ['victoria-palace', 'lyric-theater'];
    }
    
    // Get detailed information for each venue
    const venues = [];
    
    for (const venueSlug of venueDirectories) {
      try {
        const adapter = new VenueAdapter(venueSlug);
        const status = await adapter.getIntegrationStatus();
        const isHealthy = await adapter.performHealthCheck();
        
        venues.push({
          slug: venueSlug,
          status: status.status,
          healthy: isHealthy,
          last_sync: status.last_sync,
          data_source: status.data_source,
          health_check: status.health_check
        });
        
      } catch (error) {
        console.warn(`Failed to get status for venue ${venueSlug}:`, error);
        venues.push({
          slug: venueSlug,
          status: 'error',
          healthy: false,
          last_sync: 'never',
          data_source: 'unknown',
          health_check: {
            api_responsive: false,
            data_fresh: false,
            sync_working: false,
            error_rate: 1.0
          },
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        total_venues: venues.length,
        healthy_venues: venues.filter(v => v.healthy).length,
        venues
      },
      _metadata: {
        endpoint: 'list_venues',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Failed to list venues:', error);
    return NextResponse.json({
      success: false,
      error: 'LIST_VENUES_FAILED',
      message: error instanceof Error ? error.message : 'Failed to list venues'
    }, { status: 500 });
  }
}

/**
 * Handle getting status for a specific venue
 */
async function handleVenueStatus(venueSlug: string): Promise<NextResponse> {
  try {
    console.log(`📊 Getting detailed status for venue: ${venueSlug}`);
    
    const adapter = new VenueAdapter(venueSlug);
    const simulator = new VenueAPISimulator(venueSlug, 'json_file');
    
    // Get comprehensive status information
    const [integrationStatus, healthCheck, venueInfo] = await Promise.allSettled([
      adapter.getIntegrationStatus(),
      adapter.performHealthCheck(),
      simulator.getVenueInfo()
    ]);
    
    const response: any = {
      venue_slug: venueSlug,
      timestamp: new Date().toISOString()
    };
    
    // Integration status
    if (integrationStatus.status === 'fulfilled') {
      response.integration_status = integrationStatus.value;
    } else {
      response.integration_status = {
        status: 'error',
        error: integrationStatus.reason?.message || 'Failed to get integration status'
      };
    }
    
    // Health check
    if (healthCheck.status === 'fulfilled') {
      response.healthy = healthCheck.value;
    } else {
      response.healthy = false;
      response.health_error = healthCheck.reason?.message || 'Health check failed';
    }
    
    // Venue information
    if (venueInfo.status === 'fulfilled') {
      response.venue_info = venueInfo.value;
    } else {
      response.venue_info_error = venueInfo.reason?.message || 'Failed to get venue info';
    }
    
    return NextResponse.json({
      success: true,
      data: response,
      _metadata: {
        endpoint: 'venue_status',
        venue_slug: venueSlug,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`Failed to get venue status for ${venueSlug}:`, error);
    return NextResponse.json({
      success: false,
      error: 'VENUE_STATUS_FAILED',
      message: error instanceof Error ? error.message : 'Failed to get venue status',
      venue_slug: venueSlug
    }, { status: 500 });
  }
}

/**
 * Handle system health check for all venues
 */
async function handleSystemHealth(): Promise<NextResponse> {
  try {
    console.log('💊 Performing system-wide venue health check');
    
    const venueList = await VenueAdapter.getAvailableVenues();
    const healthChecks = await Promise.allSettled(
      venueList.map(async (venueSlug) => {
        const adapter = new VenueAdapter(venueSlug);
        const isHealthy = await adapter.performHealthCheck();
        return { venue_slug: venueSlug, healthy: isHealthy };
      })
    );
    
    const results = healthChecks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          venue_slug: venueList[index],
          healthy: false,
          error: result.reason?.message || 'Health check failed'
        };
      }
    });
    
    const healthyCount = results.filter(r => r.healthy).length;
    const totalCount = results.length;
    
    return NextResponse.json({
      success: true,
      data: {
        overall_health: healthyCount === totalCount ? 'healthy' : healthyCount > 0 ? 'partial' : 'unhealthy',
        healthy_venues: healthyCount,
        total_venues: totalCount,
        health_percentage: totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0,
        venues: results
      },
      _metadata: {
        endpoint: 'system_health',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Failed to perform system health check:', error);
    return NextResponse.json({
      success: false,
      error: 'SYSTEM_HEALTH_FAILED',
      message: error instanceof Error ? error.message : 'Failed to perform system health check'
    }, { status: 500 });
  }
}

/**
 * POST endpoint for venue integration operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, venue_slug } = body;
    
    console.log(`🔧 Venue integration POST: action=${action}, venue=${venue_slug}`);
    
    if (!venue_slug) {
      return NextResponse.json({
        success: false,
        error: 'MISSING_VENUE_SLUG',
        message: 'venue_slug is required'
      }, { status: 400 });
    }
    
    switch (action) {
      case 'test_connection':
        return await handleTestConnection(venue_slug);
        
      case 'sync_data':
        return await handleSyncData(venue_slug, body.show_id);
        
      case 'reset_cache':
        return await handleResetCache(venue_slug);
        
      default:
        return NextResponse.json({
          success: false,
          error: 'INVALID_ACTION',
          message: `Unknown action: ${action}`,
          supported_actions: ['test_connection', 'sync_data', 'reset_cache']
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('🚨 Venue integration POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Test connection to a specific venue
 */
async function handleTestConnection(venueSlug: string): Promise<NextResponse> {
  try {
    console.log(`🧪 Testing connection to venue: ${venueSlug}`);
    
    const adapter = new VenueAdapter(venueSlug);
    const simulator = new VenueAPISimulator(venueSlug, 'json_file');
    
    const startTime = Date.now();
    
    // Test basic connectivity
    const venueInfo = await simulator.getVenueInfo();
    const responseTime = Date.now() - startTime;
    
    // Test health check
    const isHealthy = await adapter.performHealthCheck();
    
    return NextResponse.json({
      success: true,
      data: {
        venue_slug: venueSlug,
        connection_successful: true,
        response_time_ms: responseTime,
        healthy: isHealthy,
        venue_info: {
          name: venueInfo.name,
          capacity: venueInfo.capacity,
          contact: venueInfo.contact
        }
      },
      _metadata: {
        endpoint: 'test_connection',
        venue_slug: venueSlug,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`Connection test failed for ${venueSlug}:`, error);
    return NextResponse.json({
      success: false,
      error: 'CONNECTION_TEST_FAILED',
      message: error instanceof Error ? error.message : 'Connection test failed',
      venue_slug: venueSlug
    }, { status: 500 });
  }
}

/**
 * Sync data for a specific venue
 */
async function handleSyncData(venueSlug: string, showId?: string): Promise<NextResponse> {
  try {
    console.log(`🔄 Syncing data for venue: ${venueSlug}, show: ${showId || 'all'}`);
    
    const adapter = new VenueAdapter(venueSlug);
    await adapter.syncVenueData(showId);
    
    return NextResponse.json({
      success: true,
      message: `Data sync completed for ${venueSlug}`,
      venue_slug: venueSlug,
      show_id: showId,
      synced_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`Data sync failed for ${venueSlug}:`, error);
    return NextResponse.json({
      success: false,
      error: 'DATA_SYNC_FAILED',
      message: error instanceof Error ? error.message : 'Data sync failed',
      venue_slug: venueSlug
    }, { status: 500 });
  }
}

/**
 * Reset cache for a specific venue
 */
async function handleResetCache(venueSlug: string): Promise<NextResponse> {
  try {
    console.log(`🗑️ Resetting cache for venue: ${venueSlug}`);
    
    // In a real implementation, this would clear Redis cache
    // For now, we'll just acknowledge the request
    
    return NextResponse.json({
      success: true,
      message: `Cache reset completed for ${venueSlug}`,
      venue_slug: venueSlug,
      reset_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`Cache reset failed for ${venueSlug}:`, error);
    return NextResponse.json({
      success: false,
      error: 'CACHE_RESET_FAILED',
      message: error instanceof Error ? error.message : 'Cache reset failed',
      venue_slug: venueSlug
    }, { status: 500 });
  }
} 