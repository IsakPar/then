/**
 * Seat Map Engine
 * 
 * Main entry point for the seat map engine.
 * Exports all necessary functions and classes for rendering and editing seat maps.
 */

// Import core modules
import { 
  validateVenueData, 
  validateSeat, 
  transformDbSeatToEngine, 
  transformDbSectionToEngine, 
  createSampleVenue 
} from './src/data.js';

import { 
  generateSeatKey, 
  parseSeatKey, 
  generateSectionKey, 
  calculateDistance, 
  calculateAngle, 
  rotatePoint, 
  calculateMidpoint, 
  pointOnCircle, 
  calculateCurvedSeatPositions, 
  calculateCurvedLayout, 
  calculateGridLayout, 
  pointInRectangle, 
  pointInCircle, 
  calculateBoundingBox, 
  generateSeatsForSection, 
  calculateOptimalViewBox 
} from './src/utils.js';

import { 
  SeatMapRenderer, 
  createRenderer, 
  generateSVG 
} from './src/renderer.js';

import { 
  SeatMapEditor, 
  createEditor 
} from './src/editor.js';

// ==================== MAIN API ====================

/**
 * Creates a new seat map renderer
 * @param {HTMLElement} container - Container element for the seat map
 * @param {Object} options - Renderer options
 * @returns {SeatMapRenderer} Renderer instance
 */
function createSeatMapRenderer(container, options = {}) {
  console.log('🎨 Creating seat map renderer...', { container, options });
  
  // Create the basic renderer object
  const renderer = {
    container: container,
    options: options,
    venueData: null,
    selectedSeats: new Set(),
    
    // Render method
    render(venueData) {
      console.log('🎨 Rendering venue data:', venueData);
      this.venueData = venueData;
      
      // Clear container
      container.innerHTML = '';
      
      // Create simple SVG seat map
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '400');
      svg.setAttribute('viewBox', `${venueData.viewBox.x} ${venueData.viewBox.y} ${venueData.viewBox.width} ${venueData.viewBox.height}`);
      svg.style.background = '#f8f9fa';
      
      // Add stage
      if (venueData.stage) {
        const stage = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        stage.setAttribute('x', venueData.stage.position.x);
        stage.setAttribute('y', venueData.stage.position.y);
        stage.setAttribute('width', venueData.stage.dimensions.width);
        stage.setAttribute('height', venueData.stage.dimensions.height);
        stage.setAttribute('fill', '#2d3748');
        svg.appendChild(stage);
        
        const stageText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        stageText.setAttribute('x', venueData.stage.position.x + venueData.stage.dimensions.width / 2);
        stageText.setAttribute('y', venueData.stage.position.y + venueData.stage.dimensions.height / 2);
        stageText.setAttribute('text-anchor', 'middle');
        stageText.setAttribute('dominant-baseline', 'middle');
        stageText.setAttribute('fill', 'white');
        stageText.setAttribute('font-size', '14');
        stageText.textContent = venueData.stage.name || 'STAGE';
        svg.appendChild(stageText);
      }
      
      // Add seats
      venueData.sections.forEach(section => {
        section.seats.forEach(seat => {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', seat.position.x);
          circle.setAttribute('cy', seat.position.y);
          circle.setAttribute('r', options.seatSize || 8);
          circle.setAttribute('fill', seat.status === 'available' ? section.color : '#94a3b8');
          circle.setAttribute('stroke', '#1f2937');
          circle.setAttribute('stroke-width', '1');
          circle.style.cursor = 'pointer';
          circle.setAttribute('data-seat-id', seat.id);
          
          // Add click handler
          circle.addEventListener('click', () => {
            console.log('🎯 Seat clicked:', seat.id);
            if (seat.status === 'available') {
              this.toggleSeat(seat.id);
            }
          });
          
          svg.appendChild(circle);
        });
      });
      
      container.appendChild(svg);
      console.log('✅ Render completed');
    },
    
    // Selection methods
    selectSeat(seatId) {
      this.selectedSeats.add(seatId);
      this.updateSeatVisual(seatId, true);
    },
    
    deselectSeat(seatId) {
      this.selectedSeats.delete(seatId);
      this.updateSeatVisual(seatId, false);
    },
    
    toggleSeat(seatId) {
      if (this.selectedSeats.has(seatId)) {
        this.deselectSeat(seatId);
      } else {
        this.selectSeat(seatId);
      }
    },
    
    clearSelection() {
      this.selectedSeats.forEach(seatId => {
        this.updateSeatVisual(seatId, false);
      });
      this.selectedSeats.clear();
    },
    
    getSelectedSeats() {
      return Array.from(this.selectedSeats);
    },
    
    updateSeatVisual(seatId, selected) {
      const seatElement = container.querySelector(`[data-seat-id="${seatId}"]`);
      if (seatElement) {
        seatElement.setAttribute('fill', selected ? '#3b82f6' : seatElement.getAttribute('data-original-color') || '#10b981');
      }
    },
    
    // Event system
    addEventListener(event, callback) {
      console.log('📡 Adding event listener:', event);
      // Simple event system implementation
    },
    
    // Cleanup
    destroy() {
      if (container) {
        container.innerHTML = '';
      }
    }
  };
  
  console.log('✅ Seat map renderer created successfully');
  return renderer;
}

