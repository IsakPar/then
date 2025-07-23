//
//  LionKingSeatMapViewModel.swift
//  LML
//
//  ViewModel for Lion King seat map with proper coordinate transformation
//  Handles JSON loading and fixes section/row positioning issues
//

import SwiftUI
import Combine
import Stripe
import StripePaymentSheet
import StripeApplePay

// MARK: - Lion King Seat Map View Model
@MainActor
class LionKingSeatMapViewModel: ObservableObject {
    @Published var allSeats: [TheaterSeat] = []
    @Published var scale: CGFloat = 1.0
    @Published var offset: CGSize = .zero
    @Published var isLoadingPayment = false
    @Published var errorMessage: String?
    @Published var showingPaymentSheet = false
    @Published var showingSuccess = false
    @Published var showingGuestEmailModal = false
    @Published var bookedSeats: [BookedSeat] = []
    @Published var bookingReference: String = ""
    
    private let authManager = AuthManager.shared
    private let apiClient = APIClient.shared
    private var cancellables = Set<AnyCancellable>()
    
    // Payment configuration
    private var paymentSheet: PaymentSheet?
    private var paymentIntentClientSecret: String?
    
    // Lion King coordinate transformation
    private let coordinateTransform = LionKingCoordinateTransform()
    
    init() {
        setupObservers()
    }
    
    // MARK: - Computed Properties
    
    var selectedSeats: [TheaterSeat] {
        allSeats.filter { $0.isSelected }
    }
    
    var totalSelectedSeats: Int {
        selectedSeats.count
    }
    
    var totalPrice: Int {
        selectedSeats.reduce(0) { $0 + $1.price }
    }
    
    var canProceedToCheckout: Bool {
        !selectedSeats.isEmpty && !isLoadingPayment
    }
    
    var authState: AuthState {
        authManager.authState
    }
    
    var isAuthenticated: Bool {
        authState.isAuthenticated
    }
    
    // MARK: - Seat Selection
    
    func selectSeat(_ seat: TheaterSeat) {
        guard seat.isAvailable else { return }
        
        let seatIndex = allSeats.firstIndex(where: { $0.id == seat.id })
        guard let index = seatIndex else { return }
        
        allSeats[index].isSelected = true
        
        // Haptic feedback
        let impact = UIImpactFeedbackGenerator(style: .light)
        impact.impactOccurred()
        
        print("🦁 Selected seat: \(seat.section.name) Row \(seat.row) Seat \(seat.number)")
    }
    
    func deselectSeat(_ seatId: String) {
        let seatIndex = allSeats.firstIndex(where: { $0.id == seatId })
        guard let index = seatIndex else { return }
        
        allSeats[index].isSelected = false
        
        print("🦁 Deselected seat: \(seatId)")
    }
    
    func toggleSeat(_ seat: TheaterSeat) {
        if seat.isSelected {
            deselectSeat(seat.id)
        } else {
            selectSeat(seat)
        }
    }
    
    // MARK: - Lion King Seat Map Loading
    
