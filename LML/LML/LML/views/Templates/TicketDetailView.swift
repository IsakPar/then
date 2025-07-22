//
//  TicketDetailView.swift
//  LML
//
//  Template for displaying detailed ticket information
//  Following atomic design principles
//

import SwiftUI

// MARK: - Ticket Detail View Template
struct TicketDetailView: View {
    let ticket: Ticket
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    ticketHeader
                    
                    ticketDetails
                    
                    actionButtons
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
            }
            .navigationBarBackButtonHidden()
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
            }
            .background(theaterBackground)
        }
    }
    
    // MARK: - UI Components
    
    private var ticketHeader: some View {
        VStack(spacing: 16) {
            Text(ticket.showName)
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
            
            Text(ticket.venueName)
                .font(.title2)
                .foregroundColor(.gray)
                .multilineTextAlignment(.center)
        }
    }
    
    private var ticketDetails: some View {
        VStack(spacing: 16) {
            DetailRow(label: "Date", value: formatDate(ticket.showDate))
            DetailRow(label: "Time", value: ticket.showTime)
            DetailRow(label: "Seats", value: ticket.seatInfo)
            DetailRow(label: "Total Price", value: formatPrice(ticket.totalPrice))
            DetailRow(label: "Booking Reference", value: ticket.bookingReference)
            DetailRow(label: "Status", value: ticket.status.rawValue.capitalized)
        }
        .padding(.horizontal, 16)
    }
    
    private var actionButtons: some View {
        VStack(spacing: 12) {
            if ticket.status == .upcoming || ticket.status == .today {
                Button("Add to Calendar") {
                    // Add calendar functionality
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
                
                Button("Share Ticket") {
                    // Add share functionality
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.secondary)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
        }
        .padding(.horizontal, 16)
    }
    
    private var theaterBackground: some View {
        Color(red: 0.067, green: 0.094, blue: 0.153)
            .ignoresSafeArea()
    }
    
    // MARK: - Helper Methods
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        return formatter.string(from: date)
    }
    
    private func formatPrice(_ price: Int) -> String {
        let pounds = Double(price) / 100.0
        return String(format: "£%.2f", pounds)
    }
}

// MARK: - Detail Row Component
struct DetailRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .font(.headline)
                .foregroundColor(.gray)
                .frame(width: 120, alignment: .leading)
            
            Spacer()
            
            Text(value)
                .font(.body)
                .foregroundColor(.white)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 8)
    }
}

// MARK: - Preview
struct TicketDetailView_Previews: PreviewProvider {
    static var previews: some View {
        TicketDetailView(
            ticket: Ticket(
                id: "preview-1",
                showName: "Hamilton",
                venueName: "Victoria Palace Theatre",
                showDate: Date(),
                showTime: "7:30 PM",
                seatInfo: "Stalls, Row F, Seats 12-13",
                totalPrice: 15000,
                status: .upcoming,
                bookingReference: "LML-HAM-001"
            )
        )
    }
} 