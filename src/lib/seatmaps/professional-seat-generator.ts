/**
 * Professional Seat Generator
 * 
 * Generates seat positions using the enhanced geometry engine for curved theater layouts.
 * This replaces the old grid-based generation with professional curved arrangements.
 */

import { EnhancedGeometryEngine, SeatPosition, PROFESSIONAL_COLOR_SYSTEM } from './enhanced-geometry-engine';
// import { GenericSeatMapConfig } from './generic/types';

// Temporary type definitions until generic/types is created
export interface GenericSeatMapConfig {
  name: string;
  description: string;
  totalCapacity: number;
  svgViewbox: string;
  stageArea: any;
  sections: any[];
}

export interface GeneratedSeat {
  id: string;
  row_letter: string;
  seat_number: number;
  section_id: string;
  price_pence: number;
  position: {
    x: number;
    y: number;
  };
  is_accessible: boolean;
  status: 'available' | 'booked' | 'reserved';
  color_hex: string;
}

export interface GeneratedSection {
  id: string;
  name: string;
  display_name: string;
  color_hex: string;
  base_price_pence: number;
  sort_order: number;
  seat_map_id: string;
}

export interface GeneratedSeatMap {
  id: string;
  name: string;
  layout_config: any;
  total_capacity: number;
  svg_viewbox: string;
  sections: GeneratedSection[];
  seats: GeneratedSeat[];
}

/**
 * Professional Seat Generator Class
 */
export class ProfessionalSeatGenerator {
  private geometryEngine: EnhancedGeometryEngine;

  constructor() {
    this.geometryEngine = new EnhancedGeometryEngine();
  }

  /**
   * Generate complete seat map from professional theater configuration
   */
  generateSeatMap(config: GenericSeatMapConfig, seatMapId: string): GeneratedSeatMap {
    console.log(`🎭 Generating professional seat map: ${config.name}`);
    
    const sections: GeneratedSection[] = [];
    const allSeats: GeneratedSeat[] = [];
    let seatIdCounter = 0;

    // Validate section boundaries first
    const boundaries = config.sections.map(section => section.boundaries);
    if (!this.geometryEngine.validateSectionBoundaries(boundaries)) {
      throw new Error('Section boundaries overlap! Cannot generate seat map.');
    }

    // Generate each section
    config.sections.forEach((sectionConfig, index) => {
      console.log(`🎪 Generating section: ${sectionConfig.displayName || sectionConfig.name}`);
      
      // Create section metadata
      const section: GeneratedSection = {
        id: sectionConfig.id,
        name: sectionConfig.name,
        display_name: sectionConfig.displayName || sectionConfig.name,
        color_hex: sectionConfig.colorHex || this.getDefaultColor(sectionConfig.theme),
        base_price_pence: sectionConfig.defaultPrice,
        sort_order: index,
        seat_map_id: seatMapId
      };
      sections.push(section);

      // Generate seats based on section shape
      const seatPositions = this.generateSectionSeats(sectionConfig);
      
      // Convert to database format
      const sectionSeats = seatPositions.map((pos, seatIndex) => ({
        id: `seat_${seatIdCounter++}`,
        row_letter: pos.row,
        seat_number: pos.seatNumber,
        section_id: sectionConfig.id,
        price_pence: sectionConfig.defaultPrice,
        position: {
          x: pos.x,
          y: pos.y
        },
        is_accessible: this.isAccessibleSeat(pos, sectionConfig),
        status: 'available' as const,
        color_hex: sectionConfig.colorHex || this.getDefaultColor(sectionConfig.theme)
      }));

      allSeats.push(...sectionSeats);
      console.log(`✅ Generated ${sectionSeats.length} seats for ${sectionConfig.displayName || sectionConfig.name}`);
    });

    console.log(`🎯 Total seats generated: ${allSeats.length}`);

    return {
      id: seatMapId,
      name: config.name,
      layout_config: config,
      total_capacity: allSeats.length,
      svg_viewbox: config.svgViewbox,
      sections,
      seats: allSeats
    };
  }

  /**
   * Generate seats for a specific section based on its shape
   */
  private generateSectionSeats(sectionConfig: any): SeatPosition[] {
    switch (sectionConfig.shape) {
      case 'curved-orchestra':
        return this.generateCurvedOrchestraSeats(sectionConfig);
      case 'curved-balcony':
        return this.generateCurvedBalconySeats(sectionConfig);
      case 'amphitheater-curve':
        return this.generateAmphitheaterSeats(sectionConfig);
      default:
        // Fallback to grid for backward compatibility
        return this.generateGridSeats(sectionConfig);
    }
  }

