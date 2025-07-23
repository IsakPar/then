//
//  APIClient.swift
//  LML
//
//  Core API client service
//  Handles all network communication with proper error handling
//

import Foundation

// MARK: - API Client Protocol
protocol APIClientProtocol {
    func signUp(email: String, password: String, firstName: String, lastName: String) async throws -> AuthResponse
    func signIn(email: String, password: String) async throws -> AuthResponse
    func socialAuth(request: SocialAuthRequest) async throws -> AuthResponse
    func createGuestSession(email: String, deviceInfo: [String: String]) async throws -> GuestResponse
    func validateToken(_ token: String) async throws -> User
    func updateBiometricPreference(enabled: Bool) async throws
    func createPaymentIntent(showId: String, specificSeatIds: [String]) async throws -> PaymentIntentResponse
    func getShows() async throws -> [Show]
    func getShow(id: String) async throws -> Show
    func getUserTickets() async throws -> [Ticket]
    func sendBookingConfirmationEmail(to: String, userName: String, showTitle: String, showDate: String, showTime: String, venue: String, bookingReference: String, seatInfo: String, totalAmount: Int) async throws -> Bool
}

// MARK: - API Client
class APIClient: APIClientProtocol {
    static let shared = APIClient()
    
    private let session: URLSession
    private let baseURL: URL
    private let environment: APIEnvironment
    private let jsonDecoder: JSONDecoder
    
    private init(environment: APIEnvironment = .production) {
        self.environment = environment
        
        // 🚨 ULTRA-AGGRESSIVE RAILWAY FORCING - NEVER ALLOW LOCALHOST
        let requestedURL = environment.baseURL
        let requestedString = requestedURL.absoluteString
        
        print("🔍 ULTRA-AGGRESSIVE URL CHECK:")
        print("   🎯 Requested URL: \(requestedString)")
        print("   🔍 Environment: \(environment)")
        print("   🏗️ Build Config: \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown")")
        
        // MULTIPLE LOCALHOST DETECTION METHODS
        let isLocalhost = requestedString.contains("localhost") || 
                         requestedString.contains("127.0.0.1") ||
                         requestedString.contains("3001") ||
                         requestedString.hasPrefix("http://")
        
        if isLocalhost {
            print("🚨🚨🚨 LOCALHOST DETECTED AND BLOCKED!")
            print("❌ Blocked URL: \(requestedString)")
            print("🔒 FORCING RAILWAY CONNECTION...")
            self.baseURL = URL(string: "https://then-production.up.railway.app")!
            print("✅ FORCED Railway URL: \(self.baseURL.absoluteString)")
            print("🚫 Localhost connections are PERMANENTLY DISABLED")
        } else {
            self.baseURL = requestedURL
            print("✅ Railway URL approved: \(self.baseURL.absoluteString)")
        }
        
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: configuration)
        
        // Configure JSON decoder with proper date strategy for ISO 8601 with milliseconds
        self.jsonDecoder = JSONDecoder()
        
        // Create custom date formatter that handles milliseconds
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        
        self.jsonDecoder.dateDecodingStrategy = .formatted(dateFormatter)
        
