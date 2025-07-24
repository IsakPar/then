# 🎭 **Last Minute Live Seat Map Rendering Engine - Complete Overhaul Plan**

## 📊 **Current State Analysis**

Your seat map system is **fundamentally broken** with multiple critical issues:

### 🚨 **Critical Problems Identified**

1. **Multiple Incompatible Rendering Systems**
   - `HamiltonSeatMapView` (hardcoded generation) **← KEEP FOR INVESTORS**
   - `LionKingSeatMapView` (JSON + complex transformations) **← NEEDS OVERHAUL**
   - `HardcodedSeatMapView` (WebKit-based) **← REPLACE**
   - Multiple canvas renderers with different logic **← CONSOLIDATE**

2. **Coordinate Transformation Nightmare**
   ```swift
   // Found in 3+ different places with different logic:
   let flippedY = 800.0 - jsonY
   let scaledX = 100 + ((jsonX - 100) * 800 / 600)
   let scaledY = 100 + ((flippedY - 115) * 600 / 485)
   ```

3. **Performance Catastrophe**
   - Creating 500+ individual SwiftUI `SeatButton` views
   - No virtualization or level-of-detail
   - Memory leaks from complex gesture handling

4. **Data Model Chaos**
   - `TheaterSeat`, `JSONSeat`, `Seat` - multiple incompatible models
   - Inconsistent section mapping across venues
   - Hardcoded enum mappings

---

## 🎯 **SOLUTION: Unified JSON + Canvas Rendering Engine**

### **🎭 IMPORTANT: Hamilton Preservation Strategy**

- **Keep `HamiltonSeatMapView` unchanged** - Investors are familiar with this
- **All other venues** will use the new unified system
- **Router decides**: Hamilton → legacy view, everything else → new system

---

### **Phase 1: Unified JSON Schema** (Week 1)

#### 1.1 **Single Venue JSON Format**
```json
{
  "venue_id": "victoria-palace",
  "venue_name": "Victoria Palace Theatre",
  "version": "1.0.0",
  "coordinate_system": "viewport_1000x800",
  "viewport": {
    "width": 1000,
    "height": 800
  },
  "stage": {
    "x": 500, "y": 50,
    "width": 200, "height": 30,
    "label": "STAGE"
  },
  "sections": [
    {
      "id": "premium",
      "name": "Premium Orchestra",
      "color": "#FFD700",
      "base_price_pence": 8500,
      "level": 0
    }
  ],
  "seats": [
    {
      "id": "premium-A-1",
      "section_id": "premium", 
      "row": "A", "seat": 1,
      "x": 450, "y": 200,
      "status": "available"
    }
  ],
  "visual_elements": [
    {
      "type": "aisle",
      "x1": 400, "y1": 150,
      "x2": 600, "y2": 150,
      "stroke": "#666"
    }
  ]
}
```

#### 1.2 **Standardized Coordinate System**
- **Viewport**: Always 1000x800 logical units
- **Origin**: Top-left (0,0), standard iOS coordinates
- **Stage**: Always positioned at top center
- **No transformations needed** - JSON coordinates = rendering coordinates

#### 1.3 **Database Integration**
```sql
-- New unified seat map storage
CREATE TABLE venue_layouts (
  id UUID PRIMARY KEY,
  venue_slug TEXT UNIQUE,
  layout_json JSONB,
  version TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- API endpoint: GET /api/venues/{slug}/layout
```

**Backend Connection**: Your existing database structure can stay - this adds a new `venue_layouts` table alongside your current `seat_maps`, `sections`, and `seats` tables.

---

### **Phase 2: Unified Rendering Engine** (Week 2)

#### 2.1 **Single Canvas Renderer**
```swift
// New unified renderer for non-Hamilton venues
struct UnifiedSeatMapRenderer: View {
    let layout: VenueLayout
    @Binding var availability: [String: SeatStatus]
    let onSeatTap: (String) -> Void
    
    var body: some View {
        GeometryReader { geometry in
            Canvas { context, size in
                renderSeatMap(context: context, size: size)
            }
            .gesture(TapGesture().onEnded { location in
                handleTap(at: location)
            })
            .scaleEffect(scale)
            .offset(offset)
            .gesture(zoomAndPanGesture)
        }
    }
    
    private func renderSeatMap(context: GraphicsContext, size: CGSize) {
        // 1. Render stage
        renderStage(context: context)
        
        // 2. Render visual elements (aisles, labels)
        renderVisualElements(context: context)
        
        // 3. Render seats efficiently
        renderSeats(context: context)
    }
}
```

