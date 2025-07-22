//
//  AuthManager.swift
//  Last Minute Live
//
//  Authentication manager handling user auth state and flows
//  Mirrors functionality from mobile-app/src/contexts/AuthContext.tsx
//

import Foundation
import Combine
import LocalAuthentication
import UIKit

// MARK: - JWT Payload Model

struct JWTPayload: Codable {
    let exp: TimeInterval
    let iat: TimeInterval?
    let sub: String?
    let email: String?
    
    enum CodingKeys: String, CodingKey {
        case exp, iat, sub, email
    }
}

// MARK: - Extended Keychain Manager Protocol

protocol ExtendedKeychainManagerProtocol: KeychainManagerProtocol {
    // Convenience methods that AuthManager needs
    func storeAuthToken(_ token: String) throws
    func getAuthToken() throws -> String?
    func getAuthTokenWithBiometrics() async throws -> String?
    func storeUserCredentials(userID: String, email: String) throws
    func getUserCredentials() throws -> (userID: String?, email: String?)
    func isBiometricEnabledForApp() -> Bool
    func setBiometricEnabledForApp(_ enabled: Bool) throws
    func areCredentialsExpired(maxAge: TimeInterval) -> Bool
    func promptBiometricSetup() async throws -> Bool
}

// Extend KeychainManager to conform to ExtendedKeychainManagerProtocol
extension KeychainManager: ExtendedKeychainManagerProtocol {}

// MARK: - Authentication State

enum AuthState: Equatable {
    case unauthenticated
    case authenticating
    case authenticated(User)
    case biometricRequired
    case emailVerificationRequired(String) // email
    case error(String)
    
    var isAuthenticated: Bool {
        if case .authenticated = self {
            return true
        }
        return false
    }
    
    var user: User? {
        if case .authenticated(let user) = self {
            return user
        }
        return nil
    }
    
    static func == (lhs: AuthState, rhs: AuthState) -> Bool {
        switch (lhs, rhs) {
        case (.unauthenticated, .unauthenticated),
             (.authenticating, .authenticating),
             (.biometricRequired, .biometricRequired):
            return true
        case (.authenticated(let lhsUser), .authenticated(let rhsUser)):
            return lhsUser.id == rhsUser.id
        case (.emailVerificationRequired(let lhsEmail), .emailVerificationRequired(let rhsEmail)):
            return lhsEmail == rhsEmail
        case (.error(let lhsMessage), .error(let rhsMessage)):
            return lhsMessage == rhsMessage
        default:
            return false
        }
    }
}

// MARK: - Auth Manager Protocol

protocol AuthManagerProtocol: ObservableObject {
    var authState: AuthState { get }
    var isAuthenticated: Bool { get }
    var currentUser: User? { get }
    var authToken: String? { get }
    var isBiometricEnabled: Bool { get }
    
    // Authentication methods
    func signIn(email: String, password: String) async throws -> User
    func signUp(request: SignUpRequest) async throws -> User
    func socialSignIn(request: SocialAuthRequest) async throws -> User
    func signInWithBiometrics() async throws -> User
    func signOut() async throws
    
    // Token management
    func refreshTokenIfNeeded() async throws
    func verifyCurrentToken() async throws -> Bool
    
    // Email verification
    func sendEmailVerification(email: String) async throws
    func verifyEmail(token: String, email: String) async throws
    
    // Password reset
    func resetPassword(email: String) async throws
    
    // Biometric settings
    func enableBiometricAuth() async throws -> Bool
    func disableBiometricAuth() async throws
    
    // Session management
    func checkAuthenticationStatus() async
    func clearAuthenticationData() async throws
}

// MARK: - Auth Manager Implementation

@MainActor
class AuthManager: AuthManagerProtocol {
    
    // MARK: - Published Properties
    
    @Published private(set) var authState: AuthState = .unauthenticated
    @Published private(set) var isLoading = false
    @Published private(set) var lastError: Error?
    
    // MARK: - Computed Properties
    
    var isAuthenticated: Bool {
        return authState.isAuthenticated
    }
    
    var currentUser: User? {
        return authState.user
    }
    
