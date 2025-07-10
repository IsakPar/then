import { GenericSeatMapConfig } from './types';

/**
 * Black Box Theater Layout
 * 
 * Flexible theater space with modular seating:
 * - Center performance area
 * - Modular seating blocks around perimeter
 * - Flexible configuration zones
 * 
 * Total capacity: ~150 seats
 */
export const BLACK_BOX: GenericSeatMapConfig = {
  name: "Black Box Theater",
  description: "Flexible black box theater with modular seating configuration",
  totalCapacity: 144,
  svgViewbox: "0 0 800 800",
  sections: [
    {
      id: "north-block",
      name: "North Block",
      shape: "grid",
      rows: 6,
      cols: 12,
      seatSpacing: 22,
      rowSpacing: 20,
      offset: { x: 280, y: 100 },
      capacity: 72,
      defaultPrice: 4500, // £45.00
      colorHex: "#8B5CF6"
    },
    {
      id: "south-block",
      name: "South Block",
      shape: "grid",
      rows: 6,
      cols: 12,
      seatSpacing: 22,
      rowSpacing: 20,
      offset: { x: 280, y: 580 },
      capacity: 72,
      defaultPrice: 4500, // £45.00
      colorHex: "#06B6D4"
    }
  ]
}; 