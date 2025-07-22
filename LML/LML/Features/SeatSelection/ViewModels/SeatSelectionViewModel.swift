//
//  SeatSelectionViewModel.swift
//  Last Minute Live
//
//  View model for SeatSelectionView managing seat selection logic
//  Implements local-first seat map caching, real-time updates, and reservation timers
//

import Foundation
import Combine
import SwiftUI

@MainActor
class SeatSelectionViewModel: ObservableObject {
    
    // MARK: - Published Properties
    
    @Published var seatMapData: SeatMapData?
    @Published var selectedSeats: Set<String> = []
    @Published var isLoading: Bool = false
    @Published var isProcessingReservation: Bool = false
    @Published var hasError: Bool = false
    @Published var errorMessage: String?
    @Published var reservationTimeRemaining: Int = 0
    @Published var showSeatMapInfo: Bool = false
    
    // MARK: - Computed Properties
    
    var totalPrice: Int {
        guard let seatMapData = seatMapData else { return 0 }
        
        return selectedSeats.compactMap { seatId in
            seatMapData.seats.first { $0.id == seatId }
        }.reduce(0) { total, seat in
            total + getSectionPrice(for: seat.section)
        }
    }
    
    var formattedTotalPrice: String {
        let pounds = Double(totalPrice) / 100.0
        return String(format: "£%.2f", pounds)
    }
    
    var formattedTimeRemaining: String {
        let minutes = reservationTimeRemaining / 60
        let seconds = reservationTimeRemaining % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    var selectedSeatsBySection: [(key: String, value: [Seat])] {
        guard let seatMapData = seatMapData else { return [] }
        
        let selectedSeatObjects = selectedSeats.compactMap { seatId in
            seatMapData.seats.first { $0.id == seatId }
        }
        
        let groupedSeats = Dictionary(grouping: selectedSeatObjects) { $0.section }
        return groupedSeats.sorted { $0.key < $1.key }
    }
    
    // MARK: - Private Properties
    
    private var cancellables = Set<AnyCancellable>()
    private let offlineDataManager = OfflineDataManager.shared
    private var apiClient: APIClientProtocol?
    private var reservationTimer: Timer?
    private let reservationDuration: Int = 15 * 60 // 15 minutes
    
    // Real-time updates (WebSocket or polling)
    private var seatUpdateTimer: Timer?
    private let seatUpdateInterval: TimeInterval = 30 // 30 seconds
    
    // MARK: - Initialization
    
    init() {
        setupReservationTimer()
    }
    
    deinit {
        reservationTimer?.invalidate()
        seatUpdateTimer?.invalidate()
    }
    
    // MARK: - Seat Map Loading (Local-First)
    
    func loadSeatMap(for show: Show) async {
        setLoading(true)
        clearError()
        
        // Step 1: Try to load from cache first (local-first principle)
        do {
            if let cachedSeatMap = try await offlineDataManager.getCachedSeatMap(for: show.id) {
                seatMapData = cachedSeatMap
                print("🎭 SeatSelectionViewModel: Loaded seat map from cache for show: \(show.id)")
                
                // Start real-time updates if online
                startRealTimeUpdates(for: show)
                setLoading(false)
                return
            }
        } catch {
            print("🎭 SeatSelectionViewModel: Failed to load cached seat map: \(error)")
        }
        
        // Step 2: Load from API if not in cache
        await loadSeatMapFromAPI(for: show)
    }
    
    private func loadSeatMapFromAPI(for show: Show) async {
        do {
            // Simulate API call - replace with actual implementation
            let freshSeatMapData = try await fetchSeatMapFromAPI(show: show)
            
            // Update local data
            seatMapData = freshSeatMapData
            
            // Cache the fresh data
            try await offlineDataManager.cacheSeatMap(freshSeatMapData, for: show.id)
            
            // Start real-time updates
            startRealTimeUpdates(for: show)
            
            print("🎭 SeatSelectionViewModel: Loaded seat map from API for show: \(show.id)")
            
        } catch {
            handleSeatMapError(error)
        }
        
        setLoading(false)
    }
    
    // MARK: - Seat Selection Logic
    
    func handleSeatTap(_ seat: Seat) {
        // Check if seat is available or already selected
        guard seat.status == .available || selectedSeats.contains(seat.id) else {
            // Provide haptic feedback for unavailable seats
            let impactFeedback = UIImpactFeedbackGenerator(style: .light)
            impactFeedback.impactOccurred()
            return
        }
        
        if selectedSeats.contains(seat.id) {
            // Deselect seat
            selectedSeats.remove(seat.id)
            
            // Stop reservation timer if no seats selected
            if selectedSeats.isEmpty {
                stopReservationTimer()
            }
        } else {
            // Select seat
            selectedSeats.insert(seat.id)
            
            // Start reservation timer if first seat selected
            if selectedSeats.count == 1 {
                startReservationTimer()
            }
            
            // Limit maximum seats (e.g., 8 seats)
            if selectedSeats.count > 8 {
                selectedSeats.removeFirst()
                
                // Show feedback about seat limit
                setError("Maximum 8 seats can be selected")
                
                // Clear error after delay
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    self.clearError()
                }
            }
        }
        
        // Provide haptic feedback for successful selection
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()
        
        // Update seat availability in real-time (optimistic update)
        updateSeatStatus(seat.id, isSelected: selectedSeats.contains(seat.id))
    }
    
