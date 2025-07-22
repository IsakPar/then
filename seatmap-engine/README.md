# Seat Map Engine

A modern, JSON-based seat map rendering and editing engine inspired by professional implementations like seatmap.pro and D3-seating-chart.

## Features

- **Modern Architecture**: Clean separation of concerns with modular design
- **JSON-based Data**: Structured, validated data format for venues and seat layouts
- **SVG Rendering**: Scalable, interactive graphics with responsive design
- **Interactive Editing**: Drag-and-drop seat editing with history management
- **Section Support**: Proper hierarchical organization with curved and grid layouts
- **Accessibility**: Screen reader support and keyboard navigation
- **TypeScript Ready**: Full type definitions and validation
- **Framework Agnostic**: Works with React, Vue, Angular, or vanilla JS

## Quick Start

### Basic Usage

```javascript
import { createSeatMapRenderer } from './seatmap-engine';

// Create a container
const container = document.getElementById('seatmap-container');

// Create renderer
const renderer = createSeatMapRenderer(container, {
  enableTooltips: true,
  seatSize: 12,
  enableInteraction: true
});

// Load venue data
const venueData = {
  id: 'sample-theater',
  name: 'Sample Theater',
  type: 'theater',
  viewBox: { x: 0, y: 0, width: 1000, height: 800 },
  stage: {
    id: 'main-stage',
    name: 'STAGE',
    position: { x: 300, y: 650 },
    dimensions: { width: 400, height: 80 },
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
      seats: [
        {
          id: 'orch-A-1',
          rowId: 'A',
          seatNumber: '1',
          position: { x: 200, y: 400 },
          status: 'available',
          price: 85,
          isAccessible: false,
          tags: []
        }
        // ... more seats
      ]
    }
  ],
  metadata: {
    capacity: 800,
    created: new Date().toISOString(),
    version: '1.0.0'
  }
};

// Render the seat map
renderer.render(venueData);
```

### Editor Mode

```javascript
import { createSeatMapEditor } from './seatmap-engine';

const editor = createSeatMapEditor(container, {
  enableTooltips: true,
  seatSize: 12,
  enableDragAndDrop: true,
  gridSize: 10,
  snapToGrid: true
});

// Enable editing
editor.enableEditing();

// Render data
editor.render(venueData);

// Export modified data
const exportedData = editor.export();
```

### React Integration

```jsx
import React, { useEffect, useRef } from 'react';
import { createSeatMapRenderer } from './seatmap-engine';

const SeatMapComponent = ({ venueData, onSeatSelect }) => {
  const containerRef = useRef(null);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = createSeatMapRenderer(containerRef.current, {
      enableTooltips: true,
      seatSize: 12
    });

    renderer.addEventListener('selectionChange', (data) => {
      onSeatSelect(data.seatId);
    });

    rendererRef.current = renderer;

    return () => {
      renderer.destroy();
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current && venueData) {
      rendererRef.current.render(venueData);
    }
  }, [venueData]);

  return <div ref={containerRef} className="seat-map-container" />;
};
```

## API Reference

### Core Classes

#### `SeatMapRenderer`

Main rendering class for displaying seat maps.

```javascript
const renderer = new SeatMapRenderer(container, options);
```

**Options:**
- `seatSize`: Size of seat circles (default: 12)
- `enableInteraction`: Enable seat selection (default: true)
- `enableTooltips`: Show tooltips on hover (default: true)
- `responsive`: Enable responsive design (default: true)

**Methods:**
- `render(venueData)`: Render venue data
- `selectSeat(seatId)`: Select a specific seat
- `deselectSeat(seatId)`: Deselect a specific seat
- `clearSelection()`: Clear all selections
- `getSelectedSeats()`: Get array of selected seat IDs
- `addEventListener(event, callback)`: Add event listener
- `destroy()`: Clean up resources

#### `SeatMapEditor`

Advanced editor class extending SeatMapRenderer.

```javascript
const editor = new SeatMapEditor(container, options);
```

**Additional Options:**
- `enableDragAndDrop`: Enable drag-and-drop editing (default: true)
- `gridSize`: Grid size for snapping (default: 10)
- `snapToGrid`: Enable grid snapping (default: true)

**Additional Methods:**
- `enableEditing()`: Enable editing mode
- `disableEditing()`: Disable editing mode
- `export()`: Export venue data as JSON
- `import(jsonData)`: Import venue data from JSON
- `undo()`: Undo last action
- `redo()`: Redo last undone action

### Utility Functions

#### Data Transformation

```javascript
import { transformDatabaseData, validateVenueDataStructure } from './seatmap-engine';

// Transform database format to engine format
const engineData = transformDatabaseData(dbData);

// Validate venue data structure
const validation = validateVenueDataStructure(venueData);
if (!validation.isValid) {
  console.log('Validation errors:', validation.errors);
}
```

#### Seat Generation

