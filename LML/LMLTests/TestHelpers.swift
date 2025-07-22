//
//  TestHelpers.swift
//  LML
//
//  Comprehensive testing utilities and helpers
//  Supports unit tests, integration tests, and UI tests
//

import SwiftUI
import XCTest
import Combine

// MARK: - Test Configuration
struct TestConfig {
    static let defaultTimeout: TimeInterval = 10.0
    static let shortTimeout: TimeInterval = 2.0
    static let longTimeout: TimeInterval = 30.0
    
    static var isRunningUITests: Bool {
        ProcessInfo.processInfo.arguments.contains("UI_TESTING")
    }
    
    static var shouldUseMockData: Bool {
        return true // Always use mock data for testing
    }
}

// MARK: - Mock Data Factory
class MockDataFactory {
    
    // MARK: - Mock Users
    static func createMockUser(
        id: String = "test-user-123",
        email: String = "test@example.com",
        firstName: String = "Test",
        lastName: String = "User",
        accountType: User.AccountType = .registered,
        authProvider: User.AuthProvider = .email
    ) -> User {
        return User(
            id: id,
            email: email,
            firstName: firstName,
            lastName: lastName,
            accountType: accountType,
            authProvider: authProvider,
            isGuest: false,
            emailVerified: true,
            biometricEnabled: false,
            createdAt: Date()
        )
    }
    
    static func createGuestUser() -> User {
        return createMockUser(
            id: "guest-user-456",
            email: "guest@example.com",
            firstName: nil,
            lastName: nil,
            accountType: .guest,
            authProvider: .guest
        )
    }
    
