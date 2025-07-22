/**
 * Enhanced Geometry Engine for Professional Theater Seat Maps
 * 
 * Generates curved, realistic theater layouts that prevent section overlaps
 * and create professional-looking seat arrangements.
 */

export interface CurvedSectionConfig {
  centerX: number;
  centerY: number;
  startAngle: number; // degrees
  endAngle: number;   // degrees  
  innerRadius: number;
  outerRadius: number;
  rowDepth: number;
}

export interface SeatPosition {
  x: number;
  y: number;
  row: string;
  seatNumber: number;
  angle?: number; // for curved sections
}

export interface SectionBoundary {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  buffer: number;
}

/**
 * Professional Color System - Based on Bagley Wright Theater Reference
 */
export const PROFESSIONAL_COLOR_SYSTEM = {
  premium: {
    primary: '#8B5CF6',    // Purple (like reference image)
    secondary: '#7C3AED',  // Darker purple
    text: '#F3E8FF',       // Light purple
    theme: 'premium' as const
  },
  standard: {
    primary: '#F59E0B',    // Orange/Amber (like reference image)
    secondary: '#D97706',  // Darker orange
    text: '#FEF3C7',       // Light amber
    theme: 'standard' as const
  },
  budget: {
    primary: '#06B6D4',    // Cyan/Light blue (like reference image)
    secondary: '#0891B2',  // Darker cyan
    text: '#CFFAFE',       // Light cyan
    theme: 'budget' as const
  },
  balcony: {
    primary: '#EF4444',    // Red (for upper sections)
    secondary: '#DC2626',  // Darker red
    text: '#FEE2E2',       // Light red
    theme: 'budget' as const
  }
};

/**
 * Enhanced Geometry Engine Class
 */
export class EnhancedGeometryEngine {
  private sectionBoundaries: Map<string, SectionBoundary> = new Map();

  /**
   * Generate curved orchestra section (main floor, curved towards stage)
   */
  generateCurvedOrchestra(config: CurvedSectionConfig, rows: number, seatsPerRow: number[]): SeatPosition[] {
    const seats: SeatPosition[] = [];
    
    // Calculate row positions from front to back
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLetter = String.fromCharCode(65 + rowIndex); // A, B, C, etc.
      const seatsInRow = seatsPerRow[rowIndex] || seatsPerRow[seatsPerRow.length - 1];
      
      // Calculate radius for this row (closer to stage = smaller radius)
      const rowRadius = config.innerRadius + (rowIndex * config.rowDepth);
      
      // Calculate angle step for even seat distribution
      const totalAngle = config.endAngle - config.startAngle;
      const angleStep = totalAngle / (seatsInRow - 1);
      
      // Generate seats for this row
      for (let seatIndex = 0; seatIndex < seatsInRow; seatIndex++) {
        const angle = config.startAngle + (seatIndex * angleStep);
        const angleRad = (angle * Math.PI) / 180;
        
        const x = config.centerX + rowRadius * Math.cos(angleRad);
        const y = config.centerY + rowRadius * Math.sin(angleRad);
        
        seats.push({
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
          row: rowLetter,
          seatNumber: seatIndex + 1,
          angle: angle
        });
      }
    }
    
