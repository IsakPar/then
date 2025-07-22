//
//  ForgotPasswordView.swift
//  Last Minute Live
//
//  Password reset screen for users who forgot their password
//  Handles password reset email requests
//

import SwiftUI

struct ForgotPasswordView: View {
    @StateObject private var viewModel = ForgotPasswordViewModel()
    @EnvironmentObject private var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    @FocusState private var isEmailFieldFocused: Bool
    
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
                            // Reset password icon
                            Image(systemName: "key.fill")
                                .font(.system(size: 60))
                                .foregroundColor(.blue)
                                .accessibilityLabel("Password reset")
                            
                            Text("Reset Password")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .multilineTextAlignment(.center)
                            
                            Text("Enter your email address and we'll send you a link to reset your password.")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, 40)
                        
                        // Reset form
                        VStack(spacing: 20) {
                            // Email field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email Address")
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                
                                TextField("Enter your email", text: $viewModel.email)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .keyboardType(.emailAddress)
                                    .textContentType(.emailAddress)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                                    .focused($isEmailFieldFocused)
                                    .submitLabel(.send)
                                    .onSubmit {
                                        Task {
                                            await viewModel.sendResetEmail()
                                        }
                                    }
                                    .accessibilityLabel("Email address")
                                    .accessibilityHint("Enter your email address to receive password reset link")
                                
                                if viewModel.showEmailValidation && !viewModel.isEmailValid {
                                    HStack {
                                        Image(systemName: "exclamationmark.triangle.fill")
                                            .foregroundColor(.red)
                                        Text("Please enter a valid email address")
                                            .font(.caption)
                                            .foregroundColor(.red)
                                    }
                                    .accessibilityElement(children: .combine)
                                }
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
                                    Text("Password reset email sent! Please check your inbox.")
                                        .font(.body)
                                        .foregroundColor(.green)
                                        .multilineTextAlignment(.leading)
                                }
                                .padding(.horizontal)
                                .padding(.vertical, 8)
                                .background(Color.green.opacity(0.1))
                                .cornerRadius(8)
                                .accessibilityElement(children: .combine)
                                .accessibilityLabel("Success: Password reset email sent")
                            }
                            
                            // Send reset email button
                            Button(action: {
                                Task {
                                    await viewModel.sendResetEmail()
                                }
                            }) {
                                HStack {
                                    if viewModel.isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                            .scaleEffect(0.8)
                                        Text("Sending...")
                                    } else if viewModel.emailSent {
                                        Image(systemName: "checkmark")
                                        Text("Email Sent!")
                                    } else {
                                        Text("Send Reset Email")
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .foregroundColor(.white)
                                .background(viewModel.emailSent ? Color.green : (viewModel.canSendReset ? Color.blue : Color.gray))
                                .cornerRadius(12)
                                .font(.headline)
                            }
                            .disabled(!viewModel.canSendReset || viewModel.isLoading)
                            .accessibilityLabel(viewModel.isLoading ? "Sending reset email" : "Send password reset email")
                            .accessibilityHint("Tap to send password reset email")
                        }
                        .padding(.horizontal)
                        
                        // Help section
                        if !viewModel.emailSent {
                            VStack(spacing: 12) {
                                Text("Need Help?")
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                
                                VStack(spacing: 8) {
                                    Text("• Make sure the email address is correct")
                                    Text("• Check your spam/junk folder")
                                    Text("• The reset link will expire in 24 hours")
                                    Text("• Contact support if you continue having issues")
                                }
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.leading)
                            }
                            .padding(.horizontal)
                        } else {
                            // Post-send instructions
                            VStack(spacing: 16) {
                                Text("Next Steps")
                                    .font(.title2)
                                    .fontWeight(.semibold)
                                
                                VStack(spacing: 12) {
                                    HStack(alignment: .top, spacing: 12) {
                                        Image(systemName: "1.circle.fill")
                                            .font(.title3)
                                            .foregroundColor(.blue)
                                        VStack(alignment: .leading) {
                                            Text("Check your email")
                                                .font(.body)
                                                .fontWeight(.medium)
                                            Text("Look for an email from Last Minute Live")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                        Spacer()
                                    }
                                    
                                    HStack(alignment: .top, spacing: 12) {
                                        Image(systemName: "2.circle.fill")
                                            .font(.title3)
                                            .foregroundColor(.blue)
                                        VStack(alignment: .leading) {
                                            Text("Click the reset link")
                                                .font(.body)
                                                .fontWeight(.medium)
                                            Text("This will open a secure page to set your new password")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                        Spacer()
                                    }
                                    
                                    HStack(alignment: .top, spacing: 12) {
                                        Image(systemName: "3.circle.fill")
                                            .font(.title3)
                                            .foregroundColor(.blue)
                                        VStack(alignment: .leading) {
                                            Text("Return to the app")
                                                .font(.body)
                                                .fontWeight(.medium)
                                            Text("Sign in with your new password")
                                                .font(.caption)
                                                .foregroundColor(.secondary)
                                        }
                                        Spacer()
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                        
                        Spacer(minLength: 20)
                    }
                    .padding(.horizontal, 20)
                }
            }
            .navigationTitle("Reset Password")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                if viewModel.emailSent {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") {
                            dismiss()
                        }
                    }
                }
            }
            .onAppear {
                viewModel.setAuthManager(authManager)
                isEmailFieldFocused = true
            }
        }
    }
}

// MARK: - Preview

struct ForgotPasswordView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            ForgotPasswordView()
                .environmentObject(MockAuthManager())
                .previewDisplayName("Light Mode")
            
            ForgotPasswordView()
                .environmentObject(MockAuthManager())
                .preferredColorScheme(.dark)
                .previewDisplayName("Dark Mode")
            
            ForgotPasswordView()
                .environmentObject(MockAuthManager())
                .previewDevice("iPhone SE (3rd generation)")
                .previewDisplayName("iPhone SE")
        }
    }
} 