#### 2.2 **High-Performance Seat Rendering**
```swift
private func renderSeats(context: GraphicsContext) {
    // Use viewport culling for performance
    let visibleBounds = calculateVisibleBounds()
    let visibleSeats = spatialIndex.seatsInBounds(visibleBounds)
    
    for seat in visibleSeats {
        let seatRect = CGRect(
            x: seat.x - 12, y: seat.y - 10,
            width: 24, height: 20
        )
        
        // Fast rectangle rendering
        context.fill(
            Path(roundedRect: seatRect, cornerRadius: 4),
            with: .color(seatColor(for: seat))
        )
        
        // Add selection outline if needed
        if availability[seat.id]?.isSelected == true {
            context.stroke(
                Path(roundedRect: seatRect, cornerRadius: 4),
                with: .color(.white),
                lineWidth: 2
            )
        }
    }
}
```

#### 2.3 **Spatial Indexing for Performance**
```swift
class SpatialIndex {
    private var grid: [GridKey: [SeatData]] = [:]
    private let gridSize: CGFloat = 100
    
    func updateSeats(_ seats: [SeatData]) {
        grid.removeAll()
        
        for seat in seats {
            let key = gridKey(for: CGPoint(x: seat.x, y: seat.y))
            grid[key, default: []].append(seat)
        }
    }
    
    func seatsInBounds(_ bounds: CGRect) -> [SeatData] {
        var result: [SeatData] = []
        
        let minGridX = Int(bounds.minX / gridSize)
        let maxGridX = Int(bounds.maxX / gridSize)
        let minGridY = Int(bounds.minY / gridSize)
        let maxGridY = Int(bounds.maxY / gridSize)
        
        for x in minGridX...maxGridX {
            for y in minGridY...maxGridY {
                if let seats = grid[GridKey(x: x, y: y)] {
                    result.append(contentsOf: seats)
                }
            }
        }
        
        return result
    }
}
```

---

### **Phase 3: Clean Data Models** (Week 2)

#### 3.1 **Unified Data Models**
```swift
// Single seat model for everything (except Hamilton)
struct SeatData: Identifiable, Codable {
    let id: String
    let sectionId: String
    let row: String
    let seat: Int
    let x: CGFloat
    let y: CGFloat
    
    // Runtime state (not in JSON)
    var status: SeatStatus = .available
    var isSelected: Bool = false
}

struct VenueLayout: Codable {
    let venueId: String
    let venueName: String
    let version: String
    let viewport: Viewport
    let stage: Stage
    let sections: [Section]
    let seats: [SeatData]
    let visualElements: [VisualElement]
}

enum SeatStatus {
    case available
    case selected
    case reserved
    case sold
    
    var color: Color {
        switch self {
        case .available: return .green
        case .selected: return .blue
        case .reserved: return .orange
        case .sold: return .gray
        }
    }
}
```

#### 3.2 **Legacy Model Preservation**
```swift
// KEEP these for Hamilton:
// ✅ TheaterSeat.swift (Hamilton only)
// ✅ HamiltonSeatMapView.swift
// ✅ SeatMapViewModel.swift (Hamilton-specific)

// REPLACE these for other venues:
// ❌ LionKingSeatMapViewModel.swift
// ❌ JSONSeat.swift → SeatData.swift
// ❌ Multiple coordinate transform classes
// ❌ SectionBoundaryManager.swift
```

---

### **Phase 4: Smart Routing System** (Week 3)

#### 4.1 **Venue-Aware Router**
```swift
struct SeatMapContainer: View {
    let showId: String
    let venueSlug: String
    
    var body: some View {
        Group {
            if venueSlug == "victoria-palace" && isHamiltonShow(showId) {
                // Use legacy Hamilton view for investors
                HamiltonSeatMapView()
            } else {
                // Use new unified system for all other venues
                UnifiedSeatMapView(showId: showId, venueSlug: venueSlug)
            }
        }
    }
    
    private func isHamiltonShow(_ showId: String) -> Bool {
        return showId.contains("hamilton")
    }
}
```

