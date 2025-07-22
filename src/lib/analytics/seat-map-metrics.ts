// TODO [Phase 2]: Add performance metrics tracking and user interaction analytics
// Purpose: Monitor seat map performance, user behavior, and system health for optimization

import { SeatMapPerformanceMetrics, SeatMapAnalyticsEvent } from '../../types/seat-map-shared';

/**
 * Performance monitoring configuration
 */
interface PerformanceConfig {
  enableRealTimeMetrics: boolean;
  enableUserAnalytics: boolean;
  enableErrorTracking: boolean;
  batchSize: number;
  flushInterval: number;
  maxQueueSize: number;
  enableDebugLogs: boolean;
}

/**
 * Analytics batch entry
 */
interface AnalyticsBatch {
  events: SeatMapAnalyticsEvent[];
  timestamp: number;
  sessionId: string;
  userId?: string;
}

/**
 * Error tracking entry
 */
interface ErrorEvent {
  error: Error;
  context: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  metadata: Record<string, any>;
}

/**
 * Performance benchmark thresholds
 */
const PERFORMANCE_THRESHOLDS = {
  renderTime: 100,           // ms - max acceptable render time
  coordinateTransform: 50,   // ms - max coordinate transformation time
  cacheHitRate: 80,         // % - minimum acceptable cache hit rate
  memoryUsage: 100,         // MB - max memory usage warning threshold
  seatCount: 1000,          // seats - threshold for large venue optimization
  networkLatency: 500       // ms - max acceptable network response time
};

/**
 * Default analytics configuration
 */
const DEFAULT_CONFIG: PerformanceConfig = {
  enableRealTimeMetrics: true,
  enableUserAnalytics: true,
  enableErrorTracking: true,
  batchSize: 50,
  flushInterval: 30000,     // 30 seconds
  maxQueueSize: 1000,
  enableDebugLogs: process.env.NODE_ENV === 'development'
};

/**
 * Seat map analytics and performance monitoring system
 */
export class SeatMapMetrics {
  private config: PerformanceConfig;
  private eventQueue: SeatMapAnalyticsEvent[] = [];
  private errorQueue: ErrorEvent[] = [];
  private performanceEntries: SeatMapPerformanceMetrics[] = [];
  private sessionId: string;
  private flushInterval: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  // Performance tracking
  private renderStartTime = 0;
  private transformStartTime = 0;
  private interactionCounts = new Map<string, number>();
  private errorCounts = new Map<string, number>();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    
    this.startFlushScheduler();
    this.setupPerformanceObserver();
    this.setupErrorHandling();
    
