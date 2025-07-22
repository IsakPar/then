//
//  SeatSelectionView.swift
//  Last Minute Live
//
//  Interactive seat selection screen with SVG/Canvas seat maps
//  Features zoom, pan, tap-to-select, real-time updates, and offline caching
//

import SwiftUI
import WebKit

// MARK: - Supporting Types

struct SeatMapData {
    let seats: [Seat]
    let sections: [String]
    let venue: Venue?
}

struct Venue {
    let id: String
    let name: String
    let address: String
}

struct Seat {
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
}

struct SeatPosition {
    let x: Int
    let y: Int
}

enum SeatStatus {
    case available
    case reserved
    case booked
    case blocked
}

struct Show {
    let id: String
    let title: String
    let description: String
    let date: String
    let time: String
    let imageUrl: String?
    let venueId: String
    let venueName: String
    let venueAddress: String
    let seatMapId: String
    let minPrice: Int
    let maxPrice: Int
    let isActive: Bool
    let seatPricing: [String: Int]
    let durationMinutes: Int
}

// MARK: - Date Formatter Extension (moved to top and made internal)

extension DateFormatter {
    static let yearMonthDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

// MARK: - Main View

struct SeatSelectionView: View {
    let show: Show
    @StateObject private var viewModel = SeatSelectionViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var showingPaymentFlow = false
    @State private var showingTimeoutAlert = false
    