        print("🔍 APIClient: Configured JSON decoder with custom date format for milliseconds")
        print("🌐 APIClient: Initialized with environment: \(environment)")
        print("🌐 APIClient: Base URL: \(baseURL.absoluteString)")
    }
    
    // MARK: - Authentication Endpoints
    
    func signUp(email: String, password: String, firstName: String, lastName: String) async throws -> AuthResponse {
        let body = [
            "email": email,
            "password": password,
            "firstName": firstName,
            "lastName": lastName
        ]
        
        return try await performRequest(
            endpoint: "/auth/signup",
            method: .POST,
            body: body,
            responseType: AuthResponse.self
        )
    }
    
    func signIn(email: String, password: String) async throws -> AuthResponse {
        let body = [
            "email": email,
            "password": password
        ]
        
        return try await performRequest(
            endpoint: "/auth/signin",
            method: .POST,
            body: body,
            responseType: AuthResponse.self
        )
    }
    
    func socialAuth(request: SocialAuthRequest) async throws -> AuthResponse {
        let body: [String: Any] = [
            "provider": request.provider,
            "token": request.token,
            "email": request.email as Any,
            "firstName": request.firstName as Any,
            "lastName": request.lastName as Any
        ]
        
        return try await performRequest(
            endpoint: "/auth/social",
            method: .POST,
            body: body,
            responseType: AuthResponse.self
        )
    }
    
    func createGuestSession(email: String, deviceInfo: [String: String]) async throws -> GuestResponse {
        let body: [String: Any] = [
            "email": email,
            "deviceInfo": deviceInfo
        ]
        
        return try await performRequest(
            endpoint: "/guest-session",
            method: .POST,
            body: body,
            responseType: GuestResponse.self
        )
    }
    
    func validateToken(_ token: String) async throws -> User {
        return try await performRequest(
            endpoint: "/auth/validate",
            method: .GET,
            authToken: token,
            responseType: User.self
        )
    }
    
    func updateBiometricPreference(enabled: Bool) async throws {
        let body = ["biometricEnabled": enabled]
        
        let _: EmptyResponse = try await performRequest(
            endpoint: "/auth/biometric",
            method: .PUT,
            body: body,
            requiresAuth: true,
            responseType: EmptyResponse.self
        )
    }
    
    // MARK: - Show Endpoints
    
    func getShows() async throws -> [Show] {
        return try await performRequest(
            endpoint: "/shows",
            method: .GET,
            responseType: [Show].self
        )
    }
    
    func getShow(id: String) async throws -> Show {
        return try await performRequest(
            endpoint: "/shows/\(id)",
            method: .GET,
            responseType: Show.self
        )
    }
    
    // MARK: - Ticket Endpoints
    
    func getUserTickets() async throws -> [Ticket] {
        return try await performRequest(
            endpoint: "/tickets",
            method: .GET,
            requiresAuth: true,
            responseType: [Ticket].self
        )
    }
    
    // MARK: - Email Endpoints
    
    func sendBookingConfirmationEmail(
        to: String,
        userName: String,
        showTitle: String,
        showDate: String,
        showTime: String,
        venue: String,
        bookingReference: String,
        seatInfo: String,
        totalAmount: Int
    ) async throws -> Bool {
        let body = [
            "to": to,
            "userName": userName,
            "showTitle": showTitle,
            "showDate": showDate,
            "showTime": showTime,
            "venue": venue,
            "bookingReference": bookingReference,
            "seatInfo": seatInfo,
            "totalAmount": totalAmount
        ] as [String: Any]
        
        do {
            let _: EmptyResponse = try await performRequest(
                endpoint: "/email/booking-confirmation",
                method: .POST,
                body: body,
                requiresAuth: false,
                responseType: EmptyResponse.self
            )
            print("✅ Booking confirmation email API call successful")
            return true
        } catch {
            print("❌ Booking confirmation email API call failed: \(error)")
            return false // Don't throw error - email failure shouldn't break payment flow
        }
    }
    
    // MARK: - Payment Endpoints
    
    func createPaymentIntent(showId: String, specificSeatIds: [String]) async throws -> PaymentIntentResponse {
        let body: [String: Any] = [
            "showId": showId,
            "specificSeatIds": specificSeatIds
        ]
        
        return try await performRequest(
            endpoint: "/payment-intent",
            method: .POST,
            body: body,
            requiresAuth: false,
            responseType: PaymentIntentResponse.self
        )
    }
    
    // MARK: - Core Request Method
    
    private func performRequest<T: Codable>(
        endpoint: String,
        method: HTTPMethod,
        body: [String: Any]? = nil,
        authToken: String? = nil,
        requiresAuth: Bool = false,
        responseType: T.Type
    ) async throws -> T {
        
        let url = baseURL.appendingPathComponent("api").appendingPathComponent(endpoint)
        
        // 🚨 ULTRA-AGGRESSIVE REQUEST VALIDATION
        print("🌐 APIClient REQUEST VALIDATION:")
        print("   📍 Base URL: \(baseURL.absoluteString)")
        print("   🎯 Full URL: \(url.absoluteString)")
        print("   📡 Method: \(method.rawValue)")
        print("   🔧 Endpoint: \(endpoint)")
        
        // 🚨 FINAL LOCALHOST CHECK - BLOCK ANY LOCALHOST REQUESTS
        if url.absoluteString.contains("localhost") || url.absoluteString.contains("127.0.0.1") || url.absoluteString.contains("3001") {
            print("🚨🚨🚨 EMERGENCY LOCALHOST BLOCK!")
            print("❌ BLOCKED REQUEST: \(url.absoluteString)")
            throw APIError.networkError("Localhost connections are permanently disabled. Using Railway only.")
        }
        
        // 🚨 ENSURE RAILWAY CONNECTION  
        if !url.absoluteString.contains("railway.app") {
            print("⚠️ WARNING: Non-Railway URL detected: \(url.absoluteString)")
        } else {
            print("✅ RAILWAY CONNECTION VERIFIED: \(url.absoluteString)")
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add authentication if required
        if requiresAuth || authToken != nil {
            let token = authToken ?? getStoredToken()
            if let token = token {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            } else if requiresAuth {
                throw APIError.authenticationRequired
            }
        }
        
        // Add body if provided
        if let body = body {
            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
            } catch {
                throw APIError.invalidRequest
            }
        }
        
        do {
            let (data, response) = try await session.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }
            
            try handleHTTPResponse(httpResponse)
            
            // Handle empty responses
            if T.self == EmptyResponse.self {
                return EmptyResponse() as! T
            }
            
            // 🔍 ENHANCED LOGGING: Log raw response for debugging
            if let responseString = String(data: data, encoding: .utf8) {
                print("🔍 RAW API Response Data:")
                print("📄 Response String: \(responseString)")
                print("📊 Data Length: \(data.count) bytes")
                print("🎯 Attempting to decode to type: \(T.self)")
            } else {
                print("❌ Failed to convert response data to UTF-8 string")
                print("📊 Raw Data Length: \(data.count) bytes")
            }
            
            do {
                let decodedResponse = try jsonDecoder.decode(T.self, from: data)
                print("✅ Successfully decoded response to \(T.self)")
                return decodedResponse
            } catch let DecodingError.keyNotFound(key, context) {
                print("🚨 JSON DECODING ERROR - Missing Key:")
                print("   Missing Key: \(key)")
                print("   Coding Path: \(context.codingPath)")
                print("   Context: \(context.debugDescription)")
                throw APIError.networkError("Missing required key '\(key)' in response")
            } catch let DecodingError.typeMismatch(type, context) {
                print("🚨 JSON DECODING ERROR - Type Mismatch:")
                print("   Expected Type: \(type)")
                print("   Coding Path: \(context.codingPath)")
                print("   Context: \(context.debugDescription)")
                throw APIError.networkError("Type mismatch for '\(context.codingPath)' - expected \(type)")
            } catch let DecodingError.valueNotFound(type, context) {
                print("🚨 JSON DECODING ERROR - Value Not Found:")
                print("   Missing Type: \(type)")
                print("   Coding Path: \(context.codingPath)")
                print("   Context: \(context.debugDescription)")
                throw APIError.networkError("Missing value for '\(context.codingPath)' of type \(type)")
            } catch let DecodingError.dataCorrupted(context) {
                print("🚨 JSON DECODING ERROR - Data Corrupted:")
                print("   Coding Path: \(context.codingPath)")
                print("   Context: \(context.debugDescription)")
                throw APIError.networkError("Corrupted data at '\(context.codingPath)'")
            } catch {
                print("🚨 JSON DECODING ERROR - Unknown:")
                print("   Error: \(error)")
                print("   Error Type: \(type(of: error))")
                throw APIError.networkError("JSON decoding failed: \(error.localizedDescription)")
            }
            
        } catch let error as APIError {
            throw error
        } catch {
            print("🚨 NETWORK ERROR:")
            print("   Error: \(error)")
            print("   Error Type: \(type(of: error))")
            throw APIError.networkError(error.localizedDescription)
        }
    }
    
    private func handleHTTPResponse(_ response: HTTPURLResponse) throws {
        switch response.statusCode {
        case 200...299:
            return
        case 401:
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound
        case 422:
            throw APIError.validationError
        case 500...599:
            throw APIError.serverError
        default:
            throw APIError.unknownError(response.statusCode)
        }
    }
    
    private func getStoredToken() -> String? {
        return KeychainService.shared.getAuthToken()
    }
}

