//
//  GuestEmailModal.swift
//  LML
//
//  Modal for collecting email from guest users during checkout
//

import SwiftUI

struct GuestEmailModal: View {
    @Binding var isPresented: Bool
    @State private var email: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?
    @StateObject private var authManager = AuthManager.shared
    @FocusState private var isEmailFieldFocused: Bool
    
    let onEmailSubmitted: (String) -> Void
    
    var body: some View {
        NavigationView {
            ZStack {
                // Dark background
                Color(red: 0.067, green: 0.094, blue: 0.153) // #111827
                    .ignoresSafeArea()
                
                VStack(spacing: 24) {
                    // Header
                    VStack(spacing: 12) {
                        Image(systemName: "envelope.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(Color(red: 0.231, green: 0.510, blue: 0.965)) // #3B82F6
                        
                        Text("Enter Your Email")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        Text("We need your email to send you the tickets and booking confirmation")
                            .font(.subheadline)
                            .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                    .padding(.top, 20)
                    
                    // Email Form
                    VStack(spacing: 16) {
                        // Email Input
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email Address")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                            
                            TextField("your.email@example.com", text: $email)
                                .textFieldStyle(DarkTextFieldStyle())
                                .keyboardType(.emailAddress)
                                .textContentType(.emailAddress)
                                .autocapitalization(.none)
                                .autocorrectionDisabled(true)
                                .focused($isEmailFieldFocused)
                                .submitLabel(.continue)
                                .onSubmit {
                                    if isEmailValid {
                                        handleEmailSubmission()
                                    }
                                }
                                .onChange(of: email) { _ in
                                    // Clear error when user starts typing
                                    if errorMessage != nil {
                                        errorMessage = nil
                                    }
                                }
                        }
                        
                        // Error Message
                        if let errorMessage = errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .font(.system(size: 14))
                                Text(errorMessage)
                                    .font(.system(size: 14))
                            }
                            .foregroundColor(.red)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .background(Color.red.opacity(0.1))
                            .cornerRadius(8)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.red.opacity(0.3), lineWidth: 1)
                            )
                        }
                        
                        // Continue Button
                        Button(action: handleEmailSubmission) {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.8)
                                } else {
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 16, weight: .medium))
                                }
                                
                                Text(isLoading ? "Creating Guest Account..." : "Continue to Payment")
                                    .font(.system(size: 16, weight: .semibold))
                            }
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(
                                isEmailValid && !isLoading
                                ? LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color(red: 0.231, green: 0.510, blue: 0.965), // #3B82F6
                                        Color(red: 0.114, green: 0.306, blue: 0.847)  // #1D4ED8
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                                : LinearGradient(
                                    gradient: Gradient(colors: [
                                        Color(red: 0.374, green: 0.404, blue: 0.447), // #5F6875 - Gray
                                        Color(red: 0.374, green: 0.404, blue: 0.447)  // Same gray
                                    ]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .cornerRadius(12)
                        }
                        .disabled(!isEmailValid || isLoading)
                        
                        // Info Box
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "info.circle.fill")
                                    .foregroundColor(Color(red: 0.231, green: 0.510, blue: 0.965)) // #3B82F6
                                Text("Guest Checkout")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.white)
                                Spacer()
                            }
                            
                            Text("• Tickets will be sent to your email\n• No account required right now\n• You can create an account after payment to save tickets in the app")
                                .font(.system(size: 12))
                                .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                        }
                        .padding(.all, 12)
                        .background(
                            Color(red: 0.122, green: 0.161, blue: 0.216) // #1F2937
                                .cornerRadius(8)
                        )
                    }
                    .padding(.horizontal, 20)
                    
                    Spacer()
                }
            }
            .navigationTitle("Guest Checkout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        isPresented = false
                    }
                    .foregroundColor(Color(red: 0.231, green: 0.510, blue: 0.965)) // #3B82F6
                }
            }
        }
        .preferredColorScheme(.dark)
        .onAppear {
            // Auto-focus the email field when modal appears
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                isEmailFieldFocused = true
            }
        }
    }
    
    // MARK: - Computed Properties
    
    private var isEmailValid: Bool {
        let emailRegex = #"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"#
        return email.range(of: emailRegex, options: .regularExpression) != nil
    }
    
    // MARK: - Methods
    
    private func handleEmailSubmission() {
        guard isEmailValid else { return }
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                // Create guest session via API call to Docker backend
                let _ = try await authManager.createGuestSession(email: email)
                
                await MainActor.run {
                    print("✅ Guest session created successfully: \(email)")
                    onEmailSubmitted(email)
                    isPresented = false
                }
                
            } catch {
                await MainActor.run {
                    isLoading = false
                    
                    // Better error messaging based on error type
                    if error.localizedDescription.contains("network") || error.localizedDescription.contains("connection") {
                        errorMessage = "Cannot connect to server. Please check your connection and ensure Docker is running."
                    } else if error.localizedDescription.contains("timeout") {
                        errorMessage = "Request timed out. Please try again."
                    } else {
                        errorMessage = "Failed to create guest session: \(error.localizedDescription)"
                    }
                    
                    print("❌ Guest session creation failed: \(error)")
                }
            }
        }
    }
}

// MARK: - Dark Text Field Style
struct DarkTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(
                Color(red: 0.122, green: 0.161, blue: 0.216) // #1F2937
                    .cornerRadius(8)
            )
            .foregroundColor(.white)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color(red: 0.216, green: 0.255, blue: 0.318), lineWidth: 1) // #374151
            )
    }
}

// MARK: - Preview
struct GuestEmailModal_Previews: PreviewProvider {
    static var previews: some View {
        GuestEmailModal(
            isPresented: .constant(true),
            onEmailSubmitted: { email in
                print("Email submitted: \(email)")
            }
        )
        .preferredColorScheme(.dark)
    }
} 