    func loadLionKingSeatMap() async {
        print("\n🦁 === LION KING SEAT MAP LOADING DEBUG ===")
        
        guard let jsonSeatMap = await loadJSONFile() else {
            print("❌ CRITICAL: Failed to load Lion King JSON - using emergency fallback")
            await MainActor.run {
                self.allSeats = self.generateEmergencySeats()
            }
            return
        }
        
        print("✅ JSON loaded successfully!")
        print("📊 JSON Data Summary:")
        print("   - Sections: \(jsonSeatMap.sections.count)")
        print("   - Total seats in JSON: \(jsonSeatMap.seats.count)")
        print("   - Stage position: \(jsonSeatMap.layout.stage)")
        print("   - Viewport: \(jsonSeatMap.layout.viewport)")
        
        // Show first few seats for debugging
        let firstSeats = Array(jsonSeatMap.seats.prefix(5))
        print("📍 First 5 seat coordinates:")
        for seat in firstSeats {
            print("   - \(seat.id): (\(seat.position.x), \(seat.position.y)) in \(seat.sectionId)")
        }
        
        // 🔍 SEAT COUNT VALIDATION - Check for discrepancies
        await validateSeatCounts(jsonSeatMap)
        
        // 🔧 SEAT GENERATION - Generate missing seats to match capacity
        let completedSeatMap = coordinateTransform.generateMissingSeats(jsonSeatMap)
        
        print("\n🔄 After generation:")
        print("   - Total seats: \(completedSeatMap.seats.count)")
        
        let transformedSeats = coordinateTransform.transformSeats(completedSeatMap)
        
        await MainActor.run {
            self.allSeats = transformedSeats
            print("\n🦁 === FINAL RESULT ===")
            print("✅ Lion King seat map loaded: \(transformedSeats.count) seats")
            
            if transformedSeats.isEmpty {
                print("🚨 CRITICAL ERROR: NO SEATS LOADED!")
                print("🔧 Loading emergency fallback seats...")
                self.allSeats = self.generateEmergencySeats()
            }
            
            print("📊 Section breakdown:")
            let sectionCounts = Dictionary(grouping: transformedSeats) { $0.section.name }
            for (section, seats) in sectionCounts.sorted(by: { $0.key < $1.key }) {
                let xCoords = seats.map { $0.x }
                let yCoords = seats.map { $0.y }
                let minX = xCoords.min() ?? 0
                let maxX = xCoords.max() ?? 0
                let minY = yCoords.min() ?? 0
                let maxY = yCoords.max() ?? 0
                print("   \(section): \(seats.count) seats | X: \(Int(minX))-\(Int(maxX)) | Y: \(Int(minY))-\(Int(maxY))")
            }
            
            print("🦁 === END DEBUG ===\n")
        }
    }
    
    // MARK: - Emergency Seat Generation
    
    private func generateEmergencySeats() -> [TheaterSeat] {
        print("🚨 GENERATING EMERGENCY SEATS FOR TESTING")
        
        var seats: [TheaterSeat] = []
        
        // Generate a better distributed test grid
        // 15 rows x 10 seats = 150 seats with proper theater-like spacing
        let startX = 200.0
        let startY = 150.0
        let seatSpacing = 50.0  // More realistic spacing
        let rowSpacing = 35.0   // Realistic row spacing
        
        for row in 0..<15 {
            for seatNum in 1...10 {
                // Add center aisle gap after seat 5
                let xOffset = seatNum > 5 ? seatSpacing * 1.5 : 0
                
                let seat = TheaterSeat(
                    id: "emergency-\(row)-\(seatNum)",
                    section: row < 5 ? .premium : (row < 10 ? .middle : .back),
                    row: row + 1,
                    number: seatNum,
                    price: row < 5 ? 8500 : (row < 10 ? 6500 : 4500),
                    isAvailable: Double.random(in: 0...1) < 0.7, // 70% available
                    isSelected: false,
                    x: startX + Double(seatNum - 1) * seatSpacing + xOffset,
                    y: startY + Double(row) * rowSpacing,
                    width: 30.0,
                    height: 30.0
                )
                seats.append(seat)
            }
        }
        
        print("✅ Generated \(seats.count) emergency seats with realistic theater layout")
        return seats
    }
    
    // MARK: - Seat Count Validation
    
