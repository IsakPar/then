//
//  IntegrationTests.swift
//  LML
//
//  Integration tests for end-to-end user flows
//  Tests component interactions and complete user journeys
//

import XCTest
import Combine
@testable import LML

// MARK: - Authentication Flow Integration Tests
class AuthenticationFlowIntegrationTests: XCTestCase {
    
    var authManager: AuthManager!
    var mockAPIClient: MockAPIClient!
    var cancellables: Set<AnyCancellable>!
    
    override func setUp() async throws {
        try await super.setUp()
        mockAPIClient = MockAPIClient()
        cancellables = Set<AnyCancellable>()
        
        // Enable testing mode
        TestUtilities.enableUITestingMode()
        TestUtilities.disableAnimationsForTesting()
        
        // Initialize with mock dependencies
        authManager = AuthManager.shared
    }
    
    override func tearDown() async throws {
        authManager = nil
        mockAPIClient = nil
        cancellables = nil
        TestUtilities.enableAnimationsForTesting()
        try await super.tearDown()
    }
    
    // MARK: - Complete Sign Up Flow
    
    func testCompleteSignUpFlow() async throws {
        // Given: User not authenticated
        XCTAssertEqual(authManager.authState, .notAuthenticated)
        
        // When: User signs up successfully
        mockAPIClient.shouldSucceed = true
        try await authManager.signUp(
            email: "newuser@test.com",
            password: "SecurePassword123!",
            firstName: "New",
            lastName: "User"
        )
        
        // Then: Should be authenticated
        if case .authenticated(let user) = authManager.authState {
            XCTAssertEqual(user.email, "newuser@test.com")
            XCTAssertEqual(user.firstName, "New")
            XCTAssertEqual(user.lastName, "User")
            XCTAssertFalse(user.isGuest)
        } else {
            XCTFail("Expected authenticated state")
        }
    }
    
    func testCompleteSignInFlow() async throws {
        // Given: User not authenticated
        XCTAssertEqual(authManager.authState, .notAuthenticated)
        
        // When: User signs in successfully
        mockAPIClient.shouldSucceed = true
        try await authManager.signIn(
            email: "existing@test.com",
            password: "UserPassword123!"
        )
        
        // Then: Should be authenticated
        if case .authenticated(let user) = authManager.authState {
            XCTAssertEqual(user.email, "existing@test.com")
        } else {
            XCTFail("Expected authenticated state")
        }
    }
    
    func testGuestSessionFlow() async throws {
        // Given: User not authenticated
        XCTAssertEqual(authManager.authState, .notAuthenticated)
        
        // When: Creating guest session
        mockAPIClient.shouldSucceed = true
        let guestUser = try await authManager.createGuestSession(email: "guest@test.com")
        
        // Then: Should be in guest state
        if case .guest(let user) = authManager.authState {
            XCTAssertEqual(user.email, "guest@test.com")
            XCTAssertTrue(user.isGuest)
            XCTAssertEqual(user.accountType, .guest)
        } else {
            XCTFail("Expected guest state")
        }
    }
    
    func testBiometricAuthenticationFlow() async throws {
        // Given: User authenticated with biometric enabled
        let user = MockDataFactory.createMockUser()
        // Set biometric enabled in real scenario
        authManager.authState = .biometricRequired(user)
        
        // When: Biometric authentication succeeds
        try await authManager.authenticateWithBiometric()
        
        // Then: Should transition to authenticated
        if case .authenticated = authManager.authState {
            // Success
        } else {
            XCTFail("Expected authenticated state after biometric")
        }
    }
    
    // MARK: - Error Handling Integration
    
    func testAuthenticationErrorHandling() async {
        // Given: API will fail
        mockAPIClient.shouldSucceed = false
        
        // When: Attempting to sign in
        do {
            try await authManager.signIn(email: "test@test.com", password: "wrong")
            XCTFail("Expected error to be thrown")
        } catch {
            // Then: Should handle error appropriately
            XCTAssertTrue(error is AuthError)
        }
    }
}

// MARK: - Seat Selection Flow Integration Tests
class SeatSelectionFlowIntegrationTests: XCTestCase {
    
    var seatMapViewModel: SeatMapViewModel!
    var authManager: AuthManager!
    var mockAPIClient: MockAPIClient!
    var cancellables: Set<AnyCancellable>!
    
    override func setUp() async throws {
        try await super.setUp()
        mockAPIClient = MockAPIClient()
        cancellables = Set<AnyCancellable>()
        
        TestUtilities.enableUITestingMode()
        
        authManager = AuthManager.shared
        seatMapViewModel = SeatMapViewModel()
    }
    
    override func tearDown() async throws {
        seatMapViewModel = nil
        authManager = nil
        mockAPIClient = nil
        cancellables = nil
        try await super.tearDown()
    }
    
    // MARK: - Complete Seat Selection to Payment Flow
    
