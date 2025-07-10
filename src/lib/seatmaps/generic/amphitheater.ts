import { GenericSeatMapConfig } from './types';

/**
 * Amphitheater Layout
 * 
 * Traditional amphitheater with tiered seating:
 * - Orchestra pit (premium)
 * - Lower tier
 * - Middle tier  
 * - Upper tier
 * - Lawn seating (general admission)
 * 
 * Total capacity: ~5,500 seats
 */
export const AMPHITHEATER: GenericSeatMapConfig = {
  name: "Amphitheater",
  description: "Outdoor amphitheater with tiered seating and lawn area",
  totalCapacity: 5420,
  svgViewbox: "0 0 1600 1400",
  sections: [
    {
      id: "orchestra-pit",
      name: "Orchestra Pit",
      shape: "grid",
      rows: 8,
      cols: 40,
      seatSpacing: 22,
      rowSpacing: 20,
      offset: { x: 400, y: 200 },
      capacity: 320,
      defaultPrice: 12000, // £120.00
      colorHex: "#8B5CF6"
    },
    {
      id: "lower-tier",
      name: "Lower Tier",
      shape: "trapezoid",
      rowCounts: [45, 48, 52, 56, 60, 64, 68, 72, 76, 80],
      seatSpacing: 20,
      rowSpacing: 18,
      offset: { x: 300, y: 360 },
      capacity: 621,
      defaultPrice: 8500, // £85.00
      colorHex: "#06B6D4"
    },
    {
      id: "middle-tier",
      name: "Middle Tier",
      shape: "trapezoid", 
      rowCounts: [85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140],
      seatSpacing: 18,
      rowSpacing: 16,
      offset: { x: 200, y: 560 },
      capacity: 1320,
      defaultPrice: 6500, // £65.00
      colorHex: "#F59E0B"
    },
    {
      id: "upper-tier",
      name: "Upper Tier",
      shape: "trapezoid",
      rowCounts: [140, 145, 150, 155, 160, 165, 170, 175, 180, 185],
      seatSpacing: 16,
      rowSpacing: 14,
      offset: { x: 100, y: 770 },
      capacity: 1575,
      defaultPrice: 4500, // £45.00
      colorHex: "#EF4444"
    },
    {
      id: "lawn-seating",
      name: "Lawn Seating",
      shape: "standing",
      rows: 1,
      cols: 1,
      seatSpacing: 0,
      rowSpacing: 0,
      offset: { x: 50, y: 980 },
      capacity: 1584,
      defaultPrice: 2500, // £25.00
      colorHex: "#10B981"
    }
  ]
}; 