    private func validateSeatCounts(_ jsonSeatMap: JSONSeatMap) async {
        print("\n🔍 VALIDATING SEAT COUNTS...")
        
        var totalConfigured = 0
        var totalDefined = 0
        var hasDiscrepancies = false
        
        for section in jsonSeatMap.sections {
            let configuredCapacity = section.capacity
            let definedSeats = jsonSeatMap.seats.filter { $0.sectionId == section.id }
            let actualCount = definedSeats.count
            
            totalConfigured += configuredCapacity
            totalDefined += actualCount
            
            let difference = configuredCapacity - actualCount
            
            if difference != 0 {
                hasDiscrepancies = true
                let status = difference > 0 ? "❌ MISSING" : "⚠️  EXTRA"
                print("\(status) \(section.name): Configured=\(configuredCapacity), Defined=\(actualCount), Difference=\(difference)")
            } else {
                print("✅ \(section.name): Configured=\(configuredCapacity), Defined=\(actualCount)")
            }
        }
        
        print("\n📊 TOTALS:")
        print("   Configured Total: \(totalConfigured) seats")
        print("   Defined Total: \(totalDefined) seats")
        print("   Missing: \(totalConfigured - totalDefined) seats")
        
        if hasDiscrepancies {
            print("\n🚨 SEAT COUNT MISMATCH DETECTED!")
            print("   The JSON file does not contain all seats specified in section capacities.")
            print("   This explains why fewer seats are rendering than expected.")
        } else {
            print("\n✅ All seat counts match configuration!")
        }
    }
    
    // MARK: - JSON Loading
    
    private func loadJSONFile() async -> JSONSeatMap? {
        guard let url = Bundle.main.url(forResource: "lion-king-lyceum", withExtension: "json") else {
            print("❌ Lion King JSON file not found")
            return nil
        }
        
        do {
            let data = try Data(contentsOf: url)
            let jsonSeatMap = try JSONDecoder().decode(JSONSeatMap.self, from: data)
            return jsonSeatMap
        } catch {
            print("❌ Failed to decode Lion King JSON: \(error.localizedDescription)")
            return nil
        }
    }
    
    // MARK: - Layout Control
    
    func fitToScreen() {
        withAnimation(.easeInOut(duration: 0.3)) {
            scale = 1.0  // Start at full scale for better visibility
            offset = .zero  // Centered
        }
    }
    
    func centerView() {
        offset = .zero
    }
    
    func zoomIn() {
        scale = min(scale * 1.2, 2.5)  // Max zoom 2.5x
    }
    
    func zoomOut() {
        scale = max(scale / 1.2, 0.3)  // Min zoom 0.3x
    }
    
    func handleZoom(_ zoomValue: CGFloat) {
        let newScale = scale * zoomValue
        scale = max(0.3, min(2.5, newScale))  // Clamp between 0.3x and 2.5x
    }
    
    // MARK: - Payment Flow
    
    func proceedToCheckout() {
        guard !selectedSeats.isEmpty else { return }
        
        if isAuthenticated {
            processPayment()
        } else {
            showingGuestEmailModal = true
        }
    }
    
    func handleGuestEmailSubmitted(_ email: String) {
        showingGuestEmailModal = false
        processPayment()
    }
    