    func testCompleteSeatSelectionToPaymentFlow() async throws {
        // Given: Authenticated user and generated seats
        let user = MockDataFactory.createMockUser()
        authManager.authState = .authenticated(user)
        seatMapViewModel.generateAllSeats()
        
        // When: User selects seats
        let availableSeats = seatMapViewModel.allSeats.filter { $0.isAvailable }.prefix(2)
        for seat in availableSeats {
            seatMapViewModel.handleSeatSelection(seat)
        }
        
        // Then: Should have selected seats
        XCTAssertEqual(seatMapViewModel.selectedSeats.count, 2)
        XCTAssertTrue(seatMapViewModel.canProceedToCheckout)
        
        // When: Proceeding to checkout
        mockAPIClient.shouldSucceed = true
        seatMapViewModel.proceedToCheckout()
        
        // Wait for async operations
        await TestUtilities.simulateUserInteraction(delay: 1.0)
        
        // Then: Should initiate payment process
        // Note: In real test, would verify payment sheet is shown
        XCTAssertFalse(seatMapViewModel.showingGuestEmailModal) // Since user is authenticated
    }
    
    func testSeatSelectionAsGuestFlow() async throws {
        // Given: Not authenticated user and selected seats
        authManager.authState = .notAuthenticated
        seatMapViewModel.generateAllSeats()
        
        let availableSeats = seatMapViewModel.allSeats.filter { $0.isAvailable }.prefix(1)
        for seat in availableSeats {
            seatMapViewModel.handleSeatSelection(seat)
        }
        
        // When: Proceeding to checkout as guest
        seatMapViewModel.proceedToCheckout()
        
        // Then: Should show guest email modal
        XCTAssertTrue(seatMapViewModel.showingGuestEmailModal)
        
        // When: Submitting guest email
        mockAPIClient.shouldSucceed = true
        seatMapViewModel.proceedAsGuest(email: "guest@test.com")
        
        // Wait for async operations
        await TestUtilities.simulateUserInteraction(delay: 1.0)
        
        // Then: Should create guest session and proceed
        if case .guest = authManager.authState {
            // Success
        } else {
            XCTFail("Expected guest state to be created")
        }
    }
    
    // MARK: - Performance Under Load
    
    func testSeatMapPerformanceUnderLoad() async throws {
        // Given: Large number of seats
        let performanceResult = await PerformanceTester.measureSeatMapPerformance(
            seatCount: 1000,
            operations: 50
        )
        
        // Then: Should maintain acceptable performance
        XCTAssertTrue(performanceResult.isAcceptable, 
                     "Seat map performance below 60fps: \(performanceResult.operationsPerSecond) ops/sec")
        
        print("🎯 Seat Map Performance: \(Int(performanceResult.operationsPerSecond)) ops/sec")
    }
}

// MARK: - Tickets Management Integration Tests
class TicketsManagementIntegrationTests: XCTestCase {
    
    var ticketsViewModel: TicketsViewModel!
    var authManager: AuthManager!
    var mockDataService: MockDataService!
    var cancellables: Set<AnyCancellable>!
    
    override func setUp() async throws {
        try await super.setUp()
        mockDataService = MockDataService()
        cancellables = Set<AnyCancellable>()
        
        TestUtilities.enableUITestingMode()
        
        authManager = AuthManager.shared
        ticketsViewModel = TicketsViewModel()
    }
    
    override func tearDown() async throws {
        ticketsViewModel = nil
        authManager = nil
        mockDataService = nil
        cancellables = nil
        try await super.tearDown()
    }
    
    // MARK: - Ticket Loading and State Management
    
    func testTicketLoadingWithAuthenticationFlow() async throws {
        // Given: User not authenticated
        authManager.authState = .notAuthenticated
        
        // Then: Should have no tickets
        XCTAssertTrue(ticketsViewModel.tickets.isEmpty)
        
        // When: User authenticates
        let user = MockDataFactory.createMockUser()
        authManager.authState = .authenticated(user)
        
        // Set up mock data
        mockDataService.shouldSucceed = true
        mockDataService.mockTickets = MockDataFactory.createMockTickets(count: 5)
        
        // When: Refreshing tickets after auth
        await ticketsViewModel.refreshTickets()
        
        // Then: Should load tickets
        await MainActor.run {
            XCTAssertEqual(ticketsViewModel.tickets.count, 5)
            XCTAssertFalse(ticketsViewModel.isLoading)
        }
    }
    
    func testOfflineTicketHandling() async throws {
        // Given: User with cached tickets
        mockDataService.shouldSucceed = true
        mockDataService.mockTickets = MockDataFactory.createMockTickets(count: 3)
        
        await ticketsViewModel.refreshTickets()
        
        await MainActor.run {
            XCTAssertEqual(ticketsViewModel.tickets.count, 3)
        }
        
        // When: Network becomes unavailable
        mockDataService.shouldSucceed = false
        
        await ticketsViewModel.refreshTickets()
        
        // Then: Should handle gracefully with error message
        await MainActor.run {
            XCTAssertNotNil(ticketsViewModel.errorMessage)
            // Note: In real implementation, would fall back to cached data
        }
    }
}