#### 4.2 **Unified Service Layer**
```swift
class SeatMapService {
    static let shared = SeatMapService()
    
    private let apiClient = APIClient.shared
    private var layoutCache: [String: VenueLayout] = [:]
    
    func loadVenueLayout(_ venueSlug: String) async throws -> VenueLayout {
        // Check cache first
        if let cached = layoutCache[venueSlug] {
            return cached
        }
        
        // Load from your existing API or new layout endpoint
        let layout = try await apiClient.fetchVenueLayout(venueSlug)
        layoutCache[venueSlug] = layout
        return layout
    }
    
    func getAvailability(showId: String) async throws -> [String: SeatStatus] {
        // Connect to your existing availability system
        return try await apiClient.fetchSeatAvailability(showId)
    }
}
```

#### 4.3 **API Integration**
```swift
// Backend API endpoints (works with your existing system):
// GET /api/venues/{slug}/layout - New unified layout
// GET /api/shows/{id}/availability - Your existing availability
// POST /api/shows/{id}/reserve - Your existing reservation system
```

---

### **Phase 5: View Layer Simplification** (Week 3)

#### 5.1 **New Unified Seat Map View**
```swift
struct UnifiedSeatMapView: View {
    let showId: String
    let venueSlug: String
    
    @StateObject private var viewModel = UnifiedSeatMapViewModel()
    
    var body: some View {
        VStack {
            // Header with show info
            SeatMapHeader(showId: showId)
            
            // Main seat map
            UnifiedSeatMapRenderer(
                layout: viewModel.layout,
                availability: $viewModel.availability,
                onSeatTap: viewModel.handleSeatTap
            )
            
            // Footer with selection summary
            SeatMapFooter(
                selectedSeats: viewModel.selectedSeats,
                totalPrice: viewModel.totalPrice,
                onCheckout: viewModel.proceedToCheckout
            )
        }
        .task {
            await viewModel.loadShow(showId: showId, venueSlug: venueSlug)
        }
    }
}
```

#### 5.2 **New Unified View Model**
```swift
@MainActor
class UnifiedSeatMapViewModel: ObservableObject {
    @Published var layout: VenueLayout?
    @Published var availability: [String: SeatStatus] = [:]
    @Published var isLoading = false
    @Published var error: String?
    
    private let seatMapService = SeatMapService.shared
    private let spatialIndex = SpatialIndex()
    
    var selectedSeats: [SeatData] {
        guard let layout = layout else { return [] }
        return layout.seats.filter { availability[$0.id]?.isSelected == true }
    }
    
    var totalPrice: Int {
        selectedSeats.reduce(0) { total, seat in
            guard let section = layout?.sections.first(where: { $0.id == seat.sectionId }) else { return total }
            return total + section.basePricePence
        }
    }
    
    func loadShow(showId: String, venueSlug: String) async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            // Load layout and availability in parallel
            async let layoutResult = seatMapService.loadVenueLayout(venueSlug)
            async let availabilityResult = seatMapService.getAvailability(showId: showId)
            
            layout = try await layoutResult
            availability = try await availabilityResult
            
            // Update spatial index
            if let layout = layout {
                spatialIndex.updateSeats(layout.seats)
            }
            
        } catch {
            self.error = error.localizedDescription
        }
    }
    
    func handleSeatTap(_ seatId: String) {
        guard availability[seatId]?.status == .available || availability[seatId]?.isSelected == true else { return }
        
        availability[seatId]?.isSelected.toggle()
    }
    
    func proceedToCheckout() {
        // Connect to your existing payment flow
        // The seat IDs will map to your existing reservation system
    }
}
```

---

### **Phase 6: Performance Optimizations** (Week 4)

#### 6.1 **Viewport Culling**
```swift
private func calculateVisibleBounds() -> CGRect {
    let scaledViewport = CGRect(
        x: -offset.width / scale,
        y: -offset.height / scale,
        width: viewportSize.width / scale,
        height: viewportSize.height / scale
    )
    
    // Add buffer for smooth scrolling
    return scaledViewport.insetBy(dx: -100, dy: -100)
}
```

