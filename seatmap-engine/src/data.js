/**
 * Data Models and JSON Schemas for Seat Map Engine
 * 
 * This module defines the data structures used by the seatmap engine,
 * inspired by modern implementations like D3-seating-chart and seatmap.pro
 */

// ==================== VENUE DATA SCHEMA ====================

/**
 * Complete venue data structure
 * @typedef {Object} VenueData
 * @property {string} id - Unique venue identifier
 * @property {string} name - Venue name
 * @property {string} type - Venue type (theater, arena, stadium, etc.)
 * @property {ViewBox} viewBox - SVG viewBox for the venue
 * @property {Stage} stage - Stage/performance area configuration
 * @property {Section[]} sections - Array of seating sections
 * @property {Object} metadata - Additional venue metadata
 */

/**
 * SVG ViewBox configuration
 * @typedef {Object} ViewBox
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate  
 * @property {number} width - Width
 * @property {number} height - Height
 */

/**
 * Stage configuration
 * @typedef {Object} Stage
 * @property {string} id - Stage identifier
 * @property {string} name - Stage name
 * @property {Coordinates} position - Stage position
 * @property {Dimensions} dimensions - Stage dimensions
 * @property {string} shape - Stage shape (rectangle, arc, custom)
 * @property {string} orientation - Stage orientation (north, south, east, west)
 */

/**
 * Section configuration
 * @typedef {Object} Section
 * @property {string} id - Section identifier
 * @property {string} name - Section display name
 * @property {string} type - Section type (orchestra, balcony, mezzanine, etc.)
 * @property {string} color - Section color (hex)
 * @property {number} priceLevel - Price level (1-5)
 * @property {SectionLayout} layout - Section layout configuration
 * @property {Seat[]} seats - Array of seats in this section
 */

/**
 * Section layout configuration
 * @typedef {Object} SectionLayout
 * @property {string} type - Layout type (grid, curved, custom)
 * @property {Coordinates} origin - Starting position
 * @property {number} rowCount - Number of rows
 * @property {number} seatsPerRow - Seats per row (average)
 * @property {Curve} curve - Curve configuration (if curved layout)
 * @property {number} rowSpacing - Spacing between rows
 * @property {number} seatSpacing - Spacing between seats
 */

/**
 * Seat configuration
 * @typedef {Object} Seat
 * @property {string} id - Seat identifier
 * @property {string} rowId - Row identifier
 * @property {string} seatNumber - Seat number within row
 * @property {Coordinates} position - Seat position
 * @property {string} status - Seat status (available, selected, reserved, blocked)
 * @property {number} price - Seat price
 * @property {boolean} isAccessible - Accessibility indicator
 * @property {string[]} tags - Additional seat tags
 */

/**
 * Coordinate system
 * @typedef {Object} Coordinates
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * Dimensions
 * @typedef {Object} Dimensions
 * @property {number} width - Width
 * @property {number} height - Height
 */

