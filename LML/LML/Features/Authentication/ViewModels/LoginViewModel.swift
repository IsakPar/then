//
//  LoginViewModel.swift
//  Last Minute Live
//
//  View model for LoginView handling authentication logic
//  Implements local-first credential storage and offline session restoration
//

import Foundation
import Combine
import SwiftUI

@MainActor
class LoginViewModel: ObservableObject {
    
    // MARK: - Published Properties
    
    @Published var email: String = ""
    @Published var password: String = ""
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var showEmailValidation: Bool = false
    @Published var showPasswordValidation: Bool = false
    @Published var showEmailVerificationAlert: Bool = false
    @Published var showSignUpView: Bool = false
    @Published var showForgotPasswordSheet: Bool = false
    
    // MARK: - Computed Properties
    
    var isEmailValid: Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format:"SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    var isPasswordValid: Bool {
        return password.count >= 8
    }
    
    var canSignIn: Bool {
        return !email.isEmpty && !password.isEmpty && isEmailValid && isPasswordValid && !isLoading
    }
    
    // MARK: - Private Properties
    
    private var authManager: AuthManager?
    private var cancellables = Set<AnyCancellable>()
    private let keychainManager = KeychainManager.shared
    
    // MARK: - Initialization
    
    init() {
        setupValidation()
    }
    
    // MARK: - Setup Methods
    
    func setAuthManager(_ authManager: AuthManager) {
        self.authManager = authManager
    }
    
    private func setupValidation() {
        // Email validation
        $email
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.validateEmailIfNeeded()
            }
            .store(in: &cancellables)
        
        // Password validation
        $password
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.validatePasswordIfNeeded()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Validation Methods
    
    private func validateEmailIfNeeded() {
        if !email.isEmpty {
            showEmailValidation = true
        }
    }
    
    private func validatePasswordIfNeeded() {
        if !password.isEmpty {
            showPasswordValidation = true
        }
    }
    
    // MARK: - Authentication Methods
    
    func signIn() async {
        guard let authManager = authManager else {
            setError("Authentication service not available")
            return
        }
        
        guard canSignIn else {
            validateFields()
            return
        }
        
        setLoading(true)
        clearError()
        
        do {
            let user = try await authManager.signIn(email: email, password: password)
            
            // Store credentials locally for offline session restoration
            await storeCredentialsForOfflineAccess(email: email)
            
            // Success - let AuthManager handle navigation via state change
            print("🔐 LoginViewModel: Successfully signed in user: \(user.email)")
            
        } catch let error as AuthError {
            handleAuthError(error)
        } catch {
            setError("An unexpected error occurred. Please try again.")
        }
        
        setLoading(false)
    }
    
    func signInWithBiometrics() async {
        guard let authManager = authManager else {
            setError("Authentication service not available")
            return
        }
        
        setLoading(true)
        clearError()
        
        do {
            let user = try await authManager.signInWithBiometrics()
            print("🔐 LoginViewModel: Successfully signed in with biometrics: \(user.email)")
            
        } catch let error as AuthError {
            handleAuthError(error)
        } catch {
            setError("Biometric authentication failed. Please try again.")
        }
        
        setLoading(false)
    }
    
    // MARK: - Local-First Methods
    
    func checkForSavedCredentials() {
        // Check if we have a valid token in keychain for offline session restoration
        guard let token = try? keychainManager.getAuthToken() else {
            return
        }
        
        // Check if the user has saved email for convenience
        if let savedEmail = try? keychainManager.getUserEmail() {
            email = savedEmail
        }
        
        // Validate the token with auth manager
        Task {
            await authManager?.checkAuthenticationStatus()
        }
    }
    
    private func storeCredentialsForOfflineAccess(email: String) async {
        do {
            // Store email for convenience (non-sensitive data)
            try keychainManager.storeUserEmail(email)
            
            // Token is already stored by AuthManager, but we ensure it's there
            // for offline session restoration on next app launch
            if let token = try? keychainManager.getAuthToken() {
                print("🔐 LoginViewModel: Credentials stored for offline access")
            }
        } catch {
            print("🔐 LoginViewModel: Failed to store credentials for offline access: \(error)")
        }
    }
    
    // MARK: - Email Verification
    
    func resendVerificationEmail() async {
        guard let authManager = authManager, !email.isEmpty else {
            setError("Please enter your email address")
            return
        }
        
        setLoading(true)
        clearError()
        
        do {
            try await authManager.sendEmailVerification(email: email)
            setError("Verification email sent! Please check your inbox.")
        } catch {
            setError("Failed to send verification email. Please try again.")
        }
        
        setLoading(false)
    }
    
    // MARK: - Navigation Methods
    
    func showSignUp() {
        showSignUpView = true
    }
    
    func showForgotPassword() {
        showForgotPasswordSheet = true
    }
    
    // MARK: - State Management
    
    func handleAuthStateChange(_ newState: AuthState) {
        switch newState {
        case .authenticated:
            // Navigation handled by parent view
            clearError()
            
        case .emailVerificationRequired:
            showEmailVerificationAlert = true
            setError("Please verify your email address before signing in.")
            
        case .error(let errorMessage):
            setError(errorMessage)
            
        case .unauthenticated:
            // User was signed out
            clearForm()
            
        default:
            break
        }
    }
    
    // MARK: - Helper Methods
    
    private func validateFields() {
        showEmailValidation = true
        showPasswordValidation = true
        
        if !isEmailValid {
            setError("Please enter a valid email address")
        } else if !isPasswordValid {
            setError("Password must be at least 8 characters")
        }
    }
    
    private func handleAuthError(_ error: AuthError) {
        switch error {
        case .invalidCredentials:
            setError("Invalid email or password. Please try again.")
        case .emailNotVerified:
            showEmailVerificationAlert = true
            setError("Please verify your email address before signing in.")
        case .networkError:
            setError("Network error. Please check your connection and try again.")
        case .biometricNotAvailable:
            setError("Biometric authentication is not available on this device.")
        case .biometricNotEnrolled:
            setError("Please set up Face ID or Touch ID in your device settings.")
        case .biometricFailed:
            setError("Biometric authentication failed. Please try again.")
        case .keychainError(let message):
            setError("Security error: \(message)")
        case .tokenExpired:
            setError("Your session has expired. Please sign in again.")
        case .invalidToken:
            setError("Invalid authentication. Please sign in again.")
        case .unknown(let message):
            setError(message)
        }
    }
    
    private func setLoading(_ loading: Bool) {
        isLoading = loading
    }
    
    private func setError(_ message: String) {
        errorMessage = message
    }
    
    private func clearError() {
        errorMessage = nil
    }
    
    private func clearForm() {
        email = ""
        password = ""
        showEmailValidation = false
        showPasswordValidation = false
        clearError()
    }
}

// MARK: - Keychain Extensions for User Convenience

private extension KeychainManager {
    
    func storeUserEmail(_ email: String) throws {
        let emailData = email.data(using: .utf8)!
        try storeData(emailData, for: .userEmail)
    }
    
    func getUserEmail() throws -> String? {
        guard let emailData = try getData(for: .userEmail) else {
            return nil
        }
        return String(data: emailData, encoding: .utf8)
    }
}

