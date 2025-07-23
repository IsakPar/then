//
//  AuthenticationService.swift
//  LML
//
//  Authentication service for API calls and business logic
//  Handles sign in, sign up, guest sessions, and token validation
//

import Foundation
import UIKit

// MARK: - Authentication Service Protocol
protocol AuthenticationServiceProtocol {
    func signUp(email: String, password: String, firstName: String, lastName: String) async throws -> AuthResponse
    func signIn(email: String, password: String) async throws -> AuthResponse
    func socialAuth(request: SocialAuthRequest) async throws -> AuthResponse
    func createGuestSession(email: String) async throws -> GuestResponse
    func validateToken(_ token: String) async throws -> User
    func updateBiometricPreference(enabled: Bool) async throws
}

// MARK: - Authentication Service
class AuthenticationService: AuthenticationServiceProtocol {
    static let shared = AuthenticationService()
    
    private let apiClient = APIClient.shared
    
    private init() {}
    
    func signUp(email: String, password: String, firstName: String, lastName: String) async throws -> AuthResponse {
        print("📝 Signing up user: \(email)")
        
        do {
            let response = try await apiClient.signUp(
                email: email,
                password: password,
                firstName: firstName,
                lastName: lastName
            )
            
            print("✅ Sign up successful")
            return response
            
        } catch {
            print("❌ Sign up failed: \(error)")
            throw AuthError.unknown(error.localizedDescription)
        }
    }
    
    func signIn(email: String, password: String) async throws -> AuthResponse {
        print("🔐 Signing in user: \(email)")
        
        do {
            let response = try await apiClient.signIn(email: email, password: password)
            
            print("✅ Sign in successful")
            return response
            
        } catch {
            print("❌ Sign in failed: \(error)")
            throw AuthError.invalidCredentials
        }
    }
    
    func socialAuth(request: SocialAuthRequest) async throws -> AuthResponse {
        print("🔗 Social auth with provider: \(request.provider)")
        
        do {
            let response = try await apiClient.socialAuth(request: request)
            
            print("✅ Social auth successful")
            return response
            
        } catch {
            print("❌ Social auth failed: \(error)")
            throw AuthError.socialAuthFailed(request.provider)
        }
    }
    
    func createGuestSession(email: String) async throws -> GuestResponse {
        print("🎭 Creating guest session for: \(email)")
        print("🔍 AuthService: Starting guest session creation")
        
        do {
            let deviceInfo = [
                "platform": "iOS",
                "version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0",
                "device": await UIDevice.current.model
            ]
            
            print("🔍 AuthService: Device info prepared: \(deviceInfo)")
            print("🔍 AuthService: Calling apiClient.createGuestSession")
            
            let response = try await apiClient.createGuestSession(email: email, deviceInfo: deviceInfo)
            
            print("✅ Guest session created successfully")
            print("🔍 AuthService: Response received from APIClient")
            print("🔍 Response type: \(type(of: response))")
            
            return response
            
        } catch {
            print("❌ Guest session creation failed: \(error)")
            print("❌ AuthService error type: \(type(of: error))")
            print("❌ AuthService error description: \(error.localizedDescription)")
            
            if let apiError = error as? APIError {
                print("❌ API Error details: \(apiError)")
            }
            
            throw AuthError.unknown(error.localizedDescription)
        }
    }
    
    func validateToken(_ token: String) async throws -> User {
        do {
            let user = try await apiClient.validateToken(token)
            return user
        } catch {
            print("❌ Token validation failed: \(error)")
            throw AuthError.tokenExpired
        }
    }
    
    func updateBiometricPreference(enabled: Bool) async throws {
        do {
            try await apiClient.updateBiometricPreference(enabled: enabled)
            print("✅ Biometric preference updated: \(enabled)")
        } catch {
            print("❌ Failed to update biometric preference: \(error)")
            throw AuthError.unknown(error.localizedDescription)
        }
    }
}

// MARK: - Response Models
struct AuthResponse: Codable {
    let user: User
    let token: String
}

struct GuestResponse: Codable {
    let user: User
    let sessionToken: String
} 