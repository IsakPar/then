//
//  TicketsViewModel.swift
//  LML
//
//  ViewModel for tickets business logic
//  Updated to use production data services with proper error handling
//

import SwiftUI
import Combine

// MARK: - Tickets View Model
@MainActor
class TicketsViewModel: ObservableObject {
    @Published var tickets: [Ticket] = []
    @Published var isLoading = false
    @Published var showingSignIn = false
    @Published var showingSignUp = false
    @Published var selectedTicket: Ticket?
    @Published var errorMessage: String?
    
    private let authManager: AuthManager
    private let dataService = DataService.shared
    private var cancellables = Set<AnyCancellable>()
    
    init(authManager: AuthManager) {
        self.authManager = authManager
        setupObservers()
        loadTickets()
        
        // Debug logging to understand auth state
        print("🔍 TicketsViewModel: Initialized with authState: \(authManager.authState)")
    }
    
    // MARK: - Computed Properties
    
    var authState: AuthState {
        authManager.authState
    }
    
    var currentUser: User? {
        authState.user
    }
    
    var ticketStats: TicketStats {
        TicketStats(tickets: tickets)
    }
    
    var sortedTickets: [Ticket] {
        tickets.sorted { $0.showDate < $1.showDate }
    }
    
    var hasTickets: Bool {
        !tickets.isEmpty
    }
    
    // MARK: - Actions
    
    func showSignIn() {
        showingSignIn = true
    }
    
    func showSignUp() {
        showingSignUp = true
    }
    
    func selectTicket(_ ticket: Ticket) {
        selectedTicket = ticket
    }
    
    func refreshTickets() async {
        loadTickets()
    }
    
    func authenticateWithBiometric() {
        Task {
            do {
                try await authManager.authenticateWithBiometric()
            } catch {
                await MainActor.run {
                    errorMessage = "Biometric authentication failed: \(error.localizedDescription)"
                }
            }
        }
    }
    
    func browseShows() {
        // TODO: Navigate to shows tab or home
        print("Navigate to browse shows")
    }
    
    // MARK: - Data Loading
    
    func loadTickets() {
        Task {
            await MainActor.run {
                isLoading = true
                errorMessage = nil
            }
            
            do {
                let fetchedTickets = try await dataService.getUserTickets()
                
                await MainActor.run {
                    self.tickets = fetchedTickets
                    self.isLoading = false
                    print("✅ Loaded \(fetchedTickets.count) tickets")
                }
                
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    
                    // Handle different error types appropriately
                    switch error {
                    case APIError.unauthorized:
                        self.errorMessage = "Session expired. Please sign in again."
                        // Could trigger sign out here
                        
                    case DataError.networkUnavailable:
                        self.errorMessage = "Network unavailable. Showing cached tickets."
                        
                    case APIError.networkError(let message):
                        self.errorMessage = "Network error: \(message)"
                        
                    default:
                        self.errorMessage = "Failed to load tickets: \(error.localizedDescription)"
                    }
                    
                    print("❌ Failed to load tickets: \(error)")
                }
            }
        }
    }
    
    // MARK: - Private Methods
    
    private func setupObservers() {
        authManager.$authState
            .sink { [weak self] newState in
                self?.handleAuthStateChange(newState)
            }
            .store(in: &cancellables)
    }
    
    private func handleAuthStateChange(_ newState: AuthState) {
        switch newState {
        case .authenticated, .guest:
            loadTickets()
        case .notAuthenticated:
            tickets = []
        case .error(let message):
            errorMessage = message
        default:
            break
        }
    }
}

// MARK: - Ticket Stats Model
struct TicketStats {
    let upcoming: Int
    let today: Int
    let past: Int
    let total: Int
    
    init(tickets: [Ticket]) {
        self.upcoming = tickets.filter { $0.status == .upcoming }.count
        self.today = tickets.filter { $0.status == .today }.count
        self.past = tickets.filter { $0.status == .past }.count
        self.total = tickets.count
    }
}

// MARK: - Ticket Model
struct Ticket: Identifiable, Equatable, Codable {
    let id: String
    let showName: String
    let venueName: String
    let showDate: Date
    let showTime: String
    let seatInfo: String
    let totalPrice: Int
    let status: TicketStatus
    let bookingReference: String
}

// MARK: - Ticket Status
enum TicketStatus: String, CaseIterable, Codable {
    case upcoming
    case today
    case past
    case cancelled
} 