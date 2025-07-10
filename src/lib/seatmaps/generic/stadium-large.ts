import { GenericSeatMapConfig } from './types';

/**
 * Large Stadium Layout
 * 
 * Major stadium with multiple tiers:
 * - Lower bowl (all sides)
 * - Club level
 * - Upper bowl  
 * - Luxury suites
 * - Premium field level
 * 
 * Total capacity: ~75,000 seats
 */
export const STADIUM_LARGE: GenericSeatMapConfig = {
  name: "Large Stadium",
  description: "Major stadium layout with multiple tiers and premium sections",
  totalCapacity: 74850,
  svgViewbox: "0 0 2000 1600",
  sections: [
    {
      id: "lower-bowl-home",
      name: "Lower Bowl Home",
      shape: "grid",
      rows: 35,
      cols: 150,
      seatSpacing: 18,
      rowSpacing: 16,
      offset: { x: 400, y: 200 },
      capacity: 5250,
      defaultPrice: 8500, // £85.00
      colorHex: "#DC2626"
    },
    {
      id: "lower-bowl-visitor",
      name: "Lower Bowl Visitor",
      shape: "grid",
      rows: 35,
      cols: 150,
      seatSpacing: 18,
      rowSpacing: 16,
      offset: { x: 400, y: 1000 },
      capacity: 5250,
      defaultPrice: 8500, // £85.00
      colorHex: "#2563EB"
    },
    {
      id: "lower-bowl-endzone-1",
      name: "Lower Bowl Endzone 1",
      shape: "trapezoid",
      rowCounts: [80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200],
      seatSpacing: 16,
      rowSpacing: 14,
      offset: { x: 50, y: 350 },
      capacity: 3375,
      defaultPrice: 6500, // £65.00
      colorHex: "#7C3AED"
    },
    {
      id: "lower-bowl-endzone-2",
      name: "Lower Bowl Endzone 2", 
      shape: "trapezoid",
      rowCounts: [80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200],
      seatSpacing: 16,
      rowSpacing: 14,
      offset: { x: 1700, y: 350 },
      capacity: 3375,
      defaultPrice: 6500, // £65.00
      colorHex: "#059669"
    },
    {
      id: "club-level-all",
      name: "Club Level",
      shape: "grid",
      rows: 12,
      cols: 600,
      seatSpacing: 20,
      rowSpacing: 18,
      offset: { x: 200, y: 650 },
      capacity: 7200,
      defaultPrice: 25000, // £250.00
      colorHex: "#F59E0B"
    },
    {
      id: "upper-bowl-home",
      name: "Upper Bowl Home",
      shape: "grid",
      rows: 50,
      cols: 180,
      seatSpacing: 16,
      rowSpacing: 14,
      offset: { x: 350, y: 100 },
      capacity: 9000,
      defaultPrice: 4500, // £45.00
      colorHex: "#EF4444"
    },
    {
      id: "upper-bowl-visitor",
      name: "Upper Bowl Visitor",
      shape: "grid",
      rows: 50,
      cols: 180,
      seatSpacing: 16,
      rowSpacing: 14,
      offset: { x: 350, y: 1200 },
      capacity: 9000,
      defaultPrice: 4500, // £45.00
      colorHex: "#3B82F6"
    },
    {
      id: "upper-bowl-corners",
      name: "Upper Bowl Corners",
      shape: "grid",
      rows: 45,
      cols: 640,
      seatSpacing: 15,
      rowSpacing: 13,
      offset: { x: 100, y: 250 },
      capacity: 28800,
      defaultPrice: 3500, // £35.00
      colorHex: "#10B981"
    },
    {
      id: "luxury-suites",
      name: "Luxury Suites",
      shape: "grid",
      rows: 3,
      cols: 200,
      seatSpacing: 30,
      rowSpacing: 25,
      offset: { x: 400, y: 550 },
      capacity: 600,
      defaultPrice: 50000, // £500.00
      colorHex: "#8B5CF6"
    }
  ]
}; 