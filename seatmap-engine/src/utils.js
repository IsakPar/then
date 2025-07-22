/**
 * Utility Functions for Seat Map Engine
 * 
 * This module provides helper functions for coordinate calculations,
 * seat key generation, geometry operations, and other utilities
 */

// ==================== SEAT KEY GENERATION ====================

/**
 * Generates a unique seat key from row and seat number
 * @param {string} rowId - Row identifier
 * @param {string|number} seatNumber - Seat number
 * @returns {string} Unique seat key
 */
function generateSeatKey(rowId, seatNumber) {
  return `${rowId}-${seatNumber}`;
}

/**
 * Parses a seat key into row and seat number
 * @param {string} seatKey - Seat key to parse
 * @returns {Object} Object with rowId and seatNumber
 */
function parseSeatKey(seatKey) {
  const [rowId, seatNumber] = seatKey.split('-');
  return { rowId, seatNumber };
}

/**
 * Generates a unique section key
 * @param {string} sectionId - Section identifier
 * @returns {string} Section key
 */
function generateSectionKey(sectionId) {
  return `section-${sectionId}`;
}

// ==================== COORDINATE CALCULATIONS ====================

/**
 * Calculates distance between two points
 * @param {Object} point1 - First point {x, y}
 * @param {Object} point2 - Second point {x, y}
 * @returns {number} Distance between points
 */
function calculateDistance(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates angle between two points in degrees
 * @param {Object} point1 - First point {x, y}
 * @param {Object} point2 - Second point {x, y}
 * @returns {number} Angle in degrees
 */
function calculateAngle(point1, point2) {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Rotates a point around another point by given angle
 * @param {Object} point - Point to rotate {x, y}
 * @param {Object} center - Center point {x, y}
 * @param {number} angle - Angle in degrees
 * @returns {Object} Rotated point {x, y}
 */
function rotatePoint(point, center, angle) {
  const rad = angle * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
}

/**
 * Calculates midpoint between two points
 * @param {Object} point1 - First point {x, y}
 * @param {Object} point2 - Second point {x, y}
 * @returns {Object} Midpoint {x, y}
 */
function calculateMidpoint(point1, point2) {
  return {
    x: (point1.x + point2.x) / 2,
    y: (point1.y + point2.y) / 2
  };
}

// ==================== CURVE CALCULATIONS ====================

/**
 * Calculates point on a circle given center, radius, and angle
 * @param {Object} center - Center point {x, y}
 * @param {number} radius - Circle radius
 * @param {number} angle - Angle in degrees
 * @returns {Object} Point on circle {x, y}
 */
function pointOnCircle(center, radius, angle) {
  const rad = angle * (Math.PI / 180);
  return {
    x: center.x + radius * Math.cos(rad),
    y: center.y + radius * Math.sin(rad)
  };
}

/**
 * Calculates positions for seats in a curved row
 * @param {Object} options - Configuration options
 * @param {Object} options.center - Center point of curve
 * @param {number} options.radius - Curve radius
 * @param {number} options.startAngle - Start angle in degrees
 * @param {number} options.endAngle - End angle in degrees
 * @param {number} options.seatCount - Number of seats
 * @returns {Array} Array of seat positions
 */
function calculateCurvedSeatPositions(options) {
  const { center, radius, startAngle, endAngle, seatCount } = options;
  const positions = [];
  
  if (seatCount <= 1) {
    return [pointOnCircle(center, radius, (startAngle + endAngle) / 2)];
  }
  
  const angleStep = (endAngle - startAngle) / (seatCount - 1);
  
  for (let i = 0; i < seatCount; i++) {
    const angle = startAngle + i * angleStep;
    positions.push(pointOnCircle(center, radius, angle));
  }
  
  return positions;
}

/**
 * Calculates curved section layout
 * @param {Object} section - Section configuration
 * @returns {Array} Array of row configurations with seat positions
 */
function calculateCurvedLayout(section) {
  const { layout } = section;
  const { curve, rowCount, seatsPerRow, rowSpacing } = layout;
  
  const rows = [];
  
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const rowRadius = curve.radius + (rowIndex * rowSpacing);
    const rowPositions = calculateCurvedSeatPositions({
      center: curve.center,
      radius: rowRadius,
      startAngle: curve.startAngle,
      endAngle: curve.endAngle,
      seatCount: seatsPerRow
    });
    
    rows.push({
      rowIndex,
      rowId: String.fromCharCode(65 + rowIndex), // A, B, C, etc.
      positions: rowPositions
    });
  }
  
  return rows;
}

// ==================== GRID CALCULATIONS ====================

/**
 * Calculates positions for seats in a grid layout
 * @param {Object} section - Section configuration
 * @returns {Array} Array of row configurations with seat positions
 */
function calculateGridLayout(section) {
  const { layout } = section;
  const { origin, rowCount, seatsPerRow, rowSpacing, seatSpacing } = layout;
  
  const rows = [];
  
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const rowY = origin.y + (rowIndex * rowSpacing);
    const positions = [];
    
    for (let seatIndex = 0; seatIndex < seatsPerRow; seatIndex++) {
      const seatX = origin.x + (seatIndex * seatSpacing);
      positions.push({ x: seatX, y: rowY });
    }
    
    rows.push({
      rowIndex,
      rowId: String.fromCharCode(65 + rowIndex), // A, B, C, etc.
      positions
    });
  }
  
  return rows;
}

