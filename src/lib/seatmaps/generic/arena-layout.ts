import { GenericSeatMapConfig } from './types';

/**
 * Arena Layout
 * 
 * 360-degree seating around central stage:
 * - Floor sections (A, B, C, D quadrants)
 * - Lower bowl 
 * - Upper bowl
 * 
 * Total capacity: ~12,000 seats
 */
export const ARENA_LAYOUT: GenericSeatMapConfig = {
  name: "Arena Layout",
  description: "360-degree arena seating with central stage and tiered sections",
  totalCapacity: 12240,
  svgViewbox: "0 0 1600 1200",
  sections: [
    {
      id: "floor-a",
      name: "Floor Section A",
      shape: "grid",
      rows: 20,
      cols: 25,
      seatSpacing: 18,
      rowSpacing: 16,
      offset: { x: 200, y: 200 },
      capacity: 500,
      defaultPrice: 15000, // £150.00
      colorHex: "#DC2626"
    },
    {
      id: "floor-b",
      name: "Floor Section B", 
      shape: "grid",
      rows: 20,
      cols: 25,
      seatSpacing: 18,
      rowSpacing: 16,
      offset: { x: 950, y: 200 },
      capacity: 500,
      defaultPrice: 15000, // £150.00
      colorHex: "#DC2626"
    },
    {
      id: "floor-c",
      name: "Floor Section C",
      shape: "grid", 
      rows: 20,
      cols: 25,
      seatSpacing: 18,
      rowSpacing: 16,
      offset: { x: 950, y: 700 },
      capacity: 500,
      defaultPrice: 15000, // £150.00
      colorHex: "#DC2626"
    },
    {
      id: "floor-d",
      name: "Floor Section D",
      shape: "grid",
      rows: 20,
      cols: 25,
      seatSpacing: 18,
      rowSpacing: 16,
      offset: { x: 200, y: 700 },
      capacity: 500,
      defaultPrice: 15000, // £150.00
      colorHex: "#DC2626"
    },
    {
      id: "lower-bowl",
      name: "Lower Bowl",
      shape: "curve",
      rows: 35,
      cols: 120,
      seatSpacing: 16,
      rowSpacing: 14,
      offset: { x: 50, y: 50 },
      capacity: 4200,
      defaultPrice: 8500, // £85.00
      colorHex: "#7C3AED"
    },
    {
      id: "upper-bowl",
      name: "Upper Bowl", 
      shape: "curve",
      rows: 25,
      cols: 260,
      seatSpacing: 15,
      rowSpacing: 13,
      offset: { x: 25, y: 25 },
      capacity: 6500,
      defaultPrice: 4500, // £45.00
      colorHex: "#059669"
    }
  ]
}; 