```javascript
import { generateSeatsForSection } from './seatmap-engine';

const section = {
  id: 'orchestra',
  name: 'Orchestra',
  layout: {
    type: 'grid',
    origin: { x: 200, y: 400 },
    rowCount: 15,
    seatsPerRow: 20,
    rowSpacing: 25,
    seatSpacing: 18
  }
};

const seats = generateSeatsForSection(section);
```

#### Coordinate Calculations

```javascript
import { calculateCurvedLayout, calculateGridLayout } from './seatmap-engine';

// Calculate curved seating layout
const curvedLayout = calculateCurvedLayout(curvedSection);

// Calculate grid seating layout
const gridLayout = calculateGridLayout(gridSection);
```

## Data Format

### Venue Data Structure

```json
{
  "id": "venue-id",
  "name": "Venue Name",
  "type": "theater",
  "viewBox": {
    "x": 0,
    "y": 0,
    "width": 1000,
    "height": 800
  },
  "stage": {
    "id": "stage-id",
    "name": "Stage Name",
    "position": { "x": 300, "y": 650 },
    "dimensions": { "width": 400, "height": 80 },
    "shape": "rectangle",
    "orientation": "north"
  },
  "sections": [
    {
      "id": "section-id",
      "name": "Section Name",
      "type": "orchestra",
      "color": "#e11d48",
      "priceLevel": 5,
      "layout": {
        "type": "grid",
        "origin": { "x": 200, "y": 400 },
        "rowCount": 15,
        "seatsPerRow": 20,
        "rowSpacing": 25,
        "seatSpacing": 18
      },
      "seats": [
        {
          "id": "seat-id",
          "rowId": "A",
          "seatNumber": "1",
          "position": { "x": 200, "y": 400 },
          "status": "available",
          "price": 85,
          "isAccessible": false,
          "tags": []
        }
      ]
    }
  ],
  "metadata": {
    "capacity": 800,
    "created": "2025-01-14T14:16:00.000Z",
    "version": "1.0.0"
  }
}
```

### Seat Status Values

- `available`: Seat is available for selection
- `selected`: Seat is currently selected
- `reserved`: Seat is reserved/booked
- `blocked`: Seat is blocked/unavailable

### Section Types

- `orchestra`: Main floor seating
- `balcony`: Upper level seating
- `mezzanine`: Middle level seating
- `box`: Private box seating
- `general`: General admission

### Layout Types

- `grid`: Rectangular grid layout
- `curved`: Curved theater-style layout
- `custom`: Custom positioning

## Events

### Selection Events

```javascript
renderer.addEventListener('selectionChange', (data) => {
  console.log('Selection changed:', data);
  // data = { seatId, selected, totalSelected }
});
```

### Editor Events

```javascript
editor.addEventListener('seatCreated', (data) => {
  console.log('Seat created:', data);
});

editor.addEventListener('seatMoved', (data) => {
  console.log('Seat moved:', data);
});

editor.addEventListener('sectionCreated', (data) => {
  console.log('Section created:', data);
});
```

## Styling

The engine uses CSS classes for styling. You can customize the appearance by overriding these classes:

```css
.seatmap-svg {
  /* SVG container styles */
}

.seatmap-seat {
  /* Seat element styles */
  cursor: pointer;
  transition: all 0.2s ease;
}

.seatmap-seat:hover {
  /* Seat hover styles */
  stroke-width: 2;
}

.seatmap-seat.seat-available {
  /* Available seat styles */
}

.seatmap-seat.seat-selected {
  /* Selected seat styles */
}

.seatmap-seat.seat-reserved {
  /* Reserved seat styles */
  cursor: not-allowed;
  opacity: 0.6;
}

.seatmap-seat.seat-blocked {
  /* Blocked seat styles */
  cursor: not-allowed;
  opacity: 0.4;
}

.seatmap-seat.seat-accessible {
  /* Accessible seat styles */
  stroke-dasharray: 3,3;
}

.seatmap-stage {
  /* Stage styles */
}

.seatmap-section-label {
  /* Section label styles */
}

.seatmap-tooltip {
  /* Tooltip styles */
}
```

## Performance

The engine is optimized for performance with:

- **Efficient Rendering**: Only renders visible elements
- **Event Delegation**: Single event listener for all seats
- **Memory Management**: Proper cleanup of resources
- **Responsive Design**: Scales efficiently on different devices

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Development

### Running the Demo

```bash
# Serve the demo files
npx serve seatmap-engine/examples
```

Open `http://localhost:3000/demo.html` in your browser.

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

### Building

```bash
# Build for production
npm run build

# Build for development
npm run build:dev
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Changelog

### v1.0.0
- Initial release
- Basic rendering and editing functionality
- JSON-based data format
- SVG rendering with responsive design
- Interactive seat selection
- Drag-and-drop editing
- Section support with curved and grid layouts 