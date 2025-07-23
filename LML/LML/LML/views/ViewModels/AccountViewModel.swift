//
//  AccountViewModel.swift
//  LML
//
//  ViewModel for account business logic
//  Updated with comprehensive error handling and production services
//

import SwiftUI
import Combine
import LocalAuthentication

// MARK: - Account View Model
@MainActor
class AccountViewModel: ObservableObject {
    @Published var showingSignIn = false
    @Published var showingSignUp = false
    @Published var showingForgotPassword = false
    @Published var showingBiometricSetup = false
    @Published var errorState: AppError?
    @Published var errorMessage: String?
    
    private let authManager: AuthManager
    private var cancellables = Set<AnyCancellable>()
    
    init(authManager: AuthManager) {
        self.authManager = authManager
        setupObservers()
        
        // Debug logging to understand auth state
        print("🔍 AccountViewModel: Initialized with authState: \(authManager.authState)")
    }
    
    // MARK: - Authentication Actions
    
    func showSignUp() {
        print("🔵 AccountViewModel: showSignUp() called")
        print("🔍 AccountViewModel: Current auth state: \(authManager.authState)")
        showingSignUp = true
        print("✅ AccountViewModel: showingSignUp set to true")
    }
    
    func showSignIn() {
        print("🔵 AccountViewModel: showSignIn() called") 
        print("🔍 AccountViewModel: Current auth state: \(authManager.authState)")
        showingSignIn = true
        print("✅ AccountViewModel: showingSignIn set to true")
    }
    
    func showForgotPassword() {
        print("🔵 AccountViewModel: showForgotPassword() called")
        showingForgotPassword = true
        print("✅ AccountViewModel: showingForgotPassword set to true")
    }
    
    func signInWithApple() {
        print("🔍 AccountViewModel: Apple Sign-In requested")
        
        // Immediate feedback for testing
        errorMessage = "Apple Sign-In button tapped! (Check console for details)"
        
        // Clear the test message after a delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            if self.errorMessage == "Apple Sign-In button tapped! (Check console for details)" {
                self.errorMessage = nil
            }
        }
        
        Task {
            do {
                try await authManager.signInWithApple()
                await MainActor.run {
                    print("✅ AccountViewModel: Apple Sign-In successful")
                    self.errorMessage = nil
                }
            } catch {
                await MainActor.run {
                    print("❌ AccountViewModel: Apple Sign-In failed: \(error)")
                    self.handleAuthError(error)
                }
            }
        }
    }
    
    func signInWithGoogle() {
        print("🔍 AccountViewModel: Google Sign-In requested")
        
        // Immediate feedback for testing
        errorMessage = "Google Sign-In button tapped! (Check console for details)"
        
        // Clear the test message after a delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            if self.errorMessage == "Google Sign-In button tapped! (Check console for details)" {
                self.errorMessage = nil
            }
        }
        
        Task {
            do {
                try await authManager.signInWithGoogle()
                await MainActor.run {
                    print("✅ AccountViewModel: Google Sign-In successful")
                    self.errorMessage = nil
                }
            } catch {
                await MainActor.run {
                    print("❌ AccountViewModel: Google Sign-In failed: \(error)")
                    self.handleAuthError(error)
                }
            }
        }
    }
    
    func authenticateWithBiometric() {
        Task {
            do {
                try await authManager.authenticateWithBiometric()
            } catch {
                await MainActor.run {
                    if let authError = error as? AuthError {
                        self.errorState = .biometric(authError.localizedDescription)
                    } else {
                        self.errorState = .biometric("Biometric authentication failed")
                    }
                }
            }
        }
    }
    
    func signOut() {
        authManager.signOut()
    }
    
    func refreshSession() {
        Task {
            do {
                try await authManager.refreshSession()
            } catch {
                await MainActor.run {
                    self.handleAuthError(error)
                }
            }
        }
    }
    
    func enableBiometric() {
        showingBiometricSetup = true
    }
    
    func clearError() {
        errorState = nil
    }
    
    // MARK: - Computed Properties
    
    var authState: AuthState {
        authManager.authState
    }
    
    var currentUser: User? {
        authState.user
    }
    
    var isAuthenticated: Bool {
        authState.isAuthenticated
    }
    
    var userStats: [AccountStat] {
        guard let user = currentUser else { return [] }
        
        return [
            AccountStat(
                title: "Shows Attended",
                value: "12",
                icon: "theatermask.and.paintbrush",
                color: .purple
            ),
            AccountStat(
                title: "Total Tickets",
                value: "24",
                icon: "ticket",
                color: .blue
            ),
            AccountStat(
                title: "Member Since",
                value: formatMemberSince(user.createdAt),
                icon: "calendar",
                color: .green
            )
        ]
    }
    
    // MARK: - Private Methods
    
    private func setupObservers() {
        authManager.$authState
            .sink { [weak self] newState in
                if case .error(let message) = newState {
                    self?.errorState = .authentication(AuthError.unknown(message))
                }
            }
            .store(in: &cancellables)
    }
    
    private func handleAuthError(_ error: Error) {
        // Provide user-friendly error messages for common issues
        if let authError = error as? AuthError {
            switch authError {
            case .socialAuthFailed(let provider):
                if provider.contains("CLIENT_ID missing") {
                    errorMessage = "Google Sign-In setup incomplete. Using development configuration."
                } else if provider.contains("Apple") {
                    errorMessage = "Apple Sign-In may not work on simulator. Try a physical device."
                } else {
                    errorMessage = "\(provider) authentication failed. Please try again."
                }
            default:
                errorState = .authentication(authError)
            }
        } else if let apiError = error as? APIError {
            errorState = .network(apiError)
        } else {
            // Check for specific Apple Sign-In errors
            let errorDescription = error.localizedDescription
            if errorDescription.contains("AuthenticationServices.AuthorizationError") {
                errorMessage = "Apple Sign-In is limited on simulator. Try email sign-in or use a physical device."
            } else {
                errorState = .authentication(AuthError.unknown(error.localizedDescription))
            }
        }
    }
    
    private func formatMemberSince(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM yyyy"
        return formatter.string(from: date)
    }
}

// MARK: - Account Stat Model
struct AccountStat {
    let title: String
    let value: String
    let icon: String
    let color: Color
} 