    return seats;
  }

  /**
   * Generate curved balcony section (upper level, more dramatic curve)
   */
  generateCurvedBalcony(config: CurvedSectionConfig, rows: number, seatsPerRow: number[]): SeatPosition[] {
    const seats: SeatPosition[] = [];
    
    // Balconies typically have more dramatic curves and wider angles
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLetter = String.fromCharCode(65 + rowIndex); // A, B, C, etc.
      const seatsInRow = seatsPerRow[rowIndex] || seatsPerRow[seatsPerRow.length - 1];
      
      // For balconies, rows get progressively wider (further from center)
      const rowRadius = config.innerRadius + (rowIndex * config.rowDepth);
      
      // Wider angle distribution for balcony seats
      const totalAngle = config.endAngle - config.startAngle;
      const angleStep = totalAngle / Math.max(seatsInRow - 1, 1);
      
      for (let seatIndex = 0; seatIndex < seatsInRow; seatIndex++) {
        const angle = config.startAngle + (seatIndex * angleStep);
        const angleRad = (angle * Math.PI) / 180;
        
        const x = config.centerX + rowRadius * Math.cos(angleRad);
        const y = config.centerY + rowRadius * Math.sin(angleRad);
        
        seats.push({
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
          row: rowLetter,
          seatNumber: seatIndex + 1,
          angle: angle
        });
      }
    }
    
    return seats;
  }

  /**
   * Generate amphitheater-style curved section (dramatic wrap-around)
   */
  generateAmphitheaterCurve(config: CurvedSectionConfig, rows: number, seatsPerRow: number[]): SeatPosition[] {
    const seats: SeatPosition[] = [];
    
    // Amphitheater sections wrap around more dramatically
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
      const rowLetter = String.fromCharCode(65 + rowIndex);
      const seatsInRow = seatsPerRow[rowIndex] || seatsPerRow[seatsPerRow.length - 1];
      
      // Progressive radius increase for amphitheater effect
      const rowRadius = config.innerRadius + (rowIndex * config.rowDepth * 1.2); // More spacing
      
      const totalAngle = config.endAngle - config.startAngle;
      const angleStep = totalAngle / Math.max(seatsInRow - 1, 1);
      
      for (let seatIndex = 0; seatIndex < seatsInRow; seatIndex++) {
        const angle = config.startAngle + (seatIndex * angleStep);
        const angleRad = (angle * Math.PI) / 180;
        
        const x = config.centerX + rowRadius * Math.cos(angleRad);
        const y = config.centerY + rowRadius * Math.sin(angleRad);
        
        seats.push({
          x: Math.round(x * 100) / 100,
          y: Math.round(y * 100) / 100,
          row: rowLetter,
          seatNumber: seatIndex + 1,
          angle: angle
        });
      }
    }
    
    return seats;
  }

  /**
   * Calculate section boundaries to prevent overlaps
   */
  calculateSectionBoundary(seats: SeatPosition[], buffer: number = 40): SectionBoundary {
    if (seats.length === 0) {
      return { minX: 0, maxX: 0, minY: 0, maxY: 0, buffer };
    }

    const xs = seats.map(s => s.x);
    const ys = seats.map(s => s.y);
    
    return {
      minX: Math.min(...xs) - buffer,
      maxX: Math.max(...xs) + buffer,
      minY: Math.min(...ys) - buffer,
      maxY: Math.max(...ys) + buffer,
      buffer
    };
  }

  /**
   * Validate that sections don't overlap
   */
  validateSectionBoundaries(boundaries: SectionBoundary[]): boolean {
    for (let i = 0; i < boundaries.length; i++) {
      for (let j = i + 1; j < boundaries.length; j++) {
        const a = boundaries[i];
        const b = boundaries[j];
        
        // Check if rectangles overlap
        if (a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY) {
          console.error(`Section overlap detected between sections ${i} and ${j}`);
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Get professional color theme for section
   */
  getColorTheme(theme: 'premium' | 'standard' | 'budget', sectionType: 'orchestra' | 'balcony' = 'orchestra') {
    if (sectionType === 'balcony') {
      return PROFESSIONAL_COLOR_SYSTEM.balcony;
    }
    
    switch (theme) {
      case 'premium':
        return PROFESSIONAL_COLOR_SYSTEM.premium;
      case 'standard':
        return PROFESSIONAL_COLOR_SYSTEM.standard;
      case 'budget':
        return PROFESSIONAL_COLOR_SYSTEM.budget;
      default:
        return PROFESSIONAL_COLOR_SYSTEM.standard;
    }
  }

  /**
   * Generate professional seat spacing based on venue type
   */
  calculateProfessionalSpacing(venueType: 'theater' | 'arena' | 'amphitheater' = 'theater') {
    switch (venueType) {
      case 'theater':
        return {
          seatSpacing: 22,    // Professional theater spacing
          rowSpacing: 36,     // Enough legroom
          sectionBuffer: 60   // Clear section separation
        };
      case 'arena':
        return {
          seatSpacing: 20,
          rowSpacing: 32,
          sectionBuffer: 80
        };
      case 'amphitheater':
        return {
          seatSpacing: 24,
          rowSpacing: 40,
          sectionBuffer: 100
        };
      default:
        return {
          seatSpacing: 22,
          rowSpacing: 36,
          sectionBuffer: 60
        };
    }
  }
} 