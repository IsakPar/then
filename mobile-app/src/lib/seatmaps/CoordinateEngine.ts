// TODO [Phase 2]: Synchronize coordinate engines between web and mobile platforms
// Purpose: Ensure consistent seat positioning and transformations across platforms

import { 
  StandardizedCoordinates,
  ViewportBounds,
  SeatMapPerformanceMetrics 
} from '../../types/seat-map-shared';

export interface RawPosition {
  x: number;
  y: number;
}

export interface NormalizedPosition {
  x: number; // 0-1 normalized coordinates
  y: number; // 0-1 normalized coordinates
}

export interface ScaledPosition {
  x: number; // Final coordinates for mobile view
  y: number; // Final coordinates for mobile view
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface SeatDensityInfo {
  averageSpacingX: number;
  averageSpacingY: number;
  recommendedRadius: number;
  totalSeats: number;
  density: number; // seats per unit area
}

export interface MobileViewportInfo {
  width: number;
  height: number;
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface CoordinateSystemConfig {
  paddingPercent: number; // Default: 0.1 (10%)
  minSeatRadius: number;  // Default: 8 (larger for mobile)
  maxSeatRadius: number;  // Default: 20 (larger for mobile)
  seatSpacingFactor: number; // Default: 0.4 (slightly more spacing for touch)
}

/**
 * Mobile-optimized coordinate engine for React Native
 * Maintains compatibility with web version while optimizing for touch interactions
 */
export class MobileCoordinateEngine {
  private rawBounds: BoundingBox;
  private paddedBounds: BoundingBox;
  private densityInfo: SeatDensityInfo;
  private mobileViewport: MobileViewportInfo;
  private config: CoordinateSystemConfig;

  constructor(
    rawPositions: RawPosition[],
    mobileViewport: MobileViewportInfo,
    config: Partial<CoordinateSystemConfig> = {}
  ) {
    this.config = {
      paddingPercent: 0.1,
      minSeatRadius: 8,      // Larger for mobile touch
      maxSeatRadius: 20,     // Larger for mobile touch
      seatSpacingFactor: 0.4, // More spacing for touch accuracy
      ...config
    };

    this.mobileViewport = mobileViewport;
    this.validateInput(rawPositions);
    this.rawBounds = this.calculateRawBounds(rawPositions);
    this.paddedBounds = this.calculateMobilePaddedBounds(this.rawBounds);
    this.densityInfo = this.calculateDensityInfo(rawPositions, this.rawBounds);
  }

  /**
   * Transform raw coordinates to mobile-optimized coordinates
   */
  public transformPosition(raw: RawPosition): ScaledPosition {
    const normalized = this.normalizePosition(raw);
    return this.scalePosition(normalized);
  }

  /**
   * Batch transform multiple positions for performance
   */
  public batchTransformPositions(positions: RawPosition[]): ScaledPosition[] {
    return positions.map(pos => this.transformPosition(pos));
  }

  /**
   * Get standardized coordinates for cross-platform compatibility
   */
  public getStandardizedCoordinates(raw: RawPosition): StandardizedCoordinates {
    const normalized = this.normalizePosition(raw);
    const scaled = this.scalePosition(normalized);
    
    return {
      raw,
      normalized,
      scaled,
      viewport: this.transformToViewport(scaled)
    };
  }

  /**
   * Normalize position to 0-1 range
   */
  public normalizePosition(raw: RawPosition): NormalizedPosition {
    return {
      x: (raw.x - this.rawBounds.minX) / this.rawBounds.width,
      y: (raw.y - this.rawBounds.minY) / this.rawBounds.height
    };
  }

  /**
   * Scale normalized coordinates to mobile screen coordinates
   */
  public scalePosition(normalized: NormalizedPosition): ScaledPosition {
    return {
      x: this.paddedBounds.minX + (normalized.x * this.paddedBounds.width),
      y: this.paddedBounds.minY + (normalized.y * this.paddedBounds.height)
    };
  }

  /**
   * Transform to viewport coordinates (accounting for safe areas)
   */
  private transformToViewport(scaled: ScaledPosition): { x: number; y: number } {
    return {
      x: scaled.x + this.mobileViewport.safeAreaInsets.left,
      y: scaled.y + this.mobileViewport.safeAreaInsets.top
    };
  }

