//
//  LoginView.swift
//  Last Minute Live
//
//  User login screen with email/password and biometric authentication
//  Implements local-first token storage for offline session restoration
//

import SwiftUI
import LocalAuthentication

struct LoginView: View {
    @StateObject private var viewModel = LoginViewModel()
    @EnvironmentObject private var authManager: AuthManager
    @FocusState private var focusedField: LoginField?
    
    private enum LoginField {
        case email, password
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
                        VStack(spacing: 16) {
                            // App logo
                            Image("lastminutelive-logo-transparent")
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(height: 80)
                                .accessibilityLabel("Last Minute Live logo")
                            
                            Text("Welcome Back")
                                .font(.largeTitle)
                                .fontWeight(.bold)
                                .multilineTextAlignment(.center)
                            
                            Text("Sign in to your account")
                                .font(.body)
                                .foregroundColor(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding(.top, 40)
                        
                        // Login form
                        VStack(spacing: 20) {
                            // Email field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Email")
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
                                        focusedField = .password
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
                            
                            // Password field
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Password")
                                    .font(.headline)
                                    .foregroundColor(.primary)
                                
                                SecureField("Enter your password", text: $viewModel.password)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .textContentType(.password)
                                    .focused($focusedField, equals: .password)
                                    .submitLabel(.go)
                                    .onSubmit {
                                        Task {
                                            await viewModel.signIn()
                                        }
                                    }
                                    .accessibilityLabel("Password")
                                    .accessibilityHint("Enter your password")
                                
                                if viewModel.showPasswordValidation && !viewModel.isPasswordValid {
                                    HStack {
                                        Image(systemName: "exclamationmark.triangle.fill")
                                            .foregroundColor(.red)
                                        Text("Password must be at least 8 characters")
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
                            
                            // Sign in button
                            Button(action: {
                                Task {
                                    await viewModel.signIn()
                                }
                            }) {
                                HStack {
                                    if viewModel.isLoading {
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                            .scaleEffect(0.8)
                                        Text("Signing In...")
                                    } else {
                                        Text("Sign In")
                                    }
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .foregroundColor(.white)
                                .background(viewModel.canSignIn ? Color.blue : Color.gray)
                                .cornerRadius(12)
                                .font(.headline)
                            }
                            .disabled(!viewModel.canSignIn || viewModel.isLoading)
                            .accessibilityLabel(viewModel.isLoading ? "Signing in" : "Sign in")
                            .accessibilityHint("Tap to sign in with your email and password")
                            
                            // Biometric authentication
                            if authManager.isBiometricEnabled {
                                Button(action: {
                                    Task {
                                        await viewModel.signInWithBiometrics()
                                    }
                                }) {
                                    HStack {
                                        Image(systemName: LAContext().biometryType == .faceID ? "faceid" : "touchid")
                                        Text("Sign in with \(LAContext().biometryType == .faceID ? "Face ID" : "Touch ID")")
                                    }
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 50)
                                    .foregroundColor(.blue)
                                    .background(Color.blue.opacity(0.1))
                                    .cornerRadius(12)
                                    .font(.headline)
                                }
                                .disabled(viewModel.isLoading)
                                .accessibilityLabel("Sign in with biometrics")
                                .accessibilityHint("Use Face ID or Touch ID to sign in")
                            }
                        }
                        .padding(.horizontal)
                        
                        // Footer links
                        VStack(spacing: 16) {
                            // Forgot password
                            Button("Forgot Password?") {
                                viewModel.showForgotPassword()
                            }
                            .foregroundColor(.blue)
                            .accessibilityLabel("Forgot password")
                            .accessibilityHint("Tap to reset your password")
                            
                            // Sign up link
                            HStack {
                                Text("Don't have an account?")
                                    .foregroundColor(.secondary)
                                Button("Sign Up") {
                                    viewModel.showSignUp()
                                }
                                .foregroundColor(.blue)
                                .fontWeight(.medium)
                            }
                            .accessibilityElement(children: .combine)
                            .accessibilityLabel("Don't have an account? Sign up")
                            .accessibilityHint("Tap to create a new account")
                        }
                        
                        Spacer(minLength: 20)
                    }
                    .padding(.horizontal, 20)
                }
            }
            .navigationBarHidden(true)
            .onAppear {
                viewModel.setAuthManager(authManager)
                viewModel.checkForSavedCredentials()
            }
            .onChange(of: authManager.authState) { newState in
                viewModel.handleAuthStateChange(newState)
            }
            .alert("Email Verification Required", isPresented: $viewModel.showEmailVerificationAlert) {
                Button("OK", role: .cancel) { }
                Button("Resend Email") {
                    Task {
                        await viewModel.resendVerificationEmail()
                    }
                }
            } message: {
                Text("Please check your email and verify your account before signing in.")
            }
            .fullScreenCover(isPresented: $viewModel.showSignUpView) {
                SignupView()
            }
            .sheet(isPresented: $viewModel.showForgotPasswordSheet) {
                ForgotPasswordView()
            }
        }
    }
}

// MARK: - Preview

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            LoginView()
                .environmentObject(MockAuthManager())
                .previewDisplayName("Light Mode")
            
            LoginView()
                .environmentObject(MockAuthManager())
                .preferredColorScheme(.dark)
                .previewDisplayName("Dark Mode")
            
            LoginView()
                .environmentObject(MockAuthManager())
                .previewDevice("iPhone SE (3rd generation)")
                .previewDisplayName("iPhone SE")
        }
    }
} 