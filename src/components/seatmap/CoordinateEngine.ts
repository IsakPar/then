// ============================================================================
// COORDINATE ENGINE - Professional seat map coordinate transformation system
// ============================================================================

export interface RawPosition {
  x: number;
  y: number;
}

export interface NormalizedPosition {
  x: number; // 0-1 normalized coordinates
  y: number; // 0-1 normalized coordinates
}

export interface ScaledPosition {
  x: number; // Final SVG coordinates
  y: number; // Final SVG coordinates
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

export interface ViewBoxInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
  viewBoxString: string;
}

export interface CoordinateSystemConfig {
  paddingPercent: number; // Default: 0.1 (10%)
  minSeatRadius: number;  // Default: 3
  maxSeatRadius: number;  // Default: 12
  seatSpacingFactor: number; // Default: 0.35
}

const DEFAULT_CONFIG: CoordinateSystemConfig = {
  paddingPercent: 0.1,
  minSeatRadius: 3,
  maxSeatRadius: 12,
  seatSpacingFactor: 0.35
};

export class CoordinateEngine {
  private rawBounds: BoundingBox;
  private paddedBounds: BoundingBox;
  private densityInfo: SeatDensityInfo;
  private viewBox: ViewBoxInfo;
  private config: CoordinateSystemConfig;

