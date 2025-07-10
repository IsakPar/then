import { GenericSeatMapConfig } from './types';

/**
 * Round Room Layout
 * 
 * Circular venue with central performance area:
 * - Inner circle (premium)
 * - Middle circle
 * - Outer circle
 * - Standing area around perimeter
 * 
 * Total capacity: ~600 seats
 */
export const ROUND_ROOM: GenericSeatMapConfig = {
  name: "Round Room",
  description: "Circular venue with concentric seating sections and central stage",
  totalCapacity: 580,
  svgViewbox: "0 0 1200 1200",
  sections: [
    {
      id: "inner-circle",
      name: "Inner Circle",
      shape: "curve",
      rows: 6,
      cols: 24,
      seatSpacing: 20,
      rowSpacing: 18,
      offset: { x: 480, y: 350 },
      capacity: 144,
      defaultPrice: 9500, // £95.00
      colorHex: "#8B5CF6"
    },
    {
      id: "middle-circle",
      name: "Middle Circle",
      shape: "curve",
      rows: 8,
      cols: 32,
      seatSpacing: 18,
      rowSpacing: 16,
      offset: { x: 420, y: 290 },
      capacity: 256,
      defaultPrice: 7500, // £75.00
      colorHex: "#06B6D4"
    },
    {
      id: "outer-circle",
      name: "Outer Circle", 
      shape: "curve",
      rows: 6,
      cols: 30,
      seatSpacing: 16,
      rowSpacing: 14,
      offset: { x: 360, y: 230 },
      capacity: 180,
      defaultPrice: 5500, // £55.00
      colorHex: "#F59E0B"
    }
  ]
}; 