    var authToken: String? {
        do {
            return try keychainManager.getAuthToken()
        } catch {
            print("🔐 AuthManager: Failed to retrieve auth token - \(error)")
            return nil
        }
    }
    
    var isBiometricEnabled: Bool {
        return keychainManager.isBiometricEnabledForApp() && keychainManager.isBiometricAvailable()
    }
    
    // MARK: - Dependencies
    
    private let apiClient: APIClient
    private let keychainManager: ExtendedKeychainManagerProtocol
    private let notificationCenter: NotificationCenter
    
    // MARK: - Private Properties
    
    private var cancellables = Set<AnyCancellable>()
    private var tokenRefreshTask: Task<Void, Never>?
    private let sessionExpirationWarningTime: TimeInterval = 5 * 60 // 5 minutes
    
    // MARK: - Initialization
    
    init(apiClient: APIClient, 
         keychainManager: ExtendedKeychainManagerProtocol = KeychainManager.shared,
         notificationCenter: NotificationCenter = .default) {
        
        self.apiClient = apiClient
        self.keychainManager = keychainManager
        self.notificationCenter = notificationCenter
        
        setupNotificationObservers()
        
        // Check authentication status on initialization - ensuring MainActor context
        Task { @MainActor in
            await checkAuthenticationStatus()
        }
    }
    
    deinit {
        tokenRefreshTask?.cancel()
        cancellables.removeAll()
    }
    
    // MARK: - Setup
    
