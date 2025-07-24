//
//  AccountView.swift
//  LML
//
//  Template view for account management
//  Refactored using Atomic Design principles
//

import SwiftUI
import LocalAuthentication

// MARK: - Account View Template
struct AccountView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel: AccountViewModel = AccountViewModel(authManager: AuthManager.shared)
    
    var body: some View {
        NavigationView {
            ZStack {
                accountBackground
                
                ScrollView {
                    VStack(spacing: 24) {
                        contentForAuthState
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                }
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.large)
            .foregroundColor(.white)
            .overlay(
                // Debug view for development - positioned to not interfere with buttons
                VStack {
                    AuthDebugView()
                        .environmentObject(authManager)
                    Spacer()
                }
                .allowsHitTesting(false), // Disable hit testing to prevent blocking touches
                alignment: .top
            )
        }
        .onAppear {
            print("🔍 AccountView: Appeared with authManager, current state: \(authManager.authState)")
        }
        .sheet(isPresented: $viewModel.showingSignIn) {
            SignInView()
        }
        .sheet(isPresented: $viewModel.showingSignUp) {
            SignUpView()
        }
        .sheet(isPresented: $viewModel.showingForgotPassword) {
            ForgotPasswordView()
        }
        .alert("Error", isPresented: Binding<Bool>(
            get: { viewModel.errorMessage != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button("OK") { viewModel.errorMessage = nil }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
    }
    
    // MARK: - UI Components
    
    private var accountBackground: some View {
        Color(red: 0.067, green: 0.094, blue: 0.153)
            .ignoresSafeArea()
    }
    
    @ViewBuilder
    private var contentForAuthState: some View {
        switch viewModel.authState {
        case .loading:
            LoadingStateView(message: "Loading your account...")
            
        case .notAuthenticated:
            notAuthenticatedContent
            
        case .biometricRequired(let user):
            biometricRequiredContent(user: user)
            
        case .guest(let user), .authenticated(let user):
            authenticatedContent(user: user)
            
        case .error(let message):
            ErrorStateView(message: message) {
                viewModel.refreshSession()
            }
        }
    }
    
    private var notAuthenticatedContent: some View {
        VStack(spacing: 32) {
            welcomeHeader
            
            AuthenticationOptions(
                onSignUp: { viewModel.showSignUp() },
                onSignIn: { viewModel.showSignIn() },
                onAppleSignIn: { viewModel.signInWithApple() },
                onGoogleSignIn: { viewModel.signInWithGoogle() }
            )
            .padding(.horizontal, 16)
        }
    }
    
    private var welcomeHeader: some View {
        VStack(spacing: 16) {
            UserAvatar(size: .extraLarge)
            
            Text("Welcome to Last Minute Live")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
            
            Text("Save your tickets, get notifications, and never miss a show!")
                .font(.body)
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding(.top, 40)
    }
    
    private func biometricRequiredContent(user: User) -> some View {
        VStack(spacing: 24) {
            UserProfileHeader(user: user)
            
            VStack(spacing: 16) {
                Text("Biometric Authentication Required")
                    .font(.headline)
                    .foregroundColor(.white)
                
                AuthButton(
                    title: "Authenticate with Biometric",
                    icon: "faceid",
                    style: .primary,
                    action: { viewModel.authenticateWithBiometric() }
                )
                .padding(.horizontal, 16)
            }
        }
    }
    
    private func authenticatedContent(user: User) -> some View {
        VStack(spacing: 24) {
            UserProfileHeader(user: user)
            
            userStatsSection
            
            AccountActions(
                onSettings: { /* TODO: Navigate to settings */ },
                onSupport: { /* TODO: Navigate to support */ },
                onPrivacy: { /* TODO: Navigate to privacy */ },
                onSignOut: { viewModel.signOut() }
            )
            .padding(.horizontal, 16)
        }
    }
    
    private var userStatsSection: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Your Activity")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                Spacer()
            }
            .padding(.horizontal, 16)
            
            HStack(spacing: 12) {
                ForEach(Array(viewModel.userStats.enumerated()), id: \.offset) { index, stat in
                    AccountStatCard(
                        title: stat.title,
                        value: stat.value,
                        icon: stat.icon,
                        color: stat.color
                    )
                    
                    if index < viewModel.userStats.count - 1 {
                        Spacer()
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }
}

// MARK: - Error State View
private struct ErrorStateView: View {
    let message: String
    let onRetry: () -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundColor(.orange)
            
            Text("Something went wrong")
                .font(.headline)
                .foregroundColor(.white)
            
            Text(message)
                .font(.body)
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
            
            AuthButton(
                title: "Try Again",
                icon: "arrow.clockwise",
                style: .primary,
                action: onRetry
            )
            .frame(maxWidth: 200)
        }
    }
}

// MARK: - Preview
struct AccountView_Previews: PreviewProvider {
    static var previews: some View {
        AccountView()
            .preferredColorScheme(.dark)
    }
} 