    var body: some View {
        ZStack {
            // Main content
            VStack(spacing: 0) {
                // Show header
                showHeaderSection
                
                // Seat map container
                seatMapSection
                
                // Selection summary and checkout
                if !viewModel.selectedSeats.isEmpty {
                    checkoutSection
                }
            }
            
            // Loading overlay
            if viewModel.isLoading {
                loadingOverlay
            }
        }
        .navigationTitle("Select Seats")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Back") {
                    dismiss()
                }
            }
            
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Info") {
                    viewModel.toggleSeatMapInfo()
                }
            }
        }
        .onAppear {
            Task {
                await viewModel.loadSeatMap(for: show)
            }
        }
        .alert("Session Timeout", isPresented: $showingTimeoutAlert) {
            Button("Extend Session") {
                viewModel.extendReservationTimer()
            }
            Button("Cancel", role: .cancel) {
                dismiss()
            }
        } message: {
            Text("Your seat reservation will expire soon. Extend your session to continue?")
        }
        .onChange(of: viewModel.reservationTimeRemaining) { timeRemaining in
            if timeRemaining <= 30 && timeRemaining > 0 {
                showingTimeoutAlert = true
            }
        }
        .fullScreenCover(isPresented: $showingPaymentFlow) {
            PaymentFlowView(
                show: show,
                selectedSeats: viewModel.selectedSeats,
                totalPrice: viewModel.totalPrice
            )
        }
    }
    
    // MARK: - Show Header Section
    
    private var showHeaderSection: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading) {
                    Text(show.title)
                        .font(.headline)
                        .fontWeight(.semibold)
                        .lineLimit(2)
                    
                    Text(show.venueName)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    HStack {
                        Text(formattedDate)
                        Text("•")
                            .foregroundColor(.secondary)
                        Text(show.time)
                    }
                    .font(.caption)
                    .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Timer display
                if viewModel.reservationTimeRemaining > 0 {
                    reservationTimerView
                }
            }
            
            // Seat legend
            seatLegendView
        }
        .padding()
        .background(Color(.systemBackground))
        .overlay(
            Rectangle()
                .frame(height: 1)
                .foregroundColor(Color(.separator)),
            alignment: .bottom
        )
    }
    
    // MARK: - Seat Map Section
    
    private var seatMapSection: some View {
        GeometryReader { geometry in
            ZStack {
                Color(.systemGroupedBackground)
                
                Group {
                    if viewModel.seatMapData != nil {
                        HardcodedSeatMapView(
                            selectedSeats: $viewModel.selectedSeats,
                            onSeatTapped: { seatId in
                                // Create a mock seat object from the seatId
                                let parts = seatId.components(separatedBy: "-")
                                if parts.count >= 3 {
                                    let mockSeat = Seat(
                                        id: seatId,
                                        showId: show.id,
                                        sectionId: parts[0],
                                        rowLetter: parts[1],
                                        seatNumber: Int(parts[2]) ?? 1,
                                        pricePence: {
                                            switch parts[0] {
                                            case "premium": return 8500 // £85
                                            case "sideA", "sideB": return 6500 // £65
                                            case "middle": return 6500 // £65
                                            case "back": return 4500 // £45
                                            default: return 4500
                                            }
                                        }(),
                                        status: .available,
                                        position: SeatPosition(x: 0, y: 0),
                                        isAccessible: false,
                                        notes: nil
                                    )
                                    viewModel.handleSeatTap(mockSeat)
                                }
                            },
                            containerSize: geometry.size
                        )
                    } else if viewModel.hasError {
                        errorStateView
                    } else {
                        loadingSeatMapView
                    }
                }
                
                // Stage indicator
                VStack {
                    stageView
                    Spacer()
                }
            }
        }
    }
    
    // MARK: - Checkout Section
    
    private var checkoutSection: some View {
        VStack(spacing: 16) {
            Divider()
            
            VStack(spacing: 12) {
                // Selected seats summary
                HStack {
                    Text("\(viewModel.selectedSeats.count) seat(s) selected")
                        .font(.headline)
                    
                    Spacer()
                    
                    Button("Clear All") {
                        viewModel.clearSelection()
                    }
                    .font(.caption)
                    .foregroundColor(.red)
                }
                
                // Price breakdown
                VStack(spacing: 4) {
                    ForEach(viewModel.selectedSeatsBySection, id: \.key) { section, seats in
                        HStack {
                            Text("\(seats.count)x \(section)")
                                .font(.subheadline)
                            Spacer()
                            Text(viewModel.formattedSectionPrice(for: section))
                                .font(.subheadline)
                                .fontWeight(.medium)
                        }
                    }
                    
                    Divider()
                    
                    HStack {
                        Text("Total")
                            .font(.headline)
                            .fontWeight(.semibold)
                        Spacer()
                        Text(viewModel.formattedTotalPrice)
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                    }
                }
                
                // Checkout button
                Button(action: {
                    Task {
                        await proceedToPayment()
                    }
                }) {
                    HStack {
                        if viewModel.isProcessingReservation {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(0.8)
                            Text("Reserving Seats...")
                        } else {
                            Text("Continue to Payment")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .foregroundColor(.white)
                    .background(Color.blue)
                    .cornerRadius(12)
                    .font(.headline)
                }
                .disabled(viewModel.isProcessingReservation)
            }
            .padding()
        }
        .background(Color(.systemBackground))
    }
    
    // MARK: - Supporting Views
    
    private var reservationTimerView: some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text("Reserved")
                .font(.caption2)
                .foregroundColor(.orange)
            
            Text(viewModel.formattedTimeRemaining)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.orange)
                .monospacedDigit()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.orange.opacity(0.1))
        .cornerRadius(6)
    }
    
    private var seatLegendView: some View {
        HStack(spacing: 20) {
            LegendItem(color: .green, text: "Available")
            LegendItem(color: .blue, text: "Selected")
            LegendItem(color: .gray, text: "Taken")
            LegendItem(color: .orange, text: "Reserved")
        }
        .font(.caption)
    }
    
    private var stageView: some View {
        Text("STAGE")
            .font(.caption)
            .fontWeight(.bold)
            .foregroundColor(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [Color.purple, Color.blue]),
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .cornerRadius(20)
            .shadow(radius: 2)
            .padding(.top, 20)
    }
    
    private var loadingOverlay: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()
            
            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.2)
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                
                Text("Loading seat map...")
                    .foregroundColor(.white)
                    .font(.subheadline)
            }
            .padding(24)
            .background(Color.black.opacity(0.8))
            .cornerRadius(12)
        }
    }
    
    private var loadingSeatMapView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading seat map...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
    }
    
    private var errorStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40))
                .foregroundColor(.orange)
            
            Text("Unable to load seat map")
                .font(.headline)
                .fontWeight(.semibold)
            
            Text("Please check your connection and try again.")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Retry") {
                Task {
                    await viewModel.loadSeatMap(for: show)
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
    
    // MARK: - Helper Methods
    
    private func proceedToPayment() async {
        do {
            try await viewModel.reserveSelectedSeats()
            showingPaymentFlow = true
        } catch {
            // Handle reservation error
            print("Failed to reserve seats: \(error)")
        }
    }
    
    private var formattedDate: String {
        guard let date = DateFormatter.yearMonthDay.date(from: show.date) else {
            return show.date
        }
        
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

// MARK: - Legend Item

struct LegendItem: View {
    let color: Color
    let text: String
    
    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 12, height: 12)
            Text(text)
        }
    }
}

