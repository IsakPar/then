//
//  HamiltonSeatMapView.swift
//  LML
//
//  Template view for Hamilton seat map
//  Refactored using Atomic Design principles
//

import SwiftUI
import Stripe
import StripePaymentSheet

// MARK: - Hamilton Seat Map Template
struct HamiltonSeatMapView: View {
    @StateObject private var viewModel = SeatMapViewModel()
    @Environment(\.dismiss) private var dismiss
    
    private let theaterConfig = TheaterConfig()
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                theaterBackground
                
                VStack(spacing: 0) {
                    headerSection
                    
                    SeatMapCanvas(viewModel: viewModel, theaterConfig: theaterConfig)
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
            print("🎭 Hamilton SeatMapView appeared - loading seats...")
            viewModel.generateAllSeats()
            viewModel.fitToScreen()
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
            // Refresh seat map when app becomes active
            print("🎭 App became active - current seat count: \(viewModel.allSeats.count)")
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
                showTitle: "Hamilton",
                venueTitle: "Victoria Palace Theatre",
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
            // Back button
            Button(action: { dismiss() }) {
                HStack(spacing: 8) {
                    Image(systemName: "chevron.left")
                        .font(.system(size: 16, weight: .semibold))
                    Text("Back")
                        .font(.system(size: 16, weight: .medium))
                }
                .foregroundColor(.white)
            }
            
            Spacer()
            
            // Title
            VStack(spacing: 2) {
                Text("Hamilton")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.white)
                Text("Victoria Palace Theatre")
                    .font(.system(size: 14))
                    .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686))
            }
            
            Spacer()
            
            // Zoom reset button
            Button(action: viewModel.fitToScreen) {
                Image(systemName: "viewfinder")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 10)
        .background(Color(red: 0.067, green: 0.094, blue: 0.153))
    }
    
    private var bottomControlsSection: some View {
        VStack(spacing: 15) {
            SeatSelectionSummary(selectedSeats: viewModel.selectedSeats)
            
            CheckoutButton(
                selectedSeatsCount: viewModel.selectedSeats.count,
                totalPrice: viewModel.totalPrice,
                isLoading: viewModel.isLoadingPayment,
                onTap: viewModel.proceedToCheckout
            )
        }
        .padding(.vertical, 20)
        .background(bottomBackground)
        .cornerRadius(20, corners: [.topLeft, .topRight])
        .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: -5)
        }
    
    private var bottomBackground: LinearGradient {
        LinearGradient(
            gradient: Gradient(colors: [
                Color(red: 0.122, green: 0.161, blue: 0.216),
                Color(red: 0.067, green: 0.094, blue: 0.153)
            ]),
            startPoint: .top,
            endPoint: .bottom
        )
    }
}

// MARK: - View Extensions
extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - Preview
struct HamiltonSeatMapView_Previews: PreviewProvider {
    static var previews: some View {
        HamiltonSeatMapView()
            .preferredColorScheme(.dark)
    }
} 