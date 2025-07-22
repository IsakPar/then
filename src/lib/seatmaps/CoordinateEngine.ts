// ============================================================================
// ENTERPRISE SEAT MAP COORDINATE ENGINE
// ============================================================================
// Professional coordinate transformation system for Ticketmaster-quality rendering
// Supports both web and mobile platforms with SVG-based rendering

export interface SeatPosition {
  x: number;
  y: number;
}

export interface SeatData {
  id: string;
  position: SeatPosition;
  section: {
    id: string;
    name: string;
    display_name?: string;
    color_hex: string;
  };
  row_letter: string;
  seat_number: number;
  status: 'available' | 'selected' | 'booked' | 'reserved';
  price_pence: number;
  is_accessible?: boolean;
}

export interface CoordinateBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ViewBoxConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  viewBox: string; // "x y width height" format for SVG
}

export interface ScaledPosition {
  x: number;
  y: number;
  normalizedX: number; // 0-1 range
  normalizedY: number; // 0-1 range
}

export interface MapDimensions {
  containerWidth: number;
  containerHeight: number;
  aspectRatio: number;
  bounds: CoordinateBounds;
  viewBox: ViewBoxConfig;
  padding: number;
}

// ============================================================================
// COORDINATE TRANSFORMATION ENGINE
// ============================================================================

export class CoordinateEngine {
  private seats: SeatData[];
  private bounds: CoordinateBounds;
  private padding: number;

  constructor(seats: SeatData[], padding: number = 50) {
    this.seats = seats;
    this.padding = padding;
    this.bounds = this.calculateBounds();
  }

  /**
   * Calculate the bounding box of all seat positions
   */
  private calculateBounds(): CoordinateBounds {
    if (this.seats.length === 0) {
      return {
        minX: 0,
        minY: 0,
        maxX: 1000,
        maxY: 600,
        width: 1000,
        height: 600,
      };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Find the actual bounds of all seat positions
    this.seats.forEach(seat => {
      if (seat.position) {
        minX = Math.min(minX, seat.position.x);
        minY = Math.min(minY, seat.position.y);
        maxX = Math.max(maxX, seat.position.x);
        maxY = Math.max(maxY, seat.position.y);
      }
    });

    // Add padding to prevent seats from touching edges
    const paddedMinX = minX - this.padding;
    const paddedMinY = minY - this.padding;
    const paddedMaxX = maxX + this.padding;
    const paddedMaxY = maxY + this.padding;

    return {
      minX: paddedMinX,
      minY: paddedMinY,
      maxX: paddedMaxX,
      maxY: paddedMaxY,
      width: paddedMaxX - paddedMinX,
      height: paddedMaxY - paddedMinY,
    };
  }

  /**
   * Calculate optimal container dimensions for a given viewport
   */
  public calculateMapDimensions(
    maxWidth: number = 1000, 
    maxHeight: number = 700
  ): MapDimensions {
    const aspectRatio = this.bounds.width / this.bounds.height;
    
    // Calculate container size maintaining aspect ratio
    let containerWidth = maxWidth;
    let containerHeight = maxWidth / aspectRatio;

    // If height exceeds max, scale by height instead
    if (containerHeight > maxHeight) {
      containerHeight = maxHeight;
      containerWidth = maxHeight * aspectRatio;
    }

    // Ensure minimum dimensions for usability
    containerWidth = Math.max(containerWidth, 400);
    containerHeight = Math.max(containerHeight, 300);

    const viewBox: ViewBoxConfig = {
      x: this.bounds.minX,
      y: this.bounds.minY,
      width: this.bounds.width,
      height: this.bounds.height,
      viewBox: `${this.bounds.minX} ${this.bounds.minY} ${this.bounds.width} ${this.bounds.height}`,
    };

    return {
      containerWidth,
      containerHeight,
      aspectRatio,
      bounds: this.bounds,
      viewBox,
      padding: this.padding,
    };
  }

  /**
   * Convert raw seat position to normalized coordinates (0-1 range)
   */
  public normalizePosition(position: SeatPosition): ScaledPosition {
    const normalizedX = (position.x - this.bounds.minX) / this.bounds.width;
    const normalizedY = (position.y - this.bounds.minY) / this.bounds.height;

    return {
      x: position.x,
      y: position.y,
      normalizedX: Math.max(0, Math.min(1, normalizedX)),
      normalizedY: Math.max(0, Math.min(1, normalizedY)),
    };
  }

  /**
   * Scale normalized coordinates to fit within container dimensions
   */
  public scaleToContainer(
    normalizedPosition: ScaledPosition, 
    containerWidth: number, 
    containerHeight: number
  ): { x: number; y: number } {
    return {
      x: normalizedPosition.normalizedX * containerWidth,
      y: normalizedPosition.normalizedY * containerHeight,
    };
  }

  /**
   * One-step transformation: raw position → scaled container position
   */
  public transformPosition(
    position: SeatPosition, 
    containerWidth: number, 
    containerHeight: number
  ): { x: number; y: number } {
    const normalized = this.normalizePosition(position);
    return this.scaleToContainer(normalized, containerWidth, containerHeight);
  }

  /**
   * Calculate stage position (typically at bottom center of venue)
   */
  public getStagePosition(containerWidth: number, containerHeight: number): { x: number; y: number; width: number } {
    // Stage is positioned at bottom center, 60% of container width
    const stageWidth = containerWidth * 0.6;
    const stageX = (containerWidth - stageWidth) / 2;
    const stageY = containerHeight - 40; // 40px from bottom

    return {
      x: stageX,
      y: stageY,
      width: stageWidth,
    };
  }

  /**
   * Group seats by section for efficient rendering
   */
  public getSeatsBySection(): Map<string, SeatData[]> {
    const sectionMap = new Map<string, SeatData[]>();
    
    this.seats.forEach(seat => {
      const sectionId = seat.section.id;
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, []);
      }
      sectionMap.get(sectionId)!.push(seat);
    });

