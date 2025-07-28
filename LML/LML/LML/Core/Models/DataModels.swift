//
//  DataModels.swift
//  LML
//
//  Core data models for the application
//  Production-ready models with proper validation
//

import Foundation

// MARK: - Show Models
struct Show: Codable, Identifiable, Equatable {
    let id: String
    let title: String
    let venue: Venue
    let description: String
    let imageURL: String?
    let category: ShowCategory
    let duration: TimeInterval
    let ageRating: String
    let pricing: PricingInfo
    let schedule: [ShowTime]
    let seatMap: SeatMapData?
    let isActive: Bool
    let createdAt: Date
    let updatedAt: Date
    
    // MARK: - Public Initializer for Mock Data
    
    init(id: String, title: String, venue: Venue, description: String, imageURL: String? = nil, category: ShowCategory, duration: TimeInterval, ageRating: String, pricing: PricingInfo, schedule: [ShowTime], seatMap: SeatMapData? = nil, isActive: Bool, createdAt: Date, updatedAt: Date) {
        self.id = id
        self.title = title
        self.venue = venue
        self.description = description
        self.imageURL = imageURL
        self.category = category
        self.duration = duration
        self.ageRating = ageRating
        self.pricing = pricing
        self.schedule = schedule
        self.seatMap = seatMap
        self.isActive = isActive
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
    
    // MARK: - API Response Mapping
    
    private enum CodingKeys: String, CodingKey {
        case id, title, description, date, time
        case imageUrl = "imageUrl"
        case venue_name = "venue_name"
        case address = "address"
        case min_price = "min_price"
        case max_price = "max_price"
        case seat_pricing = "seat_pricing"
        case isActive = "is_active"
        case seatMapId = "seatMapId"
        case seatMapType = "seatMapType"
        case total_available_seats = "total_available_seats"
        case ios_config = "ios_config"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Basic fields
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description) ?? ""
        imageURL = try container.decodeIfPresent(String.self, forKey: .imageUrl)
        isActive = try container.decodeIfPresent(Bool.self, forKey: .isActive) ?? true
        
        // Venue mapping: Transform flat API data to structured Venue object
        let venueName = try container.decode(String.self, forKey: .venue_name)
        let venueAddress = try container.decodeIfPresent(String.self, forKey: .address) ?? ""
        
        venue = Venue(
            id: "venue-\(id)", // Generate consistent venue ID
            name: venueName,
            address: Address(
                street: venueAddress,
                city: Show.extractCityFromAddress(venueAddress),
                postcode: Show.extractPostcodeFromAddress(venueAddress),
                country: "UK"
            ),
            capacity: 1000, // Default capacity (can be enhanced in Phase 2)
            accessibility: AccessibilityInfo(
                wheelchairAccessible: true,
                hearingLoopAvailable: true,
                audioDescriptionAvailable: false,
                signLanguageAvailable: false
            ),
            facilities: ["Box Office", "Bar", "Cloakroom"]
        )
        
        // Pricing mapping: Transform API pricing to structured PricingInfo
        let minPricePounds = try container.decodeIfPresent(Int.self, forKey: .min_price) ?? 0
        let maxPricePounds = try container.decodeIfPresent(Int.self, forKey: .max_price) ?? 0
        let seatPricingData = try container.decodeIfPresent([APISectionPricing].self, forKey: .seat_pricing) ?? []
        
        // Convert pounds to pence for internal consistency
        let minPricePence = minPricePounds * 100
        let maxPricePence = maxPricePounds * 100
        
        // Transform API section pricing to PriceSection objects
        let priceSections = seatPricingData.map { apiSection in
            PriceSection(
                name: apiSection.section_name ?? "General",
                price: (apiSection.price ?? 0) * 100, // Convert to pence
                availableSeats: apiSection.available_seats ?? 0,
                totalSeats: apiSection.total_seats ?? 0
            )
        }
        
        pricing = PricingInfo(
            currency: "GBP",
            minPrice: minPricePence,
            maxPrice: maxPricePence,
            sections: priceSections
        )
        
        // Default values for fields not in API response
        duration = 2.5 * 3600 // 2.5 hours in seconds
        ageRating = "PG" // Default rating
        seatMap = nil // Will be loaded separately when needed
        createdAt = Date()
        updatedAt = Date()
        
        // Show category mapping: Determine category from title
        category = Show.determineShowCategory(from: title)
        
        // Schedule mapping: Create ShowTime from date/time strings and initialize schedule
        let dateString = try container.decodeIfPresent(String.self, forKey: .date) ?? ""
        let timeString = try container.decodeIfPresent(String.self, forKey: .time) ?? "19:30"
        
        if let showTime = Show.createShowTime(from: dateString, time: timeString, showId: id, duration: duration, pricing: pricing) {
            schedule = [showTime]
        } else {
            schedule = []
        }
    }
    