// MARK: - Interactive Seat Map View

struct InteractiveSeatMapView: UIViewRepresentable {
    let seatMapData: SeatMapData
    @Binding var selectedSeats: Set<String>
    let onSeatTapped: (Seat) -> Void
    let containerSize: CGSize
    
    func makeUIView(context: Context) -> SeatMapCanvasView {
        let canvasView = SeatMapCanvasView()
        canvasView.delegate = context.coordinator
        canvasView.setupSeatMap(seatMapData, containerSize: containerSize)
        return canvasView
    }
    
    func updateUIView(_ uiView: SeatMapCanvasView, context: Context) {
        uiView.updateSelectedSeats(selectedSeats)
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: SeatMapCanvasDelegate {
        let parent: InteractiveSeatMapView
        
        init(_ parent: InteractiveSeatMapView) {
            self.parent = parent
        }
        
        func seatTapped(_ seat: Seat) {
            parent.onSeatTapped(seat)
        }
    }
}

// MARK: - Canvas Seat Map Implementation

protocol SeatMapCanvasDelegate: AnyObject {
    func seatTapped(_ seat: Seat)
}

class SeatMapCanvasView: UIView {
    weak var delegate: SeatMapCanvasDelegate?
    
    private var seatMapData: SeatMapData?
    private var selectedSeats: Set<String> = []
    private var seatViews: [String: SeatView] = [:]
    private var scrollView: UIScrollView!
    private var contentView: UIView!
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupScrollView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupScrollView()
    }
    
    private func setupScrollView() {
        scrollView = UIScrollView()
        scrollView.delegate = self
        scrollView.minimumZoomScale = 0.5
        scrollView.maximumZoomScale = 3.0
        scrollView.showsVerticalScrollIndicator = false
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        
        contentView = UIView()
        contentView.translatesAutoresizingMaskIntoConstraints = false
        
        addSubview(scrollView)
        scrollView.addSubview(contentView)
        
        NSLayoutConstraint.activate([
            scrollView.topAnchor.constraint(equalTo: topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),
            
            contentView.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentView.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor)
        ])
    }
    
    func setupSeatMap(_ seatMapData: SeatMapData, containerSize: CGSize) {
        self.seatMapData = seatMapData
        
        // Clear existing seat views
        seatViews.values.forEach { $0.removeFromSuperview() }
        seatViews.removeAll()
        
        // Calculate seat map dimensions
        let seatSize: CGFloat = 30
        let seatSpacing: CGFloat = 4
        let maxSeatsPerRow = seatMapData.seats.map { $0.position.x }.max() ?? 0
        let maxRows = seatMapData.seats.map { $0.position.y }.max() ?? 0
        
        let mapWidth = CGFloat(maxSeatsPerRow + 1) * (seatSize + seatSpacing)
        let mapHeight = CGFloat(maxRows + 1) * (seatSize + seatSpacing)
        
        // Update content view size
        contentView.widthAnchor.constraint(equalToConstant: max(mapWidth, containerSize.width)).isActive = true
        contentView.heightAnchor.constraint(equalToConstant: max(mapHeight, containerSize.height)).isActive = true
        
        // Create seat views
        for seat in seatMapData.seats {
            let seatView = SeatView(seat: seat, size: seatSize)
            seatView.translatesAutoresizingMaskIntoConstraints = false
            
            let x = CGFloat(seat.position.x) * (seatSize + seatSpacing)
            let y = CGFloat(seat.position.y) * (seatSize + seatSpacing)
            
            contentView.addSubview(seatView)
            
            NSLayoutConstraint.activate([
                seatView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: x),
                seatView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: y),
                seatView.widthAnchor.constraint(equalToConstant: seatSize),
                seatView.heightAnchor.constraint(equalToConstant: seatSize)
            ])
            
            // Add tap gesture
            let tapGesture = UITapGestureRecognizer(target: self, action: #selector(seatTapped(_:)))
            seatView.addGestureRecognizer(tapGesture)
            seatView.isUserInteractionEnabled = true
            
            seatViews[seat.id] = seatView
        }
    }
    
    func updateSelectedSeats(_ selectedSeats: Set<String>) {
        self.selectedSeats = selectedSeats
        
        for (seatId, seatView) in seatViews {
            seatView.isSelected = selectedSeats.contains(seatId)
        }
    }
    
    @objc private func seatTapped(_ gesture: UITapGestureRecognizer) {
        guard let seatView = gesture.view as? SeatView,
              let seat = seatView.seat,
              seat.status == .available || selectedSeats.contains(seat.id) else {
            return
        }
        
        delegate?.seatTapped(seat)
    }
}

