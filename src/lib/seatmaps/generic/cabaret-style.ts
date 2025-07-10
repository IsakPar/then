import { GenericSeatMapConfig } from './types';

/**
 * Cabaret Style Layout
 * 
 * Intimate setting with table seating:
 * - Front tables (premium)
 * - Side tables
 * - Bar seating 
 * - Standing room
 * 
 * Total capacity: ~300 seats
 */
export const CABARET_STYLE: GenericSeatMapConfig = {
  name: "Cabaret Style",
  description: "Intimate cabaret layout with table seating and bar area",
  totalCapacity: 296,
  svgViewbox: "0 0 1000 800",
  sections: [
    {
      id: "front-tables",
      name: "Front Tables",
      shape: "grid",
      rows: 4,
      cols: 12,
      seatSpacing: 35,
      rowSpacing: 40,
      offset: { x: 300, y: 180 },
      capacity: 48,
      defaultPrice: 12000, // £120.00
      colorHex: "#8B5CF6"
    },
    {
      id: "side-tables-left",
      name: "Side Tables Left",
      shape: "grid",
      rows: 6,
      cols: 8,
      seatSpacing: 30,
      rowSpacing: 35,
      offset: { x: 100, y: 200 },
      capacity: 48,
      defaultPrice: 9500, // £95.00
      colorHex: "#06B6D4"
    },
    {
      id: "side-tables-right",
      name: "Side Tables Right", 
      shape: "grid",
      rows: 6,
      cols: 8,
      seatSpacing: 30,
      rowSpacing: 35,
      offset: { x: 720, y: 200 },
      capacity: 48,
      defaultPrice: 9500, // £95.00
      colorHex: "#06B6D4"
    },
    {
      id: "back-tables",
      name: "Back Tables",
      shape: "grid",
      rows: 6,
      cols: 14,
      seatSpacing: 28,
      rowSpacing: 32,
      offset: { x: 240, y: 420 },
      capacity: 84,
      defaultPrice: 7500, // £75.00
      colorHex: "#F59E0B"
    },
    {
      id: "bar-seating",
      name: "Bar Seating",
      shape: "grid",
      rows: 2,
      cols: 34,
      seatSpacing: 25,
      rowSpacing: 30,
      offset: { x: 100, y: 620 },
      capacity: 68,
      defaultPrice: 6500, // £65.00
      colorHex: "#EF4444"
    }
  ]
}; 