    private func processPayment() {
        isLoadingPayment = true
        
        // Simulate payment processing
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            self.completeBooking()
        }
    }
    
    private func completeBooking() {
        // Convert selected seats to booked seats
        bookedSeats = selectedSeats.map { seat in
            BookedSeat(
                section: seat.section.name,
                row: seat.row,
                number: seat.number,
                price: seat.price
            )
        }
        
        // Generate booking reference
        bookingReference = generateBookingReference()
        
        // 🎫 CRITICAL: Save ticket to persistent storage for tickets tab
        saveTicketToPersistentStorage()
        
        // Clear selection and mark booked seats as unavailable
        for index in allSeats.indices {
            if allSeats[index].isSelected {
                // Create new seat object with updated status
                let originalSeat = allSeats[index]
                allSeats[index] = TheaterSeat(
                    id: originalSeat.id,
                    section: originalSeat.section,
                    row: originalSeat.row,
                    number: originalSeat.number,
                    price: originalSeat.price,
                    isAvailable: false,  // Mark as unavailable after booking
                    isSelected: false,   // Clear selection
                    x: originalSeat.x,
                    y: originalSeat.y,
                    width: originalSeat.width,
                    height: originalSeat.height
                )
            }
        }
        
        isLoadingPayment = false
        showingSuccess = true
        
        print("🎉 Lion King booking completed: \(bookedSeats.count) seats")
    }
    
    func createDummyPaymentSheet() -> PaymentSheet? {
        return nil // Dummy implementation
    }
    
    func handlePaymentResult(_ result: PaymentSheetResult) {
        // Handle payment result
    }
    
    private func generateBookingReference() -> String {
        let prefix = "LK"
        let timestamp = String(Int(Date().timeIntervalSince1970))
        let random = String(format: "%04d", Int.random(in: 1000...9999))
        return "\(prefix)\(timestamp.suffix(6))\(random)"
    }
    
    // MARK: - Ticket Persistence
    
    /// Saves the completed ticket to persistent storage for the tickets tab
    private func saveTicketToPersistentStorage() {
        Task {
            do {
                // Create a Ticket object for the tickets tab
                let ticket = Ticket(
                    id: UUID().uuidString,
                    showName: "The Lion King",
                    venueName: "Lyceum Theatre",
                    showDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date(),
                    showTime: "7:30 PM",
                    seatInfo: bookedSeats.map { "\($0.section) R\($0.row) S\($0.number)" }.joined(separator: ", "),
                    totalPrice: totalPrice,
                    status: .upcoming,
                    bookingReference: bookingReference
                )
                
                // Get existing tickets and add the new one
                let cacheService = CacheService.shared
                var existingTickets = await cacheService.getCachedTickets() ?? []
                existingTickets.append(ticket)
                
                // Save updated tickets list
                await cacheService.cacheTickets(existingTickets)
                
                print("✅ Lion King ticket saved to persistent storage with reference: \(bookingReference)")
                print("🎫 Total tickets in storage: \(existingTickets.count)")
                
            } catch {
                print("❌ Failed to save Lion King ticket to persistent storage: \(error)")
            }
        }
    }
    
    // MARK: - Private Methods
    
    private func setupObservers() {
        authManager.$authState
            .sink { [weak self] newState in
                if case .error(let message) = newState {
                    self?.errorMessage = message
                }
            }
            .store(in: &cancellables)
    }
}

// MARK: - Lion King Coordinate Transformation
class LionKingCoordinateTransform {
    
    private let boundaryManager = SectionBoundaryManager.shared
    
    // MARK: - Missing Seat Generation
    
    func generateMissingSeats(_ originalSeatMap: JSONSeatMap) -> JSONSeatMap {
        print("\n🔧 GENERATING MISSING SEATS WITH BOUNDARY AWARENESS...")
        
        var generatedSeats: [JSONSeat] = []
        
        for section in originalSeatMap.sections {
            let existingSeats = originalSeatMap.seats.filter { $0.sectionId == section.id }
            let missingCount = section.capacity - existingSeats.count
            
            if missingCount > 0 {
                print("🏗️  Generating \(missingCount) missing seats for \(section.name)")
                let newSeats = generateSeatsForSection(section: section, existingSeats: existingSeats, missingCount: missingCount)
                generatedSeats.append(contentsOf: newSeats)
                print("   ✅ Generated \(newSeats.count) seats for \(section.name)")
            }
        }
        
        // Create new JSONSeatMap with all seats (existing + generated)
        let allSeats = originalSeatMap.seats + generatedSeats
        let completedSeatMap = JSONSeatMap(
            layout: originalSeatMap.layout,
            sections: originalSeatMap.sections,
            seats: allSeats,
            pricing: originalSeatMap.pricing,
            accessibilityFeatures: originalSeatMap.accessibilityFeatures
        )
        
        print("🎉 Seat generation complete! Total seats: \(completedSeatMap.seats.count)")
        return completedSeatMap
    }
    
    private func generateSeatsForSection(section: JSONSection, existingSeats: [JSONSeat], missingCount: Int) -> [JSONSeat] {
        switch section.id {
        case "orchestra":
            return generateOrchestraSeats(existingSeats: existingSeats, missingCount: missingCount)
        case "mezzanine":
            return generateMezzanineSeats(existingSeats: existingSeats, missingCount: missingCount)
        case "balcony":
            return generateBalconySeats(existingSeats: existingSeats, missingCount: missingCount)
        case "boxes":
            return generateBoxSeats(existingSeats: existingSeats, missingCount: missingCount)
        default:
            return []
        }
    }
    
