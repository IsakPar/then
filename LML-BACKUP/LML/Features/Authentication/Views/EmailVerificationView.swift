//
//  EmailVerificationView.swift
//  Last Minute Live
//
//  Email verification screen for new user accounts
//  Handles verification token processing and resend functionality
//

import SwiftUI

struct EmailVerificationView: View {
    @StateObject private var viewModel = EmailVerificationViewModel()
    @EnvironmentObject private var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    
    let email: String
    let isModal: Bool
    
    init(email: String, isModal: Bool = false) {
        self.email = email
        self.isModal = isModal
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background gradient
                LinearGradient(
                    gradient: Gradient(colors: [Color(.systemBackground), Color(.secondarySystemBackground)]),
                    startPoint: .top,
                    endPoint: .bottom
                )
                .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 32) {
                        // Header section
                        VStack(spacing: 20) {
                            // Email verification icon
                            Image(systemName: "envelope.badge.fill")
                                .font(.system(size: 80))
                                .foregroundColor(.blue)
                                .accessibilityLabel("Email verification")
                            
                            Text("Check Your Email")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .multilineTextAlignment(.center)
                            
                            VStack(spacing: 12) {
                                Text("We've sent a verification email to:")
                                    .font(.body)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                                
                                Text(email)
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 8)
                                    .background(Color(.secondarySystemBackground))
                                    .cornerRadius(8)
                                
                                Text("Please check your inbox and click the verification link to activate your account.")
                                    .font(.body)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                        }
                        .padding(.top, 40)
                        
                        // Instructions
                        VStack(spacing: 16) {
                            Text("What's Next?")
                                .font(.title2)
                                .fontWeight(.semibold)
                            
                            VStack(spacing: 12) {
                                InstructionRow(
                                    icon: "1.circle.fill",
                                    text: "Check your email inbox"
                                )
                                
                                InstructionRow(
                                    icon: "2.circle.fill",
                                    text: "Look for an email from Last Minute Live"
                                )
                                
                                InstructionRow(
                                    icon: "3.circle.fill",
                                    text: "Click the verification link"
                                )
                                
                                InstructionRow(
                                    icon: "4.circle.fill",
                                    text: "Return to the app to sign in"
                                )
                            }
                        }
                        .padding(.horizontal)
                        
                        // Actions
                        VStack(spacing: 16) {
                            // Resend email button
                            Button(action: {
                                Task {
                                    await viewModel.resendVerificationEmail()
                                }
                            }) {
                                HStack {
                                    if viewModel.isResending {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                            .scaleEffect(0.8)
                                        Text("Sending...")
                                    } else if viewModel.emailSent {
                                        Image(systemName: "checkmark")
                                        Text("Email Sent!")
                                    } else {
                                        Image(systemName: "arrow.clockwise")
                                        Text("Resend Email")
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .foregroundColor(.white)
                                .background(viewModel.emailSent ? Color.green : Color.blue)
                                .cornerRadius(12)
                                .font(.headline)
                            }
                            .disabled(viewModel.isResending || viewModel.resendCooldown > 0)
                            .accessibilityLabel(viewModel.isResending ? "Sending verification email" : "Resend verification email")
                            .accessibilityHint("Tap to send another verification email")
                            
                            // Cooldown timer
                            if viewModel.resendCooldown > 0 {
                                Text("Please wait \(viewModel.resendCooldown) seconds before requesting another email")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                            }
                            
                            // Error message
                            if let errorMessage = viewModel.errorMessage {
                                HStack {
                                    Image(systemName: "exclamationmark.circle.fill")
                                        .foregroundColor(.red)
                                    Text(errorMessage)
                                        .font(.body)
                                        .foregroundColor(.red)
                                        .multilineTextAlignment(.leading)
                                }
                                .padding(.horizontal)
                                .padding(.vertical, 8)
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(8)
                                .accessibilityElement(children: .combine)
                                .accessibilityLabel("Error: \(errorMessage)")
                            }
                            
                            // Success message
                            if viewModel.emailSent {
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                    Text("Verification email sent successfully! Please check your inbox.")
                                        .font(.body)
                                        .foregroundColor(.green)
                                        .multilineTextAlignment(.leading)
                                }
                                .padding(.horizontal)
                                .padding(.vertical, 8)
                                .background(Color.green.opacity(0.1))
                                .cornerRadius(8)
                                .accessibilityElement(children: .combine)
                                .accessibilityLabel("Success: Verification email sent")
                            }
                        }
                        .padding(.horizontal)
                        
                        // Help section
                        VStack(spacing: 12) {
                            Text("Need Help?")
                                .font(.headline)
                                .foregroundColor(.primary)
                            
                            VStack(spacing: 8) {
                                Text("• Check your spam/junk folder")
                                Text("• Make sure \(email) is correct")
                                Text("• Contact support if you continue having issues")
                            }
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.leading)
                        }
                        .padding(.horizontal)
                        
                        // Footer actions
                        VStack(spacing: 16) {
                            if isModal {
                                Button("Done") {
                                    dismiss()
                                }
                                .foregroundColor(.blue)
                                .font(.headline)
                            } else {
                                Button("Back to Sign In") {
                                    dismiss()
                                }
                                .foregroundColor(.blue)
                                .font(.headline)
                            }
                        }
                        
                        Spacer(minLength: 20)
                    }
                    .padding(.horizontal, 20)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if isModal {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") {
                            dismiss()
                        }
                    }
                }
            }
            .onAppear {
                viewModel.setEmail(email)
                viewModel.setAuthManager(authManager)
            }
            .onChange(of: authManager.authState) { newState in
                viewModel.handleAuthStateChange(newState)
            }
        }
    }
}

// MARK: - Instruction Row Component

struct InstructionRow: View {
    let icon: String
    let text: String
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.blue)
                .frame(width: 24)
            
            Text(text)
                .font(.body)
                .foregroundColor(.primary)
                .multilineTextAlignment(.leading)
            
            Spacer()
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Preview

struct EmailVerificationView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            EmailVerificationView(email: "user@example.com")
                .environmentObject(MockAuthManager())
                .previewDisplayName("Light Mode")
            
            EmailVerificationView(email: "user@example.com", isModal: true)
                .environmentObject(MockAuthManager())
                .preferredColorScheme(.dark)
                .previewDisplayName("Dark Mode")
            
            EmailVerificationView(email: "user@example.com")
                .environmentObject(MockAuthManager())
                .previewDevice("iPhone SE (3rd generation)")
                .previewDisplayName("iPhone SE")
        }
    }
} 