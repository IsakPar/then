//
//  TicketStatusBadge.swift
//  LML
//
//  Reusable ticket status badge atom component
//  Displays ticket status with appropriate colors and icons
//

import SwiftUI

// MARK: - Ticket Status Badge Atom Component
struct TicketStatusBadge: View {
    let status: TicketStatus
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: status.icon)
                .font(.caption)
            Text(status.displayName)
                .font(.caption)
                .fontWeight(.semibold)
        }
        .foregroundColor(status.color)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(status.backgroundColor)
        .clipShape(Capsule())
    }
}

// MARK: - Ticket Status Extensions
extension TicketStatus {
    var displayName: String {
        switch self {
        case .upcoming: return "Upcoming"
        case .today: return "Today"
        case .past: return "Past"
        case .cancelled: return "Cancelled"
        }
    }
    
    var color: Color {
        switch self {
        case .upcoming: return .green
        case .today: return .red
        case .past: return .gray
        case .cancelled: return .orange
        }
    }
    
    var backgroundColor: Color {
        color.opacity(0.2)
    }
    
    var borderColor: Color {
        color
    }
    
    var icon: String {
        switch self {
        case .upcoming: return "calendar.badge.clock"
        case .today: return "clock.badge.checkmark"
        case .past: return "checkmark.circle"
        case .cancelled: return "xmark.circle"
        }
    }
} 