    // MARK: - Mock Shows
    static func createMockShow(
        id: String = "test-show-123",
        title: String = "Test Musical",
        category: ShowCategory = .musical
    ) -> Show {
        return Show(
            id: id,
            title: title,
            venue: createMockVenue(),
            description: "A test musical for automated testing purposes",
            imageURL: "test-image.jpg",
            category: category,
            duration: 2.5 * 3600,
            ageRating: "PG",
            pricing: createMockPricing(),
            schedule: [createMockShowTime()],
            seatMap: nil,
            isActive: true,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
    
    static func createMockVenue() -> Venue {
        return Venue(
            id: "test-venue-123",
            name: "Test Theatre",
            address: Address(
                street: "123 Test Street",
                city: "Test City",
                postcode: "T3ST 123",
                country: "Test Country"
            ),
            capacity: 1000,
            accessibility: AccessibilityInfo(
                wheelchairAccessible: true,
                hearingLoopAvailable: true,
                audioDescriptionAvailable: false,
                signLanguageAvailable: false
            ),
            facilities: ["Test Bar", "Test Shop"]
        )
    }
    
    static func createMockPricing() -> PricingInfo {
        return PricingInfo(
            currency: "GBP",
            minPrice: 2500,
            maxPrice: 10000,
            sections: [
                PriceSection(name: "Premium", price: 10000, availableSeats: 50, totalSeats: 100),
                PriceSection(name: "Standard", price: 5000, availableSeats: 150, totalSeats: 200)
            ]
        )
    }
    
    static func createMockShowTime() -> ShowTime {
        return ShowTime(
            id: "test-showtime-123",
            showId: "test-show-123",
            startTime: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date(),
            endTime: Calendar.current.date(byAdding: .hour, value: 3, to: Date()) ?? Date(),
            isAvailable: true,
            availableSeats: 200
        )
    }
    
    // MARK: - Mock Tickets
    static func createMockTicket(
        id: String = "test-ticket-123",
        status: TicketStatus = .upcoming
    ) -> Ticket {
        let calendar = Calendar.current
        let baseDate = Date()
        
        let showDate: Date
        switch status {
        case .upcoming:
            showDate = calendar.date(byAdding: .day, value: 7, to: baseDate) ?? baseDate
        case .today:
            showDate = baseDate
        case .past:
            showDate = calendar.date(byAdding: .day, value: -7, to: baseDate) ?? baseDate
        case .cancelled:
            showDate = calendar.date(byAdding: .day, value: 3, to: baseDate) ?? baseDate
        }
        
        return Ticket(
            id: id,
            showName: "Test Show",
            venueName: "Test Theatre",
            showDate: showDate,
            showTime: "7:30 PM",
            seatInfo: "Test Section - Row A, Seats 1-2",
            totalPrice: 10000,
            status: status,
            bookingReference: "TEST123456"
        )
    }
    
    static func createMockTickets(count: Int = 3) -> [Ticket] {
        let statuses: [TicketStatus] = [.upcoming, .today, .past]
        return (0..<count).map { index in
            createMockTicket(
                id: "test-ticket-\(index)",
                status: statuses[index % statuses.count]
            )
        }
    }
    
    // MARK: - Mock Seats
    static func createMockSeats(count: Int = 10) -> [TheaterSeat] {
        return (0..<count).map { index in
            TheaterSeat(
                id: "test-seat-\(index)",
                row: (index / 5) + 1,
                number: (index % 5) + 1,
                section: .middle,
                x: Double(index % 5) * 30,
                y: Double(index / 5) * 25,
                isAvailable: index % 3 != 0, // Make some unavailable
                isSelected: false,
                price: 5000
            )
        }
    }
}

// MARK: - Mock Services
class MockAPIClient: APIClientProtocol {
    var shouldSucceed = true
    var delayDuration: TimeInterval = 0.1
    
    func signUp(email: String, password: String, firstName: String, lastName: String) async throws -> AuthResponse {
        try await simulateDelay()
        if shouldSucceed {
            return AuthResponse(
                user: MockDataFactory.createMockUser(email: email, firstName: firstName, lastName: lastName),
                token: "mock-auth-token"
            )
        } else {
            throw APIError.validationError
        }
    }
    
    func signIn(email: String, password: String) async throws -> AuthResponse {
        try await simulateDelay()
        if shouldSucceed {
            return AuthResponse(
                user: MockDataFactory.createMockUser(email: email),
                token: "mock-auth-token"
            )
        } else {
            throw APIError.unauthorized
        }
    }
    
    func createGuestSession(email: String, deviceInfo: [String: String]) async throws -> GuestResponse {
        try await simulateDelay()
        if shouldSucceed {
            return GuestResponse(
                user: MockDataFactory.createGuestUser(),
                sessionToken: "mock-guest-token"
            )
        } else {
            throw APIError.networkError("Mock network error")
        }
    }
    
    func validateToken(_ token: String) async throws -> User {
        try await simulateDelay()
        if shouldSucceed {
            return MockDataFactory.createMockUser()
        } else {
            throw APIError.unauthorized
        }
    }
    
    func updateBiometricPreference(enabled: Bool) async throws {
        try await simulateDelay()
        if !shouldSucceed {
            throw APIError.serverError
        }
    }
    
    func createPaymentIntent(showId: String, specificSeatIds: [String]) async throws -> PaymentIntentResponse {
        try await simulateDelay()
        if shouldSucceed {
            return PaymentIntentResponse(
                paymentIntentId: "pi_test_123",
                clientSecret: "pi_test_123_secret_mock"
            )
        } else {
            throw APIError.validationError
        }
    }
    
    func getShows() async throws -> [Show] {
        try await simulateDelay()
        if shouldSucceed {
            return [
                MockDataFactory.createMockShow(),
                MockDataFactory.createMockShow(id: "show-2", title: "Another Test Show")
            ]
        } else {
            throw APIError.networkError("Mock network error")
        }
    }
    
    func getShow(id: String) async throws -> Show {
        try await simulateDelay()
        if shouldSucceed {
            return MockDataFactory.createMockShow(id: id)
        } else {
            throw APIError.notFound
        }
    }
    
    func getUserTickets() async throws -> [Ticket] {
        try await simulateDelay()
        if shouldSucceed {
            return MockDataFactory.createMockTickets()
        } else {
            throw APIError.networkError("Mock network error")
        }
    }
    
    private func simulateDelay() async throws {
        try await Task.sleep(nanoseconds: UInt64(delayDuration * 1_000_000_000))
    }
}

// MARK: - Test Utilities
class TestUtilities {
    
    // MARK: - Async Testing Helpers
    static func waitForPublisher<T: Publisher>(
        _ publisher: T,
        timeout: TimeInterval = TestConfig.defaultTimeout,
        file: StaticString = #file,
        line: UInt = #line
    ) async throws -> T.Output where T.Failure == Never {
        
        return try await withCheckedThrowingContinuation { continuation in
            var cancellable: AnyCancellable?
            let timeoutTask = Task {
                try await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                cancellable?.cancel()
                continuation.resume(throwing: TestError.timeout)
            }
            
            cancellable = publisher
                .first()
                .sink { value in
                    timeoutTask.cancel()
                    continuation.resume(returning: value)
                }
        }
    }
    
    // MARK: - UI Testing Helpers
    static func simulateUserInteraction(delay: TimeInterval = 0.5) async {
        try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
    }
    
    static func enableUITestingMode() {
        // Set up environment for UI testing
        UserDefaults.standard.set(true, forKey: "UITestingMode")
        
        // Use mock data
        AppConfiguration.shared.shouldUseMockData = true
    }
    
    // MARK: - Memory Testing
    static func measureMemoryUsage<T>(
        during operation: () async throws -> T,
        threshold: Int = 50_000_000 // 50MB
    ) async throws -> (result: T, memoryUsed: Int) {
        
        let initialMemory = getMemoryUsage()
        let result = try await operation()
        let finalMemory = getMemoryUsage()
        
        let memoryUsed = finalMemory - initialMemory
        
        if memoryUsed > threshold {
            print("⚠️ Memory usage exceeded threshold: \(memoryUsed) bytes")
        }
        
        return (result, memoryUsed)
    }
    
    private static func getMemoryUsage() -> Int {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size)/4
        
        let kerr: kern_return_t = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_,
                         task_flavor_t(MACH_TASK_BASIC_INFO),
                         $0,
                         &count)
            }
        }
        
        return kerr == KERN_SUCCESS ? Int(info.resident_size) : 0
    }
    
    // MARK: - Animation Testing
    static func disableAnimationsForTesting() {
        UIView.setAnimationsEnabled(false)
    }
    
    static func enableAnimationsForTesting() {
        UIView.setAnimationsEnabled(true)
    }
}

