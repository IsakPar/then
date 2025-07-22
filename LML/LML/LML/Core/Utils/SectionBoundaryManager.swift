//
//  SectionBoundaryManager.swift
//  LML
//
//  Manages section boundaries to prevent seat overlapping
//  Enforces proper coordinate spaces for each theater section
//

import SwiftUI

// MARK: - Section Boundary Manager
class SectionBoundaryManager {
    static let shared = SectionBoundaryManager()
    
    private init() {}
    
    // MARK: - Section Boundary Definitions
    
    struct SectionBounds {
        let xRange: ClosedRange<Double>
        let yRange: ClosedRange<Double>
        let maxSeatsPerRow: Int
        let rowSpacing: Double
        let seatSpacing: Double
        let visualSeparation: Double // Gap from other sections
    }
    
    /// Get boundary configuration for each theater section
    func getBounds(for section: TheaterSection) -> SectionBounds {
        switch section {
        case .premium: // Orchestra/Premium Front
            return SectionBounds(
                xRange: 200...800,     // 600px width
                yRange: 500...700,     // Front area (remember Y is flipped)
                maxSeatsPerRow: 20,
                rowSpacing: 28,
                seatSpacing: 30,
                visualSeparation: 40
            )
            
        case .middle: // Mezzanine Middle Tier
            return SectionBounds(
                xRange: 250...750,     // 500px width
                yRange: 350...480,     // Middle elevated area
                maxSeatsPerRow: 16,
                rowSpacing: 30,
                seatSpacing: 31,
                visualSeparation: 50
            )
            
        case .back: // Balcony Back Tier
            return SectionBounds(
                xRange: 300...700,     // 400px width
                yRange: 150...320,     // Back/highest area
                maxSeatsPerRow: 12,
                rowSpacing: 32,
                seatSpacing: 33,
                visualSeparation: 40
            )
            
        case .sideA: // Left Premium Boxes
            return SectionBounds(
                xRange: 50...190,      // Left side boxes
                yRange: 300...450,     // Mid-level boxes
                maxSeatsPerRow: 5,
                rowSpacing: 35,
                seatSpacing: 28,
                visualSeparation: 60
            )
            
        case .sideB: // Right Premium Boxes (unused in Lion King, but kept for consistency)
            return SectionBounds(
                xRange: 810...950,     // Right side boxes
                yRange: 300...450,     // Mid-level boxes
                maxSeatsPerRow: 5,
                rowSpacing: 35,
                seatSpacing: 28,
                visualSeparation: 60
            )
        }
    }
    
    // MARK: - Coordinate Transformation
    
    /// Transform JSON coordinates to section-bounded coordinates
    func transformCoordinate(
        jsonX: Double,
        jsonY: Double,
        fromSection sectionId: String,
        targetSection: TheaterSection,
        rowIndex: Int,
        seatIndex: Int
    ) -> CGPoint {
        
        let bounds = getBounds(for: targetSection)
        
        // Calculate position within section bounds
        let normalizedX = calculateNormalizedX(
            seatIndex: seatIndex,
            bounds: bounds
        )
        
        let normalizedY = calculateNormalizedY(
            rowIndex: rowIndex,
            bounds: bounds
        )
        
        return CGPoint(x: normalizedX, y: normalizedY)
    }
    
    private func calculateNormalizedX(seatIndex: Int, bounds: SectionBounds) -> Double {
        let sectionWidth = bounds.xRange.upperBound - bounds.xRange.lowerBound - (bounds.visualSeparation * 2)
        let availableWidth = sectionWidth - (Double(bounds.maxSeatsPerRow - 1) * bounds.seatSpacing)
        let startX = bounds.xRange.lowerBound + bounds.visualSeparation + (availableWidth / 2)
        
        return startX + (Double(seatIndex) * bounds.seatSpacing)
    }
    