    return sectionMap;
  }

  /**
   * Get unique sections with metadata
   */
  public getSections(): Array<{id: string; name: string; display_name?: string; color_hex: string; seatCount: number}> {
    const sectionMap = this.getSeatsBySection();
    const sections: Array<{id: string; name: string; display_name?: string; color_hex: string; seatCount: number}> = [];

    sectionMap.forEach((seats, sectionId) => {
      if (seats.length > 0) {
        const section = seats[0].section;
        sections.push({
          id: section.id,
          name: section.name,
          display_name: section.display_name,
          color_hex: section.color_hex,
          seatCount: seats.length,
        });
      }
    });

    return sections;
  }

  /**
   * Calculate section bounds for background rendering
   */
  public getSectionBounds(sectionId: string): CoordinateBounds | null {
    const sectionSeats = this.getSeatsBySection().get(sectionId);
    if (!sectionSeats || sectionSeats.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    sectionSeats.forEach(seat => {
      if (seat.position) {
        minX = Math.min(minX, seat.position.x);
        minY = Math.min(minY, seat.position.y);
        maxX = Math.max(maxX, seat.position.x);
        maxY = Math.max(maxY, seat.position.y);
      }
    });

    // Add small padding around section
    const sectionPadding = 20;
    return {
      minX: minX - sectionPadding,
      minY: minY - sectionPadding,
      maxX: maxX + sectionPadding,
      maxY: maxY + sectionPadding,
      width: (maxX + sectionPadding) - (minX - sectionPadding),
      height: (maxY + sectionPadding) - (minY - sectionPadding),
    };
  }

  /**
   * Get bounds information
   */
  public getBounds(): CoordinateBounds {
    return this.bounds;
  }

  /**
   * Update seats data and recalculate bounds
   */
  public updateSeats(newSeats: SeatData[]): void {
    this.seats = newSeats;
    this.bounds = this.calculateBounds();
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate optimal SVG viewBox for responsive rendering
 */
export function calculateSVGViewBox(
  seats: SeatData[], 
  padding: number = 50
): ViewBoxConfig {
  const engine = new CoordinateEngine(seats, padding);
  const bounds = engine.getBounds();
  
  return {
    x: bounds.minX,
    y: bounds.minY,
    width: bounds.width,
    height: bounds.height,
    viewBox: `${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`,
  };
}

/**
 * Seat status color mapping for consistent styling
 */
export function getSeatStatusColor(status: SeatData['status']): string {
  switch (status) {
    case 'available':
      return '#10b981'; // green-500
    case 'selected':
      return '#f59e0b'; // amber-500
    case 'booked':
      return '#ef4444'; // red-500
    case 'reserved':
      return '#f97316'; // orange-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Seat status opacity for visual hierarchy
 */
export function getSeatStatusOpacity(status: SeatData['status']): number {
  switch (status) {
    case 'available':
      return 1.0;
    case 'selected':
      return 1.0;
    case 'booked':
      return 0.3;
    case 'reserved':
      return 0.6;
    default:
      return 0.5;
  }
}

export default CoordinateEngine; 