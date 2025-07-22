//
//  NetworkModels.swift
//  Last Minute Live
//
//  Data models for API communication
//  Converted from TypeScript interfaces in mobile-app/src/types/
//

import Foundation

// MARK: - Authentication Models

struct SignInRequest: Codable {
    let email: String
    let password: String
}

struct SignUpRequest: Codable {
    let email: String
    let password: String
    let name: String?
    let phone: String?
}

struct SocialAuthRequest: Codable {
    let provider: String // "apple", "google"
    let token: String
    let email: String?
    let name: String?
}

struct AuthResponse: Codable {
    let success: Bool
    let message: String?
    let user: User?
    let token: String?
    let error: String?
    let requiresVerification: Bool?
}

struct TokenVerificationResponse: Codable {
    let success: Bool
    let user: User?
    let token: String?
    let error: String?
}

// MARK: - User Models

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String?
    let role: UserRole
    let emailVerified: String? // ISO date string
    let createdAt: String
    let updatedAt: String
    
    enum CodingKeys: String, CodingKey {
        case id, email, name, role
        case emailVerified = "email_verified"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

enum UserRole: String, Codable, CaseIterable {
    case customer
    case admin
    case venue
}

// MARK: - Show Models

struct Show: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let date: String // YYYY-MM-DD format
    let time: String // HH:MM format
    let imageUrl: String?
    let venueId: String
    let venueName: String
    let venueAddress: String?
    let seatMapId: String
    let minPrice: Int // Price in pence
    let maxPrice: Int // Price in pence
    let isActive: Bool
    let seatPricing: [SectionPricing]?
    let durationMinutes: Int?
    
    enum CodingKeys: String, CodingKey {
        case id, title, description, date, time
        case imageUrl = "image_url"
        case venueId = "venue_id"
        case venueName = "venue_name"
        case venueAddress = "venue_address"
        case seatMapId = "seat_map_id"
        case minPrice = "min_price"
        case maxPrice = "max_price"
        case isActive = "is_active"
        case seatPricing = "seat_pricing"
        case durationMinutes = "duration_minutes"
    }
    
    // Computed properties for convenience
    var formattedDate: String {
        // Convert YYYY-MM-DD to user-friendly format
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        if let date = formatter.date(from: date) {
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
        return date
    }
    
    var formattedTime: String {
        // Convert HH:MM to user-friendly format
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        if let time = formatter.date(from: time) {
            formatter.timeStyle = .short
            return formatter.string(from: time)
        }
        return time
    }
    
    var priceRange: String {
        let minFormatted = String(format: "£%.2f", Double(minPrice) / 100.0)
        let maxFormatted = String(format: "£%.2f", Double(maxPrice) / 100.0)
        return minPrice == maxPrice ? minFormatted : "\(minFormatted) - \(maxFormatted)"
    }
}

struct SectionPricing: Codable, Identifiable {
    let id: String
    let name: String
    let displayName: String?
    let colorHex: String
    let basePricePence: Int
    let isAccessible: Bool
    
    enum CodingKeys: String, CodingKey {
        case id, name
        case displayName = "display_name"
        case colorHex = "color_hex"
        case basePricePence = "base_price_pence"
        case isAccessible = "is_accessible"
    }
    
    var formattedPrice: String {
        return String(format: "£%.2f", Double(basePricePence) / 100.0)
    }
}

// MARK: - Venue Models

struct Venue: Codable, Identifiable {
    let id: String
    let name: String
    let slug: String
    let address: String?
    let description: String?
    
    enum CodingKeys: String, CodingKey {
        case id, name, slug, address, description
    }
}

// MARK: - Seat Models

struct Seat: Codable, Identifiable, Hashable {
    let id: String
    let showId: String
    let sectionId: String
    let rowLetter: String
    let seatNumber: Int
    let pricePence: Int
    let status: SeatStatus
    let position: SeatPosition
    let isAccessible: Bool
    let notes: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case showId = "show_id"
        case sectionId = "section_id"
        case rowLetter = "row_letter"
        case seatNumber = "seat_number"
        case pricePence = "price_pence"
        case status, position
        case isAccessible = "is_accessible"
        case notes
    }
    
    var seatLabel: String {
        return "\(rowLetter)\(seatNumber)"
    }
    
    var formattedPrice: String {
        return String(format: "£%.2f", Double(pricePence) / 100.0)
    }
    
    var isSelectable: Bool {
        return status == .available
    }
    
    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
    
    static func == (lhs: Seat, rhs: Seat) -> Bool {
        return lhs.id == rhs.id
    }
}

