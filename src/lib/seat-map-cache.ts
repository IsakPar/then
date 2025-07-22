// TODO [Phase 2]: Add intelligent caching layer for seat map performance
// Purpose: Cache seat map data, coordinate transforms, and venue layouts for optimal performance

import { CacheConfig, MemoryManagementConfig } from '../types/seat-map-shared';
import { Seat, SeatMapData, SectionInfo } from '../components/seatmap/types';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated memory size in bytes
  ttl: number;  // Time to live in milliseconds
}

/**
 * Cache statistics for monitoring
 */
interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictions: number;
  lastCleanup: number;
}

/**
 * Default cache configuration
 */
const DEFAULT_CACHE_CONFIG: CacheConfig = {
  seatMapTtl: 30 * 60 * 1000,      // 30 minutes
  seatDataTtl: 10 * 60 * 1000,     // 10 minutes
  maxCacheSize: 50 * 1024 * 1024,  // 50MB
  persistToDisk: false,
  compressionEnabled: true
};

/**
 * Default memory management configuration
 */
const DEFAULT_MEMORY_CONFIG: MemoryManagementConfig = {
  maxSeatCache: 10000,              // Max seats in cache
  cleanupInterval: 5 * 60 * 1000,   // 5 minutes
  gcThreshold: 0.8,                 // 80% of max size
  autoCleanup: true
};

/**
 * Intelligent seat map caching system
 */
