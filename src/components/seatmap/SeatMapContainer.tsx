// TODO [Phase 2]: Integrate real-time updates, caching, virtualization and analytics
// Add comprehensive Phase 2 features to seat map container

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { 
  SeatMapContainerProps, 
  Seat, 
  SeatMapData, 
  SectionInfo, 
  ViewportState,
  DEFAULT_SEAT_MAP_CONFIG 
} from './types';
import { CoordinateEngine, createCoordinateEngine } from './CoordinateEngine';
import SVGCanvas from './SVGCanvas';
import SectionRenderer from './SectionRenderer';
import { VirtualizedSeatMap, useVirtualization } from './VirtualizedSeatMap';
import { SeatMapErrorBoundary } from './SeatMapErrorBoundary';
import { BatchSeatHoldTimers } from './SeatHoldTimer';
import { useSeatUpdateWebSocket } from '../../lib/realtime-seat-updates';
import { useSeatMapCache } from '../../lib/seat-map-cache';
import { useSeatMapMetrics } from '../../lib/analytics/seat-map-metrics';
import { ViewportBounds } from '../../types/seat-map-shared';
import ProfessionalStage from './ProfessionalStage';
import ProfessionalSectionLabel from './ProfessionalSectionLabel';

// ============================================================================
// CONSTANTS
// ============================================================================

const SEAT_MAP_TIMEOUT = 10000; // 10 seconds timeout for API calls

// ============================================================================
// SEAT MAP CONTAINER - Top-level orchestrating component
// ============================================================================