// MARK: - HTTP Method
enum HTTPMethod: String {
    case GET = "GET"
    case POST = "POST"
    case PUT = "PUT"
    case DELETE = "DELETE"
    case PATCH = "PATCH"
}

// MARK: - API Environment
enum APIEnvironment {
    case development
    case staging
    case production
    
    var baseURL: URL {
        // 🚨 ULTRA-AGGRESSIVE: ALL ENVIRONMENTS USE RAILWAY
        let railwayURL = "https://then-production.up.railway.app"
        
        switch self {
        case .development:
            print("🔒 DEVELOPMENT MODE: FORCED to Railway (NO localhost allowed)")
            return URL(string: railwayURL)!
        case .staging:
            print("🔒 STAGING MODE: FORCED to Railway")  
            return URL(string: railwayURL)!
        case .production:
            print("🔒 PRODUCTION MODE: Using Railway")
            return URL(string: railwayURL)!
        }
    }
}

// MARK: - API Errors
enum APIError: LocalizedError {
    case invalidRequest
    case invalidResponse
    case unauthorized
    case forbidden
    case notFound
    case validationError
    case serverError
    case networkError(String)
    case authenticationRequired
    case unknownError(Int)
    
    var errorDescription: String? {
        switch self {
        case .invalidRequest:
            return "Invalid request format"
        case .invalidResponse:
            return "Invalid response from server"
        case .unauthorized:
            return "Authentication required"
        case .forbidden:
            return "Access forbidden"
        case .notFound:
            return "Resource not found"
        case .validationError:
            return "Validation error"
        case .serverError:
            return "Server error occurred"
        case .networkError(let message):
            return "Network error: \(message)"
        case .authenticationRequired:
            return "Authentication required for this request"
        case .unknownError(let code):
            return "Unknown error occurred (Code: \(code))"
        }
    }
}

// MARK: - Response Models
struct PaymentIntentResponse: Codable {
    let paymentIntentId: String
    let clientSecret: String
    let reservationId: String?
    let amount: Int?
    let currency: String?
    let showTitle: String?
    let seatCount: Int?
    let expiresAt: String?
}

struct EmptyResponse: Codable {
    init() {}
} 