    func clearSelection() {
        selectedSeats.removeAll()
        stopReservationTimer()
        
        // Update all seats to deselected state
        guard let seatMapData = seatMapData else { return }
        for seat in seatMapData.seats {
            updateSeatStatus(seat.id, isSelected: false)
        }
    }
    
    // MARK: - Seat Reservation
    
    func reserveSelectedSeats() async throws {
        guard !selectedSeats.isEmpty else {
            throw SeatSelectionError.noSeatsSelected
        }
        
        setProcessingReservation(true)
        
        do {
            // Create reservation request
            let seatIds = Array(selectedSeats)
            let reservationRequest = SeatReservationRequest(
                showId: seatMapData?.showId ?? "",
                seatIds: seatIds,
                reservationTimeMinutes: 15
            )
            
            // Call API to reserve seats
            let response = try await reserveSeatsAPI(request: reservationRequest)
            
            if response.success {
                // Extend reservation timer for payment process
                extendReservationTimer(to: 15 * 60) // 15 minutes for payment
                
                print("🎭 SeatSelectionViewModel: Successfully reserved \(seatIds.count) seats")
            } else {
                throw SeatSelectionError.reservationFailed(response.error ?? "Unknown error")
            }
            
        } catch {
            handleReservationError(error)
            throw error
        }
        
        setProcessingReservation(false)
    }
    
    // MARK: - Real-Time Updates
    
    private func startRealTimeUpdates(for show: Show) {
        // Stop existing timer
        seatUpdateTimer?.invalidate()
        
        // Start polling for seat updates every 30 seconds
        seatUpdateTimer = Timer.scheduledTimer(withTimeInterval: seatUpdateInterval, repeats: true) { [weak self] _ in
            Task {
                await self?.updateSeatAvailability(for: show)
            }
        }
    }
    
