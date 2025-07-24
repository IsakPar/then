//
//  LionKingSeatMapView.swift
//  LML
//
//  Dedicated seat map view for The Lion King
//  Uses JSON-based seat data with proper coordinate transformation
//

import SwiftUI
import Stripe
import StripePaymentSheet

// MARK: - Lion King Seat Map View
struct LionKingSeatMapView: View {
    @StateObject private var viewModel = LionKingSeatMapViewModel()
    @Environment(\.dismiss) private var dismiss
    
    private let theaterConfig = LionKingTheaterConfig()
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                theaterBackground
                
                VStack(spacing: 0) {
                    headerSection
                    
                    LionKingSeatMapCanvas(viewModel: viewModel, theaterConfig: theaterConfig)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    
                    bottomControlsSection
                }
            }
        }
        .navigationBarHidden(true)
        .toolbar(.hidden, for: .tabBar)
        .ignoresSafeArea(.container, edges: .bottom)
        .preferredColorScheme(.dark)
        .onAppear {
            Task {
                await viewModel.loadLionKingSeatMap()
                viewModel.fitToScreen()
            }
        }
        .paymentSheet(
            isPresented: $viewModel.showingPaymentSheet,
            paymentSheet: viewModel.createDummyPaymentSheet() ?? PaymentSheet(paymentIntentClientSecret: "", configuration: PaymentSheet.Configuration()),
            onCompletion: viewModel.handlePaymentResult
        )
        .alert("Payment Error", isPresented: Binding<Bool>(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button("OK") { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .fullScreenCover(isPresented: $viewModel.showingSuccess) {
            PaymentSuccessView(
                showTitle: "The Lion King",
                venueTitle: "Lyceum Theatre",
                showDate: "2024-01-15",
                showTime: "7:30 PM",
                selectedSeats: viewModel.bookedSeats,
                totalAmount: viewModel.totalPrice,
                bookingReference: viewModel.bookingReference
            )
        }
        // Email modal removed - Stripe now handles email collection natively
    }
    
    // MARK: - UI Components
    private var theaterBackground: some View {
        Color(red: 0.102, green: 0.102, blue: 0.102)
            .ignoresSafeArea()
    }
    
    private var headerSection: some View {
        HStack {
            Button(action: { dismiss() }) {
                Image(systemName: "chevron.left")
                    .foregroundColor(.white)
                    .font(.title2)
                    .padding()
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text("The Lion King")
                    .foregroundColor(.white)
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text("Lyceum Theatre")
                    .foregroundColor(.gray)
                    .font(.subheadline)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("Tonight 7:30 PM")
                    .foregroundColor(.white)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text("Duration: 2h 45m")
                    .foregroundColor(.gray)
                    .font(.caption)
            }
            .padding(.trailing)
        }
        .padding(.horizontal)
        .padding(.top, 8)
        .background(Color.black.opacity(0.3))
    }
    
    private var bottomControlsSection: some View {
        VStack(spacing: 16) {
            if viewModel.totalSelectedSeats > 0 {
                selectedSeatsInfo
            }
            
            checkoutButton
        }
        .padding()
        .background(Color.black.opacity(0.9))
    }
    
    private var selectedSeatsInfo: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Selected Seats")
                    .foregroundColor(.white)
                    .font(.headline)
                
                Text("\(viewModel.totalSelectedSeats) seat\(viewModel.totalSelectedSeats == 1 ? "" : "s")")
                    .foregroundColor(.gray)
                    .font(.subheadline)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("Total")
                    .foregroundColor(.white)
                    .font(.headline)
                
                Text("£\(viewModel.totalPrice / 100)")
                    .foregroundColor(.orange)
                    .font(.title2)
                    .fontWeight(.bold)
            }
        }
        .padding()
        .background(Color.gray.opacity(0.2))
        .cornerRadius(12)
    }
    
    private var checkoutButton: some View {
        Button(action: viewModel.proceedToCheckout) {
            HStack {
                Spacer()
                
                if viewModel.isLoadingPayment {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .black))
                        .scaleEffect(0.8)
                } else {
                    Text(viewModel.totalSelectedSeats > 0 ? "Proceed to Checkout" : "Select Seats")
                        .fontWeight(.semibold)
                }
                
                Spacer()
            }
            .foregroundColor(.black)
            .padding()
            .background(viewModel.canProceedToCheckout ? Color.orange : Color.gray)
            .cornerRadius(12)
        }
        .disabled(!viewModel.canProceedToCheckout)
    }
}

// MARK: - Lion King Theater Configuration
struct LionKingTheaterConfig {
    // ViewBox standardized to match JSON coordinate space
    let viewBox = CGRect(x: 0, y: 0, width: 1000, height: 800)
    let seatSize = CGSize(width: 24, height: 22)
    let seatSpacing: CGFloat = 30
    let rowSpacing: CGFloat = 28
    
    // Stage configuration for Lion King (matching JSON stage position)
    let stage = StageConfig(
        position: CGPoint(x: 500, y: 50),
        size: CGSize(width: 200, height: 30),
        label: "STAGE"
    )
}

struct StageConfig {
    let position: CGPoint
    let size: CGSize
    let label: String
}

// MARK: - Preview
#Preview {
    LionKingSeatMapView()
} 