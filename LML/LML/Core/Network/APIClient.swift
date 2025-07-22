//
//  APIClient.swift
//  Last Minute Live
//
//  Network layer for API communication
//  Mirrors functionality from mobile-app/src/lib/api/client.ts
//

import Foundation
import Combine

// MARK: - API Configuration

enum APIEnvironment {
    case production
    case staging
    case development
    
    var baseURL: URL {
        switch self {
        case .production:
            return URL(string: "https://then-production.up.railway.app")!
        case .staging:
            return URL(string: "https://staging.lastminutelive.com")!
        case .development:
            return URL(string: "http://localhost:3001")!
        }
    }
    
    var websocketURL: URL {
        switch self {
        case .production:
            return URL(string: "wss://then-production.up.railway.app")!
        case .staging:
            return URL(string: "wss://staging.lastminutelive.com")!
        case .development:
            return URL(string: "ws://localhost:3001")!
        }
    }
}

// MARK: - API Client Protocol

protocol APIClientProtocol {
    // Authentication endpoints
    func signIn(credentials: SignInRequest) async throws -> AuthResponse
    func signUp(request: SignUpRequest) async throws -> AuthResponse
    func socialAuth(request: SocialAuthRequest) async throws -> AuthResponse
    func verifyToken() async throws -> TokenVerificationResponse
    func sendEmailVerification(email: String) async throws -> Bool
    func verifyEmail(token: String, email: String) async throws -> Bool
    func resetPassword(email: String) async throws -> Bool
    
    // Shows endpoints
    func getShows() async throws -> [Show]
    func getShow(id: String) async throws -> Show
    func getShowSeats(showId: String) async throws -> [Seat]
    func getShowSeatmap(showId: String) async throws -> SeatMapResponse
    
    // Booking endpoints
    func createSeatReservation(request: SeatReservationRequest) async throws -> ReservationResponse
    func getUserBookings() async throws -> [UserBooking]
    func getBookingConfirmation(sessionId: String) async throws -> BookingConfirmation
    
    // Venue endpoints (for venue staff)
    func validateVenueTicket(venueId: String, validationCode: String) async throws -> TicketValidationResponse
    func getVenueShows(venueId: String) async throws -> [Show]
    func getVenueBookings(venueId: String, date: String?) async throws -> [UserBooking]
    
    // Utility endpoints
    func checkEnvironment() async throws -> EnvironmentResponse
}

// MARK: - Additional Response Models

struct SeatMapResponse: Codable {
    let success: Bool
    let seatMap: SeatMapData
}

struct SeatMapData: Codable {
    let id: String
    let name: String
    let totalCapacity: Int
    let svgViewbox: String
    let layoutConfig: [String: Any]
    let generatedSVG: String?
    
    enum CodingKeys: String, CodingKey {
        case id, name
        case totalCapacity = "total_capacity"
        case svgViewbox = "svg_viewbox"
        case layoutConfig = "layout_config"
        case generatedSVG = "generated_svg"
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        totalCapacity = try container.decode(Int.self, forKey: .totalCapacity)
        svgViewbox = try container.decode(String.self, forKey: .svgViewbox)
        generatedSVG = try container.decodeIfPresent(String.self, forKey: .generatedSVG)
        
        // Handle flexible JSON for layoutConfig
        let jsonValue = try container.decode(AnyCodable.self, forKey: .layoutConfig)
        layoutConfig = jsonValue.value as? [String: Any] ?? [:]
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(totalCapacity, forKey: .totalCapacity)
        try container.encode(svgViewbox, forKey: .svgViewbox)
        try container.encodeIfPresent(generatedSVG, forKey: .generatedSVG)
        
        // Encode layoutConfig using AnyCodable wrapper
        let anyCodableConfig = AnyCodable(layoutConfig)
        try container.encode(anyCodableConfig, forKey: .layoutConfig)
    }
}

