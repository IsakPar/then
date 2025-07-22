import SwiftUI
import WebKit

struct PaymentWebView: View {
    let checkoutURL: String
    let reservationId: String
    @Binding var isPresented: Bool
    @State private var sessionId: String?
    @State private var showingSuccess = false
    @State private var isLoading = true
    
    var body: some View {
        NavigationView {
            ZStack {
                WebViewRepresentable(
                    url: checkoutURL,
                    isLoading: $isLoading,
                    onPaymentSuccess: { url in
                        handlePaymentSuccess(url: url)
                    },
                    onPaymentCancel: {
                        handlePaymentCancel()
                    }
                )
                
                if isLoading {
                    VStack {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .blue))
                            .scaleEffect(1.5)
                        
                        Text("Loading checkout...")
                            .font(.system(size: 16))
                            .foregroundColor(.secondary)
                            .padding(.top, 8)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color(.systemBackground))
                }
            }
            .navigationTitle("Secure Checkout")
            .navigationBarTitleDisplayMode(.inline)
            .navigationBarItems(
                leading: Button("Cancel") {
                    isPresented = false
                }
            )
        }
        .fullScreenCover(isPresented: $showingSuccess) {
            if let sessionId = sessionId {
                PaymentSuccessView(
                    showTitle: "Hamilton",
                    venueTitle: "Victoria Palace Theatre", 
                    showDate: "2024-01-15",
                    showTime: "7:30 PM",
                    selectedSeats: [
                        BookedSeat(section: "Web Booking", row: 1, number: 1, price: 7500)
                    ],
                    totalAmount: 7500,
                    bookingReference: sessionId
                )
            }
        }
    }
    
    private func handlePaymentSuccess(url: String) {
        print("✅ Payment success detected: \(url)")
        
        // Extract session ID from URL
        if let extractedSessionId = extractSessionId(from: url) {
            sessionId = extractedSessionId
            isPresented = false
            showingSuccess = true
        }
    }
    
    private func handlePaymentCancel() {
        print("❌ Payment cancelled")
        isPresented = false
    }
    
    private func extractSessionId(from url: String) -> String? {
        if let urlComponents = URLComponents(string: url),
           let sessionId = urlComponents.queryItems?.first(where: { $0.name == "session_id" })?.value {
            return sessionId
        }
        
        // Fallback regex
        let pattern = "session_id=([^&]+)"
        if let regex = try? NSRegularExpression(pattern: pattern),
           let match = regex.firstMatch(in: url, range: NSRange(url.startIndex..., in: url)) {
            return String(url[Range(match.range(at: 1), in: url)!])
        }
        
        return nil
    }
}

struct WebViewRepresentable: UIViewRepresentable {
    let url: String
    @Binding var isLoading: Bool
    let onPaymentSuccess: (String) -> Void
    let onPaymentCancel: () -> Void
    
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        if let url = URL(string: url) {
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    class Coordinator: NSObject, WKNavigationDelegate {
        let parent: WebViewRepresentable
        
        init(_ parent: WebViewRepresentable) {
            self.parent = parent
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = false
            }
        }
        
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            DispatchQueue.main.async {
                self.parent.isLoading = true
            }
        }
        
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            
            guard let url = navigationAction.request.url?.absoluteString else {
                decisionHandler(.allow)
                return
            }
            
            print("🌐 WebView navigation: \(url)")
            
            // Check for payment success patterns
            if url.contains("payment/webview/success") ||
               url.contains("checkout/success") ||
               url.contains("success?session_id=") ||
               url.contains("session_id=") {
                print("✅ Payment success detected")
                parent.onPaymentSuccess(url)
                decisionHandler(.cancel)
                return
            }
            
            // Check for payment cancel patterns
            if url.contains("payment/webview/cancel") ||
               url.contains("checkout/cancel") ||
               url.contains("cancel") ||
               url.contains("cancelled=true") {
                print("❌ Payment cancel detected")
                parent.onPaymentCancel()
                decisionHandler(.cancel)
                return
            }
            
            decisionHandler(.allow)
        }
    }
} 