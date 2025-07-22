//
//  KeychainService.swift
//  LML
//
//  Secure storage service for authentication tokens
//  Follows single responsibility principle
//

import Foundation
import Security

// MARK: - Keychain Service
protocol KeychainServiceProtocol {
    func storeAuthToken(_ token: String)
    func getAuthToken() -> String?
    func clearAuthToken()
}

class KeychainService: KeychainServiceProtocol {
    static let shared = KeychainService()
    
    private let service = "com.lastminutelive.auth"
    private let tokenKey = "auth_token"
    
    private init() {}
    
    func storeAuthToken(_ token: String) {
        let data = token.data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecValueData as String: data
        ]
        
        // Delete any existing item first
        SecItemDelete(query as CFDictionary)
        
        // Add new item
        let status = SecItemAdd(query as CFDictionary, nil)
        
        if status == errSecSuccess {
            print("✅ Auth token stored in keychain")
        } else {
            print("❌ Failed to store auth token: \(status)")
        }
    }
    
    func getAuthToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess,
           let data = result as? Data,
           let token = String(data: data, encoding: .utf8) {
            return token
        }
        
        return nil
    }
    
    func clearAuthToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenKey
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        if status == errSecSuccess {
            print("✅ Auth token cleared from keychain")
        }
    }
} 