  /**
   * Generate curved orchestra seats
   */
  private generateCurvedOrchestraSeats(sectionConfig: any): SeatPosition[] {
    if (!sectionConfig.curveConfig) {
      throw new Error(`Curved orchestra section ${sectionConfig.id} missing curveConfig`);
    }

    // Calculate rows and seats per row based on capacity
    const estimatedRows = Math.ceil(Math.sqrt(sectionConfig.capacity / 20)); // Estimate
    const seatsPerRow = this.calculateSeatsPerRow(sectionConfig.capacity, estimatedRows);

    return this.geometryEngine.generateCurvedOrchestra(
      sectionConfig.curveConfig,
      estimatedRows,
      seatsPerRow
    );
  }

  /**
   * Generate curved balcony seats
   */
  private generateCurvedBalconySeats(sectionConfig: any): SeatPosition[] {
    if (!sectionConfig.curveConfig) {
      throw new Error(`Curved balcony section ${sectionConfig.id} missing curveConfig`);
    }

    const estimatedRows = Math.ceil(Math.sqrt(sectionConfig.capacity / 25));
    const seatsPerRow = this.calculateSeatsPerRow(sectionConfig.capacity, estimatedRows);

    return this.geometryEngine.generateCurvedBalcony(
      sectionConfig.curveConfig,
      estimatedRows,
      seatsPerRow
    );
  }

  /**
   * Generate amphitheater seats
   */
  private generateAmphitheaterSeats(sectionConfig: any): SeatPosition[] {
    if (!sectionConfig.curveConfig) {
      throw new Error(`Amphitheater section ${sectionConfig.id} missing curveConfig`);
    }

    const estimatedRows = Math.ceil(Math.sqrt(sectionConfig.capacity / 30));
    const seatsPerRow = this.calculateSeatsPerRow(sectionConfig.capacity, estimatedRows);

    return this.geometryEngine.generateAmphitheaterCurve(
      sectionConfig.curveConfig,
      estimatedRows,
      seatsPerRow
    );
  }

  /**
   * Fallback grid generation for backward compatibility
   */
  private generateGridSeats(sectionConfig: any): SeatPosition[] {
    const seats: SeatPosition[] = [];
    const rows = sectionConfig.rows || 10;
    const cols = sectionConfig.cols || Math.ceil(sectionConfig.capacity / rows);
    const seatSpacing = sectionConfig.seatSpacing || 22;
    const rowSpacing = sectionConfig.rowSpacing || 36;
    const offset = sectionConfig.offset || { x: 0, y: 0 };

    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLetter = String.fromCharCode(65 + rowIndex);
      
      for (let seatIndex = 0; seatIndex < cols; seatIndex++) {
        seats.push({
          x: offset.x + (seatIndex * seatSpacing),
          y: offset.y + (rowIndex * rowSpacing),
          row: rowLetter,
          seatNumber: seatIndex + 1
        });
      }
    }

    return seats;
  }

  /**
   * Calculate realistic seats per row distribution
   */
  private calculateSeatsPerRow(totalCapacity: number, rows: number): number[] {
    const avgSeatsPerRow = totalCapacity / rows;
    const seatsPerRow: number[] = [];

    for (let i = 0; i < rows; i++) {
      // Front rows typically have fewer seats, back rows more
      const multiplier = 0.8 + (i / rows) * 0.4; // 0.8 to 1.2 range
      const seatsInRow = Math.round(avgSeatsPerRow * multiplier);
      seatsPerRow.push(Math.max(seatsInRow, 8)); // Minimum 8 seats per row
    }

    // Adjust to match exact capacity
    const currentTotal = seatsPerRow.reduce((sum, count) => sum + count, 0);
    const difference = totalCapacity - currentTotal;
    
    if (difference !== 0) {
      // Distribute difference across middle rows
      const middleRow = Math.floor(rows / 2);
      seatsPerRow[middleRow] += difference;
    }

    return seatsPerRow;
  }

  /**
   * Determine if a seat should be accessible
   */
  private isAccessibleSeat(position: SeatPosition, sectionConfig: any): boolean {
    // Make end seats in certain rows accessible
    return position.row === 'A' && (position.seatNumber === 1 || position.seatNumber % 10 === 0);
  }

  /**
   * Get default color for theme
   */
  private getDefaultColor(theme: 'premium' | 'standard' | 'budget'): string {
    return this.geometryEngine.getColorTheme(theme).primary;
  }
} 