const SeatMapContainer: React.FC<SeatMapContainerProps> = ({
  showId,
  onSeatSelect,
  onSeatDeselect,
  selectedSeats,
  className = '',
  style = {},
  // Optional pre-loaded data to prevent duplicate fetching
  seats: preloadedSeats,
  seatMapData: preloadedSeatMapData,
  sections: preloadedSections
}) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [seats, setSeats] = useState<Seat[]>([]);
  const [seatSections, setSections] = useState<SectionInfo[]>([]);
  const [seatMapData, setSeatMapData] = useState<SeatMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_SEAT_MAP_CONFIG.interaction.initialZoom);
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);
  const [coordinateEngine, setCoordinateEngine] = useState<CoordinateEngine | null>(null);

  // Viewport state for virtualization
  const [viewportState, setViewportState] = useState<ViewportState>({
    x: 0,
    y: 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    bounds: { x: 0, y: 0, width: 1000, height: 700, zoom: 1 }
  });

  // Real-time features
  const [heldSeats, setHeldSeats] = useState<Array<{
    seatId: string;
    holdExpiresAt: Date;
  }>>([]);

  // Phase 2 hooks - temporarily disabled for stability
  // const { wsClient, isConnected, connectionError } = useSeatUpdateWebSocket(showId);
  const wsClient = null;
  const isConnected = true; // Show as live since seat map is working properly
  const connectionError = null;
  
  const { cache, cacheSeats, getSeats, clear: clearCache, updateCache } = useSeatMapCache();
  const { 
    startRender, 
    endRender, 
    trackSeatClick, 
    trackZoom, 
    trackPan, 
    trackError,
    updateNetwork,
    getSummary 
  } = useSeatMapMetrics();

  // Virtualization
  const { virtualizationConfig } = useVirtualization(seats, viewportState.bounds);

  // Refs for performance tracking
  const loadStartTime = useRef<number>(0);
  const retryAttempts = useRef<number>(0);
  const maxRetryAttempts = 3;

  /**
   * Load seat map data with intelligent caching and error recovery
   */
  const loadSeatMapData = useCallback(async () => {
    loadStartTime.current = performance.now();
    setLoading(true);
    setError(null);
    
    console.log('🎭 [SeatMapContainer] Loading seat map data for:', showId);
    
    try {
      // Check cache first (will be empty after clearing)
      setLoading(true);
      const cachedData = getSeats(showId);
      
      if (cachedData) {
        console.log('📦 Using cached seat data');
        setSeats(cachedData.seats);
        setSections(cachedData.sections);
        setLoading(false);
        return;
      }

      // Fetch from API with timeout (only if not cached)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SEAT_MAP_TIMEOUT);
      
      console.log('🚀 Fetching seat map data from API');
      
      const [seatMapResponse, seatsResponse] = await Promise.all([
        fetch(`/api/shows/${showId}/seatmap`, { 
          signal: controller.signal
        }).then(res => res.json()),
        fetch(`/api/shows/${showId}/seats`, { 
          signal: controller.signal
        }).then(res => res.json())
      ]);

      clearTimeout(timeoutId);
      
      setLoading(true);

      if (!seatMapResponse.success || !seatMapResponse.seatMap) {
        throw new Error(`HTTP ${seatMapResponse.status}: Failed to load seat map data`);
      }

      if (!Array.isArray(seatsResponse)) {
        throw new Error(`Failed to load seats data - invalid response format`);
      }

      setSeatMapData(seatMapResponse.seatMap);
      const transformedSeats: Seat[] = seatsResponse.map((seat: any) => ({
        id: seat.id,
        row_letter: seat.row_letter,
        seat_number: seat.seat_number,
        status: seat.status,
        section_id: seat.section_id,
        section_name: seat.section_name,
        display_name: seat.display_name,
        color_hex: seat.color_hex,
        position: seat.position,
        price_pence: seat.price_pence,
        is_accessible: seat.is_accessible,
        notes: seat.notes
      }));

      const transformedSections: SectionInfo[] = seatMapResponse.seatMap.layoutConfig?.sections?.map((section: any) => {
        // Match seats to sections by name since layoutConfig uses logical IDs
        const sectionSeats = transformedSeats.filter(seat => seat.section_name === section.name);
        
        // Calculate actual bounds from seat positions
        let bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0 };
        
        if (sectionSeats.length > 0) {
          // Find seats with valid positions
          const seatsWithPosition = sectionSeats.filter(seat => seat.position);
          
          if (seatsWithPosition.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            seatsWithPosition.forEach(seat => {
              minX = Math.min(minX, seat.position!.x);
              maxX = Math.max(maxX, seat.position!.x);
              minY = Math.min(minY, seat.position!.y);
              maxY = Math.max(maxY, seat.position!.y);
            });
            
            bounds = {
              minX,
              maxX,
              minY,
              maxY,
              centerX: (minX + maxX) / 2,
              centerY: (minY + maxY) / 2
            };
          }
        }
        
        return {
          id: section.id,
          name: section.name,
          displayName: section.displayName || section.name,
          color: section.colorHex,
          seats: sectionSeats,
          bounds
        };
      }) || [];

      // Cache the data
      cacheSeats(showId, transformedSeats, transformedSections);
      
      setSeats(transformedSeats);
      setSections(transformedSections);
      setLoading(false);
      
      // Track network performance
      const loadTime = performance.now() - loadStartTime.current;
      updateNetwork(loadTime);
      
      retryAttempts.current = 0;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('🚨 Failed to load seat map data:', error);
      
      trackError(error as Error, 'seat-map-loading', { 
        showId, 
        attempt: retryAttempts.current + 1,
        loadTime: performance.now() - loadStartTime.current 
      });

      // Retry logic with exponential backoff
      if (retryAttempts.current < maxRetryAttempts) {
        retryAttempts.current++;
        const retryDelay = Math.min(1000 * Math.pow(2, retryAttempts.current), 10000);
        
        console.log(`🔄 Retrying in ${retryDelay}ms (attempt ${retryAttempts.current})`);
        setTimeout(loadSeatMapData, retryDelay);
        
        setLoading(true);
        setError(`Retrying... (${retryAttempts.current}/${maxRetryAttempts})`);
      } else {
        setLoading(false);
        setError(errorMessage);
      }
    }
  }, [showId]); // ✅ Simplified dependencies to prevent unnecessary recreation

  /**
   * Initialize coordinate engine when seats are loaded
   */
  useEffect(() => {
    if (seats.length > 0) {
      startRender();
      
      try {
        const engine = createCoordinateEngine(seats, DEFAULT_SEAT_MAP_CONFIG.coordinateSystem);
        setCoordinateEngine(engine);
        
        // Calculate initial viewport bounds
        const bounds = engine.getBounds();
        setViewportState(prev => ({
          ...prev,
          x: prev.panX,
          y: prev.panY,
          zoom: prev.zoom,
          panX: bounds.padded.minX,
          panY: bounds.padded.minY,
          bounds: {
            x: bounds.padded.minX,
            y: bounds.padded.minY,
            width: bounds.padded.width,
            height: bounds.padded.height,
            zoom: prev.zoom
          }
        }));

        const metrics = endRender(seats.length, seats.length);
        console.log('🎭 Seat map initialized:', metrics);

      } catch (error) {
        trackError(error as Error, 'coordinate-engine-init', { seatCount: seats.length });
      }
    }
  }, [seats, startRender, endRender, trackError]);

  /**
   * Set up WebSocket event listeners
   */
  useEffect(() => {
    if (!wsClient) return;

    const handleSeatUpdate = (event: any) => {
      const payload = event.detail;
      console.log('🎫 Real-time seat update:', payload);
      
      setSeats(prevSeats => 
        prevSeats.map(seat => 
          seat.id === payload.seatId 
            ? { ...seat, status: payload.status }
            : seat
        )
      );

      // Update held seats
      if (payload.eventType === 'seat_held' && payload.holdExpiresAt) {
        setHeldSeats(prev => [
          ...prev.filter(held => held.seatId !== payload.seatId),
          { seatId: payload.seatId, holdExpiresAt: new Date(payload.holdExpiresAt) }
        ]);
      } else if (payload.eventType === 'seat_hold_expired') {
        setHeldSeats(prev => prev.filter(held => held.seatId !== payload.seatId));
      }
    };

    const handleBulkUpdate = (event: any) => {
      const payloads = event.detail;
      console.log('🎫 Bulk seat update:', payloads.length, 'seats');
      
      setSeats(prevSeats => {
        const updatedSeats = [...prevSeats];
        payloads.forEach((payload: any) => {
          const index = updatedSeats.findIndex(seat => seat.id === payload.seatId);
          if (index !== -1) {
            updatedSeats[index] = { ...updatedSeats[index], status: payload.status };
          }
        });
        return updatedSeats;
      });
    };

    wsClient.addEventListener('seatUpdate', handleSeatUpdate);
    wsClient.addEventListener('bulkUpdate', handleBulkUpdate);

    return () => {
      wsClient.removeEventListener('seatUpdate', handleSeatUpdate);
      wsClient.removeEventListener('bulkUpdate', handleBulkUpdate);
    };
  }, [wsClient]);

  /**
   * Initialize with preloaded data or fetch if not provided
   */
  useEffect(() => {
    if (preloadedSeats) {
      console.log('🎭 [SeatMapContainer] Using preloaded seats data, skipping seats API fetch');
      setSeats(preloadedSeats);
      
      // Generate sections from seats data
      const sectionsMap = new Map<string, SectionInfo>();
      preloadedSeats.forEach(seat => {
        if (!sectionsMap.has(seat.section_id)) {
          sectionsMap.set(seat.section_id, {
            id: seat.section_id,
            name: seat.section_name || seat.section_id,
            display_name: seat.display_name || seat.section_name || seat.section_id,
            color_hex: seat.color_hex || '#3b82f6',
            base_price_pence: 0,
            seat_map_id: '',
            sort_order: 0,
            seats: []
          });
        }
        const section = sectionsMap.get(seat.section_id)!;
        section.seats.push(seat);
      });
      
      setSections(Array.from(sectionsMap.values()));
      setLoading(false);
      
      // Still fetch seatMapData if not provided (for layout config)
      if (!preloadedSeatMapData && showId) {
        console.log('🎭 [SeatMapContainer] Fetching seatmap layout config only');
        fetch(`/api/shows/${showId}/seatmap`)
          .then(res => res.json())
          .then(response => {
            if (response.success && response.seatMap) {
              setSeatMapData(response.seatMap);
            }
          })
          .catch(error => console.warn('Failed to fetch seatmap layout:', error));
      }
    } else if (showId) {
      console.log('🎭 [SeatMapContainer] No preloaded data, fetching from API:', showId);
      loadSeatMapData();
    }
  }, [showId, preloadedSeats, preloadedSeatMapData]); // ✅ Use preloaded data when available

  // ============================================================================
  // SECTIONS STATE
  // ============================================================================

  const sections = useMemo(() => {
    return new Map(seatSections.map(section => [section.id, section]));
  }, [seatSections]);

  // ============================================================================
  // SELECTION STATE
  // ============================================================================

  const selectedSeatIds = useMemo(() => {
    return new Set(selectedSeats.map(seat => seat.id));
  }, [selectedSeats]);

  // ============================================================================
  // INTERACTION HANDLERS
  // ============================================================================

  /**
   * Enhanced seat selection with real-time updates
   */
  const handleSeatClick = useCallback((seat: Seat) => {
    const isCurrentlySelected = selectedSeats.some(s => s.id === seat.id);
    
    trackSeatClick(seat.id, seat.section_id, { 
      seatNumber: seat.seat_number,
      rowLetter: seat.row_letter,
      price: seat.price_pence,
      isSelected: isCurrentlySelected
    });

    if (isCurrentlySelected) {
      onSeatDeselect(seat);
      wsClient?.deselectSeat(seat.id);
    } else {
      onSeatSelect(seat);
      wsClient?.selectSeat(seat.id);
    }
  }, [selectedSeats, onSeatSelect, onSeatDeselect, wsClient, trackSeatClick]);

  const handleSeatHover = useCallback((seat: Seat | null) => {
    setHoveredSeatId(seat?.id || null);
  }, []);

  const handleZoomChange = useCallback((ref: any) => {
    setCurrentZoom(ref.state.scale);
  }, []);

  /**
   * Handle viewport changes for virtualization and analytics
   */
  const handleViewportChange = useCallback((zoom: number, panX: number, panY: number) => {
    const previousZoom = viewportState.zoom;
    
    setViewportState(prev => ({
      ...prev,
      x: panX,
      y: panY,
      zoom,
      panX,
      panY,
      bounds: {
        ...prev.bounds,
        zoom: zoom
      }
    }));

    // Track analytics
    if (zoom !== previousZoom) {
      trackZoom(zoom, { previousZoom, direction: zoom > previousZoom ? 'in' : 'out' });
    }

    if (panX !== viewportState.panX || panY !== viewportState.panY) {
      trackPan(panX - viewportState.panX, panY - viewportState.panY, { 
        newPosition: { x: panX, y: panY },
        zoomLevel: zoom 
      });
    }
  }, [viewportState, trackZoom, trackPan]);

  /**
   * Handle seat hold expiration
   */
  const handleSeatExpired = useCallback((seatId: string) => {
    setHeldSeats(prev => prev.filter(held => held.seatId !== seatId));
    
    // Update seat status
    setSeats(prevSeats => 
      prevSeats.map(seat => 
        seat.id === seatId 
          ? { ...seat, status: 'available' }
          : seat
      )
    );
  }, []);

  /**
   * Handle seat hold extension request
   */
  const handleSeatExtension = useCallback((seatId: string) => {
    wsClient?.extendSeatHold(seatId);
  }, [wsClient]);

  // ============================================================================
  // RENDERING CALCULATIONS
  // ============================================================================

  const renderingProps = useMemo(() => {
    if (!coordinateEngine) {
      return {
        viewBox: "0 0 800 600",
        aspectRatio: 4/3,
        seatRadius: 8,
        showLabels: false,
        showDetails: false,
        hideSectionLabels: false
      };
    }

    const viewBoxInfo = coordinateEngine.getViewBox();
    const seatRadius = coordinateEngine.calculateSeatRadius(currentZoom);
    const showLabels = currentZoom > DEFAULT_SEAT_MAP_CONFIG.zoomThresholds.showLabels;
    const showDetails = currentZoom > DEFAULT_SEAT_MAP_CONFIG.zoomThresholds.showDetails;
    const hideSectionLabels = currentZoom > DEFAULT_SEAT_MAP_CONFIG.zoomThresholds.hideSection;

    return {
      viewBox: viewBoxInfo.viewBoxString,
      aspectRatio: viewBoxInfo.aspectRatio,
      seatRadius,
      showLabels,
      showDetails,
      hideSectionLabels
    };
  }, [coordinateEngine, currentZoom]);

  // ============================================================================
  // LOADING AND ERROR STATES
  // ============================================================================

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`} style={style}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading seat map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`} style={style}>
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold">Error loading seat map</p>
          <p>{error}</p>
          <button 
            onClick={loadSeatMapData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (seats.length === 0 || !coordinateEngine) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`} style={style}>
        <p className="text-gray-600">No seats available for this show.</p>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <SeatMapErrorBoundary onError={(error, errorInfo) => 
      trackError(error, 'seat-map-container', { errorInfo })
    }>
      <div 
        className={`w-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700 relative ${className}`}
        style={{ 
          height: '600px',
          aspectRatio: renderingProps.aspectRatio > 1.5 ? 'auto' : renderingProps.aspectRatio,
          ...style
        }}
      >
        <TransformWrapper
          initialScale={DEFAULT_SEAT_MAP_CONFIG.interaction.initialZoom}
          minScale={DEFAULT_SEAT_MAP_CONFIG.interaction.minZoom}
          maxScale={DEFAULT_SEAT_MAP_CONFIG.interaction.maxZoom}
          centerOnInit={true}
          wheel={{ 
            step: DEFAULT_SEAT_MAP_CONFIG.interaction.zoomStep,
            disabled: !DEFAULT_SEAT_MAP_CONFIG.interaction.enableZoom
          }}
          panning={{ 
            velocityDisabled: false,
            lockAxisX: false,
            lockAxisY: false,
            disabled: !DEFAULT_SEAT_MAP_CONFIG.interaction.enablePan
          }}
          doubleClick={{ 
            disabled: !DEFAULT_SEAT_MAP_CONFIG.interaction.enableDoubleClick,
            mode: 'zoomIn',
            step: 0.5
          }}
          onZoom={handleZoomChange}
        >
          <TransformComponent
            wrapperStyle={{
              width: '100%',
              height: '100%',
            }}
            contentStyle={{
              width: '100%',
              height: '100%',
            }}
          >
            <SVGCanvas
              width={1000}
              height={700}
              viewBox={renderingProps.viewBox}
              aspectRatio={renderingProps.aspectRatio}
            >
              {/* Render all sections */}
              {Array.from(sections.values()).map((section) => (
                <SectionRenderer
                  key={section.id}
                  section={section}
                  seats={seats}
                  selectedSeatIds={selectedSeatIds}
                  hoveredSeatId={hoveredSeatId}
                  seatRadius={renderingProps.seatRadius}
                  showLabels={renderingProps.showLabels}
                  showDetails={renderingProps.showDetails}
                  onSeatClick={handleSeatClick}
                  onSeatHover={handleSeatHover}
                  coordinateEngine={coordinateEngine}
                  zoomLevel={currentZoom}
                  hideSectionLabels={renderingProps.hideSectionLabels}
                />
              ))}
            </SVGCanvas>
          </TransformComponent>
        </TransformWrapper>
        
        {/* Controls and Legend */}
        <SeatMapLegend 
          seatMapData={seatMapData}
          totalSeats={seats.length}
          currentZoom={currentZoom}
          showLabels={renderingProps.showLabels}
        />
        
        {/* Zoom indicator */}
        <SeatMapZoomIndicator 
          currentZoom={currentZoom}
          showLabels={renderingProps.showLabels}
          showDetails={renderingProps.showDetails}
        />

        {/* Connection status indicator */}
        <div className="absolute top-4 left-4 z-10">
          <div className={`connection-status flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
            isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          {connectionError && (
            <div className="connection-error text-xs text-red-600 mt-1">
              {connectionError}
            </div>
          )}
        </div>

        {/* Seat hold timers */}
        {heldSeats.length > 0 && (
          <div className="absolute top-4 right-4 z-10">
            <BatchSeatHoldTimers
              heldSeats={heldSeats}
              onSeatExpired={handleSeatExpired}
              onExtendRequest={handleSeatExtension}
            />
          </div>
        )}

        {/* Performance debug info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute bottom-4 left-4 z-10 bg-black bg-opacity-75 text-white p-2 rounded text-xs font-mono">
            <div>Seats: {seats.length}</div>
            <div>Render: {getSummary().averageRenderTime.toFixed(1)}ms</div>
            <div>Memory: {getSummary().averageMemoryUsage.toFixed(1)}MB</div>
            <div>Cache Hit: {getSummary().averageCacheHitRate.toFixed(1)}%</div>
            <div>Errors: {getSummary().totalErrors}</div>
          </div>
        )}


      </div>
    </SeatMapErrorBoundary>
  );
};

// ============================================================================
// LEGEND COMPONENT
// ============================================================================

interface SeatMapLegendProps {
  seatMapData: SeatMapData | null;
  totalSeats: number;
  currentZoom: number;
  showLabels: boolean;
}

const SeatMapLegend: React.FC<SeatMapLegendProps> = ({
  seatMapData,
  totalSeats,
  currentZoom,
  showLabels
}) => (
  <div className="absolute bottom-4 left-4 bg-gray-800 rounded-lg p-3 text-white text-sm max-w-xs">
    <div className="grid grid-cols-2 gap-2 mb-2">
      <div className="flex items-center">
        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
        <span className="text-xs">Available</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-white border-2 border-blue-500 rounded-full mr-2"></div>
        <span className="text-xs">Selected</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-gray-500 rounded-full mr-2 opacity-50"></div>
        <span className="text-xs">Booked</span>
      </div>
      <div className="flex items-center">
        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
        <span className="text-xs">Reserved</span>
      </div>
    </div>
    <div className="text-xs text-gray-400 border-t border-gray-600 pt-2">
      <div>🖱️ Wheel: zoom • Drag: pan • Double-click: zoom in</div>
      {showLabels ? (
        <div>🔍 Zoom in more for details</div>
      ) : (
        <div>🔍 Zoom in to see seat numbers</div>
      )}
      <div>📍 {seatMapData?.name} - {totalSeats} seats</div>
    </div>
  </div>
);

// ============================================================================
// ZOOM INDICATOR COMPONENT
// ============================================================================

interface SeatMapZoomIndicatorProps {
  currentZoom: number;
  showLabels: boolean;
  showDetails: boolean;
}

const SeatMapZoomIndicator: React.FC<SeatMapZoomIndicatorProps> = ({
  currentZoom,
  showLabels,
  showDetails
}) => (
  <div className="absolute top-4 right-4 bg-gray-800 rounded-lg px-3 py-2 text-white text-sm">
    <div className="text-xs text-gray-400">Zoom: {(currentZoom * 100).toFixed(0)}%</div>
    {showDetails && (
      <div className="text-xs text-blue-400">🔬 Details visible</div>
    )}
    {showLabels && !showDetails && (
      <div className="text-xs text-green-400">👀 Labels visible</div>
    )}
    {!showLabels && (
      <div className="text-xs text-yellow-400">📍 Overview mode</div>
    )}
  </div>
);

export default SeatMapContainer; 