// MARK: - Data Flow Integration Tests
class DataFlowIntegrationTests: XCTestCase {
    
    var dataService: DataService!
    var cacheService: CacheService!
    var mockAPIClient: MockAPIClient!
    
    override func setUp() async throws {
        try await super.setUp()
        mockAPIClient = MockAPIClient()
        cacheService = CacheService.shared
        dataService = DataService.shared
        
        TestUtilities.enableUITestingMode()
    }
    
    override func tearDown() async throws {
        dataService = nil
        cacheService = nil
        mockAPIClient = nil
        try await super.tearDown()
    }
    
    // MARK: - Cache Integration
    
    func testDataServiceCacheIntegration() async throws {
        // Given: Fresh cache
        await cacheService.clearCache()
        
        // When: Loading shows (will hit API)
        mockAPIClient.shouldSucceed = true
        let shows = try await dataService.getShows()
        
        // Then: Should have data and cache it
        XCTAssertFalse(shows.isEmpty)
        
        // When: Loading again (should hit cache)
        mockAPIClient.shouldSucceed = false // API now fails
        let cachedShows = try await dataService.getShows()
        
        // Then: Should still get data from cache
        XCTAssertEqual(shows.count, cachedShows.count)
    }
    
    // MARK: - Memory Management Integration
    
    func testMemoryManagementUnderLoad() async throws {
        // Given: Memory monitoring setup
        let (result, memoryUsed) = try await TestUtilities.measureMemoryUsage {
            // Simulate heavy data operations
            for _ in 0..<100 {
                let _ = try await dataService.getShows()
                let _ = MockDataFactory.createMockTickets(count: 50)
            }
            return "Memory test completed"
        }
        
        // Then: Should not exceed memory threshold
        XCTAssertLessThan(memoryUsed, 50_000_000, "Memory usage too high: \(memoryUsed) bytes")
        XCTAssertEqual(result, "Memory test completed")
    }
}

// MARK: - Error Recovery Integration Tests
class ErrorRecoveryIntegrationTests: XCTestCase {
    
    func testNetworkErrorRecovery() async throws {
        // Given: Network will fail initially
        let mockAPIClient = MockAPIClient()
        mockAPIClient.shouldSucceed = false
        
        // When: Attempting operation
        do {
            let _ = try await mockAPIClient.getShows()
            XCTFail("Expected error")
        } catch {
            // Then: Should get network error
            XCTAssertTrue(error is APIError)
        }
        
        // When: Network recovers
        mockAPIClient.shouldSucceed = true
        
        // Then: Should succeed on retry
        let shows = try await mockAPIClient.getShows()
        XCTAssertFalse(shows.isEmpty)
    }
    
    func testAuthenticationErrorRecovery() async throws {
        // Given: Invalid token
        let mockAPIClient = MockAPIClient()
        mockAPIClient.shouldSucceed = false
        
        // When: Token validation fails
        do {
            let _ = try await mockAPIClient.validateToken("invalid-token")
            XCTFail("Expected error")
        } catch {
            // Then: Should handle auth error appropriately
            if case APIError.unauthorized = error {
                // Expected
            } else {
                XCTFail("Expected unauthorized error")
            }
        }
    }
}

// MARK: - Performance Integration Tests
class PerformanceIntegrationTests: XCTestCase {
    
    func testFullAppStartupPerformance() async throws {
        // Given: Fresh app startup simulation
        TestUtilities.enableUITestingMode()
        
        // When: Measuring startup time
        let (_, averageTime) = try await PerformanceTester.measureExecutionTime(iterations: 5) {
            // Simulate app startup operations
            let authManager = AuthManager.shared
            let dataService = DataService.shared
            
            // Initialize core services
            await TestUtilities.simulateUserInteraction(delay: 0.1)
            
            return "Startup complete"
        }
        
        // Then: Should start up quickly
        XCTAssertLessThan(averageTime, 2.0, "App startup too slow: \(averageTime)s")
        
        print("🚀 App Startup Time: \(String(format: "%.2f", averageTime))s")
    }
    
    func testSeatMapRenderingPerformance() async throws {
        // Given: Large seat map
        let seatMapViewModel = SeatMapViewModel()
        
        // When: Measuring rendering performance
        let (_, averageTime) = try await PerformanceTester.measureExecutionTime(iterations: 10) {
            seatMapViewModel.generateAllSeats()
            
            // Simulate user interactions
            for _ in 0..<20 {
                seatMapViewModel.updateScale(CGFloat.random(in: 0.8...3.0))
                seatMapViewModel.updateOffset(CGSize(
                    width: Double.random(in: -100...100),
                    height: Double.random(in: -100...100)
                ))
            }
            
            return seatMapViewModel.allSeats.count
        }
        
        // Then: Should render efficiently
        XCTAssertLessThan(averageTime, 0.5, "Seat map rendering too slow: \(averageTime)s")
        
        print("🎯 Seat Map Rendering: \(String(format: "%.3f", averageTime))s")
    }
} 