    private func updateSeatAvailability(for show: Show) async {
        // Only update if we have current seat map data
        guard let currentSeatMapData = seatMapData else { return }
        
        do {
            // Fetch latest seat availability
            let latestSeatData = try await fetchSeatMapFromAPI(show: show)
            
            // Update only the seat statuses, preserve selections
            var updatedSeats = latestSeatData.seats
            
            // Preserve current selections for seats that are still available
            for (index, seat) in updatedSeats.enumerated() {
                if selectedSeats.contains(seat.id) {
                    // Keep as selected if still available or reserved by us
                    if seat.status == .available || seat.status == .reserved {
                        continue
                    } else {
                        // Seat was taken by someone else, remove from selection
                        selectedSeats.remove(seat.id)
                    }
                }
            }
            
            // Update seat map data
            let updatedSeatMapData = SeatMapData(
                showId: latestSeatData.showId,
                seatMapId: latestSeatData.seatMapId,
                svgContent: latestSeatData.svgContent,
                sections: latestSeatData.sections,
                seats: updatedSeats,
                metadata: latestSeatData.metadata
            )
            
            seatMapData = updatedSeatMapData
            
            // Update cache
            try await offlineDataManager.cacheSeatMap(updatedSeatMapData, for: show.id)
            
        } catch {
            print("🎭 SeatSelectionViewModel: Failed to update seat availability: \(error)")
        }
    }
    
    // MARK: - Reservation Timer Management
    