  /**
   * Calculate optimal seat radius for mobile with zoom level
   */
  public calculateSeatRadius(zoomLevel: number = 1): number {
    const baseRadius = this.densityInfo.recommendedRadius;
    const touchOptimizedRadius = Math.max(baseRadius, 12); // Minimum 12 for touch
    const zoomAdjustedRadius = touchOptimizedRadius * Math.max(0.5, Math.min(2, zoomLevel * 0.8));
    
    return Math.max(
      this.config.minSeatRadius,
      Math.min(this.config.maxSeatRadius, zoomAdjustedRadius)
    );
  }

  /**
   * Check if position is within touch-friendly distance
   */
  public isWithinTouchDistance(pos1: ScaledPosition, pos2: ScaledPosition): boolean {
    const distance = Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
    );
    const minTouchDistance = 44; // iOS recommended minimum touch target
    return distance >= minTouchDistance;
  }

  /**
   * Get viewport bounds for virtualization
   */
  public getViewportBounds(zoom: number, panX: number, panY: number): ViewportBounds {
    const effectiveWidth = this.mobileViewport.width / zoom;
    const effectiveHeight = this.mobileViewport.height / zoom;
    
    return {
      x: panX - effectiveWidth / 2,
      y: panY - effectiveHeight / 2,
      width: effectiveWidth,
      height: effectiveHeight,
      zoom
    };
  }

  /**
   * Optimize for mobile performance
   */
  public getPerformanceMetrics(): Partial<SeatMapPerformanceMetrics> {
    return {
      seatCount: this.densityInfo.totalSeats,
      memoryUsage: this.estimateMemoryUsage(),
      coordinateTransformTime: 0 // Will be measured during actual transforms
    };
  }

  /**
   * Get mobile-specific bounding information
   */
  public getBounds(): { 
    raw: BoundingBox; 
    padded: BoundingBox; 
    viewport: MobileViewportInfo 
  } {
    return {
      raw: { ...this.rawBounds },
      padded: { ...this.paddedBounds },
      viewport: { ...this.mobileViewport }
    };
  }

  /**
   * Get density analysis information
   */
  public getDensityInfo(): SeatDensityInfo {
    return { ...this.densityInfo };
  }

  /**
   * Check if position is valid
   */
  public isValidPosition(raw: RawPosition): boolean {
    return (
      raw.x >= this.rawBounds.minX && 
      raw.x <= this.rawBounds.maxX &&
      raw.y >= this.rawBounds.minY && 
      raw.y <= this.rawBounds.maxY
    );
  }

  /**
   * Validate input positions
   */
  private validateInput(rawPositions: RawPosition[]): void {
    if (!rawPositions || rawPositions.length === 0) {
      throw new Error('MobileCoordinateEngine: Cannot initialize with empty positions array');
    }

    const invalidPositions: string[] = [];
    const duplicatePositions: string[] = [];
    const positionSet = new Set<string>();

    rawPositions.forEach((pos, index) => {
      if (!pos || typeof pos !== 'object') {
        invalidPositions.push(`Position ${index}: null or invalid object`);
        return;
      }

      if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
        invalidPositions.push(`Position ${index}: x,y must be numbers`);
        return;
      }

      if (!isFinite(pos.x) || !isFinite(pos.y)) {
        invalidPositions.push(`Position ${index}: x,y must be finite numbers`);
        return;
      }

      const posKey = `${pos.x},${pos.y}`;
      if (positionSet.has(posKey)) {
        duplicatePositions.push(`Position ${index}: duplicate at (${pos.x}, ${pos.y})`);
      } else {
        positionSet.add(posKey);
      }
    });

    if (invalidPositions.length > 0) {
      throw new Error(`MobileCoordinateEngine validation failed:\n${invalidPositions.join('\n')}`);
    }

    if (duplicatePositions.length > 0) {
      console.warn(`MobileCoordinateEngine: Found duplicate positions:\n${duplicatePositions.join('\n')}`);
    }
  }

  /**
   * Calculate raw bounding box
   */
  private calculateRawBounds(positions: RawPosition[]): BoundingBox {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const pos of positions) {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = minX + width / 2;
    const centerY = minY + height / 2;

    return { minX, minY, maxX, maxY, width, height, centerX, centerY };
  }

