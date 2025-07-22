//
//  SignupView.swift
//  Last Minute Live
//
//  User registration screen with email/password signup
//  Implements email verification flow and local-first principles
//

import SwiftUI

struct SignupView: View {
    @StateObject private var viewModel = SignupViewModel()
    @EnvironmentObject private var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedField: SignupField?
    
    private enum SignupField {
        case name, email, phone, password, confirmPassword
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
                    VStack(spacing: 24) {
                        // Header section
                        VStack(spacing: 16) {
                            // App logo
                            Image("lastminutelive-logo-transparent")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(height: 60)
                                .accessibilityLabel("Last Minute Live logo")
                            
                            Text("Create Account")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .multilineTextAlignment(.center)
                            
                            Text("Join Last Minute Live for exclusive theater deals")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, 20)
                        
                        // Signup form
                        VStack(spacing: 16) {
                            // Name field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Full Name")
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                
                                TextField("Enter your full name", text: $viewModel.name)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .textContentType(.name)
                                    .autocapitalization(.words)
                                    .focused($focusedField, equals: .name)
                                    .submitLabel(.next)
                                    .onSubmit {
                                        focusedField = .email
                                    }
                                    .accessibilityLabel("Full name")
                                    .accessibilityHint("Enter your full name")
                                
                                if viewModel.showNameValidation && !viewModel.isNameValid {
                                    HStack {
                                        Image(systemName: "exclamationmark.triangle.fill")
                                            .foregroundColor(.red)
                                        Text("Name must be at least 2 characters")
                                            .font(.caption)
                                            .foregroundColor(.red)
                                    }
                                    .accessibilityElement(children: .combine)
                                }
                            }
                            
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
                                    .focused($focusedField, equals: .email)
                                    .submitLabel(.next)
                                    .onSubmit {
                                        focusedField = .phone
                                    }
                                    .accessibilityLabel("Email address")
                                    .accessibilityHint("Enter your email address")
                                
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
                            
                            // Phone field (optional)
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text("Phone Number")
                                        .font(.headline)
                                        .foregroundColor(.primary)
                                    Text("(Optional)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                
                                TextField("Enter your phone number", text: $viewModel.phone)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .keyboardType(.phonePad)
                                    .textContentType(.telephoneNumber)
                                    .focused($focusedField, equals: .phone)
                                    .submitLabel(.next)
                                    .onSubmit {
                                        focusedField = .password
                                    }
                                    .accessibilityLabel("Phone number, optional")
                                    .accessibilityHint("Enter your phone number for account recovery")
                                
                                if viewModel.showPhoneValidation && !viewModel.isPhoneValid {
                                    HStack {
                                        Image(systemName: "exclamationmark.triangle.fill")
                                            .foregroundColor(.red)
                                        Text("Please enter a valid phone number")
                                            .font(.caption)
                                            .foregroundColor(.red)
                                    }
                                    .accessibilityElement(children: .combine)
                                }
                            }
                            
                            // Password field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Password")
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                
                                SecureField("Enter your password", text: $viewModel.password)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .textContentType(.newPassword)
                                    .focused($focusedField, equals: .password)
                                    .submitLabel(.next)
                                    .onSubmit {
                                        focusedField = .confirmPassword
                                    }
                                    .accessibilityLabel("Password")
                                    .accessibilityHint("Enter a secure password")
                                
                                // Password requirements
                                VStack(alignment: .leading, spacing: 4) {
                                    ForEach(viewModel.passwordRequirements, id: \.text) { requirement in
                                        HStack {
                                            Image(systemName: requirement.isMet ? "checkmark.circle.fill" : "circle")
                                                .foregroundColor(requirement.isMet ? .green : .secondary)
                                                .font(.caption)
                                            Text(requirement.text)
                                                .font(.caption)
                                                .foregroundColor(requirement.isMet ? .green : .secondary)
                                        }
                                    }
                                }
                                .padding(.leading, 4)
                            }
                            
