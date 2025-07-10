/**
 * Generic Seat Map Templates
 * 
 * These are reusable seat map configurations that can be applied to any venue.
 * Each configuration defines sections, their layout, and default capacity.
 * 
 * Usage:
 * ```ts
 * import { CLASSIC_THEATER } from '@/lib/seatmaps/generic'
 * 
 * // Use in database
 * const seatMap = {
 *   name: "My Theater",
 *   layoutConfig: CLASSIC_THEATER,
 *   totalCapacity: CLASSIC_THEATER.totalCapacity,
 *   svgViewbox: CLASSIC_THEATER.svgViewbox
 * }
 * ```
 */

import { GenericSeatMapConfig } from './types';

// Re-export the interface for convenience
export type { GenericSeatMapConfig };

// Helper function to get all available templates (lazy-loaded to avoid circular imports)
export function getAllSeatMapTemplates(): GenericSeatMapConfig[] {
  const { CLASSIC_THEATER } = require('./classic-theater');
  const { ARENA_LAYOUT } = require('./arena-layout');
  const { ROUND_ROOM } = require('./round-room');
  const { AMPHITHEATER } = require('./amphitheater');
  const { STADIUM_SMALL } = require('./stadium-small');
  const { STADIUM_LARGE } = require('./stadium-large');
  const { CABARET_STYLE } = require('./cabaret-style');
  const { BLACK_BOX } = require('./black-box');
  const { HORSESHOE_BALCONY } = require('./horseshoe-balcony');
  const { FLAT_FLOOR_GA } = require('./flat-floor-ga');
  
  return [
    CLASSIC_THEATER,
    ARENA_LAYOUT,
    ROUND_ROOM,
    AMPHITHEATER,
    STADIUM_SMALL,
    STADIUM_LARGE,
    CABARET_STYLE,
    BLACK_BOX,
    HORSESHOE_BALCONY,
    FLAT_FLOOR_GA
  ];
}

// Helper function to get template by name
export function getSeatMapTemplate(name: string): GenericSeatMapConfig | null {
  const templates = getAllSeatMapTemplates();
  return templates.find(t => t.name === name) || null;
}

// Export all seat map templates (lazy exports to avoid circular dependency issues)
export * from './classic-theater';
export * from './arena-layout';
export * from './round-room';
export * from './amphitheater';
export * from './stadium-small';
export * from './stadium-large';
export * from './cabaret-style';
export * from './black-box';
export * from './horseshoe-balcony';
export * from './flat-floor-ga'; 