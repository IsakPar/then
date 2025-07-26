//
//  UniversalSeatMapView.swift
//  LML
//
//  Universal seat map view for all shows - scalable, data-driven architecture
//  Replaces hardcoded show-specific views with dynamic theming and configuration
//

import SwiftUI
import Stripe
import StripePaymentSheet

// MARK: - Universal Seat Map View
struct UniversalSeatMapView: View {
    let show: Show
    
    @StateObject private var viewModel = SeatMapViewModel()
    @Environment(\.dismiss) private var dismiss
    
    // Dynamic configuration based on show data
    private let theaterConfig = TheaterConfig()
    @State private var theme: ShowTheme
    @State private var isLoadingTheme = false
    
    init(show: Show) {
        self.show = show
        // Initialize with hardcoded theme for immediate display
        self._theme = State(initialValue: ShowThemeEngine.getHardcodedTheme(for: show))
    }
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                theme.backgroundColor
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    dynamicHeaderSection
                    
                    SeatMapCanvas(viewModel: viewModel, theaterConfig: theaterConfig)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    
                    dynamicBottomControlsSection
                }
            }
        }
        .navigationBarHidden(true)
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .tabBar)
        .toolbar(.hidden, for: .navigationBar)
        .ignoresSafeArea(.container, edges: .bottom)
        .preferredColorScheme(.dark)
        .background(Color.black.ignoresSafeArea())
        .onAppear {
            setupShowContext()
            viewModel.generateAllSeats()
            viewModel.fitToScreen()
            
            // Load dynamic theme asynchronously
            Task {
                isLoadingTheme = true
                let dynamicTheme = await ShowThemeEngine.getTheme(for: show)
                await MainActor.run {
                    self.theme = dynamicTheme
                    isLoadingTheme = false
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
            print("🎭 App became active - current seat count: \(viewModel.allSeats.count)")
        }
        .paymentSheet(
            isPresented: $viewModel.showingPaymentSheet,
            paymentSheet: viewModel.paymentSheet ?? PaymentSheet(paymentIntentClientSecret: "", configuration: PaymentSheet.Configuration()),
            onCompletion: viewModel.onPaymentCompletion
        )
        // Note: GuestEmailModal removed - Stripe now handles email collection
    }
    
    // MARK: - Dynamic Header Section
    private var dynamicHeaderSection: some View {
        VStack(spacing: 8) {
            HStack {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark")
                        .foregroundColor(theme.headerTextColor)
                        .font(.title2)
                        .fontWeight(.medium)
                }
                
                Spacer()
                
                VStack(alignment: .center, spacing: 2) {
                    Text(show.title)
                        .font(.headline)
                        .fontWeight(.bold)
                        .foregroundColor(theme.headerTextColor)
                    
                    Text(show.venue.name)
                        .font(.subheadline)
                        .foregroundColor(theme.secondaryTextColor)
                }
                
                Spacer()
                
                // Dynamic icon based on theme
                Image(systemName: theme.iconName)
                    .foregroundColor(theme.primaryColor)
                    .font(.title2)
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            
            // Dynamic show info
            HStack {
                Spacer()
                
                VStack(spacing: 2) {
                    if let firstShowTime = show.schedule.first {
                        Text(firstShowTime.formattedDate)
                            .font(.caption)
                            .foregroundColor(theme.secondaryTextColor)
                        
                        Text("at \(firstShowTime.formattedTime)")
                            .font(.caption)
                            .foregroundColor(theme.secondaryTextColor)
                    } else {
                        Text("Show Details")
                            .font(.caption)
                            .foregroundColor(theme.secondaryTextColor)
                    }
                }
                
                Spacer()
            }
        }
        .padding(.bottom, 8)
        .background(Color.clear)
    }
    
    // MARK: - Dynamic Bottom Controls Section  
    private var dynamicBottomControlsSection: some View {
        VStack(spacing: 12) {
            // Selected seats info with dynamic theming
            if !viewModel.selectedSeats.isEmpty {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Selected Seats")
                            .font(.caption)
                            .foregroundColor(theme.secondaryTextColor)
                        
                        Text(viewModel.selectedSeatsText)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(theme.headerTextColor)
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("Total")
                            .font(.caption)
                            .foregroundColor(theme.secondaryTextColor)
                        
                        Text(viewModel.totalPriceText)
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(theme.primaryColor)
                    }
                }
                .padding(.horizontal, 20)
            }
            
            // Action buttons with dynamic theming
            HStack(spacing: 16) {
                // Clear selection button
                if !viewModel.selectedSeats.isEmpty {
                    Button("Clear") {
                        viewModel.clearSelection()
                    }
                    .foregroundColor(theme.headerTextColor)
                    .padding(.vertical, 12)
                    .padding(.horizontal, 24)
                    .background(Color.white.opacity(0.1))
                    .cornerRadius(25)
                    .overlay(
                        RoundedRectangle(cornerRadius: 25)
                            .stroke(theme.secondaryTextColor, lineWidth: 1)
                    )
                }
                
                // Checkout button with dynamic theming
                Button(viewModel.canProceedToCheckout ? "Proceed to Payment" : "Select Seats") {
                    if viewModel.canProceedToCheckout {
                        viewModel.proceedToCheckout()
                    }
                }
                .foregroundColor(viewModel.canProceedToCheckout ? theme.buttonTextColor : theme.secondaryTextColor)
                .fontWeight(.semibold)
                .padding(.vertical, 12)
                .padding(.horizontal, 32)
                .background(viewModel.canProceedToCheckout ? theme.buttonBackgroundColor : Color.white.opacity(0.1))
                .cornerRadius(25)
                .disabled(!viewModel.canProceedToCheckout)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 8)
        }
        .background(
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.clear,
                    Color.black.opacity(0.3),
                    Color.black.opacity(0.6)
                ]),
                startPoint: .top,
                endPoint: .bottom
            )
        )
    }
    
    // MARK: - Setup Methods
    
    private func setupShowContext() {
        print("🎭 \(theme.displayName) UniversalSeatMapView appeared - loading \(show.title)")
        
        // Dynamic show context based on actual show data
        let showDate = show.schedule.first?.formattedDate ?? Date().formatted(date: .abbreviated, time: .omitted)
        let showTime = show.schedule.first?.formattedTime ?? "7:30 PM"
        
        viewModel.setShowContext(
            showId: show.id,
            showTitle: show.title,
            venueName: show.venue.name,
            date: showDate,
            time: showTime
        )
        
        print("🎨 Applied \(theme.displayName) theme for \(show.title)")
        print("🏛️ Venue: \(show.venue.name)")
        print("📍 Address: \(show.venue.address.fullAddress)")
        print("💰 Price range: \(show.pricing.formattedMinPrice) - \(show.pricing.formattedMaxPrice)")
    }
}

