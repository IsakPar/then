//
//  EmailVerificationViewModel.swift
//  Last Minute Live
//
//  View model for EmailVerificationView handling email verification logic
//  Implements resend functionality with cooldown and rate limiting
//

import Foundation
import Combine
import SwiftUI

@MainActor
class EmailVerificationViewModel: ObservableObject {
    
    // MARK: - Published Properties
    
    @Published var isResending: Bool = false
    @Published var emailSent: Bool = false
    @Published var errorMessage: String?
    @Published var resendCooldown: Int = 0
    
    // MARK: - Private Properties
    
    private var email: String = ""
    private var authManager: AuthManager?
    private var cancellables = Set<AnyCancellable>()
    private var cooldownTimer: Timer?
    private let resendCooldownDuration: Int = 60 // 60 seconds
    
    // MARK: - Initialization
    
    init() {
        // Reset email sent status after a delay
        $emailSent
            .filter { $0 }
            .delay(for: .seconds(3), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.emailSent = false
            }
            .store(in: &cancellables)
    }
    
    deinit {
        cooldownTimer?.invalidate()
    }
    
    // MARK: - Setup Methods
    
    func setEmail(_ email: String) {
        self.email = email
    }
    
    func setAuthManager(_ authManager: AuthManager) {
        self.authManager = authManager
    }
    
    // MARK: - Email Verification Methods
    
    func resendVerificationEmail() async {
        guard let authManager = authManager else {
            setError("Authentication service not available")
            return
        }
        
        guard !email.isEmpty else {
            setError("Email address is required")
            return
        }
        
        guard resendCooldown == 0 else {
            setError("Please wait before requesting another email")
            return
        }
        
        setResending(true)
        clearError()
        
        do {
            try await authManager.sendEmailVerification(email: email)
            
            // Success
            emailSent = true
            startCooldownTimer()
            
            print("📧 EmailVerificationViewModel: Verification email resent to: \(email)")
            
        } catch let error as AuthError {
            handleAuthError(error)
        } catch {
            setError("Failed to send verification email. Please try again.")
        }
        
        setResending(false)
    }
    
    // MARK: - State Management
    
    func handleAuthStateChange(_ newState: AuthState) {
        switch newState {
        case .authenticated(let user):
            // User successfully verified and signed in
            print("📧 EmailVerificationViewModel: Email verified for user: \(user.email)")
            
        case .error(let errorMessage):
            setError(errorMessage)
            
        default:
            break
        }
    }
    
    // MARK: - Timer Management
    
    private func startCooldownTimer() {
        resendCooldown = resendCooldownDuration
        
        cooldownTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self = self else {
                timer.invalidate()
                return
            }
            
            Task { @MainActor in
                self.resendCooldown -= 1
                
                if self.resendCooldown <= 0 {
                    self.stopCooldownTimer()
                }
            }
        }
    }
    
    private func stopCooldownTimer() {
        cooldownTimer?.invalidate()
        cooldownTimer = nil
        resendCooldown = 0
    }
    
    // MARK: - Helper Methods
    
    private func handleAuthError(_ error: AuthError) {
        switch error {
        case .networkError:
            setError("Network error. Please check your connection and try again.")
        case .invalidCredentials:
            setError("Invalid email address provided.")
        case .unknown(let message):
            if message.lowercased().contains("rate limit") {
                setError("Too many requests. Please wait before trying again.")
                // Start a longer cooldown for rate limiting
                resendCooldown = resendCooldownDuration * 2
                startCooldownTimer()
            } else {
                setError(message)
            }
        default:
            setError("Failed to send verification email. Please try again.")
        }
    }
    
    private func setResending(_ resending: Bool) {
        isResending = resending
    }
    
    private func setError(_ message: String) {
        errorMessage = message
    }
    
    private func clearError() {
        errorMessage = nil
    }
} 