struct TicketValidationResponse: Codable {
    let booking: BookingDetails
    let show: Show
    let venue: VenueDetails
    let seats: [SeatDetails]
}

struct EnvironmentResponse: Codable {
    let environment: String
    let version: String
    let timestamp: String
    let features: [String: Bool]
}

// Helper for flexible JSON decoding
struct AnyCodable: Codable {
    let value: Any
    
    init(_ value: Any) {
        self.value = value
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        
        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dictionary = try? container.decode([String: AnyCodable].self) {
            value = dictionary.mapValues { $0.value }
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Cannot decode value")
        }
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        
        switch value {
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(value, EncodingError.Context(codingPath: [], debugDescription: "Cannot encode value"))
        }
    }
}

// MARK: - API Client Implementation

class APIClient: APIClientProtocol {
    
    // MARK: - Properties
    
    private let session: URLSession
    private let baseURL: URL
    private let jsonDecoder: JSONDecoder
    private let jsonEncoder: JSONEncoder
    private weak var authManager: AuthManagerProtocol?
    
    // MARK: - Initialization
    
    init(environment: APIEnvironment = .production, authManager: AuthManagerProtocol? = nil) {
        self.baseURL = environment.baseURL
        self.authManager = authManager
        
        // Configure URL session with security settings
        let configuration = URLSessionConfiguration.default
        configuration.tlsMinimumSupportedProtocolVersion = .TLSv12
        configuration.waitsForConnectivity = true
        configuration.timeoutIntervalForRequest = 30.0
        configuration.timeoutIntervalForResource = 60.0
        
        self.session = URLSession(configuration: configuration)
        
        // Configure JSON decoder
        self.jsonDecoder = JSONDecoder()
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        self.jsonDecoder.dateDecodingStrategy = .formatted(dateFormatter)
        
        // Configure JSON encoder
        self.jsonEncoder = JSONEncoder()
        self.jsonEncoder.dateEncodingStrategy = .formatted(dateFormatter)
    }
    
    // MARK: - Private Methods
    
    private func makeRequest(
        endpoint: String,
        method: HTTPMethod = .GET,
        body: Codable? = nil,
        requiresAuth: Bool = false
    ) async throws -> URLRequest {
        
        guard let url = URL(string: endpoint, relativeTo: baseURL) else {
            throw NetworkError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("application/json", forHTTPHeaderField: "Accept")
        request.addValue("true", forHTTPHeaderField: "x-mobile-app")
        request.addValue("ios", forHTTPHeaderField: "x-platform")
        
        // Add authentication header if required
        if requiresAuth {
            guard let token = authManager?.authToken else {
                throw NetworkError.unauthorized
            }
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // Add request body if provided
        if let body = body {
            do {
                request.httpBody = try jsonEncoder.encode(body)
            } catch {
                throw NetworkError.decodingError(error)
            }
        }
        
        return request
    }
    
    private func performRequest<T: Codable>(
        _ request: URLRequest,
        responseType: T.Type
    ) async throws -> T {
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NetworkError.invalidResponse
            }
            
            // Handle HTTP status codes
            switch httpResponse.statusCode {
            case 200...299:
                break
            case 401:
                throw NetworkError.unauthorized
            case 403:
                throw NetworkError.forbidden
            case 404:
                throw NetworkError.notFound
            case 500...599:
                throw NetworkError.serverError(httpResponse.statusCode)
            default:
                throw NetworkError.serverError(httpResponse.statusCode)
            }
            
            // Decode response
            do {
                let decodedResponse = try jsonDecoder.decode(T.self, from: data)
                return decodedResponse
            } catch {
                // Log the error for debugging
                print("🔍 API Response decoding error:")
                print("Request URL: \(request.url?.absoluteString ?? "Unknown")")
                print("Response data: \(String(data: data, encoding: .utf8) ?? "Invalid UTF8")")
                print("Decoding error: \(error)")
                throw NetworkError.decodingError(error)
            }
            
        } catch let error as NetworkError {
            throw error
        } catch {
            if (error as NSError).domain == NSURLErrorDomain {
                if (error as NSError).code == NSURLErrorNotConnectedToInternet {
                    throw NetworkError.noInternetConnection
                } else if (error as NSError).code == NSURLErrorTimedOut {
                    throw NetworkError.timeout
                }
            }
            throw NetworkError.unknown(error)
        }
    }
    