/**
 * Curve configuration for curved sections
 * @typedef {Object} Curve
 * @property {number} radius - Curve radius
 * @property {number} startAngle - Start angle in degrees
 * @property {number} endAngle - End angle in degrees
 * @property {Coordinates} center - Center point of curve
 */

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validates venue data structure
 * @param {VenueData} venueData - Venue data to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validateVenueData(venueData) {
  const errors = [];
  
  // Check required fields
  if (!venueData.id) errors.push('Venue ID is required');
  if (!venueData.name) errors.push('Venue name is required');
  if (!venueData.viewBox) errors.push('ViewBox is required');
  if (!venueData.sections || !Array.isArray(venueData.sections)) {
    errors.push('Sections array is required');
  }
  
  // Validate viewBox
  if (venueData.viewBox) {
    const vb = venueData.viewBox;
    if (typeof vb.x !== 'number' || typeof vb.y !== 'number' || 
        typeof vb.width !== 'number' || typeof vb.height !== 'number') {
      errors.push('ViewBox must have numeric x, y, width, height');
    }
  }
  
  // Validate sections
  if (venueData.sections) {
    venueData.sections.forEach((section, index) => {
      if (!section.id) errors.push(`Section ${index}: ID is required`);
      if (!section.name) errors.push(`Section ${index}: Name is required`);
      if (!section.color) errors.push(`Section ${index}: Color is required`);
      if (!section.seats || !Array.isArray(section.seats)) {
        errors.push(`Section ${index}: Seats array is required`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validates seat data structure
 * @param {Seat} seat - Seat data to validate
 * @returns {Object} Validation result
 */
function validateSeat(seat) {
  const errors = [];
  
  if (!seat.id) errors.push('Seat ID is required');
  if (!seat.rowId) errors.push('Row ID is required');
  if (!seat.seatNumber) errors.push('Seat number is required');
  if (!seat.position || typeof seat.position.x !== 'number' || typeof seat.position.y !== 'number') {
    errors.push('Seat position with x,y coordinates is required');
  }
  if (!seat.status) errors.push('Seat status is required');
  if (typeof seat.price !== 'number') errors.push('Seat price must be a number');
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// ==================== DATA TRANSFORMATION FUNCTIONS ====================

/**
 * Transforms database seat data to engine format
 * @param {Object} dbSeat - Database seat object
 * @returns {Seat} Engine seat object
 */
function transformDbSeatToEngine(dbSeat) {
  return {
    id: dbSeat.id,
    rowId: dbSeat.row_letter || dbSeat.rowId,
    seatNumber: dbSeat.seat_number || dbSeat.seatNumber,
    position: {
      x: dbSeat.position?.x || 0,
      y: dbSeat.position?.y || 0
    },
    status: dbSeat.status || 'available',
    price: dbSeat.price_pence ? dbSeat.price_pence / 100 : 0,
    isAccessible: dbSeat.is_accessible || false,
    tags: dbSeat.tags || []
  };
}

/**
 * Transforms database section data to engine format
 * @param {Object} dbSection - Database section object
 * @returns {Section} Engine section object
 */
function transformDbSectionToEngine(dbSection) {
  return {
    id: dbSection.id,
    name: dbSection.name || dbSection.display_name,
    type: dbSection.type || 'general',
    color: dbSection.color_hex || '#3b82f6',
    priceLevel: dbSection.price_level || 1,
    layout: {
      type: dbSection.layout_type || 'grid',
      origin: { x: 0, y: 0 },
      rowCount: dbSection.row_count || 1,
      seatsPerRow: dbSection.seats_per_row || 1,
      rowSpacing: dbSection.row_spacing || 20,
      seatSpacing: dbSection.seat_spacing || 15
    },
    seats: dbSection.seats ? dbSection.seats.map(transformDbSeatToEngine) : []
  };
}

/**
 * Creates a sample venue data for testing
 * @returns {VenueData} Sample venue data
 */
function createSampleVenue() {
  return {
    id: 'sample-theater',
    name: 'Sample Theater',
    type: 'theater',
    viewBox: {
      x: 0,
      y: 0,
      width: 1000,
      height: 800
    },
    stage: {
      id: 'main-stage',
      name: 'Main Stage',
      position: { x: 300, y: 650 },
      dimensions: { width: 400, height: 100 },
      shape: 'rectangle',
      orientation: 'north'
    },
    sections: [
      {
        id: 'orchestra',
        name: 'Orchestra',
        type: 'orchestra',
        color: '#e11d48',
        priceLevel: 5,
        layout: {
          type: 'grid',
          origin: { x: 200, y: 400 },
          rowCount: 15,
          seatsPerRow: 20,
          rowSpacing: 25,
          seatSpacing: 18
        },
        seats: []
      },
      {
        id: 'balcony',
        name: 'Balcony',
        type: 'balcony',
        color: '#3b82f6',
        priceLevel: 3,
        layout: {
          type: 'curved',
          origin: { x: 100, y: 200 },
          rowCount: 10,
          seatsPerRow: 30,
          rowSpacing: 20,
          seatSpacing: 16,
          curve: {
            radius: 350,
            startAngle: -30,
            endAngle: 30,
            center: { x: 500, y: 400 }
          }
        },
        seats: []
      }
    ],
    metadata: {
      capacity: 800,
      created: new Date().toISOString(),
      version: '1.0.0'
    }
  };
}

// ==================== EXPORTS ====================

export {
  validateVenueData,
  validateSeat,
  transformDbSeatToEngine,
  transformDbSectionToEngine,
  createSampleVenue
}; 