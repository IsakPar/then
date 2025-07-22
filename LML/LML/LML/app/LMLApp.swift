//
//  LMLCleanApp.swift
//  LMLClean
//
//  Clean iOS app for Last Minute Live - Starting Simple
//

import SwiftUI
import Stripe
import StripePaymentSheet

@main
struct LMLApp: App {
    @StateObject private var authManager = AuthManager.shared
    
    init() {
        // Configure Stripe with publishable key (both APIs)
        let publishableKey = "pk_test_51RXNt54himci0hKNj5DhlhjYlmevPWR28gQrhdX9KULQj69vwV8YdTCbTABXBPnUAiuADWm6uIUKvth7yy45fiP300PRJkwcjL"
        
        StripeAPI.defaultPublishableKey = publishableKey
        STPAPIClient.shared.publishableKey = publishableKey
        
        print("🚀 LML App: Initialized successfully")
        print("💳 Stripe: Configured with publishable key")
        print("🔑 StripeAPI.defaultPublishableKey: \(StripeAPI.defaultPublishableKey ?? "nil")")
        print("🔑 STPAPIClient.shared.publishableKey: \(STPAPIClient.shared.publishableKey ?? "nil")")
        print("🔐 AuthManager: Initialized")
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
        }
    }
} 