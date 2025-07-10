import { GenericSeatMapConfig } from './types';

/**
 * Flat Floor General Admission Layout
 * 
 * Open floor plan for concerts and events:
 * - VIP pit (front)
 * - General admission standing
 * - Side viewing areas
 * - Raised platform seating
 * 
 * Total capacity: ~2,500 people
 */
export const FLAT_FLOOR_GA: GenericSeatMapConfig = {
  name: "Flat Floor GA",
  description: "General admission flat floor layout for concerts and events",
  totalCapacity: 2480,
  svgViewbox: "0 0 1600 1000",
  sections: [
    {
      id: "vip-pit",
      name: "VIP Pit",
      shape: "standing",
      rows: 1,
      cols: 1,
      seatSpacing: 0,
      rowSpacing: 0,
      offset: { x: 600, y: 150 },
      capacity: 300,
      defaultPrice: 15000, // £150.00
      colorHex: "#8B5CF6"
    },
    {
      id: "ga-floor-center",
      name: "GA Floor Center",
      shape: "standing",
      rows: 1,
      cols: 1,
      seatSpacing: 0,
      rowSpacing: 0,
      offset: { x: 400, y: 300 },
      capacity: 1200,
      defaultPrice: 7500, // £75.00
      colorHex: "#06B6D4"
    },
    {
      id: "ga-floor-sides",
      name: "GA Floor Sides",
      shape: "standing",
      rows: 1,
      cols: 1,
      seatSpacing: 0,
      rowSpacing: 0,
      offset: { x: 200, y: 300 },
      capacity: 600,
      defaultPrice: 6500, // £65.00
      colorHex: "#F59E0B"
    },
    {
      id: "raised-platform-left",
      name: "Raised Platform Left",
      shape: "grid",
      rows: 8,
      cols: 15,
      seatSpacing: 20,
      rowSpacing: 18,
      offset: { x: 100, y: 700 },
      capacity: 120,
      defaultPrice: 8500, // £85.00
      colorHex: "#EF4444"
    },
    {
      id: "raised-platform-right",
      name: "Raised Platform Right",
      shape: "grid",
      rows: 8,
      cols: 15,
      seatSpacing: 20,
      rowSpacing: 18,
      offset: { x: 1200, y: 700 },
      capacity: 120,
      defaultPrice: 8500, // £85.00
      colorHex: "#EF4444"
    },
    {
      id: "back-standing",
      name: "Back Standing",
      shape: "standing",
      rows: 1,
      cols: 1,
      seatSpacing: 0,
      rowSpacing: 0,
      offset: { x: 400, y: 800 },
      capacity: 240,
      defaultPrice: 4500, // £45.00
      colorHex: "#10B981"
    }
  ]
}; 