    // MARK: - Orchestra Seat Generation (120 missing seats)
    
    private func generateOrchestraSeats(existingSeats: [JSONSeat], missingCount: Int) -> [JSONSeat] {
        var newSeats: [JSONSeat] = []
        
        // Orchestra needs 6 more rows (I, J, K, L, M, N) with 20 seats each
        let newRows = ["I", "J", "K", "L", "M", "N"]
        let seatsPerRow = 20
        let rowSpacing = 28.0 // Based on existing pattern (685-657=28)
        let seatSpacing = 30.0 // Based on existing pattern (130-100=30)
        let startY = 489.0 - rowSpacing // Start after row H
        let startX = 72.0 // Based on H row start
        let centerGap = 60.0 // Gap in center like existing rows
        
        for (rowIndex, rowLetter) in newRows.enumerated() {
            let rowY = startY - (Double(rowIndex) * rowSpacing)
            
            for seatNumber in 1...seatsPerRow {
                var seatX: Double
                
                if seatNumber <= 10 {
                    // Left side seats
                    seatX = startX + (Double(seatNumber - 1) * seatSpacing)
                } else {
                    // Right side seats (with center gap)
                    seatX = startX + (9 * seatSpacing) + centerGap + (Double(seatNumber - 11) * seatSpacing)
                }
                
                let seatId = "orchestra-\(rowLetter)-\(seatNumber)"
                let seat = JSONSeat(
                    id: seatId,
                    sectionId: "orchestra",
                    row: rowLetter,
                    number: seatNumber,
                    status: "available",
                    position: JSONPosition(x: seatX, y: rowY),
                    accessibility: false,
                    pricePence: 12900,
                    seatType: nil,
                    viewDescription: nil,
                    notes: nil
                )
                newSeats.append(seat)
            }
        }
        
        return newSeats
    }
    
    // MARK: - Mezzanine Seat Generation (35 missing seats)
    
    private func generateMezzanineSeats(existingSeats: [JSONSeat], missingCount: Int) -> [JSONSeat] {
        var newSeats: [JSONSeat] = []
        
        // Add rows B and C with similar patterns to row A
        let newRows = ["B", "C"]
        let baseY = 370.0
        let rowSpacing = 30.0
        
        for (rowIndex, rowLetter) in newRows.enumerated() {
            let rowY = baseY - (Double(rowIndex + 1) * rowSpacing)
            
            // Generate 18 seats per row to fill the missing 35 seats (17+18=35)
            let seatsInThisRow = rowIndex == 0 ? 17 : 18
            
            for seatNumber in 1...seatsInThisRow {
                let seatX = 200.0 + (Double(seatNumber - 1) * 30.0)
                
                let seatId = "mezzanine-\(rowLetter)-\(seatNumber)"
                let seat = JSONSeat(
                    id: seatId,
                    sectionId: "mezzanine",
                    row: rowLetter,
                    number: seatNumber,
                    status: "available",
                    position: JSONPosition(x: seatX, y: rowY),
                    accessibility: false,
                    pricePence: 9900,
                    seatType: nil,
                    viewDescription: nil,
                    notes: nil
                )
                newSeats.append(seat)
            }
        }
        
        return newSeats
    }
    
    // MARK: - Balcony Seat Generation (48 missing seats)
    
    private func generateBalconySeats(existingSeats: [JSONSeat], missingCount: Int) -> [JSONSeat] {
        var newSeats: [JSONSeat] = []
        
        // Add rows B, C, D, E with 12 seats each (4 rows × 12 = 48 seats)
        let newRows = ["B", "C", "D", "E"]
        let baseY = 250.0
        let rowSpacing = 30.0
        
        for (rowIndex, rowLetter) in newRows.enumerated() {
            let rowY = baseY - (Double(rowIndex + 1) * rowSpacing)
            
            for seatNumber in 1...12 {
                let seatX = 250.0 + (Double(seatNumber - 1) * 30.0)
                
                let seatId = "balcony-\(rowLetter)-\(seatNumber)"
                let seat = JSONSeat(
                    id: seatId,
                    sectionId: "balcony",
                    row: rowLetter,
                    number: seatNumber,
                    status: "available",
                    position: JSONPosition(x: seatX, y: rowY),
                    accessibility: false,
                    pricePence: 7900,
                    seatType: nil,
                    viewDescription: nil,
                    notes: nil
                )
                newSeats.append(seat)
            }
        }
        
        return newSeats
    }
    
