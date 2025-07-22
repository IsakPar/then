//
//  LMLCleanApp.swift
//  LMLClean
//
//  Clean iOS app for Last Minute Live - Starting Simple
//

import SwiftUI
import FirebaseCore

@main
struct LMLCleanApp: App {
    
    init() {
        FirebaseApp.configure()
        print("🔥 Firebase configured")
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
} 