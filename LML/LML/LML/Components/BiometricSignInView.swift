//
//  BiometricSignInView.swift
//  LML
//
//  Biometric authentication sign-in view
//

import SwiftUI
import LocalAuthentication

struct BiometricSignInView: View {
    @EnvironmentObject var authManager: AuthManager
    
    @State private var isAuthenticating = false
    @State private var errorMessage: String?
    @State private var showingPasswordFallback = false
    
    private var user: User? {
        if case .biometricRequired(let user) = authManager.authState {
            return user
        }
        return nil
    }
    
    private var biometricType: String {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return "Biometric Authentication"
        }
        
        switch context.biometryType {
        case .faceID:
            return "Face ID"
        case .touchID:
            return "Touch ID"
        case .opticID:
            return "Optic ID"
        default:
            return "Biometric Authentication"
        }
    }
    
    private var biometricIcon: String {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return "touchid"
        }
        
        switch context.biometryType {
        case .faceID:
            return "faceid"
        case .touchID:
            return "touchid"
        case .opticID:
            return "opticid"
        default:
            return "touchid"
        }
    }
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [Color.black, Color(red: 0.1, green: 0.1, blue: 0.2)],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()
            
            VStack(spacing: 40) {
                Spacer()
                
                // Header
                VStack(spacing: 20) {
                    Image(systemName: biometricIcon)
                        .font(.system(size: 100))
                        .foregroundColor(.blue)
                        .opacity(isAuthenticating ? 0.6 : 1.0)
                        .scaleEffect(isAuthenticating ? 1.1 : 1.0)
                        .animation(.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: isAuthenticating)
                    
                    VStack(spacing: 12) {
                        Text("Welcome back!")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        if let user = user {
                            Text("Hi, \(user.displayName)")
                                .font(.title2)
                                .foregroundColor(.blue)
                                .fontWeight(.medium)
                        }
                        
                        Text("Use \(biometricType) to sign in")
                            .font(.body)
                            .foregroundColor(.white.opacity(0.8))
                            .multilineTextAlignment(.center)
                    }
                }
                
                Spacer()
                
                // Error message
                if let errorMessage = errorMessage {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.red)
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundColor(.red)
                    }
                    .padding(.horizontal, 32)
                }
                
                // Action buttons
                VStack(spacing: 16) {
                    Button(action: authenticateWithBiometric) {
                        HStack {
                            if isAuthenticating {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: biometricIcon)
                                    .font(.title2)
                            }
                            
                            Text(isAuthenticating ? "Authenticating..." : "Sign in with \(biometricType)")
                                .font(.headline)
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 56)
                        .background(
                            LinearGradient(
                                colors: [Color.blue, Color.blue.opacity(0.8)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundColor(.white)
                        .cornerRadius(16)
                    }
                    .disabled(isAuthenticating)
                    .padding(.horizontal, 32)
                    
                    Button("Use Password Instead") {
                        showingPasswordFallback = true
                    }
                    .font(.headline)
                    .foregroundColor(.white.opacity(0.7))
                    .padding(.horizontal, 32)
                }
                
                Spacer()
            }
        }
        .onAppear {
            // Auto-trigger biometric authentication when view appears
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                if !isAuthenticating {
                    authenticateWithBiometric()
                }
            }
        }
        .sheet(isPresented: $showingPasswordFallback) {
            SignInView()
                .environmentObject(authManager)
        }
    }
    
    private func authenticateWithBiometric() {
        isAuthenticating = true
        errorMessage = nil
        
        Task {
            do {
                try await authManager.authenticateWithBiometric()
                await MainActor.run {
                    isAuthenticating = false
                }
            } catch {
                await MainActor.run {
                    isAuthenticating = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}

#Preview {
    BiometricSignInView()
        .environmentObject(AuthManager.shared)
} 