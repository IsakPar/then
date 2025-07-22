import SwiftUI
import Stripe
import StripePaymentSheet
import StripeApplePay

struct NativePaymentView: View {
    let seatIds: [String]
    let showId: String
    @Binding var isPresented: Bool
    @State private var paymentSheet: PaymentSheet?
    @State private var paymentResult: PaymentSheetResult?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingSuccess = false
    @State private var paymentIntentId: String?
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Secure Payment")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("\(seatIds.count) seat\(seatIds.count == 1 ? "" : "s") selected")
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
                .padding(.top)
                
                Spacer()
                
                // Stripe Loading Section
                VStack(spacing: 16) {
                    Image(systemName: "creditcard.and.123")
                        .font(.system(size: 40))
                        .foregroundColor(.blue)
                    
                    Text("Powered by Stripe")
                        .font(.headline)
                        .foregroundColor(.white)
                    
                    Text("Secure payment processing")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal)
                
                if isLoading {
                    ProgressView("Loading Stripe Payment...")
                        .padding()
                }
                
                if let errorMessage = errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .padding()
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                        .padding(.horizontal)
                }
                
                Spacer()
            }
            .navigationTitle("Payment")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarBackButtonHidden()
            .overlay(alignment: .topLeading) {
                Button("Cancel") {
                    isPresented = false
                }
                .padding()
            }
        }
        .onAppear {
            setupPaymentSheet()
        }
        .sheet(isPresented: $showingSuccess) {
            NavigationView {
                VStack(spacing: 20) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.green)
                    
                    Text("Payment Successful!")
                        .font(.title)
                        .fontWeight(.bold)
                    
                    Text("Your payment has been processed successfully.")
                        .multilineTextAlignment(.center)
                        .foregroundColor(.secondary)
                    
                    Button("Done") {
                        showingSuccess = false
                        isPresented = false
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding()
                .navigationTitle("Success")
                .navigationBarTitleDisplayMode(.inline)
            }
        }
    }
    
    private func setupPaymentSheet() {
        Task {
            await createPaymentIntent()
        }
    }
    
    @MainActor
    private func createPaymentIntent() async {
        isLoading = true
        errorMessage = nil
        
        do {
            print("💳 Creating PaymentIntent for native payment...")
            
            let response = try await APIClient.shared.createPaymentIntent(
                showId: showId,
                specificSeatIds: seatIds
            )
            
            print("✅ PaymentIntent created: \(response.paymentIntentId)")
            
            // Configure PaymentSheet with Apple Pay support
            var configuration = PaymentSheet.Configuration()
            configuration.merchantDisplayName = "LastMinuteLive"
            configuration.allowsDelayedPaymentMethods = true
            configuration.appearance = PaymentSheet.Appearance.default
            
            // Enable Apple Pay with proper merchant configuration
            configuration.applePay = PaymentSheet.ApplePayConfiguration(
                merchantId: "merchant.lml-tickets.com.LML",
                merchantCountryCode: "GB"
            )
            
            // Configure additional payment options
            configuration.primaryButtonLabel = "Complete Payment"
            configuration.defaultBillingDetails.name = "LastMinuteLive Customer"
            
            print("💳 Apple Pay configured with merchant ID: merchant.lml-tickets.com.LML")
            
            // Create PaymentSheet
            self.paymentSheet = PaymentSheet(
                paymentIntentClientSecret: response.clientSecret,
                configuration: configuration
            )
            
            self.paymentIntentId = response.paymentIntentId
            
            // Automatically present PaymentSheet immediately
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                self.presentPaymentSheet()
            }
            
        } catch {
            print("❌ PaymentIntent creation failed: \(error)")
            self.errorMessage = "Failed to setup payment: \(error.localizedDescription)"
        }
        
        isLoading = false
    }
    
    private func presentPaymentSheet() {
        guard let paymentSheet = paymentSheet else { return }
        
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            return
        }
        paymentSheet.present(from: rootViewController) { [self] result in
            self.paymentResult = result
            self.handlePaymentResult(result)
        }
    }
    
    private func handlePaymentResult(_ result: PaymentSheetResult) {
        switch result {
        case .completed:
            print("✅ Payment completed successfully")
            showingSuccess = true
            
        case .canceled:
            print("⚠️ Payment was canceled")
            errorMessage = "Payment was canceled"
            
        case .failed(let error):
            print("❌ Payment failed: \(error)")
            errorMessage = "Payment failed: \(error.localizedDescription)"
        }
    }
} 
