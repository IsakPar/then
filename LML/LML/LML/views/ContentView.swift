//
//  ContentView.swift
//  LMLClean
//
//  Main navigation structure with bottom tabs - Expo design
//

import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 1 // Start with Home tab (index 1)
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        ZStack {
            // Main content area
            ZStack(alignment: .bottom) {
                TabView(selection: $selectedTab) {
                // Account Tab (first like Expo)
                AccountView()
                    .tag(0)
                
                // Home Tab (middle like Expo) 
                HomeView()
                    .tag(1)
                
                // Tickets Tab (last like Expo)
                TicketsView()
                    .tag(2)
            }
            .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            
            // Custom Tab Bar - Always Visible Like Expo
            HStack(spacing: 0) {
                // Account Tab
                TabBarButton(
                    icon: selectedTab == 0 ? "person.fill" : "person",
                    text: "Account",
                    isSelected: selectedTab == 0
                ) {
                    selectedTab = 0
                }
                
                Spacer()
                
                // Home Tab
                TabBarButton(
                    icon: selectedTab == 1 ? "house.fill" : "house",
                    text: "Home",
                    isSelected: selectedTab == 1
                ) {
                    selectedTab = 1
                }
                
                Spacer()
                
                // Tickets Tab
                TabBarButton(
                    icon: selectedTab == 2 ? "ticket.fill" : "ticket",
                    text: "Tickets",
                    isSelected: selectedTab == 2
                ) {
                    selectedTab = 2
                }
            }
            .padding(.horizontal, 40)
            .padding(.vertical, 12)
            .background(
                Color(red: 0.122, green: 0.161, blue: 0.216) // #1F2937 - matching Expo
                    .ignoresSafeArea(.container, edges: .bottom)
            )
            .overlay(
                Rectangle()
                    .frame(height: 0.5)
                    .foregroundColor(Color(red: 0.216, green: 0.255, blue: 0.318)), // #374151
                alignment: .top
            )
            }
            .preferredColorScheme(.dark)
            
            // Biometric Authentication Overlay
            if case .biometricRequired = authManager.authState {
                BiometricSignInView()
                    .environmentObject(authManager)
                    .zIndex(1)
            }
        }
    }
}

// MARK: - Custom Tab Bar Button
struct TabBarButton: View {
    let icon: String
    let text: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .foregroundColor(isSelected ? 
                        Color(red: 0.231, green: 0.510, blue: 0.965) : // #3B82F6 - blue when selected
                        Color(red: 0.612, green: 0.639, blue: 0.686)   // #9CA3AF - gray when not selected
                    )
                
                Text(text)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(isSelected ? 
                        Color(red: 0.231, green: 0.510, blue: 0.965) : // #3B82F6 - blue when selected
                        Color(red: 0.612, green: 0.639, blue: 0.686)   // #9CA3AF - gray when not selected
                    )
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .preferredColorScheme(.dark)
    }
} 