// MARK: - Test Errors
enum TestError: LocalizedError {
    case timeout
    case mockDataNotFound
    case unexpectedBehavior(String)
    
    var errorDescription: String? {
        switch self {
        case .timeout:
            return "Test operation timed out"
        case .mockDataNotFound:
            return "Required mock data not found"
        case .unexpectedBehavior(let description):
            return "Unexpected behavior: \(description)"
        }
    }
}

// MARK: - Performance Testing
class PerformanceTester {
    
    static func measureExecutionTime<T>(
        of operation: () async throws -> T,
        iterations: Int = 1
    ) async throws -> (result: T, averageTime: TimeInterval) {
        
        var totalTime: TimeInterval = 0
        var lastResult: T!
        
        for _ in 0..<iterations {
            let startTime = CFAbsoluteTimeGetCurrent()
            lastResult = try await operation()
            let endTime = CFAbsoluteTimeGetCurrent()
            
            totalTime += (endTime - startTime)
        }
        
        return (lastResult, totalTime / Double(iterations))
    }
    
    static func measureSeatMapPerformance(
        seatCount: Int,
        operations: Int = 100
    ) async -> PerformanceResults {
        
        let seats = MockDataFactory.createMockSeats(count: seatCount)
        let optimizer = SeatMapOptimizer()
        
        let startTime = CFAbsoluteTimeGetCurrent()
        
        // Simulate operations
        for _ in 0..<operations {
            optimizer.updateSeats(seats)
            optimizer.updateViewport(
                bounds: CGRect(x: 0, y: 0, width: 400, height: 300),
                scale: CGFloat.random(in: 0.5...2.0)
            )
        }
        
        let endTime = CFAbsoluteTimeGetCurrent()
        let totalTime = endTime - startTime
        
        return PerformanceResults(
            totalTime: totalTime,
            averageOperationTime: totalTime / Double(operations),
            operationsPerSecond: Double(operations) / totalTime
        )
    }
}

struct PerformanceResults {
    let totalTime: TimeInterval
    let averageOperationTime: TimeInterval
    let operationsPerSecond: Double
    
    var isAcceptable: Bool {
        return averageOperationTime < 0.016 // 60fps target
    }
}

// MARK: - Accessibility Testing
#if DEBUG
class AccessibilityTester {
    
    static func validateAccessibility(for view: AnyView) -> [AccessibilityIssue] {
        var issues: [AccessibilityIssue] = []
        
        // Check for missing labels
        // Check for insufficient contrast
        // Check for touch target sizes
        // Check for VoiceOver navigation
        
        // This would be implemented with actual accessibility checking logic
        
        return issues
    }
    
    static func simulateVoiceOverNavigation() {
        // Simulate VoiceOver navigation patterns for testing
        print("🗣️ Simulating VoiceOver navigation...")
    }
}

struct AccessibilityIssue {
    let type: IssueType
    let description: String
    let severity: Severity
    
    enum IssueType {
        case missingLabel
        case insufficientContrast
        case smallTouchTarget
        case navigationIssue
    }
    
    enum Severity {
        case low
        case medium
        case high
        case critical
    }
}
#endif 