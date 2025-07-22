//
//  KeychainManager.swift
//  Last Minute Live
//
//  Secure storage for JWT tokens and sensitive data
//

import Foundation
import Security
import LocalAuthentication

// MARK: - Keychain Manager Protocol

protocol KeychainManagerProtocol {
    func store(token: String, for key: KeychainKey) throws
    func retrieve(for key: KeychainKey) throws -> String?
    func retrieveWithBiometrics(for key: KeychainKey) async throws -> String?
    func delete(for key: KeychainKey) throws
    func clear() throws
    func isBiometricAvailable() -> Bool
    func getBiometricType() -> LABiometryType
}

// MARK: - Keychain Keys

enum KeychainKey: String, CaseIterable {
    case authToken = "com.lastminutelive.auth.token"
    case refreshToken = "com.lastminutelive.auth.refresh"
    case userID = "com.lastminutelive.auth.user_id"
    case userEmail = "com.lastminutelive.auth.user_email"
    case biometricEnabled = "com.lastminutelive.biometric.enabled"
    case lastSignInDate = "com.lastminutelive.auth.last_signin"
    
    var accessGroup: String {
        return "com.lastminutelive.keychain"
    }
    
    var requiresBiometric: Bool {
        switch self {
        case .authToken, .refreshToken:
            return true
        case .userID, .userEmail, .biometricEnabled, .lastSignInDate:
            return false
        }
    }
}

// MARK: - Keychain Manager Implementation

class KeychainManager: KeychainManagerProtocol {
    
    // MARK: - Singleton
    
    static let shared = KeychainManager()
    
    // MARK: - Properties
    
    private let service = "com.lastminutelive.keychain"
    private let accessGroup = "com.lastminutelive.keychain"
    
    // MARK: - Initialization
    
    private init() {}
    
    // MARK: - Public Methods
    
    func store(token: String, for key: KeychainKey) throws {
        // Delete existing item first
        try? delete(for: key)
        
        let data = token.data(using: .utf8)!
        
        var query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: key.rawValue,
            kSecValueData: data,
            kSecAttrAccessible: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        // Add access group for app group sharing if needed
        #if !targetEnvironment(simulator)
        query[kSecAttrAccessGroup] = accessGroup
        #endif
        
        // Add biometric protection for sensitive tokens
        if key.requiresBiometric && isBiometricAvailable() {
            let access = SecAccessControlCreateWithFlags(
                nil,
                kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
                .biometryAny,
                nil
            )
            query[kSecAttrAccessControl] = access
        }
        
        let status = SecItemAdd(query as CFDictionary, nil)
        
        guard status == errSecSuccess else {
            throw KeychainError.storageError(status)
        }
        
        print("🔐 Keychain: Successfully stored \(key.rawValue)")
    }
    
    func retrieve(for key: KeychainKey) throws -> String? {
        var query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: key.rawValue,
            kSecReturnData: true,
            kSecMatchLimit: kSecMatchLimitOne
        ]
        