  constructor(
    rawPositions: RawPosition[],
    config: Partial<CoordinateSystemConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // TODO [Phase 1]: Enhanced input validation and error handling
    this.validateInput(rawPositions);

    // Calculate all coordinate system properties
    this.rawBounds = this.calculateRawBounds(rawPositions);
    this.paddedBounds = this.calculatePaddedBounds(this.rawBounds);
    this.densityInfo = this.calculateDensityInfo(rawPositions, this.rawBounds);
    this.viewBox = this.calculateViewBox(this.paddedBounds);

    console.log('🎯 [CoordinateEngine] Initialized:', {
      rawSeats: rawPositions.length,
      rawBounds: this.rawBounds,
      paddedBounds: this.paddedBounds,
      density: this.densityInfo,
      viewBox: this.viewBox.viewBoxString
    });
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Transform raw database coordinates to normalized 0-1 coordinates
   */
  public normalizePosition(raw: RawPosition): NormalizedPosition {
    return {
      x: (raw.x - this.rawBounds.minX) / this.rawBounds.width,
      y: (raw.y - this.rawBounds.minY) / this.rawBounds.height
    };
  }

  /**
   * Transform normalized coordinates to final SVG coordinates
   */
  public scalePosition(normalized: NormalizedPosition): ScaledPosition {
    return {
      x: this.paddedBounds.minX + (normalized.x * this.paddedBounds.width),
      y: this.paddedBounds.minY + (normalized.y * this.paddedBounds.height)
    };
  }

  /**
   * One-step transformation from raw to final SVG coordinates
   */
  public transformPosition(raw: RawPosition): ScaledPosition {
    const normalized = this.normalizePosition(raw);
    return this.scalePosition(normalized);
  }

  /**
   * Calculate optimal seat radius based on density and zoom level
   */
  public calculateSeatRadius(zoomLevel: number = 1): number {
    const baseRadius = this.densityInfo.recommendedRadius;
    const zoomAdjustedRadius = baseRadius * Math.max(0.5, Math.min(2, zoomLevel * 0.8));
    
    return Math.max(
      this.config.minSeatRadius,
      Math.min(this.config.maxSeatRadius, zoomAdjustedRadius)
    );
  }

  /**
   * Get the SVG viewBox information
   */
  public getViewBox(): ViewBoxInfo {
    return { ...this.viewBox };
  }

  /**
   * Get bounding box information
   */
  public getBounds(): { raw: BoundingBox; padded: BoundingBox } {
    return {
      raw: { ...this.rawBounds },
      padded: { ...this.paddedBounds }
    };
  }

  /**
   * Get density analysis information
   */
  public getDensityInfo(): SeatDensityInfo {
    return { ...this.densityInfo };
  }

  /**
   * Check if a position is within the valid coordinate space
   */
  public isValidPosition(raw: RawPosition): boolean {
    return (
      raw.x >= this.rawBounds.minX && 
      raw.x <= this.rawBounds.maxX &&
      raw.y >= this.rawBounds.minY && 
      raw.y <= this.rawBounds.maxY
    );
  }

  // ============================================================================
  // PRIVATE CALCULATION METHODS
  // ============================================================================

  /**
   * TODO [Phase 1]: Comprehensive input validation with detailed error messages
   */
  private validateInput(rawPositions: RawPosition[]): void {
    // Check for empty array
    if (!rawPositions || rawPositions.length === 0) {
      throw new Error('CoordinateEngine: Cannot initialize with empty positions array');
    }

    // Validate each position
    const invalidPositions: string[] = [];
    const duplicatePositions: string[] = [];
    const positionSet = new Set<string>();

    rawPositions.forEach((pos, index) => {
      // Check for null/undefined positions
      if (!pos || typeof pos !== 'object') {
        invalidPositions.push(`Position ${index}: null or invalid object`);
        return;
      }

      // Check for valid x,y coordinates
      if (typeof pos.x !== 'number' || typeof pos.y !== 'number') {
        invalidPositions.push(`Position ${index}: x and y must be numbers`);
        return;
      }

      // Check for NaN or Infinity values
      if (!isFinite(pos.x) || !isFinite(pos.y)) {
        invalidPositions.push(`Position ${index}: x=${pos.x}, y=${pos.y} contains NaN or Infinity`);
        return;
      }

      // Check for reasonable coordinate bounds (prevent extremely large values)
      if (Math.abs(pos.x) > 1e6 || Math.abs(pos.y) > 1e6) {
        invalidPositions.push(`Position ${index}: coordinates too large (x=${pos.x}, y=${pos.y})`);
        return;
      }

      // Check for duplicate positions
      const posKey = `${pos.x},${pos.y}`;
      if (positionSet.has(posKey)) {
        duplicatePositions.push(`Position ${index}: duplicate at (${pos.x}, ${pos.y})`);
      } else {
        positionSet.add(posKey);
      }
    });

    // Report validation errors
    if (invalidPositions.length > 0) {
      throw new Error(`CoordinateEngine: Invalid coordinate data detected:\n${invalidPositions.join('\n')}`);
    }

    // Warn about duplicates but don't fail
    if (duplicatePositions.length > 0) {
      console.warn('🎯 [CoordinateEngine] Duplicate positions detected:', duplicatePositions);
    }

    // Check minimum viable dataset size
    if (rawPositions.length < 2) {
      throw new Error('CoordinateEngine: At least 2 positions required for meaningful coordinate system');
    }

    console.log(`✅ [CoordinateEngine] Input validation passed: ${rawPositions.length} positions validated`);
  }

  private calculateRawBounds(positions: RawPosition[]): BoundingBox {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    positions.forEach(pos => {
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x);
      maxY = Math.max(maxY, pos.y);
    });

    const width = maxX - minX;
    const height = maxY - minY;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      centerX: minX + width / 2,
      centerY: minY + height / 2
    };
  }

  private calculatePaddedBounds(rawBounds: BoundingBox): BoundingBox {
    const paddingX = rawBounds.width * this.config.paddingPercent;
    const paddingY = rawBounds.height * this.config.paddingPercent;

    const minX = rawBounds.minX - paddingX;
    const minY = rawBounds.minY - paddingY;
    const maxX = rawBounds.maxX + paddingX;
    const maxY = rawBounds.maxY + paddingY;

    const width = maxX - minX;
    const height = maxY - minY;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      centerX: minX + width / 2,
      centerY: minY + height / 2
    };
  }

  private calculateDensityInfo(positions: RawPosition[], bounds: BoundingBox): SeatDensityInfo {
    const totalSeats = positions.length;
    const area = bounds.width * bounds.height;
    const density = totalSeats / area;

    // Estimate average spacing by assuming roughly square arrangement
    const averageSeatsPerRow = Math.sqrt(totalSeats);
    const averageSpacingX = bounds.width / averageSeatsPerRow;
    const averageSpacingY = bounds.height / averageSeatsPerRow;

    // Calculate recommended seat radius
    const minSpacing = Math.min(averageSpacingX, averageSpacingY);
    const recommendedRadius = Math.max(
      this.config.minSeatRadius,
      Math.min(this.config.maxSeatRadius, minSpacing * this.config.seatSpacingFactor)
    );

    return {
      averageSpacingX,
      averageSpacingY,
      recommendedRadius,
      totalSeats,
      density
    };
  }

  private calculateViewBox(paddedBounds: BoundingBox): ViewBoxInfo {
    const aspectRatio = paddedBounds.width / paddedBounds.height;
    const viewBoxString = `${paddedBounds.minX} ${paddedBounds.minY} ${paddedBounds.width} ${paddedBounds.height}`;

    return {
      x: paddedBounds.minX,
      y: paddedBounds.minY,
      width: paddedBounds.width,
      height: paddedBounds.height,
      aspectRatio,
      viewBoxString
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a coordinate engine from seat data with position information
 */
export function createCoordinateEngine<T extends { position?: RawPosition }>(
  seatsWithPositions: T[],
  config?: Partial<CoordinateSystemConfig>
): CoordinateEngine {
  const validPositions = seatsWithPositions
    .filter(seat => seat.position)
    .map(seat => seat.position!);

  if (validPositions.length === 0) {
    throw new Error('No valid positions found in seat data');
  }

  return new CoordinateEngine(validPositions, config);
}

/**
 * Batch transform multiple positions efficiently
 */
export function batchTransformPositions(
  engine: CoordinateEngine,
  positions: RawPosition[]
): ScaledPosition[] {
  return positions.map(pos => engine.transformPosition(pos));
} 