//
//  VenueLayoutModels.swift
//  LML
//
//  Phase 1: JSON-Driven Venue Layout Data Models
//  Complete data structures for MongoDB venue layout representation
//

import Foundation

// MARK: - Main Venue Layout Model
/// Complete venue layout loaded from MongoDB JSON
/// Single source of truth for all theater elements
struct VenueLayout: Codable {
    let venue: VenueInfo
    let stage: StageElement?              // Optional - some venues may not have a stage
    let aisles: [AisleElement]            // Empty array if no aisles
    let sectionLabels: [LabelElement]     // Dynamic section labels
    let accessibilitySpots: [AccessibilitySpot] // Wheelchair/accessibility locations
    let sections: [SectionInfo]          // Section metadata (colors, names, capacity)
    let seats: [VenueSeatData]           // All seat positions from MongoDB
}

// MARK: - Venue Information
struct VenueInfo: Codable {
    let id: String
    let name: String
    let viewport: ViewportDimensions      // Dynamic coordinate space
}

struct ViewportDimensions: Codable {
    let width: Double
    let height: Double
}

// MARK: - Position Model
/// Universal position model for all theater elements
/// Uses top-left origin (0,0) - SVG coordinate system
struct Position: Codable {
    let x: Double
    let y: Double
}

struct Dimensions: Codable {
    let width: Double
    let height: Double
}

// MARK: - Theater Elements

/// Stage representation from JSON
/// Optional because some venues (outdoor, general admission) may not have stages
struct StageElement: Codable {
    let id: String
    let position: Position
    let dimensions: Dimensions
    let title: String                     // e.g. "STAGE", "PLATFORM", etc.
    let backgroundColor: String?          // Hex color code
    let borderColor: String?              // Hex color code
}

/// Aisle/walkway representation
/// Completely dynamic - venues can have any number of aisles in any configuration
struct AisleElement: Codable {
    let id: String
    let position: Position
    let dimensions: Dimensions
    let color: String                     // Hex color code
    let opacity: Double?                  // Optional opacity (default 0.5)
    let orientation: AisleOrientation?    // Optional for styling
}

enum AisleOrientation: String, Codable {
    case horizontal
    case vertical
    case diagonal
}

/// Section label representation
/// Dynamic text labels that can be placed anywhere
struct LabelElement: Codable {
    let id: String
    let text: String                      // e.g. "Orchestra (280 seats)"
    let position: Position
    let fontSize: Double
    let colorHex: String
    let fontWeight: FontWeight?           // Optional styling
    let alignment: TextAlignment?         // Optional alignment
}

enum FontWeight: String, Codable {
    case regular
    case medium
    case bold
    case heavy
}

enum TextAlignment: String, Codable {
    case leading
    case center
    case trailing
}

/// Accessibility spot representation
/// Wheelchair spots, companion seats, etc.
struct AccessibilitySpot: Codable {
    let id: String
    let position: Position
    let type: AccessibilityType
    let dimensions: Dimensions?           // Optional custom size
    let backgroundColor: String?          // Optional background color
    let borderColor: String?              // Optional border color
    let textColor: String?                // Optional text color
    let size: Dimensions?                 // Optional size override
}

enum AccessibilityType: String, Codable {
    case wheelchair
    case companion
    case assistiveListening
    case serviceAnimal
    case hearingLoop
    case guideDog
    case other
}

/// Section metadata
/// Contains information about seat sections for coloring and categorization
struct SectionInfo: Codable {
    let id: String
    let name: String                      // e.g. "Orchestra", "Mezzanine", "Balcony"
    let displayName: String               // e.g. "Orchestra Level", "Premium Seating"
    let colorHex: String                  // Section color for seat rendering
    let capacity: Int                     // Total seats in this section
    let description: String?              // Optional description
    let priceCategory: PriceCategory?     // Optional price categorization
}

enum PriceCategory: String, Codable {
    case premium
    case standard
    case value
    case accessibility
}