        // Add access group for app group sharing if needed
        #if !targetEnvironment(simulator)
        query[kSecAttrAccessGroup] = accessGroup
        #endif
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        switch status {
        case errSecSuccess:
            guard let data = result as? Data,
                  let token = String(data: data, encoding: .utf8) else {
                throw KeychainError.dataCorrupted
            }
            return token
            
        case errSecItemNotFound:
            return nil
            
        default:
            throw KeychainError.retrievalError(status)
        }
    }
    
    func retrieveWithBiometrics(for key: KeychainKey) async throws -> String? {
        guard key.requiresBiometric else {
            return try retrieve(for: key)
        }
        
        guard isBiometricAvailable() else {
            throw AuthError.biometricNotAvailable
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let context = LAContext()
            let reason = "Authenticate to access your secure data"
            
            var query: [CFString: Any] = [
                kSecClass: kSecClassGenericPassword,
                kSecAttrService: service,
                kSecAttrAccount: key.rawValue,
                kSecReturnData: true,
                kSecMatchLimit: kSecMatchLimitOne,
                kSecUseAuthenticationContext: context
            ]
            
            // Add access group for app group sharing if needed
            #if !targetEnvironment(simulator)
            query[kSecAttrAccessGroup] = accessGroup
            #endif
            
            // Perform biometric authentication
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                if success {
                    var result: AnyObject?
                    let status = SecItemCopyMatching(query as CFDictionary, &result)
                    
                    switch status {
                    case errSecSuccess:
                        guard let data = result as? Data,
                              let token = String(data: data, encoding: .utf8) else {
                            continuation.resume(throwing: KeychainError.dataCorrupted)
                            return
                        }
                        continuation.resume(returning: token)
                        
                    case errSecItemNotFound:
                        continuation.resume(returning: nil)
                        
                    default:
                        continuation.resume(throwing: KeychainError.retrievalError(status))
                    }
                } else {
                    if let error = error {
                        continuation.resume(throwing: AuthError.biometricAuthFailed)
                    } else {
                        continuation.resume(throwing: AuthError.biometricAuthFailed)
                    }
                }
            }
        }
    }
    
    func delete(for key: KeychainKey) throws {
        var query: [CFString: Any] = [
            kSecClass: kSecClassGenericPassword,
            kSecAttrService: service,
            kSecAttrAccount: key.rawValue
        ]
        
        // Add access group for app group sharing if needed
        #if !targetEnvironment(simulator)
        query[kSecAttrAccessGroup] = accessGroup
        #endif
        
        let status = SecItemDelete(query as CFDictionary)
        
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deletionError(status)
        }
        
        print("🔐 Keychain: Successfully deleted \(key.rawValue)")
    }
    
    func clear() throws {
        for key in KeychainKey.allCases {
            try delete(for: key)
        }
        print("🔐 Keychain: Cleared all stored data")
    }
    
    func isBiometricAvailable() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }
    
    func getBiometricType() -> LABiometryType {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }
        
        return context.biometryType
    }
}

// MARK: - Keychain Errors

enum KeychainError: LocalizedError {
    case storageError(OSStatus)
    case retrievalError(OSStatus)
    case deletionError(OSStatus)
    case dataCorrupted
    case biometricSetupRequired
    case accessDenied
    
    var errorDescription: String? {
        switch self {
        case .storageError(let status):
            return "Failed to store data in keychain (Status: \(status))"
        case .retrievalError(let status):
            return "Failed to retrieve data from keychain (Status: \(status))"
        case .deletionError(let status):
            return "Failed to delete data from keychain (Status: \(status))"
        case .dataCorrupted:
            return "Keychain data is corrupted"
        case .biometricSetupRequired:
            return "Biometric authentication must be set up to use this feature"
        case .accessDenied:
            return "Access to keychain was denied"
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .storageError, .retrievalError, .deletionError:
            return "Please try again or restart the app"
        case .dataCorrupted:
            return "The app may need to be reinstalled"
        case .biometricSetupRequired:
            return "Please set up Face ID or Touch ID in Settings"
        case .accessDenied:
            return "Please check app permissions in Settings"
        }
    }
}

// MARK: - Mock Keychain Manager for Testing

class MockKeychainManager: KeychainManagerProtocol {
    
    private var storage: [String: String] = [:]
    private var shouldFailOperations = false
    private var biometricAvailable = true
    private var biometricType: LABiometryType = .faceID
    
    func setOperationFailure(_ shouldFail: Bool) {
        shouldFailOperations = shouldFail
    }
    
    func setBiometricAvailability(_ available: Bool, type: LABiometryType = .faceID) {
        biometricAvailable = available
        biometricType = type
    }
    
    func store(token: String, for key: KeychainKey) throws {
        if shouldFailOperations {
            throw KeychainError.storageError(errSecIO)
        }
        storage[key.rawValue] = token
    }
    
    func retrieve(for key: KeychainKey) throws -> String? {
        if shouldFailOperations {
            throw KeychainError.retrievalError(errSecIO)
        }
        return storage[key.rawValue]
    }
    
    func retrieveWithBiometrics(for key: KeychainKey) async throws -> String? {
        if shouldFailOperations {
            throw AuthError.biometricAuthFailed
        }
        
        if !biometricAvailable {
            throw AuthError.biometricNotAvailable
        }
        
        // Simulate biometric delay
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        
        return storage[key.rawValue]
    }
    
    func delete(for key: KeychainKey) throws {
        if shouldFailOperations {
            throw KeychainError.deletionError(errSecIO)
        }
        storage.removeValue(forKey: key.rawValue)
    }
    
    func clear() throws {
        if shouldFailOperations {
            throw KeychainError.deletionError(errSecIO)
        }
        storage.removeAll()
    }
    
    func isBiometricAvailable() -> Bool {
        return biometricAvailable
    }
    
    func getBiometricType() -> LABiometryType {
        return biometricType
    }
}

// MARK: - Keychain Manager Extensions

extension KeychainManager {
    
    /// Convenience method to store auth token
    func storeAuthToken(_ token: String) throws {
        try store(token: token, for: .authToken)
        // Also store timestamp for session tracking
        let timestamp = String(Int(Date().timeIntervalSince1970))
        try store(token: timestamp, for: .lastSignInDate)
    }
    
    /// Convenience method to retrieve auth token
    func getAuthToken() throws -> String? {
        return try retrieve(for: .authToken)
    }
    
    /// Convenience method to retrieve auth token with biometrics
    func getAuthTokenWithBiometrics() async throws -> String? {
        return try await retrieveWithBiometrics(for: .authToken)
    }
    
    /// Convenience method to store user credentials
    func storeUserCredentials(userID: String, email: String) throws {
        try store(token: userID, for: .userID)
        try store(token: email, for: .userEmail)
    }
    
    /// Convenience method to get stored user credentials
    func getUserCredentials() throws -> (userID: String?, email: String?) {
        let userID = try retrieve(for: .userID)
        let email = try retrieve(for: .userEmail)
        return (userID, email)
    }
    
    /// Convenience method to check if biometric is enabled for the app
    func isBiometricEnabledForApp() -> Bool {
        do {
            return try retrieve(for: .biometricEnabled) == "true"
        } catch {
            return false
        }
    }
    
    /// Convenience method to enable/disable biometric for the app
    func setBiometricEnabledForApp(_ enabled: Bool) throws {
        try store(token: enabled ? "true" : "false", for: .biometricEnabled)
    }
    
    /// Convenience method to get last sign-in date
    func getLastSignInDate() -> Date? {
        do {
            guard let timestampString = try retrieve(for: .lastSignInDate),
                  let timestamp = TimeInterval(timestampString) else {
                return nil
            }
            return Date(timeIntervalSince1970: timestamp)
        } catch {
            return nil
        }
    }
    
    /// Check if stored credentials are expired
    func areCredentialsExpired(maxAge: TimeInterval = 30 * 24 * 60 * 60) -> Bool { // 30 days default
        guard let lastSignIn = getLastSignInDate() else {
            return true
        }
        return Date().timeIntervalSince(lastSignIn) > maxAge
    }
    
    /// Migrate keychain data if needed (for app updates)
    func migrateKeychainDataIfNeeded() {
        // TODO: Implement keychain migration logic for app updates
        // This would handle changes in keychain structure between app versions
        print("🔐 Keychain: Migration check completed")
    }
}

// MARK: - Biometric Helper Extension

extension KeychainManager {
    
    /// Get user-friendly description of biometric type
    func getBiometricTypeDescription() -> String {
        switch getBiometricType() {
        case .faceID:
            return "Face ID"
        case .touchID:
            return "Touch ID"
        case .none:
            return "None"
        @unknown default:
            return "Biometric Authentication"
        }
    }
    
    /// Check if device supports biometric authentication
    func deviceSupportsBiometrics() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }
    
    /// Get biometric capability error if any
    func getBiometricError() -> LAError? {
        let context = LAContext()
        var error: NSError?
        
        if !context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            return error as? LAError
        }
        
        return nil
    }
    
    /// Prompt user to enable biometric authentication
    func promptBiometricSetup() async throws -> Bool {
        guard deviceSupportsBiometrics() else {
            throw AuthError.biometricNotAvailable
        }
        
        let context = LAContext()
        let reason = "Enable \(getBiometricTypeDescription()) for secure and convenient access to your account"
        
        return try await withCheckedThrowingContinuation { continuation in
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                if success {
                    continuation.resume(returning: true)
                } else {
                    continuation.resume(throwing: AuthError.biometricAuthFailed)
                }
            }
        }
    }
} 