    private func calculateNormalizedY(rowIndex: Int, bounds: SectionBounds) -> Double {
        let startY = bounds.yRange.upperBound - bounds.visualSeparation
        return startY - (Double(rowIndex) * bounds.rowSpacing)
    }
    
    // MARK: - Section Validation
    
    /// Validate that a coordinate falls within section bounds
    func isWithinBounds(x: Double, y: Double, section: TheaterSection) -> Bool {
        let bounds = getBounds(for: section)
        return bounds.xRange.contains(x) && bounds.yRange.contains(y)
    }
    
    /// Check if two sections would overlap
    func sectionsWouldOverlap(_ section1: TheaterSection, _ section2: TheaterSection) -> Bool {
        let bounds1 = getBounds(for: section1)
        let bounds2 = getBounds(for: section2)
        
        let xOverlap = bounds1.xRange.overlaps(bounds2.xRange)
        let yOverlap = bounds1.yRange.overlaps(bounds2.yRange)
        
        return xOverlap && yOverlap
    }
    
    // MARK: - Visual Separators
    
    /// Get aisle/separator positions between sections (based on actual JSON coordinates)
    func getVisualSeparators() -> [VisualSeparator] {
        return [
            // Horizontal aisle between Orchestra (y:489-685) and Mezzanine (y:370)
            VisualSeparator(
                type: .horizontal,
                position: CGPoint(x: 400, y: 430),
                size: CGSize(width: 600, height: 15),
                opacity: 0.25
            ),
            
            // Horizontal aisle between Mezzanine (y:370) and Balcony (y:250)
            VisualSeparator(
                type: .horizontal,
                position: CGPoint(x: 400, y: 310),
                size: CGSize(width: 400, height: 12),
                opacity: 0.2
            ),
            
            // Horizontal aisle between Balcony (y:250) and Boxes (y:150)
            VisualSeparator(
                type: .horizontal,
                position: CGPoint(x: 400, y: 200),
                size: CGSize(width: 300, height: 10),
                opacity: 0.15
            ),
            
            // Vertical center aisle in Orchestra (between seats 10 and 11)
            VisualSeparator(
                type: .vertical,
                position: CGPoint(x: 400, y: 587),
                size: CGSize(width: 20, height: 200),
                opacity: 0.2
            )
        ]
    }
}

// MARK: - Visual Separator Model
struct VisualSeparator {
    enum SeparatorType {
        case horizontal
        case vertical
    }
    
    let type: SeparatorType
    let position: CGPoint
    let size: CGSize
    let opacity: Double
}

// MARK: - Section Mapping Helper
extension SectionBoundaryManager {
    
    /// Map JSON section ID to TheaterSection with boundary awareness
    func mapToTheaterSection(_ sectionId: String) -> TheaterSection {
        switch sectionId.lowercased() {
        case "orchestra":
            return .premium  // Front premium seating
        case "mezzanine":
            return .middle   // Mid-tier elevated
        case "balcony":
            return .back     // Back/highest tier
        case "boxes":
            return .sideA    // Side boxes (premium)
        default:
            return .middle   // Safe fallback
        }
    }
    
    /// Get section display info
    func getSectionDisplayInfo(for section: TheaterSection) -> (name: String, color: Color) {
        switch section {
        case .premium:
            return ("Orchestra", Color(red: 1.0, green: 0.42, blue: 0.42)) // #FF6B6B
        case .middle:
            return ("Mezzanine", Color(red: 0.31, green: 0.80, blue: 0.77)) // #4ECDC4
        case .back:
            return ("Balcony", Color(red: 0.58, green: 0.88, blue: 0.83)) // #95E1D3
        case .sideA:
            return ("Premium Boxes", Color(red: 0.95, green: 0.55, blue: 0.66)) // #F38BA8
        case .sideB:
            return ("Boxes", Color(red: 0.95, green: 0.55, blue: 0.66)) // #F38BA8
        }
    }
} 