enum SeatStatus: String, Codable, CaseIterable {
    case available
    case reserved
    case booked
    case blocked
    
    var displayName: String {
        switch self {
        case .available:
            return "Available"
        case .reserved:
            return "Reserved"
        case .booked:
            return "Booked"
        case .blocked:
            return "Blocked"
        }
    }
}

struct SeatPosition: Codable {
    let x: Double?
    let y: Double?
    
    init(x: Double? = nil, y: Double? = nil) {
        self.x = x
        self.y = y
    }
}

// MARK: - Booking Models

struct UserBooking: Codable, Identifiable {
    let id: String
    let showId: String
    let customerName: String
    let customerEmail: String
    let customerPhone: String?
    let status: BookingStatus
    let totalAmountPence: Int
    let validationCode: String
    let createdAt: String
    let show: Show?
    let venue: Venue?
    let seats: [BookingSeat]?
    
    enum CodingKeys: String, CodingKey {
        case id
        case showId = "show_id"
        case customerName = "customer_name"
        case customerEmail = "customer_email"
        case customerPhone = "customer_phone"
        case status
        case totalAmountPence = "total_amount_pence"
        case validationCode = "validation_code"
        case createdAt = "created_at"
        case show, venue, seats
    }
    
    var formattedTotal: String {
        return String(format: "£%.2f", Double(totalAmountPence) / 100.0)
    }
    
    var formattedDate: String {
        let formatter = ISO8601DateFormatter()
        if let date = formatter.date(from: createdAt) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateStyle = .medium
            displayFormatter.timeStyle = .short
            return displayFormatter.string(from: date)
        }
        return createdAt
    }
    
    var seatCount: Int {
        return seats?.count ?? 0
    }
}

struct BookingSeat: Codable, Identifiable {
    let id: String
    let seatId: String
    let pricePaidPence: Int
    let seat: Seat?
    let section: SectionPricing?
    
    enum CodingKeys: String, CodingKey {
        case id
        case seatId = "seat_id"
        case pricePaidPence = "price_paid_pence"
        case seat, section
    }
    
    var formattedPrice: String {
        return String(format: "£%.2f", Double(pricePaidPence) / 100.0)
    }
}

enum BookingStatus: String, Codable, CaseIterable {
    case pending
    case confirmed
    case cancelled
    case expired
    
    var displayName: String {
        switch self {
        case .pending:
            return "Pending"
        case .confirmed:
            return "Confirmed"
        case .cancelled:
            return "Cancelled"
        case .expired:
            return "Expired"
        }
    }
    
    var isActive: Bool {
        return self == .confirmed || self == .pending
    }
}

// MARK: - Payment Models

struct SeatReservationRequest: Codable {
    let showId: String
    let specificSeatIds: [String]
    let urlScheme: String?
    
    enum CodingKeys: String, CodingKey {
        case showId
        case specificSeatIds = "specificSeatIds"
        case urlScheme
    }
}

struct ReservationResponse: Codable {
    let sessionId: String
    let url: String
    let reservationId: String
    let expiresAt: String
    let totalAmount: Int
    let reservedSeats: Int
    
    enum CodingKeys: String, CodingKey {
        case sessionId
        case url
        case reservationId
        case expiresAt
        case totalAmount
        case reservedSeats
    }
    
    var formattedTotal: String {
        return String(format: "£%.2f", Double(totalAmount) / 100.0)
    }
}

struct BookingConfirmation: Codable {
    let verificationCode: String
    let paymentStatus: String
    let customerDetails: CustomerDetails
    let amountTotal: Int
    let showDetails: ShowDetails
    
    enum CodingKeys: String, CodingKey {
        case verificationCode = "verification_code"
        case paymentStatus = "payment_status"
        case customerDetails = "customer_details"
        case amountTotal = "amount_total"
        case showDetails = "show_details"
    }
}

struct CustomerDetails: Codable {
    let email: String
    let name: String
}

