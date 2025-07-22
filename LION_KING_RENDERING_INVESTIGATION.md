# 🔍 Lion King Seat Map Rendering Investigation

## 🚨 Core Problems Identified

### 1. DUAL SYSTEM COMPLEXITY
- **Hamilton**: Uses `SeatMapViewModel` + `SeatMapCanvas` (hardcoded 502 seats) ✅ WORKING
- **Lion King**: Uses `LionKingSeatMapViewModel` + `LionKingSeatMapCanvas` (JSON-based) ❌ BROKEN

This creates **two completely separate codebases** that should be unified.

### 2. OVER-ENGINEERED COORDINATE TRANSFORMATION
The Lion King system has **4 layers of coordinate transformation**:
```swift
JSON coordinates (x: 100-700, y: 200-685)
    ↓
Y-axis flip (y: 800 - originalY)  
    ↓
Scaling (X: 600px→800px, Y: 485px→600px)
    ↓
Boundary constraints (clamp to 50-950, 50-750)
    ↓
SectionBoundaryManager bounds checking
```

**This creates a transformation chain where errors compound!**

### 3. CONFLICTING COORDINATE SYSTEMS
- **JSON Data**: Uses SVG coordinate system (origin top-left, Y increases down)
- **iOS Views**: Uses UIKit coordinate system (origin top-left, Y increases down)  
- **Transformation Logic**: Assumes Y-axis needs flipping (wrong!)
- **Boundary Manager**: Enforces different coordinate ranges that conflict

### 4. SECTION MAPPING FAILURES
```swift
// WRONG: Lion King sections don't map to Hamilton's 5-section system
case "orchestra" → .premium  // Orchestra is HUGE, premium is small
case "mezzanine" → .middle   // Different sizing
case "balcony" → .back       // Wrong positioning
case "boxes" → .sideA        // Only maps to left side, ignores right
```

### 5. BOUNDARY MANAGER CONFLICTS
The `SectionBoundaryManager` enforces hardcoded bounds that **don't match the JSON coordinates**:
```swift
// BoundaryManager says Orchestra should be: 
xRange: 200...800, yRange: 500...700

// But JSON has Orchestra seats at: 
x: 100-700, y: 685-450 (after transform)
```

## 🎯 Comprehensive Fix Plan

### PHASE 1: IMMEDIATE FIXES (High Priority)

#### 1.1 Remove Unnecessary Y-Axis Flipping
```swift
// REMOVE: Coordinate flipping that breaks positioning
let flippedY = 800.0 - jsonY  // ❌ DELETE THIS

// KEEP: Direct coordinate usage  
let finalX = jsonSeat.position.x
let finalY = jsonSeat.position.y
```

#### 1.2 Fix Section Mapping
```swift
// NEW: Proper Lion King section mapping
private func mapJSONSectionToTheaterSection(_ sectionId: String) -> TheaterSection {
    switch sectionId.lowercased() {
    case "orchestra": 
        return .premium  // But expand premium bounds
    case "mezzanine":
        return .middle 
    case "balcony":
        return .back
    case "boxes":
        return .sideA  // Handle all boxes as side sections
    default:
        return .middle
    }
}
```

#### 1.3 Disable Boundary Enforcement
```swift
// TEMPORARY: Bypass boundary manager for Lion King
func transformCoordinate(...) -> CGPoint {
    // Return JSON coordinates directly, no bounds checking
    return CGPoint(x: jsonX, y: jsonY)
}
```

### PHASE 2: UNIFICATION (Medium Priority)

#### 2.1 Merge View Models
- Combine `SeatMapViewModel` and `LionKingSeatMapViewModel`  
- Add show type detection: `enum ShowType { case hamilton, lionKing }`
- Route to hardcoded vs JSON loading based on show type

#### 2.2 Merge Canvas Components 
- Use single `SeatMapCanvas` with conditional rendering
- Remove duplicate `LionKingSeatMapCanvas`

#### 2.3 Standardize Coordinate System
- Define single viewport: `1000x800` for all shows
- Use JSON coordinates directly (no transformation)
- Scale via SwiftUI modifiers, not coordinate math

### PHASE 3: ROBUSTNESS (Low Priority)

#### 3.1 Error Handling
```swift
// Add validation and fallbacks
guard let validPosition = validateSeatPosition(jsonSeat.position) else {
    print("❌ Invalid position for seat \(jsonSeat.id)")
    continue
}
```

#### 3.2 Debug Visualization
```swift
// Add debug overlay showing coordinate ranges
#if DEBUG
.overlay(coordinateDebugOverlay)
#endif
```

## 🚀 Recommended Immediate Action

**Start with Phase 1.1 - Remove Y-axis flipping** as this is likely the primary cause of seats being positioned incorrectly.

**Quick Test**: 
1. Comment out the Y-axis flip logic
2. Use JSON coordinates directly  
3. See if seats appear in reasonable positions
4. Then address section mapping issues

## 📁 File Structure Issues

### Current Problematic Structure
```
LML/LML/LML/views/
├── ViewModels/
│   ├── SeatMapViewModel.swift           (Hamilton)
│   └── LionKingSeatMapViewModel.swift   (Lion King - duplicate)
├── Organisms/SeatMaps/
│   ├── SeatMapCanvas.swift              (Hamilton)
│   └── LionKingSeatMapCanvas.swift      (Lion King - duplicate)
└── Templates/
    ├── HamiltonSeatMapView.swift        (Hamilton)
    └── LionKingSeatMapView.swift        (Lion King)
```

### Recommended Unified Structure
```
LML/LML/LML/views/
├── ViewModels/
│   └── SeatMapViewModel.swift           (Unified)
├── Organisms/SeatMaps/
│   └── SeatMapCanvas.swift              (Unified)
└── Templates/
    ├── HamiltonSeatMapView.swift        
    └── LionKingSeatMapView.swift        
```

## 🔧 Root Cause Analysis

The Lion King rendering issues stem from **over-engineering** a coordinate transformation system that was unnecessary. The JSON data already provides correct coordinates for the theater layout - we just need to display them directly.

The Hamilton hardcoded system works because it uses simple, direct coordinate placement without complex transformations.

**Solution**: Apply the Hamilton approach (direct coordinates) to the Lion King system. 