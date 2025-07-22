//
//  UserProfileHeader.swift
//  LML
//
//  Molecule component for user profile header
//  Combines avatar, name, email, and account type display
//

import SwiftUI

// MARK: - User Profile Header Molecule
struct UserProfileHeader: View {
    let user: User
    
    var body: some View {
        VStack(spacing: 16) {
            UserAvatar(size: .large, imageUrl: nil)
            
            VStack(spacing: 4) {
                Text(user.displayName)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text(user.email)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.7))
                
                accountTypeBadge
            }
        }
        .padding(.top, 20)
    }
    
    private var accountTypeBadge: some View {
        HStack(spacing: 6) {
            Image(systemName: accountTypeIcon)
                .font(.caption)
            Text(user.accountType.displayName)
                .font(.caption)
                .fontWeight(.medium)
        }
        .foregroundColor(.white)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(accountTypeColor.opacity(0.2))
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(accountTypeColor.opacity(0.5), lineWidth: 1)
        )
    }
    
    private var accountTypeIcon: String {
        switch user.accountType {
        case .guest: return "person.crop.circle"
        case .registered: return "checkmark.circle"
        case .premium: return "crown"
        }
    }
    
    private var accountTypeColor: Color {
        switch user.accountType {
        case .guest: return .orange
        case .registered: return .green
        case .premium: return .yellow
        }
    }
}

// MARK: - User Account Type Extension
extension User.AccountType {
    var displayName: String {
        switch self {
        case .guest: return "Guest"
        case .registered: return "Member"
        case .premium: return "Premium"
        }
    }
} 