/// Individual seat data from MongoDB
/// This replaces all hardcoded seat generation
struct VenueSeatData: Codable {
    let id: String                        // Real database ID
    let sectionId: String                 // References SectionInfo.id
    let row: String                       // Row identifier (A, B, C or 1, 2, 3)
    let number: Int                       // Seat number within row
    let position: Position                // Exact coordinates from venue data
    let status: SeatStatus                // Current availability
    let pricePence: Int                   // Price in pence
    let accessibility: Bool               // Whether this is an accessible seat
    let seatType: VenueSeatType?          // Optional seat type classification
}

enum SeatStatus: String, Codable {
    case available
    case booked
    case held
    case unavailable
    case maintenance
}

enum VenueSeatType: String, Codable {
    case standard
    case premium
    case wheelchair
    case companion
    case table
    case standing
}

// MARK: - Conversion Extensions

extension VenueLayout {
    /// Convert VenueSeatData to TheaterSeat for UI rendering
    /// Bridges the gap between JSON data and existing UI models
    func convertToTheaterSeats() -> [TheaterSeat] {
        return seats.map { seatData in
            // Find section info for this seat
            let sectionInfo = sections.first { $0.id == seatData.sectionId }
            
            // Map to existing TheaterSection enum or create dynamic mapping
            let theaterSection = mapToTheaterSection(sectionId: seatData.sectionId, sectionInfo: sectionInfo)
            
            // Convert row string to number (A=1, B=2, etc. or direct number)
            let rowNumber = parseRowNumber(seatData.row)
            
            return TheaterSeat(
                id: seatData.id,
                section: theaterSection,
                row: rowNumber,
                number: seatData.number,
                price: seatData.pricePence,
                isAvailable: seatData.status == .available,
                isSelected: false,                    // Always false initially
                x: seatData.position.x,               // Direct coordinate mapping
                y: seatData.position.y,               // No Y-flip needed with top-left origin
                width: 30.0,                          // TODO: Make dynamic from venue data
                height: 30.0                          // TODO: Make dynamic from venue data
            )
        }
    }
    
    /// Map section ID to existing TheaterSection enum
    /// This provides backward compatibility while we transition
    private func mapToTheaterSection(sectionId: String, sectionInfo: SectionInfo?) -> TheaterSection {
        // Use section name/category to map to existing enum
        guard let sectionInfo = sectionInfo else { return .middle }
        
        let lowerName = sectionInfo.name.lowercased()
        
        switch lowerName {
        case let name where name.contains("orchestra") || name.contains("stalls") || name.contains("premium"):
            return .premium
        case let name where name.contains("mezzanine") || name.contains("dress circle") || name.contains("circle"):
            return .middle
        case let name where name.contains("balcony") || name.contains("upper") || name.contains("gallery"):
            return .back
        case let name where name.contains("box") || name.contains("side") && name.contains("left"):
            return .sideA
        case let name where name.contains("box") || name.contains("side") && name.contains("right"):
            return .sideB
        default:
            return .middle  // Safe default
        }
    }
    
    /// Convert row string to number for existing UI
    private func parseRowNumber(_ rowString: String) -> Int {
        if let number = Int(rowString) {
            return number
        } else {
            // Convert A=1, B=2, etc.
            let uppercased = rowString.uppercased()
            if let firstChar = uppercased.first,
               let asciiValue = firstChar.asciiValue,
               asciiValue >= 65 && asciiValue <= 90 {  // A-Z
                return Int(asciiValue - 64)  // A=1, B=2, etc.
            }
            return 1  // Fallback
        }
    }
}

// MARK: - Validation Extensions

