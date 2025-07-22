//
//  ForgotPasswordViewModel.swift
//  Last Minute Live
//
//  View model for ForgotPasswordView handling password reset logic
//  Manages email validation and reset email sending
//

import Foundation
import Combine
import SwiftUI

@MainActor
class ForgotPasswordViewModel: ObservableObject {
    
    // MARK: - Published Properties
    
    @Published var email: String = ""
    @Published var isLoading: Bool = false
    @Published var emailSent: Bool = false
    @Published var errorMessage: String?
    @Published var showEmailValidation: Bool = false
    
    // MARK: - Computed Properties
    
    var isEmailValid: Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format:"SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    var canSendReset: Bool {
        return !email.isEmpty && isEmailValid && !isLoading && !emailSent
    }
    
    // MARK: - Private Properties
    
    private var authManager: AuthManager?
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init() {
        setupValidation()
        
        // Reset email sent status after a delay
        $emailSent
            .filter { $0 }
            .delay(for: .seconds(10), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.emailSent = false
            }
            .store(in: &cancellables)
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
    }
    
    // MARK: - Validation Methods
    
    private func validateEmailIfNeeded() {
        if !email.isEmpty {
            showEmailValidation = true
        }
    }
    
    // MARK: - Password Reset Methods
    
    func sendResetEmail() async {
        guard let authManager = authManager else {
            setError("Authentication service not available")
            return
        }
        
        guard canSendReset else {
            validateFields()
            return
        }
        
        setLoading(true)
        clearError()
        
        do {
            // Note: We'll need to add this method to AuthManager
            // For now, we'll simulate the API call
            try await authManager.resetPassword(email: email)
            
            // Success
            emailSent = true
            
            print("🔑 ForgotPasswordViewModel: Password reset email sent to: \(email)")
            
        } catch let error as AuthError {
            handleAuthError(error)
        } catch {
            setError("Failed to send password reset email. Please try again.")
        }
        
        setLoading(false)
    }
    
    // MARK: - Helper Methods
    
    private func validateFields() {
        showEmailValidation = true
        
        if !isEmailValid {
            setError("Please enter a valid email address")
        }
    }
    
    private func handleAuthError(_ error: AuthError) {
        switch error {
        case .networkError:
            setError("Network error. Please check your connection and try again.")
        case .invalidCredentials:
            setError("No account found with this email address.")
        case .unknown(let message):
            if message.lowercased().contains("rate limit") {
                setError("Too many requests. Please wait before trying again.")
            } else if message.lowercased().contains("not found") {
                setError("No account found with this email address.")
            } else {
                setError(message)
            }
        default:
            setError("Failed to send password reset email. Please try again.")
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
} 