// MARK: - Preview
struct UniversalSeatMapView_Previews: PreviewProvider {
    static var previews: some View {
        // Preview with different themes
        Group {
            // Phantom theme preview
            UniversalSeatMapView(show: mockPhantomShow)
                .previewDisplayName("Phantom Theme")
            
            // Lion King theme preview  
            UniversalSeatMapView(show: mockLionKingShow)
                .previewDisplayName("Lion King Theme")
            
            // Generic theme preview
            UniversalSeatMapView(show: mockGenericShow)
                .previewDisplayName("Generic Theme")
        }
    }
    
    // Mock shows for preview
    private static var mockPhantomShow: Show {
        // Create a mock phantom show with proper data structure
        // This would normally come from your API
        let venue = Venue(
            id: "phantom-venue",
            name: "Her Majesty's Theatre",
            address: Address(street: "Haymarket", city: "London", postcode: "SW1Y 4QL", country: "UK"),
            capacity: 1216,
            accessibility: AccessibilityInfo(
                wheelchairAccessible: true,
                hearingLoopAvailable: true,
                audioDescriptionAvailable: true,
                signLanguageAvailable: false
            ),
            facilities: ["Bar", "Cloakroom", "Gift Shop"]
        )
        
        let pricing = PricingInfo(
            currency: "GBP",
            minPrice: 3500, // £35.00 in pence
            maxPrice: 12000, // £120.00 in pence
            sections: []
        )
        
        return Show(
            id: "phantom-preview",
            title: "The Phantom of the Opera",
            venue: venue,
            description: "The world's most beloved musical",
            imageURL: nil,
            category: .musical,
            duration: 2.75 * 3600,
            ageRating: "PG",
            pricing: pricing,
            schedule: [],
            seatMap: nil,
            isActive: true,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
    
    private static var mockLionKingShow: Show {
        let venue = Venue(
            id: "lionking-venue",
            name: "Lyceum Theatre",
            address: Address(street: "Wellington Street", city: "London", postcode: "WC2E 7RQ", country: "UK"),
            capacity: 2100,
            accessibility: AccessibilityInfo(
                wheelchairAccessible: true,
                hearingLoopAvailable: true,
                audioDescriptionAvailable: true,
                signLanguageAvailable: false
            ),
            facilities: ["Bar", "Cloakroom", "Restaurant"]
        )
        
        let pricing = PricingInfo(
            currency: "GBP",
            minPrice: 4500,
            maxPrice: 15000,
            sections: []
        )
        
        return Show(
            id: "lionking-preview",
            title: "The Lion King",
            venue: venue,
            description: "Disney's award-winning musical",
            imageURL: nil,
            category: .musical,
            duration: 2.5 * 3600,
            ageRating: "U",
            pricing: pricing,
            schedule: [],
            seatMap: nil,
            isActive: true,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
    
    private static var mockGenericShow: Show {
        let venue = Venue(
            id: "generic-venue",
            name: "Generic Theatre",
            address: Address(street: "Theatre Street", city: "London", postcode: "W1A 0AA", country: "UK"),
            capacity: 800,
            accessibility: AccessibilityInfo(
                wheelchairAccessible: true,
                hearingLoopAvailable: true,
                audioDescriptionAvailable: false,
                signLanguageAvailable: false
            ),
            facilities: ["Bar", "Cloakroom"]
        )
        
        let pricing = PricingInfo(
            currency: "GBP",
            minPrice: 2500,
            maxPrice: 8000,
            sections: []
        )
        
        return Show(
            id: "generic-preview",
            title: "A Generic Musical",
            venue: venue,
            description: "A wonderful theatrical experience",
            imageURL: nil,
            category: .musical,
            duration: 2.0 * 3600,
            ageRating: "PG",
            pricing: pricing,
            schedule: [],
            seatMap: nil,
            isActive: true,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
} 