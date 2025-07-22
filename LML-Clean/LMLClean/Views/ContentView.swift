//
//  ContentView.swift
//  LMLClean
//
//  Main navigation structure with bottom tabs
//

import SwiftUI

struct ContentView: View {
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Home Tab
            HomeView()
                .tabItem {
                    Image(systemName: "house.fill")
                    Text("Home")
                }
                .tag(0)
            
            // Tickets Tab
            TicketsView()
                .tabItem {
                    Image(systemName: "ticket.fill")
                    Text("Tickets")
                }
                .tag(1)
            
            // Account Tab
            AccountView()
                .tabItem {
                    Image(systemName: "person.fill")
                    Text("Account")
                }
                .tag(2)
        }
        .accentColor(.blue)
    }
}

// MARK: - Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
} 