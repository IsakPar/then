//
//  SeatMapJSONService.swift
//  LML
//
//  Service for loading seat maps from local JSON files
//  Perfect for testing and offline development
//

import Foundation

// MARK: - JSON Seat Map Models
struct JSONSeatMap: Codable {
    let layout: JSONLayout
    let sections: [JSONSection]
    let seats: [JSONSeat]
    let pricing: [JSONPricing]
    let accessibilityFeatures: [JSONAccessibilityFeature]
    
    enum CodingKeys: String, CodingKey {
        case layout, sections, seats, pricing
        case accessibilityFeatures = "accessibility_features"
    }
}

struct JSONLayout: Codable {
    let type: String
    let viewport: JSONViewport
    let stage: JSONStage
    let coordinateSystem: String
    let backgroundImage: String?
    
    enum CodingKeys: String, CodingKey {
        case type, viewport, stage
        case coordinateSystem = "coordinate_system"
        case backgroundImage = "background_image"
    }
}

struct JSONViewport: Codable {
    let width: Double
    let height: Double
    let scale: Double
}

struct JSONStage: Codable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
    let label: String
}

struct JSONSection: Codable {
    let id: String
    let name: String
    let displayName: String
    let colorHex: String
    let capacity: Int
    let accessibilityInfo: String?
    let pricingTier: String?
    let level: Int?
    let sectionType: String?
    let viewQuality: String?
    
    enum CodingKeys: String, CodingKey {
        case id, name, capacity, level
        case displayName = "display_name"
        case colorHex = "color_hex"
        case accessibilityInfo = "accessibility_info"
        case pricingTier = "pricing_tier"
        case sectionType = "section_type"
        case viewQuality = "view_quality"
    }
}

struct JSONSeat: Codable {
    let id: String
    let sectionId: String
    let row: String
    let number: Int
    let status: String
    let position: JSONPosition
    let accessibility: Bool
    let pricePence: Int
    let seatType: String?
    let viewDescription: String?
    let notes: String?
    
    enum CodingKeys: String, CodingKey {
        case id, row, number, status, position, accessibility, notes
        case sectionId = "section_id"
        case pricePence = "price_pence"
        case seatType = "seat_type"
        case viewDescription = "view_description"
    }
}

struct JSONPosition: Codable {
    let x: Double
    let y: Double
}

struct JSONPricing: Codable {
    let sectionId: String
    let basePricePence: Int
    let fees: JSONFees?
    
    enum CodingKeys: String, CodingKey {
        case sectionId = "section_id"
        case basePricePence = "base_price_pence"
        case fees
    }
}

struct JSONFees: Codable {
    let bookingFeePence: Int?
    let serviceChargePence: Int?
    let percentageFee: Double?
    
    enum CodingKeys: String, CodingKey {
        case bookingFeePence = "booking_fee_pence"
        case serviceChargePence = "service_charge_pence"
        case percentageFee = "percentage_fee"
    }
}

struct JSONAccessibilityFeature: Codable {
    let type: String
    let description: String
    let sectionsAvailable: [String]
    let bookingNotes: String?
    let contactRequired: Bool?
    
    enum CodingKeys: String, CodingKey {
        case type, description
        case sectionsAvailable = "sections_available"
        case bookingNotes = "booking_notes"
        case contactRequired = "contact_required"
    }
}

// MARK: - Seat Map JSON Service
class SeatMapJSONService {
    static let shared = SeatMapJSONService()
    
    private init() {}
    
    /// Load seat map from local JSON file
    func loadSeatMap(filename: String) async -> [TheaterSeat]? {
        guard let jsonSeatMap = await loadJSONFile(filename: filename) else {
            print("❌ Failed to load JSON seat map: \(filename)")
            return nil
        }
        
        print("✅ Loaded JSON seat map: \(filename)")
        print("📊 Sections: \(jsonSeatMap.sections.count), Seats: \(jsonSeatMap.seats.count)")
        
        return convertToTheaterSeats(jsonSeatMap)
    }
    
    /// Load and parse JSON file from app bundle
    private func loadJSONFile(filename: String) async -> JSONSeatMap? {
        guard let url = Bundle.main.url(forResource: filename, withExtension: "json") else {
            print("❌ JSON file not found: \(filename).json")
            return nil
        }
        
        do {
            let data = try Data(contentsOf: url)
            let jsonSeatMap = try JSONDecoder().decode(JSONSeatMap.self, from: data)
            return jsonSeatMap
        } catch {
            print("❌ Failed to decode JSON: \(error.localizedDescription)")
            return nil
        }
    }
    
    /// Convert JSON seat map to TheaterSeat models
    private func convertToTheaterSeats(_ jsonSeatMap: JSONSeatMap) -> [TheaterSeat] {
        var theaterSeats: [TheaterSeat] = []
        
        // Create section lookup for easier conversion
        let sectionsById = Dictionary(uniqueKeysWithValues: jsonSeatMap.sections.map { ($0.id, $0) })
        
        for jsonSeat in jsonSeatMap.seats {
            guard let jsonSection = sectionsById[jsonSeat.sectionId] else {
                print("⚠️ Section not found for seat: \(jsonSeat.id)")
                continue
            }
            
            // Convert to TheaterSection enum or create a mapping
            let theaterSection = mapToTheaterSection(jsonSection.id)
            
            let theaterSeat = TheaterSeat(
                id: jsonSeat.id,
                section: theaterSection,
                row: parseRowNumber(jsonSeat.row),
                number: jsonSeat.number,
                price: jsonSeat.pricePence,
                isAvailable: jsonSeat.status == "available",
                isSelected: false,
                x: jsonSeat.position.x,
                y: jsonSeat.position.y,
                width: 30.0, // Default seat width
                height: 30.0  // Default seat height
            )
            
            theaterSeats.append(theaterSeat)
        }
        
        print("✅ Converted \(theaterSeats.count) seats to TheaterSeat models")
        return theaterSeats
    }
    
    /// Map JSON section ID to TheaterSection enum
    private func mapToTheaterSection(_ sectionId: String) -> TheaterSection {
        switch sectionId.lowercased() {
        case "stalls", "stalls-center", "stalls-left", "stalls-right", "orchestra":
            return .premium  // Orchestra/Stalls are premium front seating
        case "dress-circle", "royal-circle", "circle", "mezzanine":
            return .middle   // Mezzanine is elevated mid-tier
        case "upper-circle", "grand-circle", "balcony":
            return .back     // Balcony is highest/cheapest
        case "boxes", "grand-tier-boxes", "upper-tier-boxes", "royal-box":
            return .sideA    // Boxes are VIP side seating
        default:
            return .middle // Default fallback
        }
    }
    
    /// Parse row letter to row number
    private func parseRowNumber(_ rowLetter: String) -> Int {
        // Convert A=1, B=2, etc. or return number if already numeric
        if let number = Int(rowLetter) {
            return number
        } else {
            // Convert letter to number (A=1, B=2, etc.)
            let ascii = rowLetter.uppercased().first?.asciiValue ?? 65
            return Int(ascii - 64) // A=1, B=2, etc.
        }
    }
}

 