export class SeatMapCache {
  private cache = new Map<string, CacheEntry<any>>();
  private stats: CacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    evictions: 0,
    lastCleanup: Date.now()
  };
  
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isCleanupRunning = false;

  constructor(
    private config: CacheConfig = DEFAULT_CACHE_CONFIG,
    private memoryConfig: MemoryManagementConfig = DEFAULT_MEMORY_CONFIG
  ) {
    this.startCleanupScheduler();
    
    // Register cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.cleanup());
    }
  }

  /**
   * Cache seat map data
   */
  public cacheSeatMapData(venueId: string, seatMapData: SeatMapData): void {
    const key = `seatmap:${venueId}`;
    const entry: CacheEntry<SeatMapData> = {
      data: seatMapData,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.estimateSize(seatMapData),
      ttl: this.config.seatMapTtl
    };

    this.setEntry(key, entry);
    console.log(`📦 Cached seat map data for venue: ${venueId}`);
  }

  /**
   * Cache seat data for a show
   */
  public cacheSeatData(showId: string, seats: Seat[], sections: SectionInfo[]): void {
    const key = `seats:${showId}`;
    const data = { seats, sections };
    const entry: CacheEntry<typeof data> = {
      data,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.estimateSize(data),
      ttl: this.config.seatDataTtl
    };

    this.setEntry(key, entry);
    console.log(`🎫 Cached ${seats.length} seats for show: ${showId}`);
  }

  /**
   * Cache coordinate transformation results
   */
  public cacheCoordinateTransforms(
    engineId: string, 
    transforms: Array<{ input: any; output: any }>
  ): void {
    const key = `coords:${engineId}`;
    const entry: CacheEntry<typeof transforms> = {
      data: transforms,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size: this.estimateSize(transforms),
      ttl: this.config.seatDataTtl
    };

    this.setEntry(key, entry);
    console.log(`📐 Cached ${transforms.length} coordinate transforms`);
  }

  /**
   * Get cached seat map data
   */
  public getSeatMapData(venueId: string): SeatMapData | null {
    const key = `seatmap:${venueId}`;
    return this.getEntry(key);
  }

  /**
   * Get cached seat data
   */
  public getSeatData(showId: string): { seats: Seat[]; sections: SectionInfo[] } | null {
    const key = `seats:${showId}`;
    return this.getEntry(key);
  }

  /**
   * Get cached coordinate transforms
   */
  public getCoordinateTransforms(engineId: string): Array<{ input: any; output: any }> | null {
    const key = `coords:${engineId}`;
    return this.getEntry(key);
  }

  /**
   * Set cache entry with size management
   */
  private setEntry<T>(key: string, entry: CacheEntry<T>): void {
    // Check if we need to make space
    if (this.stats.totalSize + entry.size > this.config.maxCacheSize) {
      this.evictLeastRecentlyUsed(entry.size);
    }

    // Remove existing entry if present
    if (this.cache.has(key)) {
      const existing = this.cache.get(key)!;
      this.stats.totalSize -= existing.size;
      this.stats.totalEntries--;
    }

    // Add new entry
    this.cache.set(key, entry);
    this.stats.totalSize += entry.size;
    this.stats.totalEntries++;
  }

  /**
   * Get cache entry with access tracking
   */
  private getEntry<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.missRate++;
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.totalEntries--;
      this.stats.missRate++;
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hitRate++;

    return entry.data;
  }

  /**
   * Evict least recently used entries to make space
   */
  private evictLeastRecentlyUsed(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => a.entry.lastAccessed - b.entry.lastAccessed);

    let freedSpace = 0;
    
    for (const { key, entry } of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.totalEntries--;
      this.stats.evictions++;
      freedSpace += entry.size;
      
      console.log(`🗑️ Evicted cache entry: ${key} (${entry.size} bytes)`);
    }
  }

  /**
   * Estimate memory size of data
   */
  private estimateSize(data: any): number {
    try {
      // Basic estimation using JSON serialization
      const jsonString = JSON.stringify(data);
      return jsonString.length * 2; // Rough estimate for UTF-16 encoding
    } catch {
      // Fallback for circular references or non-serializable data
      return 1024; // Default 1KB
    }
  }

  /**
   * Start automatic cleanup scheduler
   */
  private startCleanupScheduler(): void {
    if (!this.memoryConfig.autoCleanup) return;

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.memoryConfig.cleanupInterval);
  }

  /**
   * Perform cache cleanup
   */
  private performCleanup(): void {
    if (this.isCleanupRunning) return;
    
    this.isCleanupRunning = true;
    const startTime = performance.now();
    let cleanedEntries = 0;
    let freedSpace = 0;

    try {
      const now = Date.now();
      const threshold = this.config.maxCacheSize * this.memoryConfig.gcThreshold;

      // Remove expired entries
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          this.stats.totalSize -= entry.size;
          this.stats.totalEntries--;
          cleanedEntries++;
          freedSpace += entry.size;
        }
      }

      // If still over threshold, remove least accessed entries
      if (this.stats.totalSize > threshold) {
        const entries = Array.from(this.cache.entries())
          .map(([key, entry]) => ({ key, entry }))
          .sort((a, b) => a.entry.accessCount - b.entry.accessCount);

        for (const { key, entry } of entries) {
          if (this.stats.totalSize <= threshold) break;
          
          this.cache.delete(key);
          this.stats.totalSize -= entry.size;
          this.stats.totalEntries--;
          cleanedEntries++;
          freedSpace += entry.size;
        }
      }

      this.stats.lastCleanup = now;
      
      if (cleanedEntries > 0) {
        console.log(`🧹 Cache cleanup: ${cleanedEntries} entries removed, ${freedSpace} bytes freed (${(performance.now() - startTime).toFixed(2)}ms)`);
      }
      
    } finally {
      this.isCleanupRunning = false;
    }
  }

  /**
   * Manual cleanup trigger
   */
  public cleanup(): void {
    this.performCleanup();
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitRate: 0,
      missRate: 0,
      evictions: 0,
      lastCleanup: Date.now()
    };
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats & { 
    hitRatePercent: number; 
    utilizationPercent: number;
    entriesList: Array<{ key: string; size: number; age: number; accessCount: number }>;
  } {
    const totalRequests = this.stats.hitRate + this.stats.missRate;
    const hitRatePercent = totalRequests > 0 ? (this.stats.hitRate / totalRequests) * 100 : 0;
    const utilizationPercent = (this.stats.totalSize / this.config.maxCacheSize) * 100;
    
    const entriesList = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      size: entry.size,
      age: Date.now() - entry.timestamp,
      accessCount: entry.accessCount
    }));

    return {
      ...this.stats,
      hitRatePercent,
      utilizationPercent,
      entriesList
    };
  }

  /**
   * Prefetch data for a venue
   */
  public async prefetchVenueData(venueId: string, shows: string[]): Promise<void> {
    console.log(`🚀 Prefetching data for venue: ${venueId}`);
    
    // This would typically make API calls to prefetch data
    // For now, we'll just log the intent
    for (const showId of shows) {
      console.log(`📋 Queued prefetch for show: ${showId}`);
    }
  }

  /**
   * Destroy cache and cleanup resources
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.clear();
    console.log('💀 SeatMapCache destroyed');
  }
}

/**
 * Global cache instance
 */
let globalCache: SeatMapCache | null = null;

/**
 * Get or create global cache instance
 */
export function getSeatMapCache(
  config?: Partial<CacheConfig>,
  memoryConfig?: Partial<MemoryManagementConfig>
): SeatMapCache {
  if (!globalCache) {
    globalCache = new SeatMapCache(
      { ...DEFAULT_CACHE_CONFIG, ...config },
      { ...DEFAULT_MEMORY_CONFIG, ...memoryConfig }
    );
  }
  return globalCache;
}

/**
 * Hook for React components to use seat map cache
 */
export function useSeatMapCache() {
  const cache = getSeatMapCache();
  
  return {
    cache,
    cacheSeatMap: (venueId: string, data: SeatMapData) => cache.cacheSeatMapData(venueId, data),
    cacheSeats: (showId: string, seats: Seat[], sections: SectionInfo[]) => cache.cacheSeatData(showId, seats, sections),
    getSeatMap: (venueId: string) => cache.getSeatMapData(venueId),
    getSeats: (showId: string) => cache.getSeatData(showId),
    getStats: () => cache.getStats(),
    clear: () => cache.clear(),
    updateCache: () => cache.cleanup() // Alias for cleanup to match expected API
  };
}

export default SeatMapCache; 