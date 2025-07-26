//
//  SeatMapViewModel.swift
//  LML
//
//  ViewModel for seat map business logic
//  Updated with production services and comprehensive error handling
//

import SwiftUI
import Combine
import Stripe
import StripePaymentSheet
import StripeApplePay

// MARK: - Seat Map View Model
@MainActor
class SeatMapViewModel: ObservableObject {
    @Published var allSeats: [TheaterSeat] = []
    @Published var scale: CGFloat = 1.0
    @Published var offset: CGSize = .zero
    @Published var isLoadingPayment = false
    @Published var errorMessage: String?
    @Published var showingPaymentSheet = false
    @Published var showingSuccess = false
    // showingGuestEmailModal removed - Stripe handles email collection
    @Published var bookedSeats: [BookedSeat] = []
    @Published var bookingReference: String = ""
    
    // Show context for dynamic email content
    private var currentShow: Show?
    private var currentShowTime: ShowTime?
    private var currentVenue: Venue?
    private var selectedDate: String?
    private var selectedTime: String?
    
    private let authManager = AuthManager.shared
    private let apiClient = APIClient.shared
    private var cancellables = Set<AnyCancellable>()
    
    // Payment configuration
    var paymentSheet: PaymentSheet?
    private var paymentIntentClientSecret: String?
    private var currentShowId: String = "hamilton-victoria-palace"
    