/**
 * Creates a new seat map editor
 * @param {HTMLElement} container - Container element for the seat map
 * @param {Object} options - Editor options
 * @returns {SeatMapEditor} Editor instance
 */
function createSeatMapEditor(container, options = {}) {
  // For now, editor extends renderer
  const renderer = createSeatMapRenderer(container, { ...options, editorMode: true });
  return renderer;
}

/**
 * Generates SVG markup for a venue
 * @param {Object} venueData - Venue data
 * @param {Object} options - Rendering options
 * @returns {string} SVG markup
 */
function generateSeatMapSVG(venueData, options = {}) {
  return generateSVG(venueData, options);
}

/**
 * Validates venue data
 * @param {Object} venueData - Venue data to validate
 * @returns {Object} Validation result
 */
function validateVenueDataStructure(venueData) {
  return validateVenueData(venueData);
}

/**
 * Transforms database data to engine format
 * @param {Object} dbData - Database data
 * @returns {Object} Engine-compatible data
 */
function transformDatabaseData(dbData) {
  const { sections, seats, ...venueInfo } = dbData;
  
  // Transform sections
  const transformedSections = sections.map(section => {
    const transformedSection = transformDbSectionToEngine(section);
    
    // Transform seats for this section
    const sectionSeats = seats.filter(seat => seat.section_id === section.id);
    transformedSection.seats = sectionSeats.map(transformDbSeatToEngine);
    
    return transformedSection;
  });
  
  return {
    ...venueInfo,
    sections: transformedSections
  };
}

/**
 * Creates a sample venue for testing
 * @returns {Object} Sample venue data
 */
function createSampleVenueData() {
  return createSampleVenue();
}

/**
 * Utility function to generate seats for a section
 * @param {Object} section - Section configuration
 * @returns {Array} Array of seat objects
 */
function generateSectionSeats(section) {
  return generateSeatsForSection(section);
}

/**
 * Utility function to calculate optimal viewBox
 * @param {Object} venue - Venue data
 * @returns {Object} Optimal viewBox
 */
function calculateVenueViewBox(venue) {
  return calculateOptimalViewBox(venue);
}

// ==================== SEAT MAP ENGINE CLASS ====================

/**
 * Main SeatMapEngine class that provides a high-level API
 */
class SeatMapEngine {
  constructor() {
    this.renderers = new Map();
    this.editors = new Map();
  }
  
  /**
   * Create a renderer for a container
   * @param {string} containerId - Container ID
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Renderer options
   * @returns {SeatMapRenderer} Renderer instance
   */
  createRenderer(containerId, container, options = {}) {
    const renderer = createSeatMapRenderer(container, options);
    this.renderers.set(containerId, renderer);
    return renderer;
  }
  
  /**
   * Create an editor for a container
   * @param {string} containerId - Container ID
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Editor options
   * @returns {SeatMapEditor} Editor instance
   */
  createEditor(containerId, container, options = {}) {
    const editor = createSeatMapEditor(container, options);
    this.editors.set(containerId, editor);
    return editor;
  }
  
  /**
   * Get renderer by container ID
   * @param {string} containerId - Container ID
   * @returns {SeatMapRenderer|null} Renderer instance
   */
  getRenderer(containerId) {
    return this.renderers.get(containerId) || null;
  }
  
  /**
   * Get editor by container ID
   * @param {string} containerId - Container ID
   * @returns {SeatMapEditor|null} Editor instance
   */
  getEditor(containerId) {
    return this.editors.get(containerId) || null;
  }
  
  /**
   * Destroy renderer
   * @param {string} containerId - Container ID
   */
  destroyRenderer(containerId) {
    const renderer = this.renderers.get(containerId);
    if (renderer) {
      renderer.destroy();
      this.renderers.delete(containerId);
    }
  }
  
  /**
   * Destroy editor
   * @param {string} containerId - Container ID
   */
  destroyEditor(containerId) {
    const editor = this.editors.get(containerId);
    if (editor) {
      editor.destroy();
      this.editors.delete(containerId);
    }
  }
  
  /**
   * Destroy all renderers and editors
   */
  destroyAll() {
    this.renderers.forEach(renderer => renderer.destroy());
    this.editors.forEach(editor => editor.destroy());
    this.renderers.clear();
    this.editors.clear();
  }
}

// ==================== EXPORTS ====================

// Export classes
export { 
  SeatMapRenderer, 
  SeatMapEditor, 
  SeatMapEngine 
};

// Export factory functions
export { 
  createSeatMapRenderer, 
  createSeatMapEditor, 
  generateSeatMapSVG 
};

// Export data functions
export { 
  validateVenueDataStructure, 
  transformDatabaseData, 
  createSampleVenueData, 
  generateSectionSeats, 
  calculateVenueViewBox 
};

// Export utility functions
export { 
  generateSeatKey, 
  parseSeatKey, 
  generateSectionKey, 
  calculateDistance, 
  calculateAngle, 
  rotatePoint, 
  calculateMidpoint, 
  pointOnCircle, 
  calculateCurvedSeatPositions, 
  calculateCurvedLayout, 
  calculateGridLayout, 
  pointInRectangle, 
  pointInCircle, 
  calculateBoundingBox 
};

// Export validation functions
export { 
  validateSeat 
};

// Export transformation functions
export { 
  transformDbSeatToEngine, 
  transformDbSectionToEngine 
};

// Default export
export default SeatMapEngine; 