                            // Confirm password field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Confirm Password")
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                
                                SecureField("Confirm your password", text: $viewModel.confirmPassword)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .textContentType(.newPassword)
                                    .focused($focusedField, equals: .confirmPassword)
                                    .submitLabel(.go)
                                    .onSubmit {
                                        Task {
                                            await viewModel.signUp()
                                        }
                                    }
                                    .accessibilityLabel("Confirm password")
                                    .accessibilityHint("Re-enter your password to confirm")
                                
                                if viewModel.showConfirmPasswordValidation && !viewModel.isConfirmPasswordValid {
                                    HStack {
                                        Image(systemName: "exclamationmark.triangle.fill")
                                            .foregroundColor(.red)
                                        Text("Passwords do not match")
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
                            
                            // Terms and privacy
                            VStack(spacing: 8) {
                                HStack {
                                    Button(action: {
                                        viewModel.toggleTermsAccepted()
                                    }) {
                                        Image(systemName: viewModel.hasAcceptedTerms ? "checkmark.square.fill" : "square")
                                            .foregroundColor(viewModel.hasAcceptedTerms ? .blue : .secondary)
                                    }
                                    .accessibilityLabel(viewModel.hasAcceptedTerms ? "Terms accepted" : "Accept terms")
                                    
                                    Text("I agree to the ")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    +
                                    Text("Terms of Service")
                                        .font(.caption)
                                        .foregroundColor(.blue)
                                        .underline()
                                    +
                                    Text(" and ")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                    +
                                    Text("Privacy Policy")
                                        .font(.caption)
                                        .foregroundColor(.blue)
                                        .underline()
                                }
                                .onTapGesture {
                                    viewModel.toggleTermsAccepted()
                                }
                            }
                            
                            // Sign up button
                            Button(action: {
                                Task {
                                    await viewModel.signUp()
                                }
                            }) {
                                HStack {
                                    if viewModel.isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                            .scaleEffect(0.8)
                                        Text("Creating Account...")
                                    } else {
                                        Text("Create Account")
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .foregroundColor(.white)
                                .background(viewModel.canSignUp ? Color.blue : Color.gray)
                                .cornerRadius(12)
                                .font(.headline)
                            }
                            .disabled(!viewModel.canSignUp || viewModel.isLoading)
                            .accessibilityLabel(viewModel.isLoading ? "Creating account" : "Create account")
                            .accessibilityHint("Tap to create your new account")
                        }
                        .padding(.horizontal)
                        
                        // Footer
                        VStack(spacing: 16) {
                            HStack {
                                Text("Already have an account?")
                                    .foregroundColor(.secondary)
                                Button("Sign In") {
                                    dismiss()
                                }
                                .foregroundColor(.blue)
                                .fontWeight(.medium)
                            }
                            .accessibilityElement(children: .combine)
                            .accessibilityLabel("Already have an account? Sign in")
                            .accessibilityHint("Tap to go back to sign in")
                        }
                        
                        Spacer(minLength: 20)
                    }
                    .padding(.horizontal, 20)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                viewModel.setAuthManager(authManager)
            }
            .onChange(of: authManager.authState) { newState in
                viewModel.handleAuthStateChange(newState)
            }
            .alert("Account Created!", isPresented: $viewModel.showSuccessAlert) {
                Button("OK") {
                    dismiss()
                }
            } message: {
                Text("Please check your email to verify your account before signing in.")
            }
        }
    }
}

// MARK: - Preview

struct SignupView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            SignupView()
                .environmentObject(MockAuthManager())
                .previewDisplayName("Light Mode")
            
            SignupView()
                .environmentObject(MockAuthManager())
                .preferredColorScheme(.dark)
                .previewDisplayName("Dark Mode")
            
            SignupView()
                .environmentObject(MockAuthManager())
                .previewDevice("iPhone SE (3rd generation)")
                .previewDisplayName("iPhone SE")
        }
    }
} 