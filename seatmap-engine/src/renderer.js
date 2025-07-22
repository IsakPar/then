/**
 * Rendering Engine for Seat Map
 * 
 * This module handles SVG generation, seat rendering, and interactive features
 * for the seat map engine. It provides a clean API for rendering venues.
 */

import { generateSeatKey, generateSectionKey } from './utils.js';

// ==================== RENDERING ENGINE ====================

/**
 * Main SeatMapRenderer class
 */
class SeatMapRenderer {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      seatSize: 12,
      seatSpacing: 2,
      enableInteraction: true,
      enableZoom: true,
      enableTooltips: true,
      responsive: true,
      ...options
    };
    
    this.svg = null;
    this.venueData = null;
    this.selectedSeats = new Set();
    this.eventListeners = new Map();
    this.tooltip = null;
    
    this.init();
  }
  
  /**
   * Initialize the renderer
   */
  init() {
    this.createSVG();
    this.setupEventListeners();
    if (this.options.enableTooltips) {
      this.createTooltip();
    }
  }
  
  /**
   * Create the main SVG element
   */
  createSVG() {
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('class', 'seatmap-svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    
    // Add responsive viewBox
    if (this.options.responsive) {
      this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }
    
    this.container.appendChild(this.svg);
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    if (this.options.enableInteraction) {
      this.svg.addEventListener('click', this.handleSeatClick.bind(this));
      this.svg.addEventListener('mouseover', this.handleSeatHover.bind(this));
      this.svg.addEventListener('mouseout', this.handleSeatLeave.bind(this));
    }
    
    if (this.options.responsive) {
      window.addEventListener('resize', this.handleResize.bind(this));
    }
  }
  
  /**
   * Create tooltip element
   */
  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'seatmap-tooltip';
    this.tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s;
    `;
    document.body.appendChild(this.tooltip);
  }
  
  /**
   * Render venue data
   */
  render(venueData) {
    this.venueData = venueData;
    this.clear();
    this.setupViewBox();
    this.renderStage();
    this.renderSections();
    this.renderLabels();
  }
  
  /**
   * Clear the SVG
   */
  clear() {
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }
  }
  
  /**
   * Setup SVG viewBox
   */
  setupViewBox() {
    if (!this.venueData.viewBox) return;
    
    const { x, y, width, height } = this.venueData.viewBox;
    this.svg.setAttribute('viewBox', `${x} ${y} ${width} ${height}`);
  }
  
  /**
   * Render stage
   */
  renderStage() {
    if (!this.venueData.stage) return;
    
    const stage = this.venueData.stage;
    const stageElement = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    
    stageElement.setAttribute('x', stage.position.x);
    stageElement.setAttribute('y', stage.position.y);
    stageElement.setAttribute('width', stage.dimensions.width);
    stageElement.setAttribute('height', stage.dimensions.height);
    stageElement.setAttribute('class', 'seatmap-stage');
    stageElement.setAttribute('fill', '#2d3748');
    stageElement.setAttribute('stroke', '#4a5568');
    stageElement.setAttribute('stroke-width', '2');
    
    this.svg.appendChild(stageElement);
    
    // Add stage label
    const stageLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    stageLabel.setAttribute('x', stage.position.x + stage.dimensions.width / 2);
    stageLabel.setAttribute('y', stage.position.y + stage.dimensions.height / 2);
    stageLabel.setAttribute('text-anchor', 'middle');
    stageLabel.setAttribute('dominant-baseline', 'middle');
    stageLabel.setAttribute('class', 'seatmap-stage-label');
    stageLabel.setAttribute('fill', 'white');
    stageLabel.setAttribute('font-size', '14');
    stageLabel.setAttribute('font-weight', 'bold');
    stageLabel.textContent = stage.name;
    
    this.svg.appendChild(stageLabel);
  }
  
  /**
   * Render all sections
   */
  renderSections() {
    this.venueData.sections.forEach(section => {
      this.renderSection(section);
    });
  }
  
  /**
   * Render a single section
   */
  renderSection(section) {
    const sectionGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    sectionGroup.setAttribute('class', 'seatmap-section');
    sectionGroup.setAttribute('data-section-id', section.id);
    
    // Render seats in this section
    section.seats.forEach(seat => {
      const seatElement = this.renderSeat(seat, section);
      sectionGroup.appendChild(seatElement);
    });
    
    this.svg.appendChild(sectionGroup);
  }
  
  /**
   * Render a single seat
   */
  renderSeat(seat, section) {
    const seatElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    
    seatElement.setAttribute('cx', seat.position.x);
    seatElement.setAttribute('cy', seat.position.y);
    seatElement.setAttribute('r', this.options.seatSize / 2);
    seatElement.setAttribute('class', `seatmap-seat seat-${seat.status}`);
    seatElement.setAttribute('data-seat-id', seat.id);
    seatElement.setAttribute('data-section-id', section.id);
    seatElement.setAttribute('data-row', seat.rowId);
    seatElement.setAttribute('data-seat-number', seat.seatNumber);
    seatElement.setAttribute('data-price', seat.price);
    
    // Set seat colors based on status
    const colors = this.getSeatColors(seat.status, section.color);
    seatElement.setAttribute('fill', colors.fill);
    seatElement.setAttribute('stroke', colors.stroke);
    seatElement.setAttribute('stroke-width', '1');
    
    // Add accessibility indicator
    if (seat.isAccessible) {
      seatElement.setAttribute('class', seatElement.getAttribute('class') + ' seat-accessible');
    }
    
    return seatElement;
  }
  
  /**
   * Get seat colors based on status
   */
  getSeatColors(status, sectionColor) {
    const colors = {
      available: { fill: sectionColor, stroke: '#2d3748' },
      selected: { fill: '#fbbf24', stroke: '#f59e0b' },
      reserved: { fill: '#6b7280', stroke: '#4b5563' },
      blocked: { fill: '#dc2626', stroke: '#b91c1c' }
    };
    
    return colors[status] || colors.available;
  }
  
  /**
   * Render section labels
   */
  renderLabels() {
    this.venueData.sections.forEach(section => {
      if (section.seats.length === 0) return;
      
      // Calculate label position (center of section)
      const seatPositions = section.seats.map(seat => seat.position);
      const centerX = seatPositions.reduce((sum, pos) => sum + pos.x, 0) / seatPositions.length;
      const centerY = seatPositions.reduce((sum, pos) => sum + pos.y, 0) / seatPositions.length;
      
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', centerX);
      label.setAttribute('y', centerY - 30); // Position above seats
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'seatmap-section-label');
      label.setAttribute('fill', '#2d3748');
      label.setAttribute('font-size', '12');
      label.setAttribute('font-weight', 'bold');
      label.textContent = section.name;
      
      this.svg.appendChild(label);
    });
  }
  
  /**
   * Handle seat click events
   */
  handleSeatClick(event) {
    const seatElement = event.target.closest('.seatmap-seat');
    if (!seatElement) return;
    
    const seatId = seatElement.getAttribute('data-seat-id');
    const seatStatus = seatElement.getAttribute('class');
    
    // Don't allow selection of reserved or blocked seats
    if (seatStatus.includes('seat-reserved') || seatStatus.includes('seat-blocked')) {
      return;
    }
    
    // Toggle seat selection
    if (this.selectedSeats.has(seatId)) {
      this.deselectSeat(seatId);
    } else {
      this.selectSeat(seatId);
    }
    
    // Emit selection change event
    this.emitEvent('selectionChange', {
      seatId,
      selected: this.selectedSeats.has(seatId),
      totalSelected: this.selectedSeats.size
    });
  }
  
  /**
   * Handle seat hover events
   */
  handleSeatHover(event) {
    const seatElement = event.target.closest('.seatmap-seat');
    if (!seatElement || !this.tooltip) return;
    
    const seatId = seatElement.getAttribute('data-seat-id');
    const sectionId = seatElement.getAttribute('data-section-id');
    const row = seatElement.getAttribute('data-row');
    const seatNumber = seatElement.getAttribute('data-seat-number');
    const price = seatElement.getAttribute('data-price');
    
    const section = this.venueData.sections.find(s => s.id === sectionId);
    
    this.tooltip.innerHTML = `
      <div><strong>${section.name}</strong></div>
      <div>Row ${row}, Seat ${seatNumber}</div>
      <div>$${price}</div>
    `;
    
    this.tooltip.style.opacity = '1';
    this.updateTooltipPosition(event);
  }
  
  /**
   * Handle seat leave events
   */
  handleSeatLeave(event) {
    if (this.tooltip) {
      this.tooltip.style.opacity = '0';
    }
  }
  
  /**
   * Update tooltip position
   */
  updateTooltipPosition(event) {
    if (!this.tooltip) return;
    
    const rect = this.container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    this.tooltip.style.left = `${x + 10}px`;
    this.tooltip.style.top = `${y - 10}px`;
  }
  
  /**
   * Select a seat
   */
  selectSeat(seatId) {
    const seatElement = this.svg.querySelector(`[data-seat-id="${seatId}"]`);
    if (!seatElement) return;
    
    this.selectedSeats.add(seatId);
    seatElement.setAttribute('class', seatElement.getAttribute('class').replace('seat-available', 'seat-selected'));
    
    const colors = this.getSeatColors('selected');
    seatElement.setAttribute('fill', colors.fill);
    seatElement.setAttribute('stroke', colors.stroke);
  }
  
  /**
   * Deselect a seat
   */
  deselectSeat(seatId) {
    const seatElement = this.svg.querySelector(`[data-seat-id="${seatId}"]`);
    if (!seatElement) return;
    
    this.selectedSeats.delete(seatId);
    seatElement.setAttribute('class', seatElement.getAttribute('class').replace('seat-selected', 'seat-available'));
    
    const sectionId = seatElement.getAttribute('data-section-id');
    const section = this.venueData.sections.find(s => s.id === sectionId);
    const colors = this.getSeatColors('available', section.color);
    seatElement.setAttribute('fill', colors.fill);
    seatElement.setAttribute('stroke', colors.stroke);
  }
  
  /**
   * Handle resize events
   */
  handleResize() {
    // Update tooltip position if visible
    if (this.tooltip && this.tooltip.style.opacity === '1') {
      this.tooltip.style.opacity = '0';
    }
  }
  
  /**
   * Get selected seats
   */
  getSelectedSeats() {
    return Array.from(this.selectedSeats);
  }
  
  /**
   * Clear selection
   */
  clearSelection() {
    this.selectedSeats.forEach(seatId => {
      this.deselectSeat(seatId);
    });
    this.selectedSeats.clear();
  }
  
  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }
  
  /**
   * Emit event
   */
  emitEvent(event, data) {
    if (!this.eventListeners.has(event)) return;
    
    this.eventListeners.get(event).forEach(callback => {
      callback(data);
    });
  }
  
  /**
   * Destroy renderer
   */
  destroy() {
    if (this.svg) {
      this.svg.remove();
    }
    
    if (this.tooltip) {
      this.tooltip.remove();
    }
    
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.eventListeners.clear();
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create a seat map renderer
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Renderer options
 * @returns {SeatMapRenderer} Renderer instance
 */
function createRenderer(container, options = {}) {
  return new SeatMapRenderer(container, options);
}

/**
 * Generate SVG string for a venue
 * @param {Object} venueData - Venue data
 * @param {Object} options - Rendering options
 * @returns {string} SVG string
 */
function generateSVG(venueData, options = {}) {
  const tempContainer = document.createElement('div');
  const renderer = createRenderer(tempContainer, options);
  renderer.render(venueData);
  
  const svgString = renderer.svg.outerHTML;
  renderer.destroy();
  
  return svgString;
}

// ==================== EXPORTS ====================

export {
  SeatMapRenderer,
  createRenderer,
  generateSVG
}; 