    if (this.config.enableDebugLogs) {
      console.log('📊 SeatMapMetrics initialized', { sessionId: this.sessionId });
    }
  }

  /**
   * Start render performance tracking
   */
  public startRenderTracking(): void {
    this.renderStartTime = performance.now();
  }

  /**
   * End render performance tracking
   */
  public endRenderTracking(seatCount: number, visibleSeatCount: number): SeatMapPerformanceMetrics {
    const renderTime = performance.now() - this.renderStartTime;
    const memoryUsage = this.getMemoryUsage();
    
    const metrics: SeatMapPerformanceMetrics = {
      renderTime,
      coordinateTransformTime: 0, // Will be set separately
      seatCount,
      visibleSeatCount,
      memoryUsage,
      cacheHitRate: 0, // Will be updated by cache system
      networkLatency: 0 // Will be updated by network calls
    };

    this.performanceEntries.push(metrics);
    
    // Check performance thresholds
    this.checkPerformanceThresholds(metrics);
    
    if (this.config.enableDebugLogs) {
      console.log('⏱️ Render performance:', metrics);
    }

    return metrics;
  }

  /**
   * Track coordinate transformation performance
   */
  public trackCoordinateTransform<T>(fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const transformTime = performance.now() - startTime;
    
    // Update latest performance entry
    if (this.performanceEntries.length > 0) {
      this.performanceEntries[this.performanceEntries.length - 1].coordinateTransformTime = transformTime;
    }

    if (transformTime > PERFORMANCE_THRESHOLDS.coordinateTransform) {
      console.warn(`⚠️ Slow coordinate transformation: ${transformTime.toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * Track user interaction events
   */
  public trackInteraction(event: Omit<SeatMapAnalyticsEvent, 'timestamp'>): void {
    if (!this.config.enableUserAnalytics) return;

    const fullEvent: SeatMapAnalyticsEvent = {
      ...event,
      timestamp: new Date(),
      performanceMetrics: this.getLatestPerformanceMetrics()
    };

    this.eventQueue.push(fullEvent);
    this.updateInteractionCounts(event.eventType);

    if (this.config.enableDebugLogs) {
      console.log('👆 User interaction:', fullEvent);
    }

    // Flush if queue is getting full
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.flushEvents();
    }
  }

  /**
   * Track seat hover events
   */
  public trackSeatHover(seatId: string, metadata: Record<string, any> = {}): void {
    this.trackInteraction({
      eventType: 'seat_hover',
      seatId,
      metadata: {
        ...metadata,
        hoverDuration: metadata.hoverDuration || 0
      }
    });
  }

  /**
   * Track seat click events
   */
  public trackSeatClick(seatId: string, sectionId?: string, metadata: Record<string, any> = {}): void {
    this.trackInteraction({
      eventType: 'seat_click',
      seatId,
      sectionId,
      metadata: {
        ...metadata,
        selectionTime: performance.now()
      }
    });
  }

  /**
   * Track zoom changes
   */
  public trackZoomChange(newZoom: number, metadata: Record<string, any> = {}): void {
    this.trackInteraction({
      eventType: 'zoom_change',
      metadata: {
        ...metadata,
        zoomLevel: newZoom,
        zoomDirection: metadata.previousZoom ? (newZoom > metadata.previousZoom ? 'in' : 'out') : 'initial'
      }
    });
  }

  /**
   * Track pan actions
   */
  public trackPanAction(deltaX: number, deltaY: number, metadata: Record<string, any> = {}): void {
    this.trackInteraction({
      eventType: 'pan_action',
      metadata: {
        ...metadata,
        deltaX,
        deltaY,
        distance: Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      }
    });
  }

  /**
   * Track errors with context
   */
  public trackError(error: Error, context: string, metadata: Record<string, any> = {}): void {
    if (!this.config.enableErrorTracking) return;

    const errorEvent: ErrorEvent = {
      error,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      metadata
    };

    this.errorQueue.push(errorEvent);
    this.updateErrorCounts(error.name);

    console.error(`🚨 SeatMap Error [${context}]:`, error, metadata);

    // Track as analytics event
    this.trackInteraction({
      eventType: 'error_encountered',
      metadata: {
        errorName: error.name,
        errorMessage: error.message,
        context,
        ...metadata
      }
    });
  }

  /**
   * Update cache hit rate metrics
   */
  public updateCacheMetrics(hitRate: number): void {
    if (this.performanceEntries.length > 0) {
      this.performanceEntries[this.performanceEntries.length - 1].cacheHitRate = hitRate;
    }
  }

  /**
   * Update network latency metrics
   */
  public updateNetworkLatency(latency: number): void {
    if (this.performanceEntries.length > 0) {
      this.performanceEntries[this.performanceEntries.length - 1].networkLatency = latency;
    }

    if (latency > PERFORMANCE_THRESHOLDS.networkLatency) {
      console.warn(`⚠️ High network latency: ${latency}ms`);
    }
  }

  /**
   * Get current performance summary
   */
  public getPerformanceSummary(): {
    averageRenderTime: number;
    averageTransformTime: number;
    averageCacheHitRate: number;
    averageMemoryUsage: number;
    totalInteractions: number;
    totalErrors: number;
    sessionDuration: number;
  } {
    const entries = this.performanceEntries;
    const totalInteractions = Array.from(this.interactionCounts.values()).reduce((sum, count) => sum + count, 0);
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);

    if (entries.length === 0) {
      return {
        averageRenderTime: 0,
        averageTransformTime: 0,
        averageCacheHitRate: 0,
        averageMemoryUsage: 0,
        totalInteractions,
        totalErrors,
        sessionDuration: Date.now() - parseInt(this.sessionId)
      };
    }

    return {
      averageRenderTime: entries.reduce((sum, e) => sum + e.renderTime, 0) / entries.length,
      averageTransformTime: entries.reduce((sum, e) => sum + e.coordinateTransformTime, 0) / entries.length,
      averageCacheHitRate: entries.reduce((sum, e) => sum + e.cacheHitRate, 0) / entries.length,
      averageMemoryUsage: entries.reduce((sum, e) => sum + e.memoryUsage, 0) / entries.length,
      totalInteractions,
      totalErrors,
      sessionDuration: Date.now() - parseInt(this.sessionId)
    };
  }

  /**
   * Get interaction analytics
   */
  public getInteractionAnalytics(): {
    eventCounts: Record<string, number>;
    topInteractions: Array<{ event: string; count: number }>;
    errorBreakdown: Record<string, number>;
    recentEvents: SeatMapAnalyticsEvent[];
  } {
    const eventCounts = Object.fromEntries(this.interactionCounts);
    const topInteractions = Array.from(this.interactionCounts.entries())
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const errorBreakdown = Object.fromEntries(this.errorCounts);
    const recentEvents = this.eventQueue.slice(-20); // Last 20 events

    return {
      eventCounts,
      topInteractions,
      errorBreakdown,
      recentEvents
    };
  }

  /**
   * Export analytics data for external systems
   */
  public exportAnalytics(): {
    sessionId: string;
    performanceMetrics: SeatMapPerformanceMetrics[];
    events: SeatMapAnalyticsEvent[];
    errors: ErrorEvent[];
    summary: any;
  } {
    return {
      sessionId: this.sessionId,
      performanceMetrics: [...this.performanceEntries],
      events: [...this.eventQueue],
      errors: [...this.errorQueue],
      summary: this.getPerformanceSummary()
    };
  }

  /**
   * Check performance thresholds and warn
   */
  private checkPerformanceThresholds(metrics: SeatMapPerformanceMetrics): void {
    if (metrics.renderTime > PERFORMANCE_THRESHOLDS.renderTime) {
      console.warn(`⚠️ Slow render time: ${metrics.renderTime.toFixed(2)}ms (threshold: ${PERFORMANCE_THRESHOLDS.renderTime}ms)`);
    }

    if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.memoryUsage) {
      console.warn(`⚠️ High memory usage: ${metrics.memoryUsage.toFixed(2)}MB (threshold: ${PERFORMANCE_THRESHOLDS.memoryUsage}MB)`);
    }

    if (metrics.cacheHitRate < PERFORMANCE_THRESHOLDS.cacheHitRate && metrics.cacheHitRate > 0) {
      console.warn(`⚠️ Low cache hit rate: ${metrics.cacheHitRate.toFixed(2)}% (threshold: ${PERFORMANCE_THRESHOLDS.cacheHitRate}%)`);
    }
  }

  /**
   * Get memory usage estimation
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      // @ts-ignore - Chrome-specific API
      return (performance.memory.usedJSHeapSize / 1024 / 1024); // Convert to MB
    }
    return 0; // Fallback for browsers without memory API
  }

  /**
   * Get latest performance metrics
   */
  private getLatestPerformanceMetrics(): Partial<SeatMapPerformanceMetrics> | undefined {
    return this.performanceEntries.length > 0 
      ? this.performanceEntries[this.performanceEntries.length - 1]
      : undefined;
  }

  /**
   * Update interaction counts
   */
  private updateInteractionCounts(eventType: string): void {
    this.interactionCounts.set(eventType, (this.interactionCounts.get(eventType) || 0) + 1);
  }

  /**
   * Update error counts
   */
  private updateErrorCounts(errorName: string): void {
    this.errorCounts.set(errorName, (this.errorCounts.get(errorName) || 0) + 1);
  }

  /**
   * Start flush scheduler
   */
  private startFlushScheduler(): void {
    this.flushInterval = setInterval(() => {
      this.flushEvents();
    }, this.config.flushInterval);
  }

  /**
   * Flush events to external analytics service
   */
  private flushEvents(): void {
    if (this.eventQueue.length === 0) return;

    const batch: AnalyticsBatch = {
      events: [...this.eventQueue],
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    // Clear queues
    this.eventQueue = [];

    // In a real implementation, this would send to an analytics service
    if (this.config.enableDebugLogs) {
      console.log('📤 Flushing analytics batch:', batch);
    }

    // TODO: Implement actual analytics service integration
    // await this.sendToAnalyticsService(batch);
  }

  /**
   * Setup performance observer
   */
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name.includes('seat-map')) {
              console.log('🔍 Performance entry:', entry);
            }
          }
        });
        observer.observe({ entryTypes: ['measure', 'navigation'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }
  }

  /**
   * Setup global error handling
   */
  private setupErrorHandling(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.trackError(event.error, 'global', {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.trackError(new Error(event.reason), 'promise-rejection', {
          reason: event.reason
        });
      });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.isDestroyed) return;

    this.flushEvents(); // Final flush
    
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    this.isDestroyed = true;
    
    if (this.config.enableDebugLogs) {
      console.log('💀 SeatMapMetrics destroyed');
    }
  }
}

/**
 * Global metrics instance
 */
let globalMetrics: SeatMapMetrics | null = null;

/**
 * Get or create global metrics instance
 */
export function getSeatMapMetrics(config?: Partial<PerformanceConfig>): SeatMapMetrics {
  if (!globalMetrics) {
    globalMetrics = new SeatMapMetrics(config);
  }
  return globalMetrics;
}

/**
 * Hook for React components to use seat map metrics
 */
export function useSeatMapMetrics() {
  const metrics = getSeatMapMetrics();
  
  return {
    startRender: () => metrics.startRenderTracking(),
    endRender: (seatCount: number, visibleCount: number) => metrics.endRenderTracking(seatCount, visibleCount),
    trackTransform: <T>(fn: () => T) => metrics.trackCoordinateTransform(fn),
    trackSeatClick: (seatId: string, sectionId?: string, metadata?: Record<string, any>) => 
      metrics.trackSeatClick(seatId, sectionId, metadata),
    trackSeatHover: (seatId: string, metadata?: Record<string, any>) => 
      metrics.trackSeatHover(seatId, metadata),
    trackZoom: (zoom: number, metadata?: Record<string, any>) => 
      metrics.trackZoomChange(zoom, metadata),
    trackPan: (deltaX: number, deltaY: number, metadata?: Record<string, any>) => 
      metrics.trackPanAction(deltaX, deltaY, metadata),
    trackError: (error: Error, context: string, metadata?: Record<string, any>) => 
      metrics.trackError(error, context, metadata),
    updateCache: (hitRate: number) => metrics.updateCacheMetrics(hitRate),
    updateNetwork: (latency: number) => metrics.updateNetworkLatency(latency),
    getSummary: () => metrics.getPerformanceSummary(),
    getAnalytics: () => metrics.getInteractionAnalytics(),
    export: () => metrics.exportAnalytics()
  };
}

export default SeatMapMetrics; 