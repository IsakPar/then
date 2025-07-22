//
//  TicketCard.swift
//  LML
//
//  Reusable ticket card atom component
//  Displays individual ticket information with consistent styling
//

import SwiftUI

// MARK: - Ticket Card Atom Component
struct TicketCard: View {
    let ticket: Ticket
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 16) {
                cardHeader
                cardContent
                cardFooter
            }
            .padding(20)
            .background(cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .overlay(cardBorder)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private var cardHeader: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(ticket.showName)
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text(ticket.venueName)
                    .font(.subheadline)
                    .foregroundColor(.white.opacity(0.7))
            }
            
            Spacer()
            
            TicketStatusBadge(status: ticket.status)
        }
    }
    
    private var cardContent: some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "calendar")
                        .foregroundColor(.white.opacity(0.6))
                    Text(formatDate(ticket.showDate))
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                }
                
                HStack {
                    Image(systemName: "clock")
                        .foregroundColor(.white.opacity(0.6))
                    Text(ticket.showTime)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                }
                
                if !ticket.seatInfo.isEmpty {
                    HStack {
                        Image(systemName: "chair")
                            .foregroundColor(.white.opacity(0.6))
                        Text(ticket.seatInfo)
                            .font(.subheadline)
                            .foregroundColor(.white.opacity(0.8))
                    }
                }
            }
            
            Spacer()
        }
    }
    
    private var cardFooter: some View {
        HStack {
            Text("£\(ticket.totalPrice / 100)")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506))
            
            Spacer()
            
            HStack(spacing: 4) {
                Text("View Details")
                    .font(.subheadline)
                    .fontWeight(.medium)
                Image(systemName: "chevron.right")
                    .font(.caption)
            }
            .foregroundColor(.white.opacity(0.6))
        }
    }
    
    private var cardBackground: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(Color.white.opacity(0.05))
    }
    
    private var cardBorder: some View {
        RoundedRectangle(cornerRadius: 16)
            .stroke(ticket.status.borderColor.opacity(0.3), lineWidth: 1)
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, yyyy"
        return formatter.string(from: date)
    }
} 