#### 6.2 **Level of Detail**
```swift
private func seatSize(for scale: CGFloat) -> CGSize {
    switch scale {
    case 0..<1.0:
        return CGSize(width: 16, height: 14) // Tiny dots
    case 1.0..<2.0:
        return CGSize(width: 24, height: 20) // Normal
    default:
        return CGSize(width: 32, height: 28) // Large detail
    }
}
```

#### 6.3 **Gesture Optimization**
```swift
private var optimizedZoomAndPan: some Gesture {
    SimultaneousGesture(
        MagnificationGesture()
            .onChanged { value in
                // Throttle updates to 60fps
                throttledUpdateScale(value)
            },
        DragGesture()
            .onChanged { value in
                throttledUpdateOffset(value.translation)
            }
    )
}
```

---

## 🗂️ **File Structure (After Cleanup)**

```
LML/
├── Views/
│   ├── SeatMap/
│   │   ├── Legacy/
│   │   │   ├── HamiltonSeatMapView.swift         ✅ KEEP (investor demos)
│   │   │   ├── SeatMapViewModel.swift            ✅ KEEP (Hamilton-specific)
│   │   │   └── SeatMapCanvas.swift               ✅ KEEP (Hamilton-specific)
│   │   ├── Unified/
│   │   │   ├── SeatMapContainer.swift            🆕 Smart router
│   │   │   ├── UnifiedSeatMapView.swift          🆕 New system
│   │   │   ├── UnifiedSeatMapRenderer.swift      🆕 Canvas renderer
│   │   │   └── UnifiedSeatMapViewModel.swift     🆕 Clean view model
│   │   └── Components/
│   │       ├── SeatMapHeader.swift
│   │       └── SeatMapFooter.swift
├── Models/
│   ├── Legacy/
│   │   └── TheaterSeat.swift                     ✅ KEEP (Hamilton only)
│   ├── Unified/
│   │   ├── VenueLayout.swift                     🆕 Clean data models
│   │   └── SeatData.swift                        🆕 Unified seat model
├── Services/
│   ├── SeatMapService.swift                      🆕 Unified service
│   └── SpatialIndex.swift                        🆕 Performance optimization
└── Resources/
    └── VenueLayouts/                             🆕 JSON files only
        ├── lyceum.json                           🆕 Lion King
        ├── gielgud.json                          🆕 Phantom
        └── drury-lane.json                       🆕 Future venues
```

### **Files to DELETE** ❌
```
❌ LionKingSeatMapView.swift  
❌ HardcodedSeatMapView.swift
❌ LionKingSeatMapViewModel.swift
❌ LionKingSeatMapCanvas.swift
❌ SeatMapOptimizer.swift
❌ SectionBoundaryManager.swift
❌ LionKingCoordinateTransform.swift
❌ JSONSeat.swift (replace with SeatData)
❌ All non-Hamilton hardcoded seat generation code
```

### **Files to KEEP** ✅
```
✅ HamiltonSeatMapView.swift (for investors)
✅ SeatMapViewModel.swift (Hamilton-specific)
✅ SeatMapCanvas.swift (Hamilton-specific)
✅ TheaterSeat.swift (Hamilton-specific)
✅ All Hamilton-related components
```

---

## 🔗 **Backend Integration Strategy**

### **Database Compatibility**
Your current system has:
```sql
-- Existing tables (keep these)
seat_maps, sections, seats, shows, venues, reservations

-- Add new table for unified system
venue_layouts (layout_json JSONB)
```

### **API Endpoint Strategy**
```typescript
// Keep existing Hamilton endpoints
GET /api/shows/hamilton-victoria-palace/seatmap
POST /api/payment-intent (your current working system)

// Add new unified endpoints
GET /api/venues/{slug}/layout  // Returns VenueLayout JSON
GET /api/shows/{id}/availability  // Maps to your existing seat status

// Seat ID mapping
// Hamilton: Uses existing "premium-1-1" → maps to your UUIDs
// New venues: Direct mapping JSON seat IDs → database seat IDs
```