    // MARK: - Authentication Endpoints
    
    func signIn(credentials: SignInRequest) async throws -> AuthResponse {
        let request = try await makeRequest(
            endpoint: "/api/auth/signin",
            method: .POST,
            body: credentials,
            requiresAuth: false
        )
        return try await performRequest(request, responseType: AuthResponse.self)
    }
    
    func signUp(request: SignUpRequest) async throws -> AuthResponse {
        let urlRequest = try await makeRequest(
            endpoint: "/api/auth/signup",
            method: .POST,
            body: request,
            requiresAuth: false
        )
        return try await performRequest(urlRequest, responseType: AuthResponse.self)
    }
    
    func socialAuth(request: SocialAuthRequest) async throws -> AuthResponse {
        let urlRequest = try await makeRequest(
            endpoint: "/api/auth/social",
            method: .POST,
            body: request,
            requiresAuth: false
        )
        return try await performRequest(urlRequest, responseType: AuthResponse.self)
    }
    
    func verifyToken() async throws -> TokenVerificationResponse {
        let request = try await makeRequest(
            endpoint: "/api/auth/verify",
            method: .GET,
            requiresAuth: true
        )
        return try await performRequest(request, responseType: TokenVerificationResponse.self)
    }
    
    func sendEmailVerification(email: String) async throws -> Bool {
        struct EmailRequest: Codable {
            let email: String
        }
        
        let request = try await makeRequest(
            endpoint: "/api/auth/verify-email",
            method: .POST,
            body: EmailRequest(email: email),
            requiresAuth: false
        )
        
        struct EmailResponse: Codable {
            let success: Bool
        }
        
        let response = try await performRequest(request, responseType: EmailResponse.self)
        return response.success
    }
    
    func verifyEmail(token: String, email: String) async throws -> Bool {
        struct VerifyRequest: Codable {
            let token: String
            let email: String
        }
        
        let request = try await makeRequest(
            endpoint: "/api/auth/verify",
            method: .POST,
            body: VerifyRequest(token: token, email: email),
            requiresAuth: false
        )
        
        struct VerifyResponse: Codable {
            let success: Bool
        }
        
        let response = try await performRequest(request, responseType: VerifyResponse.self)
        return response.success
    }
    
    func resetPassword(email: String) async throws -> Bool {
        struct ResetRequest: Codable {
            let email: String
        }
        
        let request = try await makeRequest(
            endpoint: "/api/auth/password-reset",
            method: .POST,
            body: ResetRequest(email: email),
            requiresAuth: false
        )
        
        struct ResetResponse: Codable {
            let success: Bool
        }
        
        let response = try await performRequest(request, responseType: ResetResponse.self)
        return response.success
    }
    
    // MARK: - Shows Endpoints
    
    func getShows() async throws -> [Show] {
        let request = try await makeRequest(
            endpoint: "/api/shows",
            method: .GET,
            requiresAuth: false
        )
        return try await performRequest(request, responseType: [Show].self)
    }
    
    func getShow(id: String) async throws -> Show {
        let request = try await makeRequest(
            endpoint: "/api/shows?id=\(id)",
            method: .GET,
            requiresAuth: false
        )
        return try await performRequest(request, responseType: Show.self)
    }
    
    func getShowSeats(showId: String) async throws -> [Seat] {
        let request = try await makeRequest(
            endpoint: "/api/shows/\(showId)/seats",
            method: .GET,
            requiresAuth: false
        )
        return try await performRequest(request, responseType: [Seat].self)
    }
    