// ==================== GEOMETRY HELPERS ====================

/**
 * Checks if a point is inside a rectangle
 * @param {Object} point - Point to check {x, y}
 * @param {Object} rect - Rectangle {x, y, width, height}
 * @returns {boolean} True if point is inside rectangle
 */
function pointInRectangle(point, rect) {
  return point.x >= rect.x && 
         point.x <= rect.x + rect.width &&
         point.y >= rect.y && 
         point.y <= rect.y + rect.height;
}

/**
 * Checks if a point is inside a circle
 * @param {Object} point - Point to check {x, y}
 * @param {Object} circle - Circle {x, y, radius}
 * @returns {boolean} True if point is inside circle
 */
function pointInCircle(point, circle) {
  const distance = calculateDistance(point, { x: circle.x, y: circle.y });
  return distance <= circle.radius;
}

/**
 * Calculates bounding box for a set of points
 * @param {Array} points - Array of points {x, y}
 * @returns {Object} Bounding box {x, y, width, height}
 */
function calculateBoundingBox(points) {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  
  for (let i = 1; i < points.length; i++) {
    minX = Math.min(minX, points[i].x);
    minY = Math.min(minY, points[i].y);
    maxX = Math.max(maxX, points[i].x);
    maxY = Math.max(maxY, points[i].y);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

// ==================== SEAT GENERATION ====================

/**
 * Generates seats for a section based on its layout
 * @param {Object} section - Section configuration
 * @returns {Array} Array of seat objects
 */
function generateSeatsForSection(section) {
  const seats = [];
  let layoutRows = [];
  
  // Calculate layout based on section type
  switch (section.layout.type) {
    case 'curved':
      layoutRows = calculateCurvedLayout(section);
      break;
    case 'grid':
    default:
      layoutRows = calculateGridLayout(section);
      break;
  }
  
  // Generate seat objects
  layoutRows.forEach(row => {
    row.positions.forEach((position, seatIndex) => {
      const seatNumber = seatIndex + 1;
      const seat = {
        id: `${section.id}-${row.rowId}-${seatNumber}`,
        rowId: row.rowId,
        seatNumber: seatNumber.toString(),
        position: position,
        status: 'available',
        price: section.priceLevel * 10, // Simple pricing
        isAccessible: seatIndex < 2, // First 2 seats are accessible
        tags: []
      };
      
      seats.push(seat);
    });
  });
  
  return seats;
}

// ==================== VIEWBOX CALCULATIONS ====================

/**
 * Calculates optimal viewBox for a venue
 * @param {Object} venue - Venue data
 * @returns {Object} ViewBox {x, y, width, height}
 */
function calculateOptimalViewBox(venue) {
  const allPoints = [];
  
  // Add stage points
  if (venue.stage) {
    const stage = venue.stage;
    allPoints.push(stage.position);
    allPoints.push({
      x: stage.position.x + stage.dimensions.width,
      y: stage.position.y + stage.dimensions.height
    });
  }
  
  // Add all seat positions
  venue.sections.forEach(section => {
    section.seats.forEach(seat => {
      allPoints.push(seat.position);
    });
  });
  
  const bbox = calculateBoundingBox(allPoints);
  const padding = 50; // Add padding around content
  
  return {
    x: bbox.x - padding,
    y: bbox.y - padding,
    width: bbox.width + (padding * 2),
    height: bbox.height + (padding * 2)
  };
}

// ==================== EXPORTS ====================

export {
  // Seat key generation
  generateSeatKey,
  parseSeatKey,
  generateSectionKey,
  
  // Coordinate calculations
  calculateDistance,
  calculateAngle,
  rotatePoint,
  calculateMidpoint,
  
  // Curve calculations
  pointOnCircle,
  calculateCurvedSeatPositions,
  calculateCurvedLayout,
  
  // Grid calculations
  calculateGridLayout,
  
  // Geometry helpers
  pointInRectangle,
  pointInCircle,
  calculateBoundingBox,
  
  // Seat generation
  generateSeatsForSection,
  
  // ViewBox calculations
  calculateOptimalViewBox
}; 