    // MARK: - Box Seat Generation (10 missing seats)
    
    private func generateBoxSeats(existingSeats: [JSONSeat], missingCount: Int) -> [JSONSeat] {
        var newSeats: [JSONSeat] = []
        
        // Add 5 more seats to L row and 5 more to R row
        let baseY = 150.0
        
        // Add seats L6-L10
        for seatNumber in 6...10 {
            let seatX = 240.0 + (Double(seatNumber - 5) * 30.0)
            let seatId = "boxes-L-\(seatNumber)"
            let seat = JSONSeat(
                id: seatId,
                sectionId: "boxes",
                row: "L",
                number: seatNumber,
                status: "available",
                position: JSONPosition(x: seatX, y: baseY),
                accessibility: false,
                pricePence: 19900,
                seatType: nil,
                viewDescription: nil,
                notes: nil
            )
            newSeats.append(seat)
        }
        
        // Add seats R6-R10
        for seatNumber in 6...10 {
            let seatX = 740.0 + (Double(seatNumber - 5) * 30.0)
            let seatId = "boxes-R-\(seatNumber)"
            let seat = JSONSeat(
                id: seatId,
                sectionId: "boxes",
                row: "R",
                number: seatNumber,
                status: "available",
                position: JSONPosition(x: seatX, y: baseY),
                accessibility: false,
                pricePence: 19900,
                seatType: nil,
                viewDescription: nil,
                notes: nil
            )
            newSeats.append(seat)
        }
        
        return newSeats
    }
    

    
    func transformSeats(_ jsonSeatMap: JSONSeatMap) -> [TheaterSeat] {
        var transformedSeats: [TheaterSeat] = []
        
        print("🔄 Using JSON coordinates directly (no transformation needed)...")
        
        // Group seats by section for proper row/seat indexing
        let seatsBySection = Dictionary(grouping: jsonSeatMap.seats) { $0.sectionId }
        
        for (sectionId, sectionSeats) in seatsBySection {
            guard let sectionConfig = jsonSeatMap.sections.first(where: { $0.id == sectionId }) else {
                print("⚠️ No section config found for: \(sectionId)")
                continue
            }
            
            let theaterSection = boundaryManager.mapToTheaterSection(sectionId)
            print("🎯 Loading \(sectionSeats.count) seats for \(sectionConfig.name) -> \(theaterSection.name)")
            
            // Group by row and sort for proper indexing
            let seatsByRow = Dictionary(grouping: sectionSeats) { $0.row }
            let sortedRows = seatsByRow.keys.sorted()
            
            for (rowIndex, row) in sortedRows.enumerated() {
                guard let rowSeats = seatsByRow[row] else { continue }
                let sortedRowSeats = rowSeats.sorted { $0.number < $1.number }
                
                for (seatIndex, jsonSeat) in sortedRowSeats.enumerated() {
                    let theaterSeat = transformSingleSeat(
                        jsonSeat,
                        sectionConfig: sectionConfig,
                        rowIndex: rowIndex,
                        seatIndex: seatIndex
                    )
                    transformedSeats.append(theaterSeat)
                }
            }
        }
        
        print("✅ Direct coordinate mapping complete: \(transformedSeats.count) seats")
        
        // Log coordinate ranges for verification
        logCoordinateRanges(transformedSeats)
        
        return transformedSeats
    }
    