    private func setupNotificationObservers() {
        // Observe app lifecycle events
        notificationCenter.publisher(for: UIApplication.willEnterForegroundNotification)
            .sink { [weak self] _ in
                Task { @MainActor in
                    await self?.checkAuthenticationStatus()
                }
            }
            .store(in: &cancellables)
        
        // Observe app backgrounding
        notificationCenter.publisher(for: UIApplication.didEnterBackgroundNotification)
            .sink { [weak self] _ in
                Task { @MainActor in
                    self?.tokenRefreshTask?.cancel()
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Authentication Methods
    
    func signIn(email: String, password: String) async throws -> User {
        setLoading(true)
        authState = .authenticating
        
        do {
            let credentials = SignInRequest(email: email, password: password)
            let response = try await apiClient.signIn(credentials: credentials)
            
            guard response.success, 
                  let user = response.user,
                  let token = response.token else {
                throw AuthError.invalidCredentials
            }
            
            // Check if email verification is required
            if response.requiresVerification == true {
                authState = .emailVerificationRequired(email)
                throw AuthError.emailNotVerified
            }
            
            // Store credentials securely
            try await storeUserCredentials(user: user, token: token)
            
            // Update auth state
            authState = .authenticated(user)
            
            // Start token refresh monitoring
            await startTokenRefreshMonitoring()
            
            // Send authentication success notification
            notificationCenter.post(name: .authenticationDidSucceed, object: user)
            
            setLoading(false)
            return user
            
        } catch {
            authState = .error(error.localizedDescription)
            setLoading(false)
            lastError = error
            
            // Send authentication failure notification
            notificationCenter.post(name: .authenticationDidFail, object: error)
            
            throw error
        }
    }
    
    func signUp(request: SignUpRequest) async throws -> User {
        setLoading(true)
        authState = .authenticating
        
        do {
            let response = try await apiClient.signUp(request: request)
            
            guard response.success else {
                let error = AuthError.accountAlreadyExists
                authState = .error(error.localizedDescription)
                throw error
            }
            
            // For signup, usually email verification is required
            authState = .emailVerificationRequired(request.email)
            setLoading(false)
            
            // Send verification email automatically
            try await sendEmailVerification(email: request.email)
            
            // Return a placeholder user for UI purposes
            let user = User(
                id: "pending",
                email: request.email,
                name: request.name,
                role: .customer,
                emailVerified: nil,
                createdAt: ISO8601DateFormatter().string(from: Date()),
                updatedAt: ISO8601DateFormatter().string(from: Date())
            )
            
            return user
            
        } catch {
            authState = .error(error.localizedDescription)
            setLoading(false)
            lastError = error
            throw error
        }
    }
    
    func socialSignIn(request: SocialAuthRequest) async throws -> User {
        setLoading(true)
        authState = .authenticating
        
        do {
            let response = try await apiClient.socialAuth(request: request)
            
            guard response.success,
                  let user = response.user,
                  let token = response.token else {
                throw AuthError.socialAuthFailed(request.provider)
            }
            
            // Store credentials securely
            try await storeUserCredentials(user: user, token: token)
            
            // Update auth state
            authState = .authenticated(user)
            
            // Start token refresh monitoring
            await startTokenRefreshMonitoring()
            
            setLoading(false)
            return user
            
        } catch {
            authState = .error(error.localizedDescription)
            setLoading(false)
            lastError = error
            throw error
        }
    }
    
    func signInWithBiometrics() async throws -> User {
        guard keychainManager.isBiometricAvailable() else {
            throw AuthError.biometricNotAvailable
        }
        
        guard keychainManager.isBiometricEnabledForApp() else {
            authState = .biometricRequired
            throw AuthError.biometricNotAvailable
        }
        
        setLoading(true)
        authState = .authenticating
        
        do {
            // Retrieve token with biometric authentication
            guard let token = try await keychainManager.getAuthTokenWithBiometrics() else {
                throw AuthError.tokenExpired
            }
            
            // Verify token with backend
            let response = try await apiClient.verifyToken()
            
            guard response.success, let user = response.user else {
                // Token is invalid, clear it
                try await clearAuthenticationData()
                throw AuthError.tokenExpired
            }
            
            // Update auth state
            authState = .authenticated(user)
            
            // Start token refresh monitoring
            await startTokenRefreshMonitoring()
            
            setLoading(false)
            return user
            
        } catch {
            authState = .error(error.localizedDescription)
            setLoading(false)
            lastError = error
            throw error
        }
    }
    
    func signOut() async throws {
        setLoading(true)
        
        do {
            // Clear all stored authentication data
            try await clearAuthenticationData()
            
            // Cancel token refresh monitoring
            tokenRefreshTask?.cancel()
            tokenRefreshTask = nil
            
            // Update auth state
            authState = .unauthenticated
            
            // Send sign out notification
            notificationCenter.post(name: .authenticationDidSignOut, object: nil)
            
            setLoading(false)
            
        } catch {
            setLoading(false)
            throw error
        }
    }
    
    // MARK: - Token Management
    
    func refreshTokenIfNeeded() async throws {
        guard let token = authToken else {
            throw AuthError.tokenExpired
        }
        
        // Check if token is close to expiration
        if isTokenCloseToExpiration(token) {
            // Token is close to expiration, verify and potentially refresh
            let isValid = try await verifyCurrentToken()
            if !isValid {
                throw AuthError.tokenExpired
            }
        }
    }
    
    func verifyCurrentToken() async throws -> Bool {
        guard authToken != nil else {
            authState = .unauthenticated
            return false
        }
        
        do {
            let response = try await apiClient.verifyToken()
            
            if response.success, let user = response.user {
                authState = .authenticated(user)
                return true
            } else {
                // Token is invalid
                try await clearAuthenticationData()
                authState = .unauthenticated
                return false
            }
            
        } catch {
            // Token verification failed
            try await clearAuthenticationData()
            authState = .unauthenticated
            return false
        }
    }
    
    // MARK: - Email Verification
    
    func sendEmailVerification(email: String) async throws {
        let success = try await apiClient.sendEmailVerification(email: email)
        if !success {
            throw AuthError.emailNotVerified
        }
    }
    
    func verifyEmail(token: String, email: String) async throws {
        let success = try await apiClient.verifyEmail(token: token, email: email)
        if success {
            // Email verification successful, update state
            if case .emailVerificationRequired = authState {
                // User needs to sign in again after verification
                authState = .unauthenticated
            }
        } else {
            // Update error state when verification fails
            authState = .error("Email verification failed")
            throw AuthError.emailNotVerified
        }
    }
    
    // MARK: - Password Reset
    
    func resetPassword(email: String) async throws {
        let success = try await apiClient.resetPassword(email: email)
        if !success {
            throw AuthError.networkError
        }
    }
    
    // MARK: - Biometric Settings
    
    func enableBiometricAuth() async throws -> Bool {
        guard keychainManager.isBiometricAvailable() else {
            throw AuthError.biometricNotAvailable
        }
        
        do {
            // Prompt for biometric authentication to confirm setup
            let success = try await keychainManager.promptBiometricSetup()
            
            if success {
                // Enable biometric for the app
                try keychainManager.setBiometricEnabledForApp(true)
                
                // If user is currently authenticated, re-store token with biometric protection
                if let user = currentUser, let token = authToken {
                    try await storeUserCredentials(user: user, token: token)
                }
                
                return true
            } else {
                return false
            }
            
        } catch {
            throw error
        }
    }
    
    func disableBiometricAuth() async throws {
        try keychainManager.setBiometricEnabledForApp(false)
        
        // Re-store credentials without biometric protection if user is authenticated
        // This ensures credentials remain accessible after disabling biometrics
        if let user = currentUser, let token = authToken {
            try await storeUserCredentials(user: user, token: token)
        }
    }
    
    // MARK: - Session Management
    
    func checkAuthenticationStatus() async {
        // Check if we have stored credentials
        guard let token = authToken else {
            authState = .unauthenticated
            return
        }
        
        // Check if credentials are expired (using default 30 days)
        if keychainManager.areCredentialsExpired(maxAge: 30 * 24 * 60 * 60) {
            try? await clearAuthenticationData()
            authState = .unauthenticated
            return
        }
        
        // Verify token with backend
        do {
            let isValid = try await verifyCurrentToken()
            if isValid {
                await startTokenRefreshMonitoring()
            }
        } catch {
            authState = .unauthenticated
        }
    }
    
    func clearAuthenticationData() async throws {
        do {
            try keychainManager.clear()
        } catch {
            print("🔐 AuthManager: Failed to clear keychain - \(error)")
            throw AuthError.keychainError
        }
    }
    
    // MARK: - Private Methods
    
    private func storeUserCredentials(user: User, token: String) async throws {
        do {
            // Store auth token
            try keychainManager.storeAuthToken(token)
            
            // Store user information
            try keychainManager.storeUserCredentials(userID: user.id, email: user.email)
            
        } catch {
            print("🔐 AuthManager: Failed to store credentials - \(error)")
            throw AuthError.keychainError
        }
    }
    
    private func setLoading(_ loading: Bool) {
        isLoading = loading
    }
    
    private func startTokenRefreshMonitoring() async {
        // Cancel existing task
        tokenRefreshTask?.cancel()
        
        // Start monitoring for token expiration
        tokenRefreshTask = Task { @MainActor in
            while !Task.isCancelled {
                do {
                    try await Task.sleep(nanoseconds: 60_000_000_000) // Check every minute
                    
                    guard !Task.isCancelled else { break }
                    
                    do {
                        try await refreshTokenIfNeeded()
                    } catch {
                        // Log token refresh errors but don't break the monitoring loop
                        print("🔐 AuthManager: Token refresh failed during monitoring - \(error)")
                        
                        // If token is expired, break the monitoring loop
                        if let authError = error as? AuthError, authError == AuthError.tokenExpired {
                            break
                        }
                    }
                } catch {
                    // Handle Task.sleep errors
                    print("🔐 AuthManager: Token monitoring interrupted - \(error)")
                    break
                }
            }
        }
    }
    
    private func isTokenCloseToExpiration(_ token: String) -> Bool {
        // Parse JWT token to check expiration with proper error handling
        guard let payload = decodeJWTPayload(token) else {
            print("🔐 AuthManager: Unable to decode JWT payload, assuming token is expired")
            return true // Assume expired if we can't parse
        }
        
        let expirationDate = Date(timeIntervalSince1970: payload.exp)
        let warningDate = expirationDate.addingTimeInterval(-sessionExpirationWarningTime)
        
        let isCloseToExpiration = Date() >= warningDate
        
        if isCloseToExpiration {
            print("🔐 AuthManager: Token is close to expiration. Expires at: \(expirationDate)")
        }
        
        return isCloseToExpiration
    }
    
    private func decodeJWTPayload(_ token: String) -> JWTPayload? {
        let components = token.components(separatedBy: ".")
        guard components.count >= 2 else {
            print("🔐 AuthManager: Invalid JWT format - insufficient components")
            return nil
        }
        
        let payload = components[1]
        
        // Add padding if needed
        var paddedPayload = payload
        let remainder = payload.count % 4
        if remainder > 0 {
            paddedPayload += String(repeating: "=", count: 4 - remainder)
        }
        
        guard let data = Data(base64Encoded: paddedPayload) else {
            print("🔐 AuthManager: Failed to decode base64 JWT payload")
            return nil
        }
        
        do {
            let jwtPayload = try JSONDecoder().decode(JWTPayload.self, from: data)
            return jwtPayload
        } catch {
            print("🔐 AuthManager: Failed to decode JWT payload as typed struct - \(error)")
            
            // Fallback to basic JSON parsing for exp field
            do {
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                if let exp = json?["exp"] as? TimeInterval {
                    return JWTPayload(exp: exp, iat: nil, sub: nil, email: nil)
                }
            } catch {
                print("🔐 AuthManager: Failed to parse JWT as JSON - \(error)")
            }
            
            return nil
        }
    }
}

// MARK: - Mock Auth Manager for Testing

class MockAuthManager: AuthManagerProtocol {
    
    @Published var authState: AuthState = .unauthenticated
    @Published var isLoading = false
    
    var isAuthenticated: Bool {
        return authState.isAuthenticated
    }
    
    var currentUser: User? {
        return authState.user
    }
    
    var authToken: String? {
        return isAuthenticated ? "mock_token" : nil
    }
    
    var isBiometricEnabled: Bool = false
    
    private var shouldFailAuth = false
    private var mockUser: User?
    
    func setAuthFailure(_ shouldFail: Bool) {
        shouldFailAuth = shouldFail
    }
    
    func setMockUser(_ user: User?) {
        mockUser = user
    }
    
    func signIn(email: String, password: String) async throws -> User {
        isLoading = true
        
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5 second delay
        
        if shouldFailAuth {
            authState = .error("Mock authentication failed")
            isLoading = false
            throw AuthError.invalidCredentials
        }
        
        let user = mockUser ?? User(
            id: "mock_user_id",
            email: email,
            name: "Mock User",
            role: .customer,
            emailVerified: ISO8601DateFormatter().string(from: Date()),
            createdAt: ISO8601DateFormatter().string(from: Date()),
            updatedAt: ISO8601DateFormatter().string(from: Date())
        )
        
        authState = .authenticated(user)
        isLoading = false
        return user
    }
    
    func signUp(request: SignUpRequest) async throws -> User {
        return try await signIn(email: request.email, password: request.password)
    }
    
    func socialSignIn(request: SocialAuthRequest) async throws -> User {
        return try await signIn(email: request.email ?? "mock@example.com", password: "password")
    }
    
    func signInWithBiometrics() async throws -> User {
        if !isBiometricEnabled {
            throw AuthError.biometricNotAvailable
        }
        return try await signIn(email: "biometric@example.com", password: "password")
    }
    
    func signOut() async throws {
        authState = .unauthenticated
    }
    
    func refreshTokenIfNeeded() async throws {
        // Mock implementation
    }
    
    func verifyCurrentToken() async throws -> Bool {
        return isAuthenticated
    }
    
    func sendEmailVerification(email: String) async throws {
        // Mock implementation
    }
    
    func verifyEmail(token: String, email: String) async throws {
        // Mock implementation
    }
    
    func resetPassword(email: String) async throws {
        // Mock implementation
    }
    
    func enableBiometricAuth() async throws -> Bool {
        isBiometricEnabled = true
        return true
    }
    
    func disableBiometricAuth() async throws {
        isBiometricEnabled = false
    }
    
    func checkAuthenticationStatus() async {
        // Mock implementation
    }
    
    func clearAuthenticationData() async throws {
        authState = .unauthenticated
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let authenticationDidSucceed = Notification.Name("authenticationDidSucceed")
    static let authenticationDidFail = Notification.Name("authenticationDidFail")
    static let authenticationDidSignOut = Notification.Name("authenticationDidSignOut")
    static let tokenWillExpire = Notification.Name("tokenWillExpire")
    static let biometricAuthenticationRequired = Notification.Name("biometricAuthenticationRequired")
} 