// MARK: - Seat View

class SeatView: UIView {
    let seat: Seat?
    private let size: CGFloat
    private let label: UILabel
    
    var isSelected: Bool = false {
        didSet {
            updateAppearance()
        }
    }
    
    init(seat: Seat, size: CGFloat) {
        self.seat = seat
        self.size = size
        self.label = UILabel()
        
        super.init(frame: CGRect(x: 0, y: 0, width: size, height: size))
        
        setupView()
        updateAppearance()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupView() {
        layer.cornerRadius = size / 2
        
        // Setup label - Fixed: seatNumber is Int, not Optional
        label.text = "\(seat?.seatNumber ?? 0)"
        label.font = UIFont.systemFont(ofSize: 10, weight: .bold)
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false
        
        addSubview(label)
        
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: centerXAnchor),
            label.centerYAnchor.constraint(equalTo: centerYAnchor)
        ])
        
        // Accessibility
        isAccessibilityElement = true
        accessibilityTraits = .button
        accessibilityLabel = "Seat \(seat?.seatNumber ?? 0)"
    }
    
    private func updateAppearance() {
        guard let seat = seat else { return }
        
        let color: UIColor
        
        if isSelected {
            color = .systemBlue
            label.textColor = .white
            accessibilityValue = "Selected"
        } else {
            switch seat.status {
            case .available:
                color = .systemGreen
                label.textColor = .white
                accessibilityValue = "Available"
            case .reserved:
                color = .systemOrange
                label.textColor = .white
                accessibilityValue = "Reserved"
            case .booked:
                color = .systemGray
                label.textColor = .white
                accessibilityValue = "Taken"
            case .blocked:
                color = .systemRed
                label.textColor = .white
                accessibilityValue = "Unavailable"
            }
        }
        
        backgroundColor = color
        
        // Add subtle shadow for depth
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 1)
        layer.shadowRadius = 2
        layer.shadowOpacity = 0.2
    }
}

// MARK: - Payment Flow Placeholder

struct PaymentFlowView: View {
    let show: Show
    let selectedSeats: Set<String>
    let totalPrice: Int
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack {
                Text("Payment Flow")
                    .font(.title)
                Text("Coming in next phase!")
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Payment")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - ScrollView Delegate

extension SeatMapCanvasView: UIScrollViewDelegate {
    func viewForZooming(in scrollView: UIScrollView) -> UIView? {
        return contentView
    }
}

// MARK: - Preview

struct SeatSelectionView_Previews: PreviewProvider {
    static var previews: some View {
        let mockShow = Show(
            id: "1",
            title: "Hamilton",
            description: "The acclaimed musical about Alexander Hamilton",
            date: "2024-01-15",
            time: "19:30",
            imageUrl: nil,
            venueId: "venue1",
            venueName: "Victoria Palace Theatre",
            venueAddress: "Victoria Street, London SW1E 5EA",
            seatMapId: "map1",
            minPrice: 4500,
            maxPrice: 15000,
            isActive: true,
            seatPricing: [:], // Empty dictionary instead of nil
            durationMinutes: 165
        )
        
        NavigationView {
            SeatSelectionView(show: mockShow)
        }
    }
}