extension VenueLayout {
    /// Validate venue layout for completeness and correctness
    func validate() throws {
        // Basic validation rules
        guard !venue.id.isEmpty else {
            throw VenueLayoutError.invalidVenueId
        }
        
        guard venue.viewport.width > 0 && venue.viewport.height > 0 else {
            throw VenueLayoutError.invalidViewport
        }
        
        guard !seats.isEmpty else {
            throw VenueLayoutError.noSeats
        }
        
        guard !sections.isEmpty else {
            throw VenueLayoutError.noSections
        }
        
        // Validate all seats reference valid sections
        let sectionIds = Set(sections.map { $0.id })
        let seatSectionIds = Set(seats.map { $0.sectionId })
        
        guard seatSectionIds.isSubset(of: sectionIds) else {
            throw VenueLayoutError.invalidSeatSectionReferences
        }
        
        // Validate coordinates are within viewport
        for seat in seats {
            guard seat.position.x >= 0 && seat.position.x <= venue.viewport.width &&
                  seat.position.y >= 0 && seat.position.y <= venue.viewport.height else {
                throw VenueLayoutError.seatOutsideViewport(seatId: seat.id)
            }
        }
    }
}

// MARK: - Error Types

enum VenueLayoutError: LocalizedError {
    case invalidVenueId
    case invalidViewport
    case noSeats
    case noSections
    case invalidSeatSectionReferences
    case seatOutsideViewport(seatId: String)
    case jsonDecodingError(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidVenueId:
            return "Venue ID is missing or invalid"
        case .invalidViewport:
            return "Venue viewport dimensions must be positive"
        case .noSeats:
            return "Venue must contain at least one seat"
        case .noSections:
            return "Venue must contain at least one section"
        case .invalidSeatSectionReferences:
            return "Some seats reference non-existent sections"
        case .seatOutsideViewport(let seatId):
            return "Seat \(seatId) is positioned outside the venue viewport"
        case .jsonDecodingError(let message):
            return "Failed to decode venue layout JSON: \(message)"
        }
    }
}

// MARK: - Sample Data Factory

extension VenueLayout {
    /// Create sample venue layouts for testing different theater types
    static func sampleVictoriaPalace() -> VenueLayout {
        return VenueLayout(
            venue: VenueInfo(
                id: "victoria-palace-theatre",
                name: "Victoria Palace Theatre",
                viewport: ViewportDimensions(width: 1000, height: 800)
            ),
            stage: StageElement(
                id: "main-stage",
                position: Position(x: 500, y: 50),
                dimensions: Dimensions(width: 300, height: 40),
                title: "STAGE",
                backgroundColor: "#2A2A2A",
                borderColor: "#444444"
            ),
            aisles: [
                AisleElement(id: "center-aisle", position: Position(x: 500, y: 400), 
                           dimensions: Dimensions(width: 20, height: 400), color: "#2A2A2A", opacity: 0.5, orientation: .vertical),
                AisleElement(id: "left-aisle", position: Position(x: 300, y: 350), 
                           dimensions: Dimensions(width: 30, height: 300), color: "#2A2A2A", opacity: 0.3, orientation: .vertical)
            ],
            sectionLabels: [
                LabelElement(id: "orchestra-label", text: "Orchestra (150 seats)", 
                           position: Position(x: 500, y: 120), fontSize: 16, colorHex: "#FFD700", fontWeight: .regular, alignment: .center)
            ],
            accessibilitySpots: [
                AccessibilitySpot(id: "wc-1", position: Position(x: 300, y: 140), type: .wheelchair, dimensions: nil, backgroundColor: nil, borderColor: nil, textColor: nil, size: nil),
                AccessibilitySpot(id: "wc-2", position: Position(x: 700, y: 140), type: .wheelchair, dimensions: nil, backgroundColor: nil, borderColor: nil, textColor: nil, size: nil)
            ],
            sections: [
                SectionInfo(id: "orchestra", name: "Orchestra", displayName: "Orchestra Level", 
                          colorHex: "#FF6B6B", capacity: 150, description: nil, priceCategory: .premium)
            ],
            seats: []  // Would be populated with actual seat data
        )
    }
    
    /// Test validation of our sample data
    static func testSampleValidation() {
        let sample = sampleVictoriaPalace()
        do {
            try sample.validate()
            print("✅ Sample Victoria Palace validation PASSED")
        } catch {
            print("❌ Sample Victoria Palace validation FAILED: \(error)")
        }
    }
} 