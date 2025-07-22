//
//  AuthModels.swift
//  LML
//
//  Authentication models and types
//  Extracted from AuthManager for better organization
//

import Foundation

// MARK: - User Model
struct User: Codable, Identifiable, Equatable {
    let id: String
    let email: String
    let firstName: String?
    let lastName: String?
    let accountType: AccountType
    let authProvider: AuthProvider
    let isGuest: Bool
    let emailVerified: Bool
    let biometricEnabled: Bool
    let createdAt: Date
    
    enum AccountType: String, Codable, Equatable {
        case guest = "guest"
        case registered = "registered"
        case premium = "premium"
    }
    
    enum AuthProvider: String, Codable, Equatable {
        case email = "email"
        case apple = "apple"
        case google = "google"
        case guest = "guest"
    }
    
    var displayName: String {
        if let firstName = firstName {
            return firstName
        }
        return email.components(separatedBy: "@").first ?? "User"
    }
    
    var fullName: String {
        let first = firstName ?? ""
        let last = lastName ?? ""
        if !first.isEmpty && !last.isEmpty {
            return "\(first) \(last)"
        }
        return first.isEmpty ? last : first
    }
}

// MARK: - Auth State
enum AuthState: Equatable {
    case loading
    case notAuthenticated
    case guest(User)
    case authenticated(User)
    case biometricRequired(User)
    case error(String)
    
    var isAuthenticated: Bool {
        switch self {
        case .authenticated, .guest:
            return true
        default:
            return false
        }
    }
    
    var user: User? {
        switch self {
        case .guest(let user), .authenticated(let user), .biometricRequired(let user):
            return user
        default:
            return nil
        }
    }
}

// MARK: - Authentication Errors
enum AuthError: LocalizedError {
    case invalidCredentials
    case userNotFound
    case emailAlreadyExists
    case networkError
    case biometricNotAvailable
    case biometricFailed
    case socialAuthFailed(String)
    case tokenExpired
    case unknown(String)
    
    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            return "Invalid email or password"
        case .userNotFound:
            return "User account not found"
        case .emailAlreadyExists:
            return "An account with this email already exists"
        case .networkError:
            return "Network connection error"
        case .biometricNotAvailable:
            return "Biometric authentication is not available"
        case .biometricFailed:
            return "Biometric authentication failed"
        case .socialAuthFailed(let reason):
            return "Social authentication failed: \(reason)"
        case .tokenExpired:
            return "Session expired. Please sign in again"
        case .unknown(let message):
            return message
        }
    }
} 