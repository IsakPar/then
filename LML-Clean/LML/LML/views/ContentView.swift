//
//  ContentView.swift
//  LMLClean
//
//  Main navigation structure with bottom tabs - Expo design
//

import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 1 // Start with Home tab (index 1)
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Account Tab (first like Expo)
            AccountView()
                .tabItem {
                    Image(systemName: selectedTab == 0 ? "person.fill" : "person")
                    Text("Account")
                }
                .tag(0)
            
            // Home Tab (middle like Expo) 
            HomeView()
                .tabItem {
                    Image(systemName: selectedTab == 1 ? "house.fill" : "house")
                    Text("Home")
                }
                .tag(1)
            
            // Tickets Tab (last like Expo)
            TicketsView()
                .tabItem {
                    Image(systemName: selectedTab == 2 ? "ticket.fill" : "ticket")
                    Text("Tickets")
                }
                .tag(2)
        }
        .preferredColorScheme(.dark)
        .onAppear {
            // Simple tab bar setup - no complex styling
            let appearance = UITabBarAppearance()
            appearance.configureWithOpaqueBackground()
            appearance.backgroundColor = UIColor(red: 0.122, green: 0.161, blue: 0.216, alpha: 1.0)
            
            // Make sure tab bar is visible
            UITabBar.appearance().isHidden = false
            UITabBar.appearance().standardAppearance = appearance
            UITabBar.appearance().scrollEdgeAppearance = appearance
            
            print("🔍 Simple TabView setup complete")
        }
    }
}

// MARK: - Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .preferredColorScheme(.dark)
    }
} 