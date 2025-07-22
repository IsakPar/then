// TODO [Phase 2]: Add viewport-based virtualization for large venues (2000+ seats)
// Purpose: Optimize rendering performance by only displaying seats visible in current viewport

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { ViewportBounds, VirtualizationConfig } from '../../types/seat-map-shared';
import { Seat as SeatType, SectionInfo } from './types';
import Seat from './Seat';
import { CoordinateEngine } from './CoordinateEngine';

interface VirtualizedSeatMapProps {
  seats: SeatType[];
  sections: SectionInfo[];
  coordinateEngine: CoordinateEngine;
  selectedSeats: string[];
  onSeatSelect: (seatId: string) => void;
  onSeatDeselect: (seatId: string) => void;
  viewport: ViewportBounds;
  className?: string;
  virtualizationConfig?: Partial<VirtualizationConfig>;
}

interface SeatChunk {
  id: string;
  seats: SeatType[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  priority: number; // Distance from viewport center
}

/**
 * Default virtualization configuration
 */
const DEFAULT_VIRTUALIZATION_CONFIG: VirtualizationConfig = {
  enabled: true,
  bufferSize: 100,      // Extra pixels around viewport
  chunkSize: 50,        // Seats per chunk
  throttleMs: 16        // ~60fps throttling
};

/**
 * Virtualized seat map that only renders visible seats for performance
 */
export const VirtualizedSeatMap: React.FC<VirtualizedSeatMapProps> = ({
  seats,
  sections,
  coordinateEngine,
  selectedSeats,
  onSeatSelect,
  onSeatDeselect,
  viewport,
  className = '',
  virtualizationConfig = {}
}) => {
  const config = { ...DEFAULT_VIRTUALIZATION_CONFIG, ...virtualizationConfig };
  const [visibleChunks, setVisibleChunks] = useState<SeatChunk[]>([]);
  const [renderStats, setRenderStats] = useState({
    totalSeats: 0,
    visibleSeats: 0,
    chunksRendered: 0,
    lastUpdateTime: 0
  });
  
  const chunksRef = useRef<SeatChunk[]>([]);
  const throttleTimeoutRef = useRef<NodeJS.Timeout>();
  const intersectionObserverRef = useRef<IntersectionObserver>();

  /**
   * Create seat chunks for efficient viewport culling
   */
  const createSeatChunks = useCallback((seats: SeatType[]): SeatChunk[] => {
    const chunks: SeatChunk[] = [];
    
    // Group seats into spatial chunks
    for (let i = 0; i < seats.length; i += config.chunkSize) {
      const chunkSeats = seats.slice(i, i + config.chunkSize);
      
      if (chunkSeats.length === 0) continue;

             // Calculate chunk bounds
       const bounds = chunkSeats.reduce((acc, seat) => {
         const coord = coordinateEngine.transformPosition(seat.position!);
         return {
           minX: Math.min(acc.minX, coord.x),
           maxX: Math.max(acc.maxX, coord.x),
           minY: Math.min(acc.minY, coord.y),
           maxY: Math.max(acc.maxY, coord.y)
         };
       }, {
         minX: Infinity,
         maxX: -Infinity,
         minY: Infinity,
         maxY: -Infinity
       });

      chunks.push({
        id: `chunk-${i}-${chunkSeats.length}`,
        seats: chunkSeats,
        bounds,
        priority: 0 // Will be calculated based on viewport
      });
    }

    return chunks;
  }, [coordinateEngine, config.chunkSize]);

  /**
   * Calculate viewport bounds with buffer
   */
  const getExpandedViewport = useCallback((viewport: ViewportBounds): ViewportBounds => {
    const buffer = config.bufferSize / viewport.zoom;
    return {
      x: viewport.x - buffer,
      y: viewport.y - buffer,
      width: viewport.width + (buffer * 2),
      height: viewport.height + (buffer * 2),
      zoom: viewport.zoom
    };
  }, [config.bufferSize]);

  /**
   * Check if chunk intersects with viewport
   */
  const chunkIntersectsViewport = useCallback((chunk: SeatChunk, viewport: ViewportBounds): boolean => {
    const expandedViewport = getExpandedViewport(viewport);
    
    return !(
      chunk.bounds.maxX < expandedViewport.x ||
      chunk.bounds.minX > expandedViewport.x + expandedViewport.width ||
      chunk.bounds.maxY < expandedViewport.y ||
      chunk.bounds.minY > expandedViewport.y + expandedViewport.height
    );
  }, [getExpandedViewport]);

  /**
   * Calculate chunk priority based on distance from viewport center
   */
  const calculateChunkPriority = useCallback((chunk: SeatChunk, viewport: ViewportBounds): number => {
    const chunkCenterX = (chunk.bounds.minX + chunk.bounds.maxX) / 2;
    const chunkCenterY = (chunk.bounds.minY + chunk.bounds.maxY) / 2;
    const viewportCenterX = viewport.x + viewport.width / 2;
    const viewportCenterY = viewport.y + viewport.height / 2;
    
    const distance = Math.sqrt(
      Math.pow(chunkCenterX - viewportCenterX, 2) +
      Math.pow(chunkCenterY - viewportCenterY, 2)
    );
    
    return distance;
  }, []);

  /**
   * Update visible chunks based on current viewport
   */
  const updateVisibleChunks = useCallback(() => {
    if (!config.enabled) {
      setVisibleChunks(chunksRef.current);
      return;
    }

    const startTime = performance.now();
    
    const visibleChunks = chunksRef.current
      .filter(chunk => chunkIntersectsViewport(chunk, viewport))
      .map(chunk => ({
        ...chunk,
        priority: calculateChunkPriority(chunk, viewport)
      }))
      .sort((a, b) => a.priority - b.priority); // Closest chunks first

    setVisibleChunks(visibleChunks);

    // Update render statistics
    const visibleSeatCount = visibleChunks.reduce((sum, chunk) => sum + chunk.seats.length, 0);
    setRenderStats({
      totalSeats: seats.length,
      visibleSeats: visibleSeatCount,
      chunksRendered: visibleChunks.length,
      lastUpdateTime: performance.now() - startTime
    });

    console.log(`🎭 Virtualization: ${visibleSeatCount}/${seats.length} seats visible (${visibleChunks.length} chunks)`);
  }, [seats.length, viewport, config.enabled, chunkIntersectsViewport, calculateChunkPriority]);

  /**
   * Throttled viewport update handler
   */
  const handleViewportChange = useCallback(() => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    throttleTimeoutRef.current = setTimeout(() => {
      updateVisibleChunks();
    }, config.throttleMs);
  }, [updateVisibleChunks, config.throttleMs]);

