//
//  BiometricSetupView.swift
//  LML
//
//  Biometric authentication setup view
//

import SwiftUI
import LocalAuthentication

struct BiometricSetupView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var authManager: AuthManager
    
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showingSuccess = false
    
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
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    colors: [Color.black, Color(red: 0.1, green: 0.1, blue: 0.2)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                VStack(spacing: 32) {
                    // Header
                    VStack(spacing: 16) {
                        Image(systemName: biometricIcon)
                            .font(.system(size: 80))
                            .foregroundColor(.blue)
                        
                        Text("Set up \(biometricType)")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        Text("Use \(biometricType) for quick and secure access to your account")
                            .font(.body)
                            .foregroundColor(.white.opacity(0.8))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                    
                    Spacer()
                    
                    // Benefits
                    VStack(alignment: .leading, spacing: 20) {
                        BiometricBenefitRow(
                            icon: "bolt.fill",
                            title: "Quick Access",
                            description: "Sign in instantly without typing your password"
                        )
                        
                        BiometricBenefitRow(
                            icon: "lock.shield.fill",
                            title: "Enhanced Security",
                            description: "Your biometric data stays secure on your device"
                        )
                        
                        BiometricBenefitRow(
                            icon: "hand.raised.fill",
                            title: "Private & Secure",
                            description: "We never store your biometric information"
                        )
                    }
                    .padding(.horizontal, 32)
                    
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
                        Button(action: enableBiometric) {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: biometricIcon)
                                        .font(.title2)
                                }
                                
                                Text(isLoading ? "Setting up..." : "Enable \(biometricType)")
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
                        .disabled(isLoading)
                        .padding(.horizontal, 32)
                        
                        Button("Maybe Later") {
                            dismiss()
                        }
                        .font(.headline)
                        .foregroundColor(.white.opacity(0.7))
                        .padding(.horizontal, 32)
                    }
                    
                    Spacer()
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Skip") {
                        dismiss()
                    }
                    .foregroundColor(.white.opacity(0.7))
                }
            }
        }
        .alert("Success!", isPresented: $showingSuccess) {
            Button("Done") {
                dismiss()
            }
        } message: {
            Text("\(biometricType) has been enabled for your account. You can now sign in quickly and securely.")
        }
    }
    
    private func enableBiometric() {
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await authManager.enableBiometric()
                await MainActor.run {
                    isLoading = false
                    showingSuccess = true
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                }
            }
        }
    }
}

struct BiometricBenefitRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.blue)
                .frame(width: 24)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                
                Text(description)
                    .font(.body)
                    .foregroundColor(.white.opacity(0.8))
            }
            
            Spacer()
        }
    }
}

#Preview {
    BiometricSetupView()
        .environmentObject(AuthManager.shared)
} 