    // MARK: - Encoding (for caching/persistence)
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        
        try container.encode(id, forKey: .id)
        try container.encode(title, forKey: .title)
        try container.encode(description, forKey: .description)
        try container.encodeIfPresent(imageURL, forKey: .imageUrl)
        try container.encode(venue.name, forKey: .venue_name)
        try container.encode(venue.address.fullAddress, forKey: .address)
        try container.encode(pricing.minPrice / 100, forKey: .min_price) // Convert back to pounds
        try container.encode(pricing.maxPrice / 100, forKey: .max_price)
        try container.encode(isActive, forKey: .isActive)
        
        // Encode schedule as date/time strings
        if let firstShowTime = schedule.first {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            try container.encode(dateFormatter.string(from: firstShowTime.startTime), forKey: .date)
            
            dateFormatter.dateFormat = "HH:mm"
            try container.encode(dateFormatter.string(from: firstShowTime.startTime), forKey: .time)
        }
        
        // Convert PriceSection back to API format
        let apiSectionPricing = pricing.sections.map { section in
            APISectionPricing(
                section_name: section.name,
                price: section.price / 100, // Convert back to pounds
                available_seats: section.availableSeats,
                total_seats: section.totalSeats
            )
        }
        try container.encode(apiSectionPricing, forKey: .seat_pricing)
    }
    
    // MARK: - Helper Methods
    
    private static func extractCityFromAddress(_ address: String) -> String {
        // Simple extraction - can be enhanced with proper address parsing
        let components = address.components(separatedBy: ",")
        return components.count > 1 ? components[1].trimmingCharacters(in: .whitespaces) : "London"
    }
    
    private static func extractPostcodeFromAddress(_ address: String) -> String {
        // Extract UK postcode pattern
        let postcodeRegex = try? NSRegularExpression(pattern: "[A-Z]{1,2}\\d[A-Z\\d]? \\d[A-Z]{2}", options: [])
        let range = NSRange(location: 0, length: address.utf16.count)
        
        if let match = postcodeRegex?.firstMatch(in: address, options: [], range: range) {
            return String(address[Range(match.range, in: address)!])
        }
        
        return "SW1A 1AA" // Default London postcode
    }
    
    private static func determineShowCategory(from title: String) -> ShowCategory {
        let lowercaseTitle = title.lowercased()
        
        if lowercaseTitle.contains("hamilton") || lowercaseTitle.contains("lion king") || 
           lowercaseTitle.contains("phantom") || lowercaseTitle.contains("chicago") ||
           lowercaseTitle.contains("mamma mia") || lowercaseTitle.contains("wicked") {
            return .musical
        } else if lowercaseTitle.contains("comedy") {
            return .comedy
        } else if lowercaseTitle.contains("opera") {
            return .opera
        } else if lowercaseTitle.contains("dance") {
            return .dance
        } else if lowercaseTitle.contains("concert") {
            return .concert
        } else if lowercaseTitle.contains("family") {
            return .family
        } else {
            return .musical // Default for theatre shows
        }
    }
    
    private static func createShowTime(from dateString: String, time timeString: String, showId: String, duration: TimeInterval, pricing: PricingInfo) -> ShowTime? {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        
        guard let date = dateFormatter.date(from: dateString) else {
            return nil
        }
        
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"
        
        guard let time = timeFormatter.date(from: timeString) else {
            return nil
        }
        
        // Combine date and time
        let calendar = Calendar.current
        let dateComponents = calendar.dateComponents([.year, .month, .day], from: date)
        let timeComponents = calendar.dateComponents([.hour, .minute], from: time)
        
        var combined = DateComponents()
        combined.year = dateComponents.year
        combined.month = dateComponents.month
        combined.day = dateComponents.day
        combined.hour = timeComponents.hour
        combined.minute = timeComponents.minute
        
        guard let startTime = calendar.date(from: combined) else {
            return nil
        }
        
        let endTime = startTime.addingTimeInterval(duration)
        
        return ShowTime(
            id: "\(showId)-\(dateString)-\(timeString)",
            showId: showId,
            startTime: startTime,
            endTime: endTime,
            isAvailable: true,
            availableSeats: pricing.sections.reduce(0) { $0 + $1.availableSeats }
        )
    }
    
    var displayTitle: String {
        return title
    }
    
    var shortDescription: String {
        return String(description.prefix(100)) + (description.count > 100 ? "..." : "")
    }
}

