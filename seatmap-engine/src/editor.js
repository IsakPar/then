/**
 * Seat Map Editor
 * 
 * This module provides editing capabilities for seat maps including
 * drag-and-drop functionality, seat creation, and interactive editing
 */

import { SeatMapRenderer } from './renderer.js';
import { generateSeatsForSection, calculateOptimalViewBox } from './utils.js';
import { validateVenueData } from './data.js';

// ==================== EDITOR CLASS ====================

/**
 * Seat Map Editor class
 */
class SeatMapEditor extends SeatMapRenderer {
  constructor(container, options = {}) {
    super(container, {
      enableInteraction: true,
      enableDragAndDrop: true,
      enableSeatCreation: true,
      enableSectionCreation: true,
      gridSize: 10,
      snapToGrid: true,
      ...options
    });
    
    this.isEditing = false;
    this.selectedElements = new Set();
    this.dragState = null;
    this.history = [];
    this.historyIndex = -1;
    this.clipboard = null;
    
    this.initEditor();
  }
  
  /**
   * Initialize editor-specific functionality
   */
  initEditor() {
    this.setupEditorEventListeners();
    this.createEditorUI();
  }
  
  /**
   * Setup editor event listeners
   */
  setupEditorEventListeners() {
    if (this.options.enableDragAndDrop) {
      this.svg.addEventListener('mousedown', this.handleMouseDown.bind(this));
      this.svg.addEventListener('mousemove', this.handleMouseMove.bind(this));
      this.svg.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }
  
  /**
   * Create editor UI elements
   */
  createEditorUI() {
    const editorPanel = document.createElement('div');
    editorPanel.className = 'seatmap-editor-panel';
    editorPanel.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 10px;
      min-width: 200px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      z-index: 1000;
    `;
    
    editorPanel.innerHTML = `
      <div class="editor-section">
        <h4>Mode</h4>
        <select class="editor-mode">
          <option value="select">Select</option>
          <option value="seat">Add Seat</option>
          <option value="section">Add Section</option>
        </select>
      </div>
      
      <div class="editor-section">
        <h4>Tools</h4>
        <button class="editor-btn" data-action="undo">Undo</button>
        <button class="editor-btn" data-action="redo">Redo</button>
        <button class="editor-btn" data-action="delete">Delete</button>
        <button class="editor-btn" data-action="copy">Copy</button>
        <button class="editor-btn" data-action="paste">Paste</button>
      </div>
      
      <div class="editor-section">
        <h4>Settings</h4>
        <label>
          <input type="checkbox" class="snap-to-grid" checked>
          Snap to Grid
        </label>
        <label>
          Grid Size: <input type="number" class="grid-size" value="10" min="5" max="50">
        </label>
      </div>
    `;
    
    this.container.appendChild(editorPanel);
    this.editorPanel = editorPanel;
    
    // Bind UI events
    this.bindUIEvents();
  }
  
  /**
   * Bind UI event listeners
   */
  bindUIEvents() {
    const modeSelect = this.editorPanel.querySelector('.editor-mode');
    modeSelect.addEventListener('change', (e) => {
      this.setMode(e.target.value);
    });
    
    const buttons = this.editorPanel.querySelectorAll('.editor-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        this.executeAction(action);
      });
    });
    
    const snapToGrid = this.editorPanel.querySelector('.snap-to-grid');
    snapToGrid.addEventListener('change', (e) => {
      this.options.snapToGrid = e.target.checked;
    });
    
    const gridSize = this.editorPanel.querySelector('.grid-size');
    gridSize.addEventListener('change', (e) => {
      this.options.gridSize = parseInt(e.target.value);
    });
  }
  
  /**
   * Set editing mode
   */
  setMode(mode) {
    this.mode = mode;
    this.svg.setAttribute('data-mode', mode);
    this.clearSelection();
  }
  
  /**
   * Execute editor action
   */
  executeAction(action) {
    switch (action) {
      case 'undo':
        this.undo();
        break;
      case 'redo':
        this.redo();
        break;
      case 'delete':
        this.deleteSelected();
        break;
      case 'copy':
        this.copySelected();
        break;
      case 'paste':
        this.paste();
        break;
    }
  }
  
  /**
   * Handle mouse down events
   */
  handleMouseDown(event) {
    if (!this.isEditing) return;
    
    const point = this.getMousePosition(event);
    const element = event.target;
    
    switch (this.mode) {
      case 'select':
        this.handleSelectMouseDown(event, element);
        break;
      case 'seat':
        this.handleSeatCreation(point);
        break;
      case 'section':
        this.handleSectionCreation(point);
        break;
    }
  }
  
  /**
   * Handle select mode mouse down
   */
  handleSelectMouseDown(event, element) {
    if (element.classList.contains('seatmap-seat') || 
        element.classList.contains('seatmap-section')) {
      
      // Toggle selection
      if (event.ctrlKey || event.metaKey) {
        this.toggleElementSelection(element);
      } else {
        this.clearSelection();
        this.selectElement(element);
      }
      
      // Start drag operation
      this.startDrag(event, element);
    }
  }
  
  /**
   * Handle seat creation
   */
  handleSeatCreation(point) {
    if (this.options.snapToGrid) {
      point = this.snapToGrid(point);
    }
    
    const seatId = `seat-${Date.now()}`;
    const seat = {
      id: seatId,
      rowId: 'A',
      seatNumber: '1',
      position: point,
      status: 'available',
      price: 50,
      isAccessible: false,
      tags: []
    };
    
    this.createSeat(seat);
    this.saveToHistory('Create Seat');
  }
  
  /**
   * Handle section creation
   */
  handleSectionCreation(point) {
    const sectionId = `section-${Date.now()}`;
    const section = {
      id: sectionId,
      name: 'New Section',
      type: 'general',
      color: '#3b82f6',
      priceLevel: 3,
      layout: {
        type: 'grid',
        origin: point,
        rowCount: 5,
        seatsPerRow: 10,
        rowSpacing: 25,
        seatSpacing: 18
      },
      seats: []
    };
    
    // Generate seats for the section
    section.seats = generateSeatsForSection(section);
    
    this.createSection(section);
    this.saveToHistory('Create Section');
  }
  
  /**
   * Handle mouse move events
   */
  handleMouseMove(event) {
    if (!this.dragState) return;
    
    const point = this.getMousePosition(event);
    const deltaX = point.x - this.dragState.startPoint.x;
    const deltaY = point.y - this.dragState.startPoint.y;
    
    this.dragState.elements.forEach(element => {
      const originalPos = this.dragState.originalPositions.get(element);
      let newPos = {
        x: originalPos.x + deltaX,
        y: originalPos.y + deltaY
      };
      
      if (this.options.snapToGrid) {
        newPos = this.snapToGrid(newPos);
      }
      
      this.moveElement(element, newPos);
    });
  }
  
  /**
   * Handle mouse up events
   */
  handleMouseUp(event) {
    if (this.dragState) {
      this.endDrag();
      this.saveToHistory('Move Elements');
    }
  }
  
  /**
   * Start drag operation
   */
  startDrag(event, element) {
    const point = this.getMousePosition(event);
    const elements = this.selectedElements.has(element) ? 
      Array.from(this.selectedElements) : [element];
    
    this.dragState = {
      startPoint: point,
      elements: elements,
      originalPositions: new Map()
    };
    
    // Store original positions
    elements.forEach(el => {
      const pos = this.getElementPosition(el);
      this.dragState.originalPositions.set(el, pos);
    });
  }
  
  /**
   * End drag operation
   */
  endDrag() {
    this.dragState = null;
  }
  
  /**
   * Get mouse position relative to SVG
   */
  getMousePosition(event) {
    const rect = this.svg.getBoundingClientRect();
    const viewBox = this.svg.viewBox.baseVal;
    
    const x = (event.clientX - rect.left) / rect.width * viewBox.width + viewBox.x;
    const y = (event.clientY - rect.top) / rect.height * viewBox.height + viewBox.y;
    
    return { x, y };
  }
  
  /**
   * Snap point to grid
   */
  snapToGrid(point) {
    const gridSize = this.options.gridSize;
    return {
      x: Math.round(point.x / gridSize) * gridSize,
      y: Math.round(point.y / gridSize) * gridSize
    };
  }
  
  /**
   * Get element position
   */
  getElementPosition(element) {
    if (element.classList.contains('seatmap-seat')) {
      return {
        x: parseFloat(element.getAttribute('cx')),
        y: parseFloat(element.getAttribute('cy'))
      };
    }
    
    // Handle other element types
    return { x: 0, y: 0 };
  }
  
  /**
   * Move element to new position
   */
  moveElement(element, position) {
    if (element.classList.contains('seatmap-seat')) {
      element.setAttribute('cx', position.x);
      element.setAttribute('cy', position.y);
    }
    
    // Update venue data
    this.updateVenueData(element, position);
  }
  
  /**
   * Update venue data with new position
   */
  updateVenueData(element, position) {
    const seatId = element.getAttribute('data-seat-id');
    if (!seatId) return;
    
    // Find and update seat in venue data
    this.venueData.sections.forEach(section => {
      const seat = section.seats.find(s => s.id === seatId);
      if (seat) {
        seat.position = position;
      }
    });
  }
  
  /**
   * Create new seat
   */
  createSeat(seat) {
    // Add to a default section or create one
    let defaultSection = this.venueData.sections.find(s => s.id === 'default');
    if (!defaultSection) {
      defaultSection = {
        id: 'default',
        name: 'Default Section',
        type: 'general',
        color: '#3b82f6',
        priceLevel: 3,
        layout: { type: 'custom' },
        seats: []
      };
      this.venueData.sections.push(defaultSection);
    }
    
    defaultSection.seats.push(seat);
    
    // Re-render
    this.render(this.venueData);
  }
  
  /**
   * Create new section
   */
  createSection(section) {
    this.venueData.sections.push(section);
    this.render(this.venueData);
  }
  
  /**
   * Select element
   */
  selectElement(element) {
    this.selectedElements.add(element);
    element.classList.add('selected');
  }
  
  /**
   * Toggle element selection
   */
  toggleElementSelection(element) {
    if (this.selectedElements.has(element)) {
      this.selectedElements.delete(element);
      element.classList.remove('selected');
    } else {
      this.selectElement(element);
    }
  }
  
  /**
   * Clear selection
   */
  clearSelection() {
    this.selectedElements.forEach(element => {
      element.classList.remove('selected');
    });
    this.selectedElements.clear();
  }
  
  /**
   * Delete selected elements
   */
  deleteSelected() {
    this.selectedElements.forEach(element => {
      const seatId = element.getAttribute('data-seat-id');
      if (seatId) {
        this.deleteSeat(seatId);
      }
    });
    
    this.clearSelection();
    this.render(this.venueData);
    this.saveToHistory('Delete Elements');
  }
  
  /**
   * Delete seat
   */
  deleteSeat(seatId) {
    this.venueData.sections.forEach(section => {
      section.seats = section.seats.filter(seat => seat.id !== seatId);
    });
  }
  
  /**
   * Copy selected elements
   */
  copySelected() {
    const selectedData = [];
    
    this.selectedElements.forEach(element => {
      const seatId = element.getAttribute('data-seat-id');
      if (seatId) {
        const seat = this.findSeatById(seatId);
        if (seat) {
          selectedData.push({ type: 'seat', data: { ...seat } });
        }
      }
    });
    
    this.clipboard = selectedData;
  }
  
  /**
   * Paste elements
   */
  paste() {
    if (!this.clipboard) return;
    
    const offset = 20; // Offset for pasted elements
    
    this.clipboard.forEach(item => {
      if (item.type === 'seat') {
        const newSeat = {
          ...item.data,
          id: `seat-${Date.now()}-${Math.random()}`,
          position: {
            x: item.data.position.x + offset,
            y: item.data.position.y + offset
          }
        };
        
        this.createSeat(newSeat);
      }
    });
    
    this.saveToHistory('Paste Elements');
  }
  
  /**
   * Find seat by ID
   */
  findSeatById(seatId) {
    for (const section of this.venueData.sections) {
      const seat = section.seats.find(s => s.id === seatId);
      if (seat) return seat;
    }
    return null;
  }
  
  /**
   * Save state to history
   */
  saveToHistory(action) {
    const state = {
      action,
      timestamp: Date.now(),
      venueData: JSON.parse(JSON.stringify(this.venueData))
    };
    
    // Remove any future history if we're not at the end
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(state);
    this.historyIndex++;
    
    // Limit history size
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }
  
  /**
   * Undo last action
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const state = this.history[this.historyIndex];
      this.venueData = JSON.parse(JSON.stringify(state.venueData));
      this.render(this.venueData);
    }
  }
  
  /**
   * Redo last undone action
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const state = this.history[this.historyIndex];
      this.venueData = JSON.parse(JSON.stringify(state.venueData));
      this.render(this.venueData);
    }
  }
  
  /**
   * Handle keyboard events
   */
  handleKeyDown(event) {
    if (!this.isEditing) return;
    
    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        this.deleteSelected();
        break;
      case 'c':
        if (event.ctrlKey || event.metaKey) {
          this.copySelected();
        }
        break;
      case 'v':
        if (event.ctrlKey || event.metaKey) {
          this.paste();
        }
        break;
      case 'z':
        if (event.ctrlKey || event.metaKey) {
          if (event.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
        }
        break;
    }
  }
  
  /**
   * Handle key up events
   */
  handleKeyUp(event) {
    // Handle key up events if needed
  }
  
  /**
   * Enable editing mode
   */
  enableEditing() {
    this.isEditing = true;
    this.svg.classList.add('editing');
    this.editorPanel.style.display = 'block';
    this.saveToHistory('Enable Editing');
  }
  
  /**
   * Disable editing mode
   */
  disableEditing() {
    this.isEditing = false;
    this.svg.classList.remove('editing');
    this.editorPanel.style.display = 'none';
    this.clearSelection();
  }
  
  /**
   * Export venue data
   */
  export() {
    const validation = validateVenueData(this.venueData);
    if (!validation.isValid) {
      console.warn('Venue data validation failed:', validation.errors);
    }
    
    return JSON.stringify(this.venueData, null, 2);
  }
  
  /**
   * Import venue data
   */
  import(jsonData) {
    try {
      const venueData = JSON.parse(jsonData);
      const validation = validateVenueData(venueData);
      
      if (!validation.isValid) {
        throw new Error('Invalid venue data: ' + validation.errors.join(', '));
      }
      
      this.venueData = venueData;
      this.render(this.venueData);
      this.saveToHistory('Import Data');
      
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create a seat map editor
 * @param {HTMLElement} container - Container element
 * @param {Object} options - Editor options
 * @returns {SeatMapEditor} Editor instance
 */
function createEditor(container, options = {}) {
  return new SeatMapEditor(container, options);
}

// ==================== EXPORTS ====================

export {
  SeatMapEditor,
  createEditor
}; 