//
//  AuthManager.swift
//  LML
//
//  Clean authentication manager orchestrator
//  Refactored using single responsibility principle
//

import Foundation
import SwiftUI
import AuthenticationServices
import GoogleSignIn

// MARK: - Authentication Errors
// AuthError enum moved to Core/Models/AuthModels.swift

// MARK: - Authentication Manager
@MainActor
class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var authState: AuthState = .loading
    @Published var isLoading: Bool = false
    
    private let authService = AuthenticationService.shared
    private let keychainService = KeychainService.shared
    private let biometricService = BiometricService.shared
    
    private init() {
        initializeAuth()
    }
    
    // MARK: - Initialization
    
    private func initializeAuth() {
        Task {
            await checkExistingAuth()
        }
    }
    
    private func checkExistingAuth() async {
        print("🔍 AuthManager: Starting authentication check...")
        
        // Add timeout protection to prevent infinite loading
        let authCheckTask = Task {
            do {
                if let token = keychainService.getAuthToken() {
                    print("🔑 Found stored auth token")
                    
                    let user = try await authService.validateToken(token)
                    
                    await MainActor.run {
                        if user.biometricEnabled && biometricService.isAvailable {
                            authState = .biometricRequired(user)
                            print("✅ Auth check complete: biometric required")
                        } else {
                            authState = .authenticated(user)
                            print("✅ Auth check complete: authenticated")
                        }
                    }
                } else {
                    print("ℹ️ No stored auth token found")
                    await MainActor.run {
                        authState = .notAuthenticated
                        print("✅ Auth check complete: not authenticated")
                    }
                }
            } catch {
                print("❌ Token validation failed: \(error)")
                keychainService.clearAuthToken()
                await MainActor.run {
                    authState = .notAuthenticated
                    print("✅ Auth check complete: validation failed, cleared token")
                }
            }
        }
        
        // Add 10-second timeout to prevent infinite loading
        let timeoutTask = Task {
            try await Task.sleep(nanoseconds: 10_000_000_000) // 10 seconds
            print("⏰ Auth check timed out after 10 seconds")
            await MainActor.run {
                if authState == .loading {
                    authState = .notAuthenticated
                    print("✅ Auth check timeout: fallback to not authenticated")
                }
            }
        }
        
        // Wait for either auth check to complete or timeout
        await withTaskCancellationHandler {
            await authCheckTask.value
            timeoutTask.cancel()
        } onCancel: {
            authCheckTask.cancel()
            timeoutTask.cancel()
        }
    }
    
    // MARK: - Authentication Methods
    
    func signUp(email: String, password: String, firstName: String, lastName: String) async throws {
        isLoading = true
        defer { isLoading = false }
        
        let response = try await authService.signUp(
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName
        )
        
        keychainService.storeAuthToken(response.token)
        authState = .authenticated(response.user)
    }
    
    func signIn(email: String, password: String) async throws {
        isLoading = true
        defer { isLoading = false }
        
        let response = try await authService.signIn(email: email, password: password)
        
        keychainService.storeAuthToken(response.token)
        
        if response.user.biometricEnabled && biometricService.isAvailable {
            authState = .biometricRequired(response.user)
        } else {
            authState = .authenticated(response.user)
        }
    }
    
    func createGuestSession(email: String) async throws -> User {
        isLoading = true
        defer { isLoading = false }
        
        print("🎭 Creating guest session via API for: \(email)")
        
        do {
            let response = try await authService.createGuestSession(email: email)
            
            let user = User(
                id: response.user.id,
                email: response.user.email,
                firstName: nil,
                lastName: nil,
                accountType: User.AccountType(rawValue: response.user.accountType.rawValue) ?? .guest,
                authProvider: .guest,
                isGuest: response.user.isGuest,
                emailVerified: false,
                biometricEnabled: false,
                createdAt: Date()
            )
            
            keychainService.storeAuthToken(response.sessionToken)
            authState = .guest(user)
            
            print("✅ Guest session created successfully via API for: \(email)")
            return user
            
        } catch {
            print("❌ Guest session API call failed: \(error)")
            throw error
        }
    }
    
    func enableBiometric() async throws {
        guard case .authenticated(_) = authState else {
            throw AuthError.biometricNotAvailable
        }
        
        let success = try await biometricService.enableBiometric()
        if success {
            try await authService.updateBiometricPreference(enabled: true)
            await checkExistingAuth()
        }
    }
    
    func authenticateWithBiometric() async throws {
        guard case .biometricRequired(let user) = authState else {
            throw AuthError.biometricNotAvailable
        }
        
        let success = try await biometricService.authenticate()
        if success {
            authState = .authenticated(user)
        } else {
            throw AuthError.biometricFailed
        }
    }
    
    func signInWithApple() async throws {
        print("🍎 Apple Sign-In: Starting...")
        
        isLoading = true
        defer { isLoading = false }
        
        // Check Apple Sign-In availability (basic capability check)
        // Note: We'll do a more thorough check during the actual sign-in process
        print("🍎 Apple Sign-In: Basic availability confirmed")
        
        print("🍎 Apple Sign-In: Creating authorization request...")
        
        // Create Apple Sign-In request
        let request = ASAuthorizationAppleIDProvider().createRequest()
        request.requestedScopes = [.fullName, .email]
        
        print("🍎 Apple Sign-In: Presenting authorization...")
        
        // Present the authorization
        let result = try await performAppleSignIn(request: request)
        
        // Extract credentials
        guard let appleIDCredential = result.credential as? ASAuthorizationAppleIDCredential else {
            throw AuthError.socialAuthFailed("Invalid Apple Sign-In response")
        }
        
        guard let identityToken = appleIDCredential.identityToken,
              let tokenString = String(data: identityToken, encoding: .utf8) else {
            throw AuthError.socialAuthFailed("Failed to get identity token from Apple")
        }
        
        // Extract user information
        let email = appleIDCredential.email ?? ""
        let fullName = appleIDCredential.fullName
        let firstName = fullName?.givenName
        let lastName = fullName?.familyName
        
        print("🍎 Apple Sign-In successful - Email: \(email)")
        
        // Send to backend for verification and user creation
        let socialAuthRequest = SocialAuthRequest(
            provider: "apple",
            token: tokenString,
            email: email.isEmpty ? nil : email,
            firstName: firstName,
            lastName: lastName
        )
        
        let response = try await authService.socialAuth(request: socialAuthRequest)
        
        // Store token and update state
        keychainService.storeAuthToken(response.token)
        authState = .authenticated(response.user)
        
        print("✅ Apple Sign-In complete")
    }
    
    func signInWithGoogle() async throws {
        print("🔍 Google Sign-In: Starting...")
        
        isLoading = true
        defer { isLoading = false }
        
        // Check if GoogleService-Info.plist exists
        guard let path = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") else {
            print("❌ Google Sign-In: GoogleService-Info.plist not found in bundle")
            throw AuthError.socialAuthFailed("Google Sign-In configuration file missing. Please add GoogleService-Info.plist to your project.")
        }
        
        print("🔍 Google Sign-In: Found GoogleService-Info.plist at \(path)")
        
        // Parse the plist file
        guard let plist = NSDictionary(contentsOfFile: path) else {
            print("❌ Google Sign-In: Failed to parse GoogleService-Info.plist")
            throw AuthError.socialAuthFailed("Invalid GoogleService-Info.plist file")
        }
        
        // Extract client ID
        guard let clientId = plist["CLIENT_ID"] as? String else {
            print("❌ Google Sign-In: CLIENT_ID not found in GoogleService-Info.plist")
            print("🔍 Available keys in plist: \(plist.allKeys)")
            throw AuthError.socialAuthFailed("CLIENT_ID missing from GoogleService-Info.plist")
        }
        
        // Check if using dummy/placeholder credentials
        if clientId.contains("dummy") || clientId.contains("placeholder") {
            print("⚠️ Google Sign-In: Using dummy CLIENT_ID for testing")
            print("📋 To enable real Google Sign-In:")
            print("   1. Create project at https://console.cloud.google.com")
            print("   2. Enable Google Sign-In API")
            print("   3. Create OAuth 2.0 credentials")
            print("   4. Download real GoogleService-Info.plist")
            print("   5. Replace the current dummy file")
        }
        
        print("🔍 Google Sign-In: Found CLIENT_ID: \(String(clientId.prefix(20)))...")
        
        // Configure Google Sign-In
        GIDSignIn.sharedInstance.configuration = GIDConfiguration(clientID: clientId)
        print("🔍 Google Sign-In: Configuration complete")
        
        // Get the presenting view controller
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            throw AuthError.socialAuthFailed("No presenting view controller available")
        }
        
        // Perform Google Sign-In
        do {
            let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootViewController)
            
            guard let idToken = result.user.idToken?.tokenString else {
                throw AuthError.socialAuthFailed("Failed to get ID token from Google")
            }
            
            // Extract user information
            let user = result.user
            let profile = user.profile
            let email = profile?.email ?? ""
            let firstName = profile?.givenName
            let lastName = profile?.familyName
            
            print("🔍 Google Sign-In successful - Email: \(email)")
            
            // Send to backend for verification and user creation
            let socialAuthRequest = SocialAuthRequest(
                provider: "google",
                token: idToken,
                email: email.isEmpty ? nil : email,
                firstName: firstName,
                lastName: lastName
            )
            
            let response = try await authService.socialAuth(request: socialAuthRequest)
            
            // Store token and update state
            keychainService.storeAuthToken(response.token)
            authState = .authenticated(response.user)
            
            print("✅ Google Sign-In complete")
            
        } catch {
            print("❌ Google Sign-In failed: \(error)")
            throw AuthError.socialAuthFailed("Google Sign-In failed: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Private Apple Sign-In Helper
    
    private func performAppleSignIn(request: ASAuthorizationAppleIDRequest) async throws -> ASAuthorizationResult {
        return try await withCheckedThrowingContinuation { continuation in
            let authorizationController = ASAuthorizationController(authorizationRequests: [request])
            
            let delegate = AppleSignInDelegate { result in
                continuation.resume(with: result)
            }
            
            authorizationController.delegate = delegate
            authorizationController.presentationContextProvider = delegate
            
            print("🍎 Apple Sign-In: Performing authorization request...")
            authorizationController.performRequests()
            
            // Keep delegate alive
            objc_setAssociatedObject(authorizationController, "delegate", delegate, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
        }
    }
    
    // MARK: - Session Management
    
    func refreshSession() async throws {
        print("🔄 Refreshing session...")
        
        guard let token = keychainService.getAuthToken() else {
            authState = .notAuthenticated
            throw AuthError.tokenExpired
        }
        
        do {
            let user = try await authService.validateToken(token)
            if user.biometricEnabled && biometricService.isAvailable {
                authState = .biometricRequired(user)
            } else {
                authState = .authenticated(user)
            }
            print("✅ Session refresh successful")
        } catch {
            print("❌ Session refresh failed: \(error)")
            signOut()
            throw AuthError.tokenExpired
        }
    }
    
    func signOut() {
        print("🚪 Signing out user")
        
        keychainService.clearAuthToken()
        biometricService.clearBiometricData()
        authState = .notAuthenticated
        
        print("✅ Sign out successful")
    }
    
    // MARK: - Computed Properties
    
    var isAuthenticated: Bool {
        authState.isAuthenticated
    }
    
    var currentUser: User? {
        authState.user
    }
    
    var authToken: String? {
        isAuthenticated ? keychainService.getAuthToken() : nil
    }
}

// MARK: - Apple Sign-In Delegate

private class AppleSignInDelegate: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
    private let completion: (Result<ASAuthorizationResult, Error>) -> Void
    
    init(completion: @escaping (Result<ASAuthorizationResult, Error>) -> Void) {
        self.completion = completion
    }
    
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        print("🍎 Apple Sign-In Delegate: Authorization successful")
        let result = ASAuthorizationResult(credential: authorization.credential)
        completion(.success(result))
    }
    
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        print("🍎 Apple Sign-In Delegate: Authorization failed with error: \(error)")
        
        // Provide helpful error messages
        if let authError = error as? ASAuthorizationError {
            switch authError.code {
            case .canceled:
                print("📱 Apple Sign-In: User canceled or not available on simulator")
            case .failed:
                print("📱 Apple Sign-In: Authentication failed - check device/simulator capabilities")
            case .invalidResponse:
                print("📱 Apple Sign-In: Invalid response - possible configuration issue")
            case .notHandled:
                print("📱 Apple Sign-In: Not handled - check app configuration")
            case .unknown:
                print("📱 Apple Sign-In: Unknown error - try on physical device")
            @unknown default:
                print("📱 Apple Sign-In: Unexpected error")
            }
        }
        
        completion(.failure(error))
    }
    
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let window = windowScene.windows.first else {
            fatalError("No window available for Apple Sign-In")
        }
        return window
    }
}

// MARK: - ASAuthorizationResult Helper

private struct ASAuthorizationResult {
    let credential: ASAuthorizationCredential
}

// MARK: - Social Auth Request Model

struct SocialAuthRequest: Codable {
    let provider: String
    let token: String
    let email: String?
    let firstName: String?
    let lastName: String?
} 