// MARK: - API Response Support Models

private struct APISectionPricing: Codable {
    let section_name: String?
    let price: Int?
    let available_seats: Int?
    let total_seats: Int?
}

struct Venue: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let address: Address
    let capacity: Int
    let accessibility: AccessibilityInfo
    let facilities: [String]
}

struct Address: Codable, Equatable {
    let street: String
    let city: String
    let postcode: String
    let country: String
    
    var fullAddress: String {
        return "\(street), \(city), \(postcode), \(country)"
    }
}

struct AccessibilityInfo: Codable, Equatable {
    let wheelchairAccessible: Bool
    let hearingLoopAvailable: Bool
    let audioDescriptionAvailable: Bool
    let signLanguageAvailable: Bool
}

struct PricingInfo: Codable, Equatable {
    let currency: String
    let minPrice: Int // In pence/cents
    let maxPrice: Int // In pence/cents
    let sections: [PriceSection]
    
    var formattedMinPrice: String {
        return formatPrice(minPrice)
    }
    
    var formattedMaxPrice: String {
        return formatPrice(maxPrice)
    }
    
    private func formatPrice(_ pence: Int) -> String {
        return "£\(pence / 100)"
    }
}

struct PriceSection: Codable, Equatable {
    let name: String
    let price: Int
    let availableSeats: Int
    let totalSeats: Int
}

struct ShowTime: Codable, Identifiable, Equatable {
    let id: String
    let showId: String
    let startTime: Date
    let endTime: Date
    let isAvailable: Bool
    let availableSeats: Int
    
    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: startTime)
    }
    
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: startTime)
    }
}

enum ShowCategory: String, Codable, CaseIterable {
    case musical = "musical"
    case play = "play"
    case comedy = "comedy"
    case drama = "drama"
    case opera = "opera"
    case dance = "dance"
    case concert = "concert"
    case family = "family"
    
    var displayName: String {
        switch self {
        case .musical: return "Musical"
        case .play: return "Play"
        case .comedy: return "Comedy"
        case .drama: return "Drama"
        case .opera: return "Opera"
        case .dance: return "Dance"
        case .concert: return "Concert"
        case .family: return "Family"
        }
    }
}

// MARK: - Seat Map Models
struct SeatMapData: Codable, Equatable {
    let id: String
    let venueId: String
    let sections: [SeatSection]
    let layout: SeatLayout
    let metadata: SeatMapMetadata
}

struct SeatSection: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let color: String
    let price: Int
    let seats: [SeatData]
    let isWheelchairAccessible: Bool
}