    private func setupReservationTimer() {
        // Timer updates every second
        reservationTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            
            if self.reservationTimeRemaining > 0 {
                self.reservationTimeRemaining -= 1
            } else {
                self.handleReservationTimeout()
            }
        }
    }
    
    private func startReservationTimer() {
        reservationTimeRemaining = reservationDuration
    }
    
    private func stopReservationTimer() {
        reservationTimeRemaining = 0
    }
    
    func extendReservationTimer() {
        reservationTimeRemaining += 5 * 60 // Add 5 minutes
    }
    
    func extendReservationTimer(to seconds: Int) {
        reservationTimeRemaining = seconds
    }
    
    private func handleReservationTimeout() {
        // Clear selections when timer expires
        clearSelection()
        setError("Seat reservation expired. Please select seats again.")
        
        // Clear error after delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
            self.clearError()
        }
    }
    
    // MARK: - Pricing Logic
    
    func getSectionPrice(for section: String) -> Int {
        guard let seatMapData = seatMapData else { return 0 }
        
        // Find section pricing
        return seatMapData.sections.first { $0.name == section }?.priceInPence ?? 0
    }
    
    func formattedSectionPrice(for section: String) -> String {
        let priceInPence = getSectionPrice(for: section)
        let pounds = Double(priceInPence) / 100.0
        return String(format: "£%.2f", pounds)
    }
    
    // MARK: - UI Actions
    
    func toggleSeatMapInfo() {
        showSeatMapInfo.toggle()
    }
    
    // MARK: - Helper Methods
    
    private func updateSeatStatus(_ seatId: String, isSelected: Bool) {
        guard var seatMapData = seatMapData else { return }
        
        // Find and update seat status optimistically
        if let seatIndex = seatMapData.seats.firstIndex(where: { $0.id == seatId }) {
            // Don't change the actual seat status, just trigger UI update
            // The real status will be updated by real-time polling
        }
    }
    
    // MARK: - Mock API Methods (Replace with real API client)
    
    private func fetchSeatMapFromAPI(show: Show) async throws -> SeatMapData {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
        
        // Generate mock seat map data
        return generateMockSeatMapData(for: show)
    }
    
    private func reserveSeatsAPI(request: SeatReservationRequest) async throws -> ReservationResponse {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
        
        // Simulate success response
        return ReservationResponse(
            success: true,
            reservationId: UUID().uuidString,
            expirationTime: Date().addingTimeInterval(15 * 60),
            totalPrice: totalPrice,
            error: nil
        )
    }
    
    private func generateMockSeatMapData(for show: Show) -> SeatMapData {
        var seats: [Seat] = []
        let sections = ["Orchestra", "Mezzanine", "Balcony"]
        let sectionPricing = [
            SeatSection(id: "orch", name: "Orchestra", priceInPence: 12000, color: "#4CAF50", availableSeats: 150),
            SeatSection(id: "mezz", name: "Mezzanine", priceInPence: 8000, color: "#2196F3", availableSeats: 100),
            SeatSection(id: "balc", name: "Balcony", priceInPence: 5000, color: "#FF9800", availableSeats: 80)
        ]
        
        // Generate seats for each section
        var seatCounter = 1
        
        // Orchestra - 10 rows, 20 seats per row
        for row in 1...10 {
            for seat in 1...20 {
                let status: SeatStatus = Bool.random() ? .available : (Bool.random() ? .booked : .available)
                seats.append(Seat(
                    id: "seat_\(seatCounter)",
                    number: "\(seat)",
                    row: "Row \(row)",
                    section: "Orchestra",
                    status: status,
                    position: SeatPosition(row: row - 1, column: seat - 1),
                    priceInPence: 12000
                ))
                seatCounter += 1
            }
        }
        
        // Mezzanine - 8 rows, 15 seats per row
        for row in 1...8 {
            for seat in 1...15 {
                let status: SeatStatus = Bool.random() ? .available : (Bool.random() ? .booked : .available)
                seats.append(Seat(
                    id: "seat_\(seatCounter)",
                    number: "\(seat)",
                    row: "Row \(row)",
                    section: "Mezzanine",
                    status: status,
                    position: SeatPosition(row: row + 10, column: seat + 2), // Offset for visual separation
                    priceInPence: 8000
                ))
                seatCounter += 1
            }
        }
        
        // Balcony - 6 rows, 12 seats per row
        for row in 1...6 {
            for seat in 1...12 {
                let status: SeatStatus = Bool.random() ? .available : (Bool.random() ? .booked : .available)
                seats.append(Seat(
                    id: "seat_\(seatCounter)",
                    number: "\(seat)",
                    row: "Row \(row)",
                    section: "Balcony",
                    status: status,
                    position: SeatPosition(row: row + 20, column: seat + 4), // Offset for visual separation
                    priceInPence: 5000
                ))
                seatCounter += 1
            }
        }
        
        let metadata = SeatMapMetadata(
            venueId: show.venueId,
            venueName: show.venueName,
            totalCapacity: seats.count,
            availableSeats: seats.filter { $0.status == .available }.count,
            lastUpdated: Date()
        )
        
        return SeatMapData(
            showId: show.id,
            seatMapId: show.seatMapId,
            svgContent: nil, // Could include SVG content for complex layouts
            sections: sectionPricing,
            seats: seats,
            metadata: metadata
        )
    }
    
    // MARK: - Error Handling
    
    private func handleSeatMapError(_ error: Error) {
        setError("Failed to load seat map. Please try again.")
        hasError = true
        print("🎭 SeatSelectionViewModel: Seat map error: \(error)")
    }
    
    private func handleReservationError(_ error: Error) {
        if let seatError = error as? SeatSelectionError {
            switch seatError {
            case .noSeatsSelected:
                setError("Please select seats before continuing")
            case .reservationFailed(let message):
                setError("Reservation failed: \(message)")
            case .seatUnavailable:
                setError("One or more selected seats are no longer available")
            }
        } else {
            setError("Failed to reserve seats. Please try again.")
        }
    }
    
    private func setLoading(_ loading: Bool) {
        isLoading = loading
    }
    
    private func setProcessingReservation(_ processing: Bool) {
        isProcessingReservation = processing
    }
    
    private func setError(_ message: String) {
        errorMessage = message
    }
    
    private func clearError() {
        errorMessage = nil
        hasError = false
    }
}

// MARK: - Seat Selection Errors

enum SeatSelectionError: LocalizedError {
    case noSeatsSelected
    case reservationFailed(String)
    case seatUnavailable
    
    var errorDescription: String? {
        switch self {
        case .noSeatsSelected:
            return "No seats selected"
        case .reservationFailed(let message):
            return "Reservation failed: \(message)"
        case .seatUnavailable:
            return "Seat no longer available"
        }
    }
} 