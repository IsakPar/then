//
//  AccountActions.swift
//  LML
//
//  Molecule component for account action buttons
//  Groups together settings, support, and logout actions
//

import SwiftUI

// MARK: - Account Actions Molecule
struct AccountActions: View {
    let onSettings: () -> Void
    let onSupport: () -> Void
    let onPrivacy: () -> Void
    let onSignOut: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            settingsSection
            supportSection
            signOutSection
        }
    }
    
    private var settingsSection: some View {
        VStack(spacing: 12) {
            ActionButton(
                title: "Account Settings",
                icon: "gearshape",
                color: .blue,
                action: onSettings
            )
            
            ActionButton(
                title: "Privacy & Security",
                icon: "lock.shield",
                color: .green,
                action: onPrivacy
            )
        }
    }
    
    private var supportSection: some View {
        VStack(spacing: 12) {
            ActionButton(
                title: "Help & Support",
                icon: "questionmark.circle",
                color: .orange,
                action: onSupport
            )
        }
    }
    
    private var signOutSection: some View {
        ActionButton(
            title: "Sign Out",
            icon: "rectangle.portrait.and.arrow.right",
            color: .red,
            action: onSignOut
        )
    }
}

// MARK: - Action Button Component
private struct ActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color)
                    .frame(width: 24)
                
                Text(title)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.4))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.05))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.1), lineWidth: 1)
                    )
            )
        }
    }
} 