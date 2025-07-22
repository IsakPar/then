//
//  SignupViewModel.swift
//  Last Minute Live
//
//  View model for SignupView handling user registration logic
//  Implements comprehensive validation and terms acceptance
//

import Foundation
import Combine
import SwiftUI

@MainActor
class SignupViewModel: ObservableObject {
    
    // MARK: - Published Properties
    
    @Published var name: String = ""
    @Published var email: String = ""
    @Published var phone: String = ""
    @Published var password: String = ""
    @Published var confirmPassword: String = ""
    @Published var hasAcceptedTerms: Bool = false
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    @Published var showNameValidation: Bool = false
    @Published var showEmailValidation: Bool = false
    @Published var showPhoneValidation: Bool = false
    @Published var showPasswordValidation: Bool = false
    @Published var showConfirmPasswordValidation: Bool = false
    @Published var showSuccessAlert: Bool = false
    
    // MARK: - Password Requirements
    
    struct PasswordRequirement {
        let text: String
        let isMet: Bool
    }
    
    var passwordRequirements: [PasswordRequirement] {
        [
            PasswordRequirement(
                text: "At least 8 characters",
                isMet: password.count >= 8
            ),
            PasswordRequirement(
                text: "Contains uppercase letter",
                isMet: password.range(of: "[A-Z]", options: .regularExpression) != nil
            ),
            PasswordRequirement(
                text: "Contains lowercase letter",
                isMet: password.range(of: "[a-z]", options: .regularExpression) != nil
            ),
            PasswordRequirement(
                text: "Contains number",
                isMet: password.range(of: "[0-9]", options: .regularExpression) != nil
            )
        ]
    }
    
    // MARK: - Computed Properties
    
    var isNameValid: Bool {
        return name.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
    }
    
    var isEmailValid: Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format:"SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    var isPhoneValid: Bool {
        // Phone is optional, so it's valid if empty or matches pattern
        if phone.isEmpty {
            return true
        }
        
        // Remove non-digits for validation
        let cleanedPhone = phone.components(separatedBy: CharacterSet.decimalDigits.inverted).joined()
        return cleanedPhone.count >= 10 && cleanedPhone.count <= 15
    }
    
    var isPasswordValid: Bool {
        return passwordRequirements.allSatisfy { $0.isMet }
    }
    
    var isConfirmPasswordValid: Bool {
        return !confirmPassword.isEmpty && password == confirmPassword
    }
    
    var canSignUp: Bool {
        return isNameValid &&
               isEmailValid &&
               isPhoneValid &&
               isPasswordValid &&
               isConfirmPasswordValid &&
               hasAcceptedTerms &&
               !isLoading
    }
    
    // MARK: - Private Properties
    
    private var authManager: AuthManager?
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init() {
        setupValidation()
    }
    
    // MARK: - Setup Methods
    
    func setAuthManager(_ authManager: AuthManager) {
        self.authManager = authManager
    }
    
    private func setupValidation() {
        // Name validation
        $name
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.validateNameIfNeeded()
            }
            .store(in: &cancellables)
        
        // Email validation
        $email
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.validateEmailIfNeeded()
            }
            .store(in: &cancellables)
        
        // Phone validation
        $phone
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.validatePhoneIfNeeded()
            }
            .store(in: &cancellables)
        
        // Password validation
        $password
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.validatePasswordIfNeeded()
            }
            .store(in: &cancellables)
        
        // Confirm password validation
        $confirmPassword
            .debounce(for: .milliseconds(500), scheduler: RunLoop.main)
            .sink { [weak self] _ in
                self?.validateConfirmPasswordIfNeeded()
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Validation Methods
    
    private func validateNameIfNeeded() {
        if !name.isEmpty {
            showNameValidation = true
        }
    }
    
    private func validateEmailIfNeeded() {
        if !email.isEmpty {
            showEmailValidation = true
        }
    }
    
    private func validatePhoneIfNeeded() {
        if !phone.isEmpty {
            showPhoneValidation = true
        }
    }
    
    private func validatePasswordIfNeeded() {
        if !password.isEmpty {
            showPasswordValidation = true
        }
    }
    
    private func validateConfirmPasswordIfNeeded() {
        if !confirmPassword.isEmpty {
            showConfirmPasswordValidation = true
        }
    }
    
    // MARK: - Authentication Methods
    
    func signUp() async {
        guard let authManager = authManager else {
            setError("Authentication service not available")
            return
        }
        
        guard canSignUp else {
            validateAllFields()
            return
        }
        
        setLoading(true)
        clearError()
        
        // Prepare signup request
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedPhone = phone.isEmpty ? nil : phone.trimmingCharacters(in: .whitespacesAndNewlines)
        
        let signupRequest = SignUpRequest(
            email: email,
            password: password,
            name: trimmedName,
            phone: trimmedPhone
        )
        
        do {
            let user = try await authManager.signUp(request: signupRequest)
            
            // Success - show success alert
            showSuccessAlert = true
            clearForm()
            
            print("🔐 SignupViewModel: Successfully created account for: \(user.email)")
            
        } catch let error as AuthError {
            handleAuthError(error)
        } catch {
            setError("An unexpected error occurred. Please try again.")
        }
        
        setLoading(false)
    }
    
    // MARK: - UI Actions
    
    func toggleTermsAccepted() {
        hasAcceptedTerms.toggle()
    }
    
    // MARK: - State Management
    
    func handleAuthStateChange(_ newState: AuthState) {
        switch newState {
        case .emailVerificationRequired(let email):
            // Account created successfully, email verification required
            showSuccessAlert = true
            clearForm()
            
        case .error(let errorMessage):
            setError(errorMessage)
            
        default:
            break
        }
    }
    
    // MARK: - Helper Methods
    
    private func validateAllFields() {
        showNameValidation = true
        showEmailValidation = true
        showPhoneValidation = true
        showPasswordValidation = true
        showConfirmPasswordValidation = true
        
        // Set appropriate error message based on first invalid field
        if !isNameValid {
            setError("Name must be at least 2 characters")
        } else if !isEmailValid {
            setError("Please enter a valid email address")
        } else if !isPhoneValid {
            setError("Please enter a valid phone number")
        } else if !isPasswordValid {
            setError("Password does not meet requirements")
        } else if !isConfirmPasswordValid {
            setError("Passwords do not match")
        } else if !hasAcceptedTerms {
            setError("Please accept the Terms of Service and Privacy Policy")
        }
    }
    
    private func handleAuthError(_ error: AuthError) {
        switch error {
        case .invalidCredentials:
            setError("Invalid information provided. Please check your details.")
        case .networkError:
            setError("Network error. Please check your connection and try again.")
        case .unknown(let message):
            if message.lowercased().contains("email") && message.lowercased().contains("exists") {
                setError("An account with this email already exists. Please sign in instead.")
            } else {
                setError(message)
            }
        default:
            setError("Failed to create account. Please try again.")
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
        name = ""
        email = ""
        phone = ""
        password = ""
        confirmPassword = ""
        hasAcceptedTerms = false
        showNameValidation = false
        showEmailValidation = false
        showPhoneValidation = false
        showPasswordValidation = false
        showConfirmPasswordValidation = false
        clearError()
    }
} 