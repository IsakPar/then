//
//  TicketsViewModel.swift
//  Last Minute Live
//
//  View model for TicketsView managing offline-first ticket access
//  Handles local storage, sync on reconnection, and ticket management
//

import Foundation
import Combine
import SwiftUI
import Network

@MainActor
class TicketsViewModel: ObservableObject {
    
    // MARK: - Published Properties
    
    @Published var tickets: [UserBooking] = []
    @Published var isLoading: Bool = false
    @Published var isOfflineMode: Bool = false
    @Published var errorMessage: String?
    @Published var showOfflineStatus: Bool = false
    @Published var lastSyncText: String = "Never"
    
    // MARK: - Private Properties
    
    private var authManager: AuthManager?
    private var cancellables = Set<AnyCancellable>()
    private let offlineDataManager = OfflineDataManager.shared
    private let networkMonitor = NWPathMonitor()
    private let networkQueue = DispatchQueue(label: "TicketsNetworkMonitor")
    private var apiClient: APIClientProtocol?
    
    // Background sync timer
    private var syncTimer: Timer?
    private let syncInterval: TimeInterval = 5 * 60 // 5 minutes
    
    // MARK: - Initialization
    
    init() {
        setupNetworkMonitoring()
        setupBackgroundSync()
        setupCacheStatusUpdates()
    }
    
    deinit {
        networkMonitor.cancel()
        syncTimer?.invalidate()
    }
    
    // MARK: - Setup Methods
    
    func setAuthManager(_ authManager: AuthManager) {
        self.authManager = authManager
        // Set up API client from auth manager if available
        // self.apiClient = authManager.apiClient
    }
    