    func getShowSeatmap(showId: String) async throws -> SeatMapResponse {
        let request = try await makeRequest(
            endpoint: "/api/shows/\(showId)/seatmap",
            method: .GET,
            requiresAuth: false
        )
        return try await performRequest(request, responseType: SeatMapResponse.self)
    }
    
    // MARK: - Booking Endpoints
    
    func createSeatReservation(request: SeatReservationRequest) async throws -> ReservationResponse {
        let urlRequest = try await makeRequest(
            endpoint: "/api/seat-checkout",
            method: .POST,
            body: request,
            requiresAuth: false // Backend TODO mentions this should require auth
        )
        return try await performRequest(urlRequest, responseType: ReservationResponse.self)
    }
    
    func getUserBookings() async throws -> [UserBooking] {
        let request = try await makeRequest(
            endpoint: "/api/user/bookings",
            method: .GET,
            requiresAuth: true
        )
        return try await performRequest(request, responseType: [UserBooking].self)
    }
    
    func getBookingConfirmation(sessionId: String) async throws -> BookingConfirmation {
        let request = try await makeRequest(
            endpoint: "/api/checkout/success?session_id=\(sessionId)",
            method: .GET,
            requiresAuth: false
        )
        return try await performRequest(request, responseType: BookingConfirmation.self)
    }
    
    // MARK: - Venue Endpoints
    
    func validateVenueTicket(venueId: String, validationCode: String) async throws -> TicketValidationResponse {
        struct ValidationRequest: Codable {
            let validationCode: String
        }
        
        let request = try await makeRequest(
            endpoint: "/api/venues/\(venueId)/validate",
            method: .POST,
            body: ValidationRequest(validationCode: validationCode),
            requiresAuth: false
        )
        return try await performRequest(request, responseType: TicketValidationResponse.self)
    }
    
    func getVenueShows(venueId: String) async throws -> [Show] {
        let request = try await makeRequest(
            endpoint: "/api/venues/\(venueId)/shows",
            method: .GET,
            requiresAuth: false
        )
        return try await performRequest(request, responseType: [Show].self)
    }
    
    func getVenueBookings(venueId: String, date: String? = nil) async throws -> [UserBooking] {
        var endpoint = "/api/venues/\(venueId)/bookings"
        if let date = date {
            endpoint += "/\(date)"
        }
        
        let request = try await makeRequest(
            endpoint: endpoint,
            method: .GET,
            requiresAuth: true
        )
        return try await performRequest(request, responseType: [UserBooking].self)
    }
    
    // MARK: - Utility Endpoints
    
    func checkEnvironment() async throws -> EnvironmentResponse {
        let request = try await makeRequest(
            endpoint: "/api/env-check",
            method: .GET,
            requiresAuth: false
        )
        return try await performRequest(request, responseType: EnvironmentResponse.self)
    }
}

// MARK: - HTTP Method Enum

enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
    case PATCH = "PATCH"
}

// MARK: - Mock API Client for Testing

class MockAPIClient: APIClientProtocol {
    
    private var mockResponses: [String: Any] = [:]
    private var shouldFailRequests = false
    private var networkDelay: TimeInterval = 0.1
    
    func setMockResponse<T: Codable>(_ response: T, for endpoint: String) {
        mockResponses[endpoint] = response
    }
    
    func setNetworkFailure(_ shouldFail: Bool) {
        shouldFailRequests = shouldFail
    }
    
    func setNetworkDelay(_ delay: TimeInterval) {
        networkDelay = delay
    }
    