struct SeatData: Codable, Identifiable, Equatable {
    let id: String
    let row: String
    let number: String
    let x: Double
    let y: Double
    let isAvailable: Bool
    let isReserved: Bool
    let seatType: SeatType
}

struct SeatLayout: Codable, Equatable {
    let width: Double
    let height: Double
    let viewBox: ViewBox
    let scale: Double
}

struct ViewBox: Codable, Equatable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

struct SeatMapMetadata: Codable, Equatable {
    let version: String
    let lastUpdated: Date
    let totalSeats: Int
    let availableSeats: Int
}

enum SeatType: String, Codable, Equatable {
    case standard = "standard"
    case premium = "premium"
    case wheelchair = "wheelchair"
    case companion = "companion"
    case restricted = "restricted"
}

// MARK: - Booking Models
struct BookedSeat: Codable, Identifiable, Equatable {
    var id = UUID()
    let section: String
    let row: Int
    let number: Int
    let price: Int
}

// MARK: - Environment Configuration
class AppConfiguration {
    static let shared = AppConfiguration()
    
    private init() {}
    
    var apiEnvironment: APIEnvironment {
        // 🚨 FORCE RAILWAY CONNECTION - ALWAYS USE PRODUCTION
        return .production  // Force Railway backend in all modes
        
        // Original logic (disabled):
        // #if DEBUG
        // return .development
        // #else
        // return .production
        // #endif
    }
    
    var isProductionBuild: Bool {
        return apiEnvironment == .production
    }
    
    var shouldUseMockData: Bool {
        #if DEBUG
        return false // Use real API to get both Hamilton and Phantom shows
        #else
        return false // Never use mock data in production
        #endif
    }
}

// MARK: - Theater Seating Models
struct TheaterSeat: Codable, Identifiable, Equatable {
    let id: String
    let section: TheaterSection
    let row: Int
    let number: Int
    let price: Int
    let isAvailable: Bool
    var isSelected: Bool
    let x: Double
    let y: Double
    let width: Double
    let height: Double
    
    var displayLabel: String {
        "\(section.name) R\(row) S\(number)"
    }
}

enum TheaterSection: String, Codable, Identifiable, Equatable, CaseIterable {
    case premium = "premium"
    case sideA = "sideA" 
    case middle = "middle"
    case sideB = "sideB"
    case back = "back"
    
    var id: String { rawValue }
    
    var name: String {
        switch self {
        case .premium: return "Premium"
        case .sideA: return "Side A"
        case .middle: return "Middle"
        case .sideB: return "Side B"
        case .back: return "Back"
        }
    }
    
    var displayName: String { name }
    
    var color: String {
        switch self {
        case .premium: return "#FFD700"
        case .sideA: return "#FF6B6B"
        case .middle: return "#4ECDC4"
        case .sideB: return "#45B7D1"
        case .back: return "#96CEB4"
        }
    }
    
    var basePrice: Int {
        switch self {
        case .premium: return 150
        case .sideA: return 100
        case .middle: return 120
        case .sideB: return 100
        case .back: return 80
        }
    }
    
    var maxSeats: Int {
        switch self {
        case .premium: return 50
        case .sideA: return 80
        case .middle: return 120
        case .sideB: return 80
        case .back: return 100
        }
    }
    
    var position: SectionPosition {
        switch self {
        case .premium:
            return SectionPosition(x: 0.5, y: 0.2, rotation: 0)
        case .sideA:
            return SectionPosition(x: 0.15, y: 0.4, rotation: -15)
        case .middle:
            return SectionPosition(x: 0.5, y: 0.5, rotation: 0)
        case .sideB:
            return SectionPosition(x: 0.85, y: 0.4, rotation: 15)
        case .back:
            return SectionPosition(x: 0.5, y: 0.8, rotation: 0)
        }
    }
    
    struct SectionPosition: Codable, Equatable {
        let x: Double
        let y: Double
        let rotation: Double
    }
} 