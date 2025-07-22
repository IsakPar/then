//
//  ContentView.swift
//  Last Minute Live
//
//  Main app content view handling authentication state
//

import SwiftUI

// MARK: - Main Content View

struct ContentView: View {
    
    // MARK: - Environment
    
    @Environment(\.authManager) private var authManager
    @EnvironmentObject private var appState: AppState
    
    // MARK: - State
    
    @State private var selectedTab = 0
    @State private var showingSplashScreen = true
    
    // MARK: - Body
    
    var body: some View {
        Group {
            if showingSplashScreen {
                SplashScreenView()
                    .task {
                        // Show splash screen for minimum duration
                        try? await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
                        withAnimation(.easeInOut(duration: 0.5)) {
                            showingSplashScreen = false
                        }
                    }
            } else {
                mainContent
            }
        }
        .onAppear {
            print("📱 ContentView: Appeared")
        }
    }
    
    // MARK: - Main Content
    
    @ViewBuilder
    private var mainContent: some View {
        switch authManager.authState {
        case .unauthenticated:
            AuthenticationView()
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing),
                    removal: .move(edge: .leading)
                ))
            
        case .authenticating:
                            LoadingView(message: "Signing in...", showBackground: true)
                .transition(.opacity)
            
        case .authenticated:
            MainTabView(selectedTab: $selectedTab)
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing),
                    removal: .move(edge: .leading)
                ))
            
        case .biometricRequired:
            BiometricPromptView()
                .transition(.scale.combined(with: .opacity))
            
        case .emailVerificationRequired(let email):
            EmailVerificationView(email: email)
                .transition(.move(edge: .bottom))
            
        case .error(let message):
            ErrorView(
                title: "Authentication Error",
                message: message,
                primaryAction: ErrorView.Action(title: "Try Again") {
                    Task {
                        await authManager.checkAuthenticationStatus()
                    }
                }
            )
            .transition(.scale.combined(with: .opacity))
        }
    }
}

// MARK: - Main Tab View

struct MainTabView: View {
    
    @Binding var selectedTab: Int
    @Environment(\.authManager) private var authManager
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Home Tab
            NavigationView {
                HomeView()
            }
            .tabItem {
                Image(systemName: selectedTab == 0 ? "house.fill" : "house")
                Text("Home")
            }
            .tag(0)
            
            // Search Tab
            NavigationView {
                SearchView()
            }
            .tabItem {
                Image(systemName: selectedTab == 1 ? "magnifyingglass.circle.fill" : "magnifyingglass")
                Text("Search")
            }
            .tag(1)
            
            // Tickets Tab
            NavigationView {
                TicketsView()
            }
            .tabItem {
                Image(systemName: selectedTab == 2 ? "ticket.fill" : "ticket")
                Text("Tickets")
            }
            .tag(2)
            
            // Profile Tab
            NavigationView {
                ProfileView()
            }
            .tabItem {
                Image(systemName: selectedTab == 3 ? "person.fill" : "person")
                Text("Profile")
            }
            .tag(3)
        }
        .accentColor(.blue)
        .onAppear {
            // Configure tab bar appearance
            let tabBarAppearance = UITabBarAppearance()
            tabBarAppearance.configureWithOpaqueBackground()
            UITabBar.appearance().standardAppearance = tabBarAppearance
            UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
        }
    }
}

// MARK: - Splash Screen View

struct SplashScreenView: View {
    
    @State private var isAnimating = false
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color.blue.opacity(0.9),
                    Color.purple.opacity(0.8)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            
            VStack(spacing: 30) {
                // App logo
                Image(systemName: "theatermasks.fill")
                    .font(.system(size: 80))
                    .foregroundColor(.white)
                    .scaleEffect(isAnimating ? 1.1 : 0.9)
                    .animation(
                        .easeInOut(duration: 1.0)
                        .repeatForever(autoreverses: true),
                        value: isAnimating
                    )
                
                // App name
                VStack(spacing: 8) {
                    Text("Last Minute Live")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    
                    Text("Discover Amazing Shows")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                }
                .opacity(isAnimating ? 1.0 : 0.7)
                .animation(
                    .easeInOut(duration: 1.5),
                    value: isAnimating
                )
            }
        }
        .onAppear {
            isAnimating = true
        }
    }
}

// MARK: - Authentication View

struct AuthenticationView: View {
    
    @State private var showingSignUp = false
    
    var body: some View {
        NavigationView {
            VStack {
                if showingSignUp {
                    SignupView()
                } else {
                    LoginView()
                }
            }
            .navigationBarHidden(true)
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }
}

// MARK: - Biometric Prompt View

struct BiometricPromptView: View {
    
    @Environment(\.authManager) private var authManager
    @State private var isAuthenticating = false
    
    var body: some View {
        VStack(spacing: 30) {
            Spacer()
            
            // Biometric icon
            Image(systemName: "faceid")
                .font(.system(size: 80))
                .foregroundColor(.blue)
            
            VStack(spacing: 16) {
                Text("Biometric Authentication")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("Use Face ID or Touch ID to securely access your account")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            
            Spacer()
            
            VStack(spacing: 16) {
                // Authenticate button
                Button {
                    authenticateWithBiometrics()
                } label: {
                    HStack {
                        if isAuthenticating {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(0.8)
                        } else {
                            Image(systemName: "faceid")
                        }
                        Text(isAuthenticating ? "Authenticating..." : "Authenticate")
                    }
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.blue)
                    .cornerRadius(10)
                }
                .disabled(isAuthenticating)
                
                // Use password button
                Button {
                    Task {
                        do {
                            try await authManager.signOut()
                        } catch {
                            print("❌ Sign out failed: \(error)")
                        }
                    }
                } label: {
                    Text("Use Password Instead")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
            }
            .padding(.horizontal, 32)
            .padding(.bottom, 50)
        }
        .background(Color(.systemBackground))
    }
    
    private func authenticateWithBiometrics() {
        isAuthenticating = true
        
        Task {
            do {
                _ = try await authManager.signInWithBiometrics()
            } catch {
                // Handle biometric authentication failure
                print("❌ Biometric authentication failed: \(error)")
            }
            isAuthenticating = false
        }
    }
}










// MARK: - Preview

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(AppState())
            .environment(\.authManager, MockAuthManager())
    }
} 