struct ShowDetails: Codable {
    let name: String
    let description: String?
    let imageUrl: String?
    let startTime: String?
    let date: String
    let time: String
    let venue: VenueDetails
    let booking: BookingDetails
    let seats: [SeatDetails]
    
    enum CodingKeys: String, CodingKey {
        case name, description
        case imageUrl = "image_url"
        case startTime = "start_time"
        case date, time, venue, booking, seats
    }
}

struct VenueDetails: Codable {
    let name: String
    let address: String?
}

struct BookingDetails: Codable {
    let id: String
    let validationCode: String
    let customerName: String
    let customerEmail: String
    let totalAmount: Double
    let status: String
    let createdAt: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case validationCode = "validation_code"
        case customerName = "customer_name"
        case customerEmail = "customer_email"
        case totalAmount = "total_amount"
        case status
        case createdAt = "created_at"
    }
}

struct SeatDetails: Codable {
    let id: String
    let sectionName: String
    let row: String
    let number: Int
    let pricePaid: Double
    let sectionColor: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case sectionName = "section_name"
        case row, number
        case pricePaid = "price_paid"
        case sectionColor = "section_color"
    }
    
    var seatLabel: String {
        return "\(row)\(number)"
    }
}

// MARK: - Error Models

enum NetworkError: LocalizedError {
    case invalidURL
    case noInternetConnection
    case connectionFailed
    case serverError(Int)
    case invalidResponse
    case decodingError(Error)
    case unauthorized
    case forbidden
    case notFound
    case timeout
    case unknown(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL configuration"
        case .noInternetConnection:
            return "No internet connection available"
        case .connectionFailed:
            return "Connection to server failed"
        case .serverError(let code):
            return "Server error (Code: \(code))"
        case .invalidResponse:
            return "Invalid server response"
        case .decodingError(let error):
            return "Data parsing error: \(error.localizedDescription)"
        case .unauthorized:
            return "Authentication required"
        case .forbidden:
            return "Access denied"
        case .notFound:
            return "Resource not found"
        case .timeout:
            return "Request timed out"
        case .unknown(let error):
            return "Unexpected error: \(error.localizedDescription)"
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .noInternetConnection:
            return "Please check your internet connection and try again"
        case .unauthorized:
            return "Please sign in to continue"
        case .serverError:
            return "Please try again later"
        case .timeout:
            return "Please check your connection and try again"
        default:
            return "Please try again"
        }
    }
}

enum AuthError: LocalizedError, Equatable {
    case invalidCredentials
    case emailNotVerified
    case accountNotFound
    case accountAlreadyExists
    case socialAuthFailed(String)
    case tokenExpired
    case biometricNotAvailable
    case biometricAuthFailed
    case keychainError
    case networkError
    case unknown(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid email or password"
        case .emailNotVerified:
            return "Please verify your email address"
        case .accountNotFound:
            return "Account not found"
        case .accountAlreadyExists:
            return "An account with this email already exists"
        case .socialAuthFailed(let provider):
            return "\(provider) sign-in failed"
        case .tokenExpired:
            return "Session expired. Please sign in again"
        case .biometricNotAvailable:
            return "Biometric authentication not available"
        case .biometricAuthFailed:
            return "Biometric authentication failed"
        case .keychainError:
            return "Secure storage error"
        case .networkError:
            return "Network connection error"
        case .unknown(let message):
            return message
        }
    }
    
    static func == (lhs: AuthError, rhs: AuthError) -> Bool {
        switch (lhs, rhs) {
        case (.invalidCredentials, .invalidCredentials),
             (.emailNotVerified, .emailNotVerified),
             (.accountNotFound, .accountNotFound),
             (.accountAlreadyExists, .accountAlreadyExists),
             (.tokenExpired, .tokenExpired),
             (.biometricNotAvailable, .biometricNotAvailable),
             (.biometricAuthFailed, .biometricAuthFailed),
             (.keychainError, .keychainError),
             (.networkError, .networkError):
            return true
        case (.socialAuthFailed(let lhsProvider), .socialAuthFailed(let rhsProvider)):
            return lhsProvider == rhsProvider
        case (.unknown(let lhsMessage), .unknown(let rhsMessage)):
            return lhsMessage == rhsMessage
        default:
            return false
        }
    }
}

// MARK: - QR Code Models

struct QRCodeData: Codable {
    let bookingId: String
    let timestamp: Date
    let checksum: String
} 