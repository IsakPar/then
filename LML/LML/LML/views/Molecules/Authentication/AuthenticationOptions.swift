//
//  AuthenticationOptions.swift
//  LML
//
//  Molecule component for authentication options
//  Combines sign in and sign up buttons with divider
//

import SwiftUI

// MARK: - Authentication Options Molecule
struct AuthenticationOptions: View {
    let onSignUp: () -> Void
    let onSignIn: () -> Void
    let onAppleSignIn: () -> Void
    let onGoogleSignIn: () -> Void
    
    var body: some View {
        VStack(spacing: 16) {
            primaryActions
            socialAuthDivider
            socialAuthButtons
        }
    }
    
    private var primaryActions: some View {
        VStack(spacing: 16) {
            AuthButton(
                title: "Create Account",
                icon: "star.fill",
                style: .primary,
                action: onSignUp
            )
            
            AuthButton(
                title: "Sign In",
                icon: "person.fill",
                style: .secondary,
                action: onSignIn
            )
        }
    }
    
    private var socialAuthDivider: some View {
        HStack {
            Rectangle()
                .frame(height: 1)
                .foregroundColor(.white.opacity(0.2))
            Text("OR CONTINUE WITH")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(.white.opacity(0.6))
                .padding(.horizontal, 12)
            Rectangle()
                .frame(height: 1)
                .foregroundColor(.white.opacity(0.2))
        }
        .padding(.vertical, 8)
    }
    
    private var socialAuthButtons: some View {
        VStack(spacing: 12) {
            AuthButton(
                title: "Continue with Apple",
                icon: "apple.logo",
                style: .apple,
                action: onAppleSignIn
            )
            
            AuthButton(
                title: "Continue with Google",
                icon: "globe",
                style: .google,
                action: onGoogleSignIn
            )
        }
    }
} 