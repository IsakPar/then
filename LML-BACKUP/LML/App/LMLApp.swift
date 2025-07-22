//
//  LMLApp.swift
//  LML
//
//  Main app entry point for Last Minute Live iOS app
//  Migrated from React Native Expo app with feature parity
//

import SwiftUI
import Combine
import FirebaseCore

// MARK: - App Delegate for Firebase

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
        FirebaseApp.configure()
        print("🔥 Firebase: Configured successfully")
        return true
    }
}

// MARK: - Main App Entry Point

@main
struct LMLApp: App {
    
    // MARK: - App Delegate
    
    @UIApplicationDelegateAdaptor(AppDelegate.self) var delegate
    
    // MARK: - App State
    
    @StateObject private var appState = AppState()
    
    // MARK: - App Lifecycle
    
    init() {
        configureApp()
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environment(\.authManager, appState.authManager)
                .environment(\.apiClient, appState.apiClient)
                .onAppear {
                    Task {
                        await appState.initialize()
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.didBecomeActiveNotification)) { _ in
                    Task {
                        await appState.handleAppDidBecomeActive()
                    }
                }
                .onReceive(NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)) { _ in
                    appState.handleAppWillResignActive()
                }
        }
    }
    
    // MARK: - Private Methods
    
    private func configureApp() {
        // Configure global app settings
        setupAppearance()
        setupNetworking()
        
        #if DEBUG
        print("🚀 LML App: Debug mode enabled")
        #endif
    }
    
    private func setupAppearance() {
        // Configure app-wide UI appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor.systemBackground
        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
    }
    
    private func setupNetworking() {
        // Configure networking and security
        URLCache.shared.memoryCapacity = 20 * 1024 * 1024 // 20MB
        URLCache.shared.diskCapacity = 100 * 1024 * 1024 // 100MB
    }
}

// MARK: - App State Manager

@MainActor
class AppState: ObservableObject {
    
    // MARK: - Published Properties
    
    @Published var isInitialized = false
    @Published var hasNetworkConnection = true
    @Published var isInBackground = false
    
    // MARK: - Dependencies
    
    let apiClient: APIClientProtocol
    let authManager: AuthManagerProtocol
    let keychainManager: KeychainManagerProtocol
    
    // MARK: - Private Properties
    
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    init() {
        // Initialize dependencies following the same pattern as React Native app
        self.keychainManager = KeychainManager.shared
        
        // Determine API environment based on build configuration
        let environment: APIEnvironment
        #if DEBUG
        environment = .development
        #else
        environment = .production
        #endif
        
        // Initialize API client
        self.apiClient = APIClient(environment: environment)
        
        // Initialize auth manager with dependencies (mirrors AuthContext.tsx)
        self.authManager = AuthManager(
            apiClient: apiClient as! APIClient,
            keychainManager: keychainManager as! ExtendedKeychainManagerProtocol
        )
        
        setupObservers()
    }
    
    // MARK: - App Lifecycle Methods
    
    func initialize() async {
        guard !isInitialized else { return }
        
        print("🚀 LML: Initializing app...")
        
        // Perform keychain migration if needed (from React Native AsyncStorage)
        // TODO: Implement migration method if needed
        // await keychainManager.migrateFromAsyncStorageIfNeeded()
        
        // Check authentication status (mirrors React Native auth check)
        await authManager.checkAuthenticationStatus()
        
        // Check network connectivity
        await checkNetworkConnectivity()
        
        isInitialized = true
        print("✅ LML: App initialization complete")
    }
    
    func handleAppDidBecomeActive() async {
        print("📱 LML: App became active")
        isInBackground = false
        
        // Refresh authentication token if needed
        do {
            try await authManager.refreshTokenIfNeeded()
        } catch {
            print("🔴 LML: Failed to refresh auth token: \(error)")
        }
        
        // Check network connectivity
        await checkNetworkConnectivity()
    }
    
    func handleAppWillResignActive() {
        print("📱 LML: App will resign active")
        isInBackground = true
        
        // Save any pending state changes
        saveAppState()
    }
    
    // MARK: - Private Methods
    
    private func setupObservers() {
        // Monitor authentication state changes (mirrors React Native AuthContext)
        authManager.authStatePublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] authState in
                self?.handleAuthStateChange(authState)
            }
            .store(in: &cancellables)
    }
    
    private func handleAuthStateChange(_ authState: AuthState) {
        switch authState {
        case .authenticated(let user):
            print("✅ LML: User authenticated - \(user.email)")
        case .unauthenticated:
            print("❌ LML: User unauthenticated")
            // Clear any cached user data
            Task {
                await clearUserSpecificCache()
            }
        default:
            break
        }
    }
    
    private func checkNetworkConnectivity() async {
        // Simple network check using API health endpoint
        do {
            await apiClient.healthCheck()
            hasNetworkConnection = true
        } catch {
            hasNetworkConnection = false
            print("⚠️ LML: Network connectivity issue - \(error.localizedDescription)")
        }
    }
    
    private func saveAppState() {
        // Save any critical app state
        UserDefaults.standard.set(Date(), forKey: "lastActiveDate")
    }
    
    private func clearUserSpecificCache() async {
        // Clear any user-specific cached data when user logs out
        print("🧹 LML: Clearing user-specific cache")
    }
}

// MARK: - Environment Keys for Dependency Injection

private struct APIClientKey: EnvironmentKey {
    static let defaultValue: APIClientProtocol = APIClient(environment: .development)
}

private struct AuthManagerKey: EnvironmentKey {
    @MainActor
    static let defaultValue: AuthManagerProtocol = {
        return AuthManager(
            apiClient: APIClient(environment: .development),
            keychainManager: KeychainManager.shared
        )
    }()
}

extension EnvironmentValues {
    var apiClient: APIClientProtocol {
        get { self[APIClientKey.self] }
        set { self[APIClientKey.self] = newValue }
    }
    
    var authManager: AuthManagerProtocol {
        get { self[AuthManagerKey.self] }
        set { self[AuthManagerKey.self] = newValue }
    }
} 