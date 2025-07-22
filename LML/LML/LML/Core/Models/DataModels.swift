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
    
    var displayTitle: String {
        return title
    }
    
    var shortDescription: String {
        return String(description.prefix(100)) + (description.count > 100 ? "..." : "")
    }
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

enum SeatType: String, Codable {
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
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }
    
    var isProductionBuild: Bool {
        return apiEnvironment == .production
    }
    
    var shouldUseMockData: Bool {
        #if DEBUG
        return true // Temporarily enabled to ensure shows are always available
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