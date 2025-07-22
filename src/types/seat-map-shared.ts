// TODO [Phase 2]: Shared interfaces for cross-platform seat map consistency
// Purpose: Ensure consistent data structures across web and mobile platforms

/**
 * Real-time seat update event types
 */
export type SeatUpdateEventType = 
  | 'seat_selected'
  | 'seat_released'
  | 'seat_purchased'
  | 'seat_held'
  | 'seat_hold_expired'
  | 'seat_availability_changed';

/**
 * Real-time seat update payload
 */
export interface SeatUpdatePayload {
  seatId: string;
  showId: string;
  eventType: SeatUpdateEventType;
  status: 'available' | 'selected' | 'held' | 'purchased' | 'unavailable';
  userId?: string;
  holdExpiresAt?: Date;
  price?: number;
  timestamp: Date;
}

/**
 * WebSocket message structure for seat updates
 */
export interface SeatUpdateMessage {
  type: 'seat_update' | 'bulk_update' | 'connection_status' | 'error';
  data: SeatUpdatePayload | SeatUpdatePayload[] | ConnectionStatus | ErrorPayload;
  messageId: string;
  timestamp: Date;
}

/**
 * Connection status for WebSocket
 */
export interface ConnectionStatus {
  connected: boolean;
  showId: string;
  userCount: number;
  lastHeartbeat: Date;
}

/**
 * Error payload for WebSocket errors
 */
export interface ErrorPayload {
  code: string;
  message: string;
  recoverable: boolean;
  retryAfter?: number;
}

/**
 * Seat hold timer configuration
 */
export interface SeatHoldConfig {
  holdDurationMs: number;
  warningThresholdMs: number;
  extendable: boolean;
  maxExtensions: number;
}

/**
 * Viewport bounds for virtualization
 */
export interface ViewportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
}

/**
 * Virtualization configuration
 */
export interface VirtualizationConfig {
  enabled: boolean;
  bufferSize: number; // Extra seats to render outside viewport
  chunkSize: number;  // Number of seats per render chunk
  throttleMs: number; // Debounce time for viewport changes
}

/**
 * Performance metrics structure
 */
export interface SeatMapPerformanceMetrics {
  renderTime: number;
  coordinateTransformTime: number;
  seatCount: number;
  visibleSeatCount: number;
  memoryUsage: number;
  cacheHitRate: number;
  networkLatency?: number;
}

/**
 * User interaction analytics event
 */
export interface SeatMapAnalyticsEvent {
  eventType: 'seat_hover' | 'seat_click' | 'zoom_change' | 'pan_action' | 'section_filter' | 'error_encountered';
  seatId?: string;
  sectionId?: string;
  timestamp: Date;
  metadata: Record<string, any>;
  performanceMetrics?: Partial<SeatMapPerformanceMetrics>;
}

/**
 * Caching configuration
 */
export interface CacheConfig {
  seatMapTtl: number;
  seatDataTtl: number;
  maxCacheSize: number;
  persistToDisk: boolean;
  compressionEnabled: boolean;
}

/**
 * Cross-platform coordinate system
 */
export interface StandardizedCoordinates {
  raw: { x: number; y: number };
  normalized: { x: number; y: number };
  scaled: { x: number; y: number };
  viewport: { x: number; y: number };
}

/**
 * Memory management configuration
 */
export interface MemoryManagementConfig {
  maxSeatCache: number;
  cleanupInterval: number;
  gcThreshold: number;
  autoCleanup: boolean;
} 