    private func performMockRequest<T: Codable>(_ endpoint: String, responseType: T.Type) async throws -> T {
        // Simulate network delay
        try await Task.sleep(nanoseconds: UInt64(networkDelay * 1_000_000_000))
        
        if shouldFailRequests {
            throw NetworkError.connectionFailed
        }
        
        guard let mockResponse = mockResponses[endpoint] as? T else {
            throw NetworkError.notFound
        }
        
        return mockResponse
    }
    
    // MARK: - Mock Implementation of Protocol Methods
    
    func signIn(credentials: SignInRequest) async throws -> AuthResponse {
        return try await performMockRequest("signin", responseType: AuthResponse.self)
    }
    
    func signUp(request: SignUpRequest) async throws -> AuthResponse {
        return try await performMockRequest("signup", responseType: AuthResponse.self)
    }
    
    func socialAuth(request: SocialAuthRequest) async throws -> AuthResponse {
        return try await performMockRequest("socialAuth", responseType: AuthResponse.self)
    }
    
    func verifyToken() async throws -> TokenVerificationResponse {
        return try await performMockRequest("verifyToken", responseType: TokenVerificationResponse.self)
    }
    
    func sendEmailVerification(email: String) async throws -> Bool {
        return try await performMockRequest("sendEmailVerification", responseType: Bool.self)
    }
    
    func verifyEmail(token: String, email: String) async throws -> Bool {
        return try await performMockRequest("verifyEmail", responseType: Bool.self)
    }
    
    func resetPassword(email: String) async throws -> Bool {
        return try await performMockRequest("resetPassword", responseType: Bool.self)
    }
    
    func getShows() async throws -> [Show] {
        return try await performMockRequest("getShows", responseType: [Show].self)
    }
    
    func getShow(id: String) async throws -> Show {
        return try await performMockRequest("getShow", responseType: Show.self)
    }
    
    func getShowSeats(showId: String) async throws -> [Seat] {
        return try await performMockRequest("getShowSeats", responseType: [Seat].self)
    }
    
    func getShowSeatmap(showId: String) async throws -> SeatMapResponse {
        return try await performMockRequest("getShowSeatmap", responseType: SeatMapResponse.self)
    }
    
    func createSeatReservation(request: SeatReservationRequest) async throws -> ReservationResponse {
        return try await performMockRequest("createSeatReservation", responseType: ReservationResponse.self)
    }
    
    func getUserBookings() async throws -> [UserBooking] {
        return try await performMockRequest("getUserBookings", responseType: [UserBooking].self)
    }
    
    func getBookingConfirmation(sessionId: String) async throws -> BookingConfirmation {
        return try await performMockRequest("getBookingConfirmation", responseType: BookingConfirmation.self)
    }
    
    func validateVenueTicket(venueId: String, validationCode: String) async throws -> TicketValidationResponse {
        return try await performMockRequest("validateVenueTicket", responseType: TicketValidationResponse.self)
    }
    
    func getVenueShows(venueId: String) async throws -> [Show] {
        return try await performMockRequest("getVenueShows", responseType: [Show].self)
    }
    
    func getVenueBookings(venueId: String, date: String?) async throws -> [UserBooking] {
        return try await performMockRequest("getVenueBookings", responseType: [UserBooking].self)
    }
    
    func checkEnvironment() async throws -> EnvironmentResponse {
        return try await performMockRequest("checkEnvironment", responseType: EnvironmentResponse.self)
    }
}

// MARK: - API Client Extensions for Convenience

extension APIClient {
    
    /// Convenience method to get shows with caching
    func getShowsWithCache(maxAge: TimeInterval = 300) async throws -> [Show] {
        // TODO: Implement caching strategy
        return try await getShows()
    }
    
    /// Convenience method to refresh auth token if needed
    func refreshAuthTokenIfNeeded() async throws {
        // TODO: Implement token refresh logic
        _ = try await verifyToken()
    }
    
    /// Convenience method to check connectivity
    func checkConnectivity() async -> Bool {
        do {
            _ = try await checkEnvironment()
            return true
        } catch {
            return false
        }
    }
} 