    private func setupNetworkMonitoring() {
        networkMonitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                let wasOffline = self?.isOfflineMode ?? false
                self?.isOfflineMode = path.status != .satisfied
                
                // If we just came back online, sync tickets
                if wasOffline && !(self?.isOfflineMode ?? true) {
                    Task {
                        await self?.syncTicketsFromServer()
                    }
                }
            }
        }
        networkMonitor.start(queue: networkQueue)
    }
    
    private func setupBackgroundSync() {
        // Sync tickets every 5 minutes when online
        syncTimer = Timer.scheduledTimer(withTimeInterval: syncInterval, repeats: true) { [weak self] _ in
            Task {
                await self?.backgroundSyncTickets()
            }
        }
    }
    
    private func setupCacheStatusUpdates() {
        // Update cache status every 30 seconds when visible
        Timer.publish(every: 30, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                if self?.showOfflineStatus == true {
                    Task {
                        await self?.updateLastSyncText()
                    }
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Data Loading (Local-First Implementation)
    
    func loadTickets() async {
        setLoading(true)
        clearError()
        
        // Step 1: Load from cache first (local-first principle)
        do {
            if let cachedTickets = try await offlineDataManager.getCachedUserBookings() {
                tickets = cachedTickets.sorted { $0.createdAt > $1.createdAt }
                await updateLastSyncText()
                
                print("🎫 TicketsViewModel: Loaded \(cachedTickets.count) tickets from cache")
                
                // If we have cached data and we're offline, we're done
                if isOfflineMode {
                    setLoading(false)
                    return
                }
            }
        } catch {
            print("🎫 TicketsViewModel: Failed to load cached tickets: \(error)")
        }
        
        // Step 2: Try to sync with server if online
        if !isOfflineMode {
            await syncTicketsFromServer()
        }
        
        setLoading(false)
    }
    
    func refreshTickets() async {
        // Don't refresh if offline
        if isOfflineMode {
            setError("You're offline. Showing locally saved tickets.")
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                self.clearError()
            }
            return
        }
        
        await syncTicketsFromServer()
    }
    
    // MARK: - Server Sync
    
    private func syncTicketsFromServer() async {
        guard !isOfflineMode else { return }
        
        do {
            // Fetch fresh tickets from API
            let freshTickets = try await fetchTicketsFromAPI()
            
            // Update local data
            tickets = freshTickets.sorted { $0.createdAt > $1.createdAt }
            
            // Cache the fresh data
            try await offlineDataManager.cacheUserBookings(freshTickets)
            
            // Clean up expired tickets
            await cleanupExpiredTickets()
            
            // Update sync status
            await updateLastSyncText()
            
            print("🎫 TicketsViewModel: Synced \(freshTickets.count) tickets from server")
            
        } catch {
            handleSyncError(error)
        }
    }
    
    private func backgroundSyncTickets() async {
        // Only sync if online and not currently loading
        guard !isOfflineMode && !isLoading else { return }
        
        await syncTicketsFromServer()
    }
    
    // MARK: - Ticket Management
    
    private func cleanupExpiredTickets() async {
        let currentDate = Date()
        
        // Remove tickets for shows that have already happened
        let validTickets = tickets.filter { ticket in
            // For now, keep all tickets since show data might not be populated
            // TODO: Implement proper date checking when show.date is available
            if let show = ticket.show {
                guard let showDate = DateFormatter.yearMonthDay.date(from: show.date) else {
                    return true // Keep if we can't parse date
                }
                return showDate >= Calendar.current.startOfDay(for: currentDate)
            }
            return true // Keep ticket if no show data available
        }
        
        if validTickets.count != tickets.count {
            tickets = validTickets
            
            // Update cache with cleaned tickets
            do {
                try await offlineDataManager.cacheUserBookings(validTickets)
                print("🎫 TicketsViewModel: Cleaned up \(tickets.count - validTickets.count) expired tickets")
            } catch {
                print("🎫 TicketsViewModel: Failed to update cache after cleanup: \(error)")
            }
        }
    }
    
    // MARK: - QR Code Scanning
    
    func handleScannedQRCode(_ qrCode: String) {
        // Validate and process scanned QR code
        // This could be used for ticket validation or adding tickets
        
        if let ticketData = parseTicketQRCode(qrCode) {
            // Process valid ticket QR code
            print("🔳 TicketsViewModel: Scanned valid ticket QR code: \(ticketData.bookingId)")
        } else {
            setError("Invalid ticket QR code")
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                self.clearError()
            }
        }
    }
    
    private func parseTicketQRCode(_ qrCode: String) -> QRCodeData? {
        guard let data = qrCode.data(using: .utf8) else { return nil }
        
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        
        return try? decoder.decode(QRCodeData.self, from: data)
    }
    
    // MARK: - UI Actions
    
    func toggleOfflineStatus() {
        showOfflineStatus.toggle()
        
        if showOfflineStatus {
            Task {
                await updateLastSyncText()
            }
        }
    }
    
    // MARK: - Cache Status
    
    private func updateLastSyncText() async {
        if let lastSync = offlineDataManager.getLastSyncTime(for: "user_bookings") {
            let formatter = RelativeDateTimeFormatter()
            formatter.dateTimeStyle = .named
            lastSyncText = formatter.localizedString(for: lastSync, relativeTo: Date())
        } else {
            lastSyncText = "Never"
        }
    }
    
    // MARK: - Mock API (Replace with real API client)
    
    private func fetchTicketsFromAPI() async throws -> [UserBooking] {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
        
        // Return mock tickets - replace with actual API call
        return generateMockTickets()
    }
    
    private func generateMockTickets() -> [UserBooking] {
        let currentDate = Date()
        let formatter = ISO8601DateFormatter()
        
        let tickets = [
            UserBooking(
                id: "booking_\(UUID().uuidString.prefix(8))",
                showId: "show_1",
                customerName: "John Doe",
                customerEmail: "john.doe@example.com",
                customerPhone: "+44 7700 900123",
                status: .confirmed,
                totalAmountPence: 24000,
                validationCode: "HAM2024",
                createdAt: formatter.string(from: currentDate.addingTimeInterval(-3600)),
                show: nil, // For mock data, we'll keep these nil
                venue: nil,
                seats: nil
            ),
            UserBooking(
                id: "booking_\(UUID().uuidString.prefix(8))",
                showId: "show_2",
                customerName: "Jane Smith", 
                customerEmail: "jane.smith@example.com",
                customerPhone: nil,
                status: .confirmed,
                totalAmountPence: 8000,
                validationCode: "LK2024",
                createdAt: formatter.string(from: currentDate.addingTimeInterval(-7200)),
                show: nil,
                venue: nil,
                seats: nil
            ),
            UserBooking(
                id: "booking_\(UUID().uuidString.prefix(8))",
                showId: "show_3",
                customerName: "Bob Wilson",
                customerEmail: "bob.wilson@example.com",
                customerPhone: "+44 7700 900456",
                status: .confirmed,
                totalAmountPence: 19000,
                validationCode: "WCK2024",
                createdAt: formatter.string(from: currentDate.addingTimeInterval(-10800)),
                show: nil,
                venue: nil,
                seats: nil
            )
        ]
        
        return tickets
    }
    
    private func generateTicketQRCode(bookingId: String) -> String {
        let qrData = QRCodeData(
            bookingId: bookingId,
            timestamp: Date(),
            checksum: String(bookingId.hashValue)
        )
        
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        
        if let jsonData = try? encoder.encode(qrData),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            return jsonString
        }
        
        return bookingId // Fallback
    }
    
    // MARK: - Error Handling
    
    private func handleSyncError(_ error: Error) {
        if isOfflineMode {
            setError("You're offline. Showing locally saved tickets.")
        } else {
            setError("Failed to sync tickets. Please try again.")
        }
        print("🎫 TicketsViewModel: Sync error: \(error)")
        
        // Auto-clear error after delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
            self.clearError()
        }
    }
    
    private func setLoading(_ loading: Bool) {
        isLoading = loading
    }
    
    private func setError(_ message: String) {
        errorMessage = message
    }
    
    private func clearError() {
        errorMessage = nil
    }
}

// MARK: - Supporting Models

// MARK: - Date Formatter Extension

private extension DateFormatter {
    static let yearMonthDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
} 