### **Gradual Migration**
1. **Week 1**: Add `venue_layouts` table, create JSON files
2. **Week 2**: Build unified renderer, test with Lion King
3. **Week 3**: Replace Lion King view, keep Hamilton unchanged
4. **Week 4**: Add more venues using unified system

---

## 📊 **Performance Targets**

| Metric | Hamilton (Keep) | Other Venues (Fix) | Target |
|--------|-----------------|-------------------|--------|
| Load Time | Current | 3-5s | <500ms |
| Memory Usage | Current | ~200MB | <50MB |
| Frame Rate | Current | 15-30fps | 60fps |
| Seat Count Support | Current | 500 max | 2000+ |
| Code Complexity | Current | 3000+ lines | <800 lines |

---

## 🚀 **Implementation Priority**

### **Week 1: Foundation**
1. ✅ Define unified JSON schema
2. ✅ Create VenueLayout data models  
3. ✅ Convert Lion King to new JSON format (keep Hamilton as-is)
4. ✅ Test JSON loading
5. ✅ Create `SeatMapContainer` router

### **Week 2: Rendering Engine**
1. ✅ Build UnifiedSeatMapRenderer
2. ✅ Implement Canvas-based rendering
3. ✅ Add spatial indexing
4. ✅ Basic zoom/pan gestures
5. ✅ Test side-by-side with Hamilton

### **Week 3: Integration**
1. ✅ Connect to existing backend API
2. ✅ Replace Lion King view only
3. ✅ Ensure Hamilton flow unchanged
4. ✅ Update payment flow for new venues
5. ✅ Add seat availability sync

### **Week 4: Polish & Performance**
1. ✅ Add viewport culling
2. ✅ Implement level of detail
3. ✅ Optimize gesture handling
4. ✅ Load testing with 1000+ seats
5. ✅ Add more venues using JSON system

---

## 🎯 **Success Criteria**

- **Hamilton preserved** - Investor demos work unchanged
- **Dual rendering system** - Old for Hamilton, new for everything else
- **JSON-driven new venues** - No hardcoded coordinates for future venues
- **60fps performance** - Smooth on all devices for new system
- **Instant venue addition** - Pure JSON, no app updates
- **<800 lines total** - Dramatic code reduction for new system
- **Zero coordinate bugs** - Standardized coordinate system for new venues
- **Backward compatibility** - Existing Hamilton reservations work unchanged

---

## 🔄 **Migration Safety**

### **Risk Mitigation**
1. **Hamilton is untouchable** - Zero changes to investor-facing views
2. **Feature flags** - Easy rollback for new venues
3. **A/B testing** - Gradual rollout of new system
4. **Database compatibility** - New system reads existing seat availability

### **Rollback Plan**
- If new system fails → Router redirects to legacy views
- Hamilton always works → Investor demos never break
- Existing reservations → Unchanged database schema

### **Testing Strategy**
```swift
// Test both systems in parallel
if enableNewSeatMapSystem && venueSlug != "victoria-palace" {
    UnifiedSeatMapView(showId: showId, venueSlug: venueSlug)
} else {
    LegacySeatMapView(showId: showId, venueSlug: venueSlug)
}
```

---

## 💭 **This Approach Solves Everything**

1. **Preserves Hamilton** - Investors see familiar, working system
2. **Eliminates coordinate nightmares** - Standard viewport for new venues
3. **Massive performance gains** - Canvas rendering vs 500+ SwiftUI views  
4. **Instant venue addition** - Pure JSON, no app updates
5. **Maintainable codebase** - Single system for new venues
6. **Production reliability** - Proven Canvas rendering approach
7. **Zero business risk** - Hamilton revenue stream protected

**This is the professional, scalable solution that protects your existing Hamilton investment while building a world-class system for growth.** 🎭

---

## 📋 **Next Steps**

1. **Approve this plan** - Confirm Hamilton preservation strategy
2. **Set up development branch** - `feature/unified-seatmap-engine`
3. **Create first JSON venue** - Start with Lion King conversion
4. **Build basic renderer** - Canvas-based with simple seat rendering
5. **Test side-by-side** - Ensure Hamilton unchanged, new system working

**Ready to transform your seat map system while protecting your existing investment!** 🚀 