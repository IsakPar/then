/**
 * Type definitions for generic seat map configurations
 */

export interface GenericSeatMapConfig {
  name: string;
  description: string;
  totalCapacity: number;
  svgViewbox: string;
  sections: Array<{
    id: string;
    name: string;
    shape: 'grid' | 'trapezoid' | 'curve' | 'standing';
    rows?: number;
    cols?: number;
    rowCounts?: number[];
    seatSpacing?: number;
    rowSpacing?: number;
    offset: { x: number; y: number };
    capacity: number;
    defaultPrice: number; // in pence
    colorHex?: string;
  }>;
} 