  /**
   * Initialize chunks when seats change
   */
  useEffect(() => {
    const chunks = createSeatChunks(seats);
    chunksRef.current = chunks;
    updateVisibleChunks();
  }, [seats, createSeatChunks, updateVisibleChunks]);

  /**
   * Update visible chunks when viewport changes
   */
  useEffect(() => {
    handleViewportChange();
  }, [viewport, handleViewportChange]);

  /**
   * Memory cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
    };
  }, []);

  /**
   * Get section for a seat
   */
  const getSectionForSeat = useCallback((seatId: string): SectionInfo | undefined => {
    const seat = seats.find(s => s.id === seatId);
    return seat ? sections.find(section => section.id === seat.section_id) : undefined;
  }, [seats, sections]);

  /**
   * Enhanced seat selection with virtualization awareness
   */
  const handleSeatClick = useCallback((seatId: string) => {
    if (selectedSeats.includes(seatId)) {
      onSeatDeselect(seatId);
    } else {
      onSeatSelect(seatId);
    }
  }, [selectedSeats, onSeatSelect, onSeatDeselect]);

  /**
   * Render visible seats from chunks
   */
  const renderVisibleSeats = useMemo(() => {
    return visibleChunks.flatMap(chunk => 
      chunk.seats.map(seat => {
        if (!seat.position) return null;
        
        const position = coordinateEngine.transformPosition(seat.position);
        const isSelected = selectedSeats.includes(seat.id);
        const radius = coordinateEngine.calculateSeatRadius(viewport.zoom);

        return (
          <Seat
            key={seat.id}
            seat={seat}
            position={position}
            radius={radius}
            isSelected={isSelected}
            isHovered={false}
            showLabel={viewport.zoom > 1.5}
            showDetails={viewport.zoom > 2.0}
            onSeatClick={(seatObj) => handleSeatClick(seatObj.id)}
          />
        );
      }).filter(Boolean)
    );
  }, [visibleChunks, coordinateEngine, selectedSeats, handleSeatClick, viewport.zoom]);