  /**
   * Calculate mobile-optimized padded bounds
   */
  private calculateMobilePaddedBounds(rawBounds: BoundingBox): BoundingBox {
    const padding = Math.min(rawBounds.width, rawBounds.height) * this.config.paddingPercent;
    
    // Account for mobile viewport and safe areas
    const availableWidth = this.mobileViewport.width - 
                          this.mobileViewport.safeAreaInsets.left - 
                          this.mobileViewport.safeAreaInsets.right;
    const availableHeight = this.mobileViewport.height - 
                           this.mobileViewport.safeAreaInsets.top - 
                           this.mobileViewport.safeAreaInsets.bottom;

    // Calculate aspect ratio and scale to fit
    const rawAspectRatio = rawBounds.width / rawBounds.height;
    const viewportAspectRatio = availableWidth / availableHeight;
    
    let scaledWidth, scaledHeight;
    
    if (rawAspectRatio > viewportAspectRatio) {
      // Raw is wider, scale by width
      scaledWidth = availableWidth - (padding * 2);
      scaledHeight = scaledWidth / rawAspectRatio;
    } else {
      // Raw is taller, scale by height
      scaledHeight = availableHeight - (padding * 2);
      scaledWidth = scaledHeight * rawAspectRatio;
    }

    const minX = (availableWidth - scaledWidth) / 2;
    const minY = (availableHeight - scaledHeight) / 2;
    const maxX = minX + scaledWidth;
    const maxY = minY + scaledHeight;
    const centerX = minX + scaledWidth / 2;
    const centerY = minY + scaledHeight / 2;

    return { 
      minX, minY, maxX, maxY, 
      width: scaledWidth, 
      height: scaledHeight, 
      centerX, centerY 
    };
  }

  /**
   * Calculate seat density information
   */
  private calculateDensityInfo(positions: RawPosition[], bounds: BoundingBox): SeatDensityInfo {
    const totalSeats = positions.length;
    const area = bounds.width * bounds.height;
    const density = totalSeats / area;

    // Calculate average spacing
    let totalSpacingX = 0;
    let totalSpacingY = 0;
    let spacingCount = 0;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = Math.abs(positions[i].x - positions[j].x);
        const dy = Math.abs(positions[i].y - positions[j].y);
        
        if (dx > 0) {
          totalSpacingX += dx;
          spacingCount++;
        }
        if (dy > 0) {
          totalSpacingY += dy;
        }
      }
    }

    const averageSpacingX = spacingCount > 0 ? totalSpacingX / spacingCount : 50;
    const averageSpacingY = spacingCount > 0 ? totalSpacingY / spacingCount : 50;
    
    // Calculate recommended radius based on spacing and mobile touch requirements
    const spacingBasedRadius = Math.min(averageSpacingX, averageSpacingY) * this.config.seatSpacingFactor;
    const recommendedRadius = Math.max(spacingBasedRadius, 8); // Minimum 8 for mobile

    return {
      averageSpacingX,
      averageSpacingY,
      recommendedRadius,
      totalSeats,
      density
    };
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    const coordinatesSize = this.densityInfo.totalSeats * 8 * 4; // 4 coordinate pairs * 8 bytes each
    const metadataSize = 1024; // Rough estimate for metadata
    return (coordinatesSize + metadataSize) / (1024 * 1024); // Convert to MB
  }
}

/**
 * Create mobile coordinate engine with device-specific optimizations
 */
export function createMobileCoordinateEngine<T extends { position?: RawPosition }>(
  seatsWithPositions: T[],
  mobileViewport: MobileViewportInfo,
  config?: Partial<CoordinateSystemConfig>
): MobileCoordinateEngine {
  const positions = seatsWithPositions
    .filter(seat => seat.position !== undefined)
    .map(seat => seat.position!);

  if (positions.length === 0) {
    throw new Error('No valid positions found in seat data');
  }

  return new MobileCoordinateEngine(positions, mobileViewport, config);
}

/**
 * Batch transform positions for performance optimization
 */
export function batchTransformMobilePositions(
  engine: MobileCoordinateEngine,
  positions: RawPosition[]
): ScaledPosition[] {
  return engine.batchTransformPositions(positions);
}

export default MobileCoordinateEngine; 