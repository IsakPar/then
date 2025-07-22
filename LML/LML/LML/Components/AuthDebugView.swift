//
//  AuthDebugView.swift
//  LML
//
//  Debug view for authentication state and service health
//  Development-only component to help diagnose auth issues
//

import SwiftUI
import AuthenticationServices
import GoogleSignIn

struct AuthDebugView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showingDebug = false
    
    var body: some View {
        #if DEBUG
        HStack {
            Spacer()
            VStack {
                // Debug toggle button - smaller and in corner
                Button("🐛") {
                    showingDebug.toggle()
                }
                .font(.caption2)
                .foregroundColor(.orange)
                .padding(8)
                .background(Color.black.opacity(0.7))
                .cornerRadius(8)
                
                if showingDebug {
                    debugContent
                        .frame(maxWidth: 250)
                }
            }
        }
        .padding(.trailing, 16)
        .padding(.top, 8)
        #endif
    }
    
    private var debugContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("🔍 Authentication Debug")
                .font(.headline)
                .foregroundColor(.orange)
            
            // Current auth state
            HStack {
                Text("State:")
                    .font(.caption)
                    .foregroundColor(.white)
                Spacer()
                Text(authStateDescription)
                    .font(.caption)
                    .foregroundColor(authStateColor)
            }
            
            // Service availability
            VStack(alignment: .leading, spacing: 4) {
                Text("Service Health:")
                    .font(.caption)
                    .foregroundColor(.white)
                
                serviceHealthRow("Apple Sign-In", isAppleSignInAvailable)
                serviceHealthRow("Google Sign-In", isGoogleSignInConfigured)
                serviceHealthRow("GoogleService-Info.plist", hasGoogleServiceInfo)
            }
            
            // Manual test buttons
            VStack(spacing: 4) {
                Text("Manual Tests:")
                    .font(.caption)
                    .foregroundColor(.white)
                
                Text("Touch Test: Tap buttons below")
                    .font(.caption2)
                    .foregroundColor(.yellow)
                
                Button("📱 Test Touch") {
                    print("🐛 Touch test successful!")
                }
                .font(.caption2)
                .foregroundColor(.green)
                
                Button("🍎 Test Apple") {
                    testAppleSignIn()
                }
                .font(.caption2)
                .foregroundColor(.blue)
                
                Button("🔍 Test Google") {
                    testGoogleSignIn()
                }
                .font(.caption2)
                .foregroundColor(.blue)
                
                Button("🔄 Reset Auth") {
                    authManager.signOut()
                }
                .font(.caption2)
                .foregroundColor(.red)
            }
        }
        .padding(8)
        .background(Color.black.opacity(0.8))
        .cornerRadius(8)
        .padding(.horizontal)
    }
    
    private func serviceHealthRow(_ service: String, _ isHealthy: Bool) -> HStack<TupleView<(Text, Spacer, Text)>> {
        HStack {
            Text("• \(service)")
                .font(.caption2)
                .foregroundColor(.white)
            Spacer()
            Text(isHealthy ? "✅" : "❌")
                .font(.caption2)
        }
    }
    
    // MARK: - Computed Properties
    
    private var authStateDescription: String {
        switch authManager.authState {
        case .loading:
            return "Loading..."
        case .notAuthenticated:
            return "Not Authenticated"
        case .guest(let user):
            return "Guest: \(user.email)"
        case .authenticated(let user):
            return "Authenticated: \(user.email)"
        case .biometricRequired(let user):
            return "Biometric Required: \(user.email)"
        case .error(let message):
            return "Error: \(message)"
        }
    }
    
    private var authStateColor: Color {
        switch authManager.authState {
        case .loading:
            return .orange
        case .notAuthenticated:
            return .gray
        case .guest, .authenticated:
            return .green
        case .biometricRequired:
            return .yellow
        case .error:
            return .red
        }
    }
    
    private var isAppleSignInAvailable: Bool {
        return true // Apple Sign-In is always available on iOS
    }
    
    private var hasGoogleServiceInfo: Bool {
        return Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil
    }
    
    private var isGoogleSignInConfigured: Bool {
        guard hasGoogleServiceInfo,
              let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
              let plist = NSDictionary(contentsOfFile: path),
              let _ = plist["CLIENT_ID"] as? String else {
            return false
        }
        return true
    }
    
    // MARK: - Test Functions
    
    private func testAppleSignIn() {
        print("🐛 Manual Apple Sign-In test triggered")
        Task {
            do {
                try await authManager.signInWithApple()
            } catch {
                print("🐛 Manual Apple Sign-In test failed: \(error)")
            }
        }
    }
    
    private func testGoogleSignIn() {
        print("🐛 Manual Google Sign-In test triggered")
        Task {
            do {
                try await authManager.signInWithGoogle()
            } catch {
                print("🐛 Manual Google Sign-In test failed: \(error)")
            }
        }
    }
}

#Preview {
    AuthDebugView()
        .environmentObject(AuthManager.shared)
} 