  /**
   * Performance debugging component
   */
  const PerformanceDebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;

    return (
      <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs font-mono">
        <div>Total Seats: {renderStats.totalSeats}</div>
        <div>Visible: {renderStats.visibleSeats}</div>
        <div>Chunks: {renderStats.chunksRendered}</div>
        <div>Update Time: {renderStats.lastUpdateTime.toFixed(2)}ms</div>
        <div>Zoom: {viewport.zoom.toFixed(2)}x</div>
        <div>Buffer: {config.bufferSize}px</div>
        <div>Virtualization: {config.enabled ? 'ON' : 'OFF'}</div>
      </div>
    );
  };

  return (
    <g className={`virtualized-seatmap ${className}`}>
      {/* Render visible seats */}
      {renderVisibleSeats}
      
      {/* Performance debugging overlay */}
      <foreignObject x="0" y="0" width="100%" height="100%" pointerEvents="none">
        <PerformanceDebugInfo />
      </foreignObject>
      
      {/* Viewport indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <rect
          x={viewport.x}
          y={viewport.y}
          width={viewport.width}
          height={viewport.height}
          fill="none"
          stroke="red"
          strokeWidth={2 / viewport.zoom}
          strokeDasharray={`${10 / viewport.zoom},${5 / viewport.zoom}`}
          opacity={0.3}
          pointerEvents="none"
        />
      )}
    </g>
  );
};

/**
 * Hook to use virtualization with a seat map
 */
export function useVirtualization(
  seats: SeatType[],
  viewport: ViewportBounds,
  config?: Partial<VirtualizationConfig>
) {
  const [isVirtualizationEnabled, setIsVirtualizationEnabled] = useState(true);
  const [performanceMode, setPerformanceMode] = useState<'auto' | 'high' | 'standard'>('auto');

  // Auto-enable virtualization for large seat counts
  useEffect(() => {
    if (config?.enabled === undefined) {
      const shouldVirtualize = seats.length > 500 || performanceMode === 'high';
      setIsVirtualizationEnabled(shouldVirtualize);
    }
  }, [seats.length, performanceMode, config?.enabled]);

  // Monitor performance and adjust settings
  const optimizePerformance = useCallback(() => {
    if (seats.length > 2000) {
      setPerformanceMode('high');
    } else if (seats.length > 1000) {
      setPerformanceMode('auto');
    } else {
      setPerformanceMode('standard');
    }
  }, [seats.length]);

  useEffect(() => {
    optimizePerformance();
  }, [optimizePerformance]);

  const virtualizationConfig: VirtualizationConfig = useMemo(() => ({
    ...DEFAULT_VIRTUALIZATION_CONFIG,
    enabled: isVirtualizationEnabled,
    bufferSize: performanceMode === 'high' ? 50 : 100,
    chunkSize: performanceMode === 'high' ? 25 : 50,
    throttleMs: performanceMode === 'high' ? 32 : 16,
    ...config
  }), [isVirtualizationEnabled, performanceMode, config]);

  return {
    virtualizationConfig,
    isVirtualizationEnabled,
    setIsVirtualizationEnabled,
    performanceMode,
    setPerformanceMode
  };
}

export default VirtualizedSeatMap; 