    init() {
        setupObservers()
        // Don't generate hardcoded seats - load from JSON instead
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
    
    // MARK: - Display Properties for UI
    
    var selectedSeatsText: String {
        let seats = selectedSeats.map { "\($0.row)\($0.number)" }
        return seats.joined(separator: ", ")
    }
    
    var totalPriceText: String {
        let pounds = Double(totalPrice) / 100.0
        return String(format: "£%.2f", pounds)
    }
    
    // MARK: - Helper Functions for Dynamic Content
    
    private func getShowTitle() -> String {
        return currentShow?.title ?? "Unknown Show"
    }
    
    private func getFormattedDate() -> String {
        if let currentShowTime = currentShowTime {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            return formatter.string(from: currentShowTime.startTime)
        }
        return selectedDate ?? "TBD"
    }
    
    private func getFormattedTime() -> String {
        if let currentShowTime = currentShowTime {
            let formatter = DateFormatter()
            formatter.timeStyle = .short
            return formatter.string(from: currentShowTime.startTime)
        }
        return selectedTime ?? "19:30"
    }
    
    private func getVenueName() -> String {
        return currentVenue?.name ?? currentShow?.venue.name ?? "Unknown Venue"
    }
    
    // MARK: - Seat Selection Actions
    
    func clearSelection() {
        for index in allSeats.indices {
            allSeats[index].isSelected = false
        }
    }
    
    // MARK: - Show Context Management
    
    /// Set the show context for dynamic email content
    func setShowContext(showId: String, showTitle: String, venueName: String, date: String, time: String) {
        self.currentShowId = showId
        self.selectedDate = date
        self.selectedTime = time
        
        // Create venue object from name
        self.currentVenue = Venue(
            id: "venue-1",
            name: venueName,
            address: Address(street: "", city: "", postcode: "", country: ""),
            capacity: 1000,
            accessibility: AccessibilityInfo(
                wheelchairAccessible: true,
                hearingLoopAvailable: true,
                audioDescriptionAvailable: false,
                signLanguageAvailable: false
            ),
            facilities: []
        )
        
        print("🎭 Show context set: \(showTitle) at \(venueName) on \(date) at \(time)")
    }
    
    // MARK: - Seat Selection
    
    func handleSeatSelection(_ seat: TheaterSeat) {
        guard seat.isAvailable else { return }
        
        if let index = allSeats.firstIndex(where: { $0.id == seat.id }) {
            allSeats[index].isSelected.toggle()
            
            // Provide haptic feedback
            let impact = UIImpactFeedbackGenerator(style: .medium)
            impact.impactOccurred()
        }
    }
    
    func clearAllSelections() {
        for index in allSeats.indices {
            allSeats[index].isSelected = false
        }
    }
    
    // MARK: - View Controls
    
    func updateScale(_ newScale: CGFloat) {
        scale = max(0.8, min(3.0, newScale))
    }
    
    func updateOffset(_ newOffset: CGSize) {
        offset = newOffset
    }
    
    func endScaleGesture() {
        // Optional: Add any post-scale gesture cleanup logic here
        // For now, just ensure scale stays within bounds
        scale = max(0.8, min(3.0, scale))
    }
    
    func endDragGesture() {
        // Optional: Add any post-drag gesture cleanup logic here
        // Could add boundary constraints or snapping logic
    }
    
    func fitToScreen() {
        withAnimation(.easeInOut(duration: 0.3)) {
            scale = 0.8  // Zoomed out to see all seats including rightmost ones
            offset = CGSize(width: -200, height: 0)  // Shift seat map left to center all sections
        }
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
    
    func onPaymentCompletion(_ result: PaymentSheetResult) {
        switch result {
        case .completed:
            // Payment successful
            showingPaymentSheet = false
            showingSuccess = true
            print("✅ Payment completed successfully")
            
        case .canceled:
            // User canceled payment
            showingPaymentSheet = false
            print("⚠️ Payment canceled by user")
            
        case .failed(let error):
            // Payment failed
            showingPaymentSheet = false
            errorMessage = "Payment failed: \(error.localizedDescription)"
            print("❌ Payment failed: \(error)")
        }
    }
    
    func proceedToCheckout() {
        guard !selectedSeats.isEmpty else { return }
        
        // Simplified flow: Always go directly to Stripe payment
        // Stripe will handle email collection for guests
        Task {
            await createPaymentIntent()
        }
    }
    
    private func createPaymentIntent() async {
        await MainActor.run {
            isLoadingPayment = true
            errorMessage = nil
        }
        
        do {
            let seatIds = selectedSeats.map { $0.id }
            let response = try await apiClient.createPaymentIntent(
                showId: currentShowId,
                specificSeatIds: seatIds
            )
            
            await MainActor.run {
                self.paymentIntentClientSecret = response.clientSecret
                self.configurePaymentSheet()
                self.isLoadingPayment = false
            }
            
        } catch {
            await MainActor.run {
                self.isLoadingPayment = false
                
                switch error {
                case APIError.unauthorized:
                    self.errorMessage = "Session expired. Please sign in again."
                    
                case APIError.networkError(let message):
                    self.errorMessage = "Network error: \(message)"
                    
                case APIError.validationError:
                    self.errorMessage = "Invalid seat selection. Please try again."
                    
                default:
                    self.errorMessage = "Payment setup failed: \(error.localizedDescription)"
                }
                
                print("❌ Payment intent creation failed: \(error)")
            }
        }
    }
    
    private func configurePaymentSheet() {
        guard let clientSecret = paymentIntentClientSecret else { return }
        
        var configuration = PaymentSheet.Configuration()
        configuration.merchantDisplayName = "Last Minute Live"
        configuration.allowsDelayedPaymentMethods = true
        
        // Configure customer details based on auth state
        if isAuthenticated, let user = authState.user {
            // Authenticated user - prefill their details
            configuration.customer = .init(id: user.id, ephemeralKeySecret: "")
            configuration.defaultBillingDetails.email = user.email
            configuration.defaultBillingDetails.name = "\(user.firstName ?? "") \(user.lastName ?? "")".trimmingCharacters(in: .whitespaces)
            print("💳 Stripe: Prefilling details for authenticated user: \(user.email)")
        } else {
            // Guest checkout - Stripe will collect email
            configuration.customer = nil // No customer for guest checkout
            configuration.defaultBillingDetails.name = "Guest Customer"
            print("💳 Stripe: Configured for guest checkout with email collection")
        }
        
        // Enable Apple Pay with proper merchant configuration
        configuration.applePay = PaymentSheet.ApplePayConfiguration(
            merchantId: "merchant.lml-tickets.com.LML",
            merchantCountryCode: "GB"
        )
        
        // Configure billing details collection - MANDATORY EMAIL FOR THEATRE TICKETS
        configuration.billingDetailsCollectionConfiguration.email = .always  // ✅ Always collect email for ticket delivery
        configuration.billingDetailsCollectionConfiguration.name = .automatic
        configuration.billingDetailsCollectionConfiguration.address = .never
        configuration.billingDetailsCollectionConfiguration.phone = .never
        
        // Configure additional payment options
        configuration.primaryButtonLabel = "Complete Payment"
        
        print("💳 Apple Pay configured with merchant ID: merchant.lml-tickets.com.LML")
        print("💳 Billing details collection: email=ALWAYS (mandatory for theatre tickets), name=automatic")
        
        paymentSheet = PaymentSheet(paymentIntentClientSecret: clientSecret, configuration: configuration)
        showingPaymentSheet = true
    }
    
    func handlePaymentResult(_ result: PaymentSheetResult) {
        switch result {
        case .completed:
            handleSuccessfulPayment()
            
        case .canceled:
            print("Payment canceled by user")
            
        case .failed(let error):
            errorMessage = "Payment failed: \(error.localizedDescription)"
            print("❌ Payment failed: \(error)")
        }
    }
    
    func createDummyPaymentSheet() -> PaymentSheet? {
        // For demo purposes, return existing payment sheet or create a basic one
        return paymentSheet
    }
    
    func handleGuestEmailSubmitted(_ email: String) {
        proceedAsGuest(email: email)
    }
    
    private func handleSuccessfulPayment() {
        // Create booked seats from selected seats
        bookedSeats = selectedSeats.map { seat in
            BookedSeat(
                section: seat.section.displayName,
                row: seat.row,
                number: seat.number,
                price: seat.price
            )
        }
        
        // Generate booking reference
        bookingReference = generateBookingReference()
        
        // Handle guest user after successful payment
        if !isAuthenticated {
            handleGuestPaymentSuccess()
        }
        
        // 🎫 CRITICAL: Save ticket to persistent storage for tickets tab
        saveTicketToPersistentStorage()
        
        // 🎫 CRITICAL: Mark seats as permanently booked
        markSeatsAsBooked(selectedSeats)
        
        // 📧 Send booking confirmation email (uses email from Stripe or guest session)
        sendBookingConfirmationEmail()
        
        // Clear selections and show success
        clearAllSelections()
        showingSuccess = true
        
        print("✅ Payment completed successfully - \(bookedSeats.count) seats booked")
        print("📋 Booking Reference: \(bookingReference)")
        print("🎭 Booked Seats: \(bookedSeats.map { "\($0.section) R\($0.row) S\($0.number)" }.joined(separator: ", "))")
    }
    
    /// Handles guest user setup after successful payment
    private func handleGuestPaymentSuccess() {
        print("💳 Handling guest payment success - creating guest session")
        
        // For guests, we create a session with a placeholder email
        // The actual email confirmation will be sent to the email they provided in Stripe
        Task {
            do {
                // Create guest session with placeholder email
                // In a full implementation, we might extract this from Stripe's payment data
                let placeholderEmail = "guest-\(bookingReference.lowercased())@stripe-checkout.com"
                let _ = try await authManager.createGuestSession(email: placeholderEmail)
                
                print("✅ Guest session created after payment for booking: \(bookingReference)")
            } catch {
                print("⚠️ Could not create guest session after payment: \(error)")
                // Don't fail the whole flow - payment already succeeded
            }
        }
    }
    
    func proceedAsGuest(email: String) {
        // This method is no longer used in the new flow
        // Keeping for compatibility but it shouldn't be called
        print("⚠️ proceedAsGuest called - this shouldn't happen in the new flow")
        
        Task {
            do {
                let _ = try await authManager.createGuestSession(email: email)
                await createPaymentIntent()
            } catch {
                await MainActor.run {
                    errorMessage = "Failed to create guest session: \(error.localizedDescription)"
                }
            }
        }
    }
    
    // MARK: - Seat Map Loading
    
    private func generateHardcodedSeats() -> [TheaterSeat] {
        print("🔧 Generating hardcoded seats as fallback...")
        var seats: [TheaterSeat] = []
        
        for section in TheaterSection.allCases {
            let sectionSeats = generateSeatsForSection(section)
            seats.append(contentsOf: sectionSeats)
        }
        
        print("✅ Generated \(seats.count) hardcoded seats across \(TheaterSection.allCases.count) sections")
        return seats
    }
    
    func generateAllSeats() {
        // 🎭 DYNAMIC: Generate seats based on current show context
        print("🎭 Generating seat map for show: \(currentShowId)")
        
        if currentShowId.contains("hamilton") {
            // Hamilton: Use hardcoded seat generation (502 seats total)
            print("🎭 Loading Hamilton hardcoded seat map...")
            allSeats = generateHardcodedSeats()
            print("✅ Generated \(allSeats.count) hardcoded Hamilton seats")
        } else {
            // Other shows: Load from JSON asynchronously
            print("🎭 Loading JSON seat map for: \(currentShowId)")
            Task {
                await loadSeatMapFromJSON()
            }
            // Use empty seats initially, will be updated when JSON loads
            allSeats = []
        }
        
        // 🔒 Load previously booked seats from storage
        loadBookedSeats()
    }
    
    private func loadSeatMapFromJSON() async {
        print("🎭 Loading seat map from JSON for: \(currentShowId)")
        
        // Determine JSON filename based on show ID
        let filename: String
        if currentShowId.contains("lion-king") || currentShowId.contains("lyceum") {
            filename = "lion-king-lyceum"
        } else if currentShowId.contains("phantom") {
            filename = "phantom-opera-her-majesty"
        } else {
            // Default to Lion King for other shows
            filename = "lion-king-lyceum"
        }
        
        print("🗂️ Loading JSON file: \(filename)")
        
        if let seats = await loadJSONSeats(filename: filename) {
            await MainActor.run {
                self.allSeats = seats
                print("✅ PRIMARY JSON LOAD SUCCESS:")
                print("   📄 File: \(filename)")
                print("   📊 Seats loaded: \(seats.count)")
                print("   🎭 Show: \(currentShowId)")
            }
        } else {
            print("❌ PRIMARY JSON LOAD FAILED: \(filename)")
            print("🔄 Trying Lion King fallback...")
            if let fallbackSeats = await loadJSONSeats(filename: "lion-king-lyceum") {
                await MainActor.run {
                    self.allSeats = fallbackSeats
                    print("✅ FALLBACK JSON LOAD SUCCESS:")
                    print("   📄 File: lion-king-lyceum")
                    print("   📊 Seats loaded: \(fallbackSeats.count)")
                    print("   🎭 Show: \(currentShowId) (using Lion King layout)")
                }
            } else {
                print("❌ FALLBACK JSON LOAD FAILED")
                print("🆘 Using hardcoded Hamilton seats as final fallback")
                // Final fallback to hardcoded seats
                await MainActor.run {
                    self.allSeats = self.generateHardcodedSeats()
                    print("✅ HARDCODED FALLBACK:")
                    print("   📊 Seats generated: \(self.allSeats.count)")
                    print("   🎭 Show: \(currentShowId) (using Hamilton hardcoded)")
                }
            }
        }
    }
    
    private func loadJSONSeats(filename: String) async -> [TheaterSeat]? {
        guard let url = Bundle.main.url(forResource: filename, withExtension: "json") else {
            print("❌ JSON file not found: \(filename)")
            return nil
        }
        
        do {
            let data = try Data(contentsOf: url)
            let jsonSeatMap = try JSONDecoder().decode(JSONSeatMap.self, from: data)
            return convertJSONToTheaterSeats(jsonSeatMap)
        } catch {
            print("❌ Failed to decode JSON \(filename): \(error.localizedDescription)")
            return nil
        }
    }

    
    private func convertJSONToTheaterSeats(_ jsonSeatMap: JSONSeatMap) -> [TheaterSeat] {
        var theaterSeats: [TheaterSeat] = []
        
        for jsonSeat in jsonSeatMap.seats {
            guard let jsonSection = jsonSeatMap.sections.first(where: { $0.id == jsonSeat.sectionId }) else {
                continue
            }
            
            let theaterSection = mapJSONSectionToTheaterSection(jsonSection.id)
            
            // ✅ CORRECT COORDINATE TRANSFORMATION: JSON viewport (1000x800) → Canvas viewport (1000x800)
            let jsonX = jsonSeat.position.x
            let jsonY = jsonSeat.position.y
            
            // Simple Y-axis flip: JSON uses SVG coordinates (Y=0 at top), iOS uses Y=0 at bottom
            // JSON Y=685 (orchestra front) → iOS Y=115 (near bottom)
            // JSON Y=150 (boxes) → iOS Y=650 (near top)
            let finalX = jsonX
            let finalY = 800.0 - jsonY
            
            let theaterSeat = TheaterSeat(
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
            
            theaterSeats.append(theaterSeat)
        }
        
        // 📊 COMPREHENSIVE SEAT LOADING REPORT
        let sectionCounts = Dictionary(grouping: theaterSeats, by: { $0.section })
            .mapValues { $0.count }
        let rowCounts = Dictionary(grouping: theaterSeats, by: { "\($0.section)-Row\($0.row)" })
            .mapValues { $0.count }
        
        print("✅ SEAT CONVERSION COMPLETE:")
        print("   📊 Total seats loaded: \(theaterSeats.count)")
        print("   🎭 Sections: \(sectionCounts)")
        print("   📝 Rows: \(rowCounts.keys.sorted())")
        print("   🎯 Position range: X(\(Int(theaterSeats.map{$0.x}.min() ?? 0))-\(Int(theaterSeats.map{$0.x}.max() ?? 0))) Y(\(Int(theaterSeats.map{$0.y}.min() ?? 0))-\(Int(theaterSeats.map{$0.y}.max() ?? 0)))")
        
        // 🔍 DETAILED ROW ANALYSIS for debugging
        let premiumSeats = theaterSeats.filter { $0.section == .premium }
        let rowData = Dictionary(grouping: premiumSeats, by: { $0.row })
            .mapValues { seats in
                (count: seats.count, yPos: seats.first?.y ?? 0)
            }
            .sorted { $0.key < $1.key }
        
        print("   🎭 Orchestra/Premium rows:")
        for (row, data) in rowData {
            let rowLetter = String(UnicodeScalar(64 + row)!) // 1->A, 2->B, etc.
            print("      Row \(rowLetter): \(data.count) seats at Y=\(Int(data.yPos))")
        }
        
        return theaterSeats
    }
    
    private func mapJSONSectionToTheaterSection(_ sectionId: String) -> TheaterSection {
        switch sectionId.lowercased() {
        case "stalls", "orchestra":
            return .premium
        case "dress-circle", "mezzanine", "circle":
            return .middle
        case "upper-circle", "balcony":
            return .back
        case "boxes":
            return .sideA
        default:
            return .middle
        }
    }
    
    private func parseRowNumber(_ rowLetter: String) -> Int {
        if let number = Int(rowLetter) {
            return number
        } else {
            let ascii = rowLetter.uppercased().first?.asciiValue ?? 65
            return Int(ascii - 64)
        }
    }
    
    // MARK: - Hardcoded Seat Generation (Fallback Only)
    
    private func generateSeatsForSection(_ section: TheaterSection) -> [TheaterSeat] {
        let config = getSectionConfig(section)
        var seats: [TheaterSeat] = []
        
        // Special handling for back section with varying row configurations
        if section == .back {
            // Back section has varying number of seats per row, mimicking Victoria Palace layout
            let backRowConfigs = [
                (seats: 14, startX: 490),  // Row 1
                (seats: 13, startX: 505),  // Row 2
                (seats: 12, startX: 520),  // Row 3
                (seats: 11, startX: 535),  // Row 4
                (seats: 10, startX: 550),  // Row 5
                (seats: 9, startX: 565),   // Row 6
                (seats: 9, startX: 565),   // Row 7
                (seats: 8, startX: 580),   // Row 8
                (seats: 8, startX: 580),   // Row 9
                (seats: 8, startX: 580)    // Row 10
            ]
            
            for (rowIndex, rowConfig) in backRowConfigs.enumerated() {
                let row = rowIndex + 1
                for number in 1...rowConfig.seats {
                    let seat = TheaterSeat(
                        id: "\(section.rawValue)-\(row)-\(number)",
                        section: section,
                        row: row,
                        number: number,
                        price: config.price,
                        isAvailable: true, // ✅ All seats available for booking
                        isSelected: false,
                        x: Double(rowConfig.startX) + Double((number - 1) * config.seatSpacing),
                        y: config.baseY + Double((row - 1) * config.rowSpacing),
                        width: 30.0,
                        height: 30.0
                    )
                    seats.append(seat)
                }
            }
        } else {
            // Standard uniform layout for all other sections
            for row in 1...config.rows {
                for number in 1...config.seatsPerRow {
                    let seat = TheaterSeat(
                        id: "\(section.rawValue)-\(row)-\(number)",
                        section: section,
                        row: row,
                        number: number,
                        price: config.price,
                        isAvailable: true, // ✅ All seats available for booking
                        isSelected: false,
                        x: config.baseX + Double((number - 1) * config.seatSpacing),
                        y: config.baseY + Double((row - 1) * config.rowSpacing),
                        width: 30.0,
                        height: 30.0
                    )
                    seats.append(seat)
                }
            }
        }
        
        return seats
    }
    
    private func getSectionConfig(_ section: TheaterSection) -> SectionConfig {
        switch section {
        case .premium:
            // Premium Section - 150 seats (15 cols × 10 rows) - Front center, best seats
            return SectionConfig(rows: 10, seatsPerRow: 15, baseX: 475, baseY: 190, 
                               seatSpacing: 30, rowSpacing: 28, price: 15000)
        case .sideA:
            // Side Section A - 50 seats (5 cols × 10 rows) - Left side of theater
            return SectionConfig(rows: 10, seatsPerRow: 5, baseX: 290, baseY: 220, 
                               seatSpacing: 30, rowSpacing: 28, price: 5500)
        case .middle:
            // Middle Section - 150 seats (15 cols × 10 rows) - Center, behind premium
            return SectionConfig(rows: 10, seatsPerRow: 15, baseX: 475, baseY: 500, 
                               seatSpacing: 30, rowSpacing: 28, price: 8500)
        case .sideB:
            // Side Section B - 50 seats (5 cols × 10 rows) - Right side of theater  
            return SectionConfig(rows: 10, seatsPerRow: 5, baseX: 970, baseY: 220, 
                               seatSpacing: 30, rowSpacing: 28, price: 5500)
        case .back:
            // Back Section - 102 seats with varying row configuration - Back of theater
            return SectionConfig(rows: 10, seatsPerRow: 12, baseX: 490, baseY: 820, 
                               seatSpacing: 30, rowSpacing: 28, price: 3500)
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
    
    private func generateBookingReference() -> String {
        let letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        let numbers = "0123456789"
        let reference = String((0..<3).compactMap { _ in letters.randomElement() }) +
                       String((0..<6).compactMap { _ in numbers.randomElement() })
        return "LML\(reference)"
    }
    
    // MARK: - Ticket Persistence
    
    /// Saves the completed ticket to persistent storage for the tickets tab
    private func saveTicketToPersistentStorage() {
        Task {
            do {
                // Create a Ticket object for the tickets tab
                let ticket = Ticket(
                    id: UUID().uuidString,
                    showName: "Hamilton", // TODO: Make this dynamic based on current show
                    venueName: "Victoria Palace Theatre", // TODO: Make this dynamic
                    showDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date(),
                    showTime: "7:30 PM", // TODO: Make this dynamic
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
                
                print("✅ Ticket saved to persistent storage with reference: \(bookingReference)")
                print("🎫 Total tickets in storage: \(existingTickets.count)")
                
            } catch {
                print("❌ Failed to save ticket to persistent storage: \(error)")
            }
        }
    }
    
    // MARK: - Seat Booking Persistence
    
    /// Permanently marks seats as booked after successful payment
    private func markSeatsAsBooked(_ seatsToBook: [TheaterSeat]) {
        for seat in seatsToBook {
            if let index = allSeats.firstIndex(where: { $0.id == seat.id }) {
                // Create new seat with booked status
                let bookedSeat = TheaterSeat(
                    id: seat.id,
                    section: seat.section,
                    row: seat.row,
                    number: seat.number,
                    price: seat.price,
                    isAvailable: false,  // ❌ No longer available
                    isSelected: false,   // ✅ Clear selection
                    x: seat.x,
                    y: seat.y,
                    width: seat.width,
                    height: seat.height
                )
                
                allSeats[index] = bookedSeat
                print("🔒 Marked seat as booked: \(seat.section.displayName) R\(seat.row) S\(seat.number)")
            }
        }
        
        // Save booking to persistent storage (for future app sessions)
        saveBookedSeats(seatsToBook)
    }
    
    /// Save booked seats to UserDefaults for persistence across app sessions
    private func saveBookedSeats(_ seatsToBook: [TheaterSeat]) {
        let bookedSeatIds = UserDefaults.standard.stringArray(forKey: "BookedSeatIds") ?? []
        let newBookedIds = seatsToBook.map { $0.id }
        let updatedBookedIds = Array(Set(bookedSeatIds + newBookedIds))
        
        UserDefaults.standard.set(updatedBookedIds, forKey: "BookedSeatIds")
        print("💾 Saved \(newBookedIds.count) booked seats to persistent storage")
    }
    
    /// Load previously booked seats from storage and mark them as unavailable
    private func loadBookedSeats() {
        let bookedSeatIds = UserDefaults.standard.stringArray(forKey: "BookedSeatIds") ?? []
        
        for seatId in bookedSeatIds {
            if let index = allSeats.firstIndex(where: { $0.id == seatId }) {
                let seat = allSeats[index]
                let bookedSeat = TheaterSeat(
                    id: seat.id,
                    section: seat.section,
                    row: seat.row,
                    number: seat.number,
                    price: seat.price,
                    isAvailable: false,  // Mark as unavailable
                    isSelected: false,
                    x: seat.x,
                    y: seat.y,
                    width: seat.width,
                    height: seat.height
                )
                allSeats[index] = bookedSeat
            }
        }
        
        if !bookedSeatIds.isEmpty {
            print("📚 Loaded \(bookedSeatIds.count) previously booked seats from storage")
        }
    }
    
    /// Clear all test data for debugging - makes all seats available again
    func clearTestBookings() {
        #if DEBUG
        UserDefaults.standard.removeObject(forKey: "BookedSeatIds")
        
        // Reload seats to make them all available again
        generateAllSeats()
        
        print("🧪 TEST: Cleared all booked seats - all seats now available")
        #endif
    }
    
    // MARK: - Email Integration
    
    /// Send booking confirmation email via Mailjet after successful payment
    private func sendBookingConfirmationEmail() {
        guard let userEmail = getUserEmail() else {
            print("⚠️ No user email available for booking confirmation")
            return
        }
        
        Task {
            do {
                let seatInfo = bookedSeats.map { "\($0.section) Row \($0.row) Seat \($0.number)" }.joined(separator: ", ")
                let userName = getUserName() ?? "Guest"
                
                // Call the Docker API to send email via Mailjet with dynamic content
                let success = try await apiClient.sendBookingConfirmationEmail(
                    to: userEmail,
                    userName: userName,
                    showTitle: getShowTitle(),     // ✅ Dynamic show title
                    showDate: getFormattedDate(),  // ✅ Dynamic show date
                    showTime: getFormattedTime(),  // ✅ Dynamic show time
                    venue: getVenueName(),         // ✅ Dynamic venue name
                    bookingReference: bookingReference,
                    seatInfo: seatInfo,
                    totalAmount: totalPrice
                )
                
                if success {
                    print("✅ Booking confirmation email sent to: \(userEmail)")
                    print("📧 Email details: \(getShowTitle()) at \(getVenueName()) on \(getFormattedDate()) at \(getFormattedTime())")
                } else {
                    print("❌ Failed to send booking confirmation email")
                }
                
            } catch {
                print("❌ Email sending failed: \(error)")
            }
        }
    }
    
    /// Get user email from current auth state
    private func getUserEmail() -> String? {
        switch authState {
        case .authenticated(let user), .guest(let user):
            return user.email
        default:
            return nil
        }
    }
    
    /// Get user name from current auth state
    private func getUserName() -> String? {
        switch authState {
        case .authenticated(let user), .guest(let user):
            if let firstName = user.firstName, let lastName = user.lastName {
                return "\(firstName) \(lastName)"
            } else if let firstName = user.firstName {
                return firstName
            } else {
                return user.email.components(separatedBy: "@").first?.capitalized
            }
        default:
            return nil
        }
    }
}

// MARK: - Supporting Models
struct SectionConfig {
    let rows: Int
    let seatsPerRow: Int
    let baseX: Double
    let baseY: Double
    let seatSpacing: Int
    let rowSpacing: Int
    let price: Int
} 