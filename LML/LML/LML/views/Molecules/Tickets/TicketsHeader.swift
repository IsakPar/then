//
//  TicketsHeader.swift
//  LML
//
//  Molecule component for tickets header
//  Combines user avatar, name, and ticket statistics
//

import SwiftUI

// MARK: - Tickets Header Molecule
struct TicketsHeader: View {
    let user: User
    let ticketStats: TicketStats
    
    var body: some View {
        VStack(spacing: 20) {
            userProfileSection
            ticketStatsSection
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
    }
    
    private var userProfileSection: some View {
        HStack {
            UserAvatar(size: .medium, imageUrl: nil)
            
            VStack(alignment: .leading, spacing: 4) {
                Text("Welcome back,")
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.7))
                
                Text(user.displayName)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
            
            Spacer()
        }
    }
    
    private var ticketStatsSection: some View {
        HStack(spacing: 16) {
            TicketStatCard(
                count: ticketStats.upcoming,
                title: "Upcoming",
                color: .green
            )
            
            TicketStatCard(
                count: ticketStats.today,
                title: "Today",
                color: .red
            )
            
            TicketStatCard(
                count: ticketStats.past,
                title: "Past",
                color: .gray
            )
        }
    }
}

// MARK: - Ticket Stats Model
// TicketStats model moved to TicketsViewModel.swift 