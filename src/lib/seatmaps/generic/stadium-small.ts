import { GenericSeatMapConfig } from './types';

/**
 * Small Stadium Layout
 * 
 * Compact stadium with:
 * - Home sideline
 * - Visitor sideline  
 * - Home endzone
 * - Visitor endzone
 * - Club level
 * 
 * Total capacity: ~25,000 seats
 */
export const STADIUM_SMALL: GenericSeatMapConfig = {
  name: "Small Stadium",
  description: "Compact stadium layout with sideline and endzone sections",
  totalCapacity: 24800,
  svgViewbox: "0 0 1800 1400",
  sections: [
    {
      id: "home-sideline",
      name: "Home Sideline",
      shape: "grid",
      rows: 45,
      cols: 120,
      seatSpacing: 18,
      rowSpacing: 16,
      offset: { x: 300, y: 200 },
      capacity: 5400,
      defaultPrice: 7500, // £75.00
      colorHex: "#DC2626"
    },
    {
      id: "visitor-sideline",
      name: "Visitor Sideline",
      shape: "grid", 
      rows: 45,
      cols: 120,
      seatSpacing: 18,
      rowSpacing: 16,
      offset: { x: 300, y: 920 },
      capacity: 5400,
      defaultPrice: 7500, // £75.00
      colorHex: "#2563EB"
    },
    {
      id: "home-endzone",
      name: "Home Endzone",
      shape: "trapezoid",
      rowCounts: [60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150],
      seatSpacing: 16,
      rowSpacing: 14,
      offset: { x: 50, y: 300 },
      capacity: 2109,
      defaultPrice: 5500, // £55.00
      colorHex: "#7C3AED"
    },
    {
      id: "visitor-endzone", 
      name: "Visitor Endzone",
      shape: "trapezoid",
      rowCounts: [60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150],
      seatSpacing: 16,
      rowSpacing: 14,
      offset: { x: 1540, y: 300 },
      capacity: 2109,
      defaultPrice: 5500, // £55.00
      colorHex: "#059669"
    },
    {
      id: "club-level",
      name: "Club Level",
      shape: "grid",
      rows: 8,
      cols: 480,
      seatSpacing: 20,
      rowSpacing: 18,
      offset: { x: 100, y: 600 },
      capacity: 3840,
      defaultPrice: 15000, // £150.00
      colorHex: "#F59E0B"
    }
  ]
}; 