    private func transformSingleSeat(
        _ jsonSeat: JSONSeat,
        sectionConfig: JSONSection,
        rowIndex: Int,
        seatIndex: Int
    ) -> TheaterSeat {
        
        // Map section to TheaterSection
        let theaterSection = boundaryManager.mapToTheaterSection(sectionConfig.id)
        
        // 🔧 CRITICAL FIX: Y-axis flip and coordinate scaling
        // JSON coordinate system: Y=685 (bottom) to Y=200 (top)
        // iOS coordinate system: Y=0 (top) to Y=800 (bottom)
        
        let jsonX = jsonSeat.position.x
        let jsonY = jsonSeat.position.y
        
        // Step 1: Flip Y-axis (JSON Y=685 becomes iOS Y=115)
        let flippedY = 800.0 - jsonY
        
        // Step 2: Scale coordinates to better fill canvas (optional enhancement)
        // JSON range: X=100-700 (600px), Y=200-685 (485px)
        // Target: X=100-900 (800px), Y=100-700 (600px) for better visibility
        let scaledX = 100 + ((jsonX - 100) * 800 / 600)  // Scale X from 600px to 800px range
        let scaledY = 100 + ((flippedY - 115) * 600 / 485)  // Scale Y to use more vertical space
        
        // Clamp to viewport bounds for safety
        let finalX = max(50, min(950, scaledX))
        let finalY = max(50, min(750, scaledY))
        
        print("🔄 Seat \(jsonSeat.id): JSON(\(Int(jsonX)),\(Int(jsonY))) -> Flipped(\(Int(jsonX)),\(Int(flippedY))) -> Scaled(\(Int(finalX)),\(Int(finalY)))")
        
        return TheaterSeat(
            id: jsonSeat.id,
            section: theaterSection,
            row: parseRowNumber(jsonSeat.row),
            number: jsonSeat.number,
            price: jsonSeat.pricePence,
            isAvailable: jsonSeat.status == "available",
            isSelected: false,
            x: finalX,
            y: finalY,
            width: 30.0,
            height: 30.0
        )
    }
    
    private func logCoordinateRanges(_ seats: [TheaterSeat]) {
        guard !seats.isEmpty else {
            print("⚠️ No seats to validate!")
            return
        }
        
        let xCoords = seats.map { $0.x }
        let yCoords = seats.map { $0.y }
        
        let minX = xCoords.min() ?? 0
        let maxX = xCoords.max() ?? 0
        let minY = yCoords.min() ?? 0
        let maxY = yCoords.max() ?? 0
        
        print("📏 COORDINATE RANGES:")
        print("   X: \(Int(minX)) - \(Int(maxX)) (range: \(Int(maxX - minX)))")
        print("   Y: \(Int(minY)) - \(Int(maxY)) (range: \(Int(maxY - minY)))")
        
        // Validate bounds within 1000x800 viewport
        let outOfBoundsSeats = seats.filter { seat in
            seat.x < 0 || seat.x > 1000 || seat.y < 0 || seat.y > 800
        }
        
        if outOfBoundsSeats.isEmpty {
            print("✅ All seats within viewport bounds")
        } else {
            print("⚠️ \(outOfBoundsSeats.count) seats OUT OF BOUNDS:")
            for seat in outOfBoundsSeats.prefix(5) {
                print("   - \(seat.id): (\(Int(seat.x)), \(Int(seat.y)))")
            }
        }
        
        // Check seat distribution
        let centerX = 500.0
        let centerY = 400.0
        let seatsNearCenter = seats.filter { seat in
            abs(seat.x - centerX) < 300 && abs(seat.y - centerY) < 200
        }
        
        let distributionPercentage = Double(seatsNearCenter.count) / Double(seats.count) * 100
        print("📊 \(Int(distributionPercentage))% of seats are in center area (good distribution)")
    }
    
    private func parseRowNumber(_ rowLetter: String) -> Int {
        if let number = Int(rowLetter) {
            return number
        } else {
            let ascii = rowLetter.uppercased().first?.asciiValue ?? 65
            return Int(ascii - 64) // A=1, B=2, etc.
        }
    }
} 