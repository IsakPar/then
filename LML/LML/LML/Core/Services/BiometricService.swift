//
//  BiometricService.swift
//  LML
//
//  Biometric authentication service
//  Handles Face ID, Touch ID, and device authentication
//

import Foundation
import LocalAuthentication

// MARK: - Biometric Service Protocol
protocol BiometricServiceProtocol {
    var isAvailable: Bool { get }
    var biometricType: LABiometryType { get }
    func enableBiometric() async throws -> Bool
    func authenticate(reason: String) async throws -> Bool
    func clearBiometricData()
}

// MARK: - Biometric Service
class BiometricService: BiometricServiceProtocol {
    static let shared = BiometricService()
    
    private let context = LAContext()
    
    private init() {}
    
    var isAvailable: Bool {
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }
    
    var biometricType: LABiometryType {
        return context.biometryType
    }
    
    func enableBiometric() async throws -> Bool {
        guard isAvailable else {
            throw AuthError.biometricNotAvailable
        }
        
        return try await authenticate(reason: "Enable biometric authentication for quick access")
    }
    
    func authenticate(reason: String = "Authenticate to access your account") async throws -> Bool {
        guard isAvailable else {
            throw AuthError.biometricNotAvailable
        }
        
        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
            return success
        } catch {
            print("❌ Biometric authentication failed: \(error)")
            throw AuthError.biometricFailed
        }
    }
    
    func clearBiometricData() {
        // Clear any biometric-related preferences
        UserDefaults.standard.removeObject(forKey: "biometric_enabled")
    }
} 