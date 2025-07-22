//
//  TicketsView.swift
//  Last Minute Live
//
//  Tickets screen displaying offline-accessible ticket list
//  Features share, scan, and local-first ticket management
//

import SwiftUI

struct TicketsView: View {
    @StateObject private var viewModel = TicketsViewModel()
    @EnvironmentObject private var authManager: AuthManager
    @State private var selectedTicket: UserBooking?
    @State private var showingTicketDetail = false
    @State private var showingQRScanner = false
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()
                
                if viewModel.tickets.isEmpty {
                    emptyStateView
                } else {
                    ticketsListView
                }
                
                // Loading overlay
                if viewModel.isLoading {
                    loadingOverlay
                }
            }
            .navigationTitle("My Tickets")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button(action: {
                            Task {
                                await viewModel.refreshTickets()
                            }
                        }) {
                            Label("Refresh", systemImage: "arrow.clockwise")
                        }
                        
                        Button(action: {
                            showingQRScanner = true
                        }) {
                            Label("Scan QR Code", systemImage: "qrcode.viewfinder")
                        }
                        
                        if viewModel.showOfflineStatus {
                            Button(action: {
                                viewModel.toggleOfflineStatus()
                            }) {
                                Label("Hide Status", systemImage: "info.circle")
                            }
                        } else {
                            Button(action: {
                                viewModel.toggleOfflineStatus()
                            }) {
                                Label("Show Status", systemImage: "info.circle")
                            }
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .onAppear {
                viewModel.setAuthManager(authManager)
                Task {
                    await viewModel.loadTickets()
                }
            }
            .refreshable {
                await viewModel.refreshTickets()
            }
            .sheet(isPresented: $showingTicketDetail) {
                if let selectedTicket = selectedTicket {
                    TicketDetailView(ticket: selectedTicket)
                }
            }
            .sheet(isPresented: $showingQRScanner) {
                QRScannerView { scannedCode in
                    viewModel.handleScannedQRCode(scannedCode)
                }
            }
        }
    }
    
    // MARK: - Empty State View
    
    private var emptyStateView: some View {
        VStack(spacing: 24) {
            Image(systemName: "ticket")
                .font(.system(size: 60))
                .foregroundColor(.secondary)
            
            VStack(spacing: 8) {
                Text("No Tickets Yet")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("When you book tickets, they'll appear here and be available offline.")
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            
            if viewModel.isOfflineMode {
                VStack(spacing: 12) {
                    HStack {
                        Image(systemName: "wifi.slash")
                            .foregroundColor(.orange)
                        Text("You're offline")
                            .font(.subheadline)
                            .foregroundColor(.orange)
                    }
                    
                    Text("Showing locally saved tickets only")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .cornerRadius(12)
            }
            
            Button("Browse Shows") {
                // Navigate to shows - implement with navigation coordinator
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }
    
    // MARK: - Tickets List View
    
    private var ticketsListView: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Offline status indicator
                if viewModel.isOfflineMode && viewModel.showOfflineStatus {
                    offlineStatusView
                }
                
                // Last sync info
                if viewModel.showOfflineStatus {
                    lastSyncView
                }
                
                // Tickets
                ForEach(viewModel.tickets) { ticket in
                    TicketCardView(ticket: ticket) {
                        selectedTicket = ticket
                        showingTicketDetail = true
                    }
                }
            }
            .padding()
        }
    }
    
    // MARK: - Status Views
    
    private var offlineStatusView: some View {
        HStack {
            Image(systemName: "wifi.slash")
                .foregroundColor(.orange)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("Offline Mode")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.orange)
                
                Text("Showing locally saved tickets")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Button("Retry") {
                Task {
                    await viewModel.refreshTickets()
                }
            }
            .font(.caption)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color.orange.opacity(0.2))
            .foregroundColor(.orange)
            .cornerRadius(12)
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(12)
    }
    
    private var lastSyncView: some View {
        HStack {
            Image(systemName: "clock")
                .foregroundColor(.secondary)
                .font(.caption)
            
            Text("Last updated: \(viewModel.lastSyncText)")
                .font(.caption)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text("\(viewModel.tickets.count) ticket(s)")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal)
    }
    
    // MARK: - Loading Overlay
    
    private var loadingOverlay: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()
            
            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.2)
                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                
                Text("Loading tickets...")
                    .foregroundColor(.white)
                    .font(.subheadline)
            }
            .padding(24)
            .background(Color.black.opacity(0.8))
            .cornerRadius(12)
        }
    }
}

// MARK: - Ticket Card View

struct TicketCardView: View {
    let ticket: UserBooking
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 0) {
                // Header with show info
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(ticket.showTitle)
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                            .multilineTextAlignment(.leading)
                        
                        Text(ticket.venueName)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        HStack {
                            Text(formattedDate)
                            Text("•")
                                .foregroundColor(.secondary)
                            Text(ticket.showTime)
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    // Mini QR code
                    MiniQRCodeView(qrCodeData: ticket.qrCode)
                }
                .padding()
                
                Divider()
                
                // Seat information
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Seats")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.secondary)
                        
                        ForEach(ticket.seats.prefix(3), id: \.id) { seat in
                            Text("\(seat.section) Row \(seat.row), Seat \(seat.number)")
                                .font(.caption)
                                .foregroundColor(.primary)
                        }
                        
                        if ticket.seats.count > 3 {
                            Text("+ \(ticket.seats.count - 3) more")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Total")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.secondary)
                        
                        Text(formattedTotalPrice)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        statusBadge
                    }
                }
                .padding()
            }
        }
        .buttonStyle(PlainButtonStyle())
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityHint("Tap to view ticket details and QR code")
    }
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        if let date = formatter.date(from: ticket.showDate) {
            formatter.dateFormat = "MMM d"
            return formatter.string(from: date)
        }
        return ticket.showDate
    }
    
    private var formattedTotalPrice: String {
        let pounds = Double(ticket.totalAmount) / 100.0
        return String(format: "£%.2f", pounds)
    }
    
    private var statusBadge: some View {
        Text(ticket.status.rawValue.capitalized)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(statusColor.opacity(0.2))
            .foregroundColor(statusColor)
            .cornerRadius(8)
    }
    
    private var statusColor: Color {
        switch ticket.status {
        case .confirmed:
            return .green
        case .pending:
            return .orange
        case .cancelled:
            return .red
        }
    }
    
    private var accessibilityLabel: String {
        return "\(ticket.showTitle) at \(ticket.venueName) on \(formattedDate) at \(ticket.showTime), \(ticket.seats.count) seats, total \(formattedTotalPrice), status \(ticket.status.rawValue)"
    }
}

// MARK: - Ticket Detail View

struct TicketDetailView: View {
    let ticket: UserBooking
    @Environment(\.dismiss) private var dismiss
    @State private var showingShareSheet = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Large QR Code
                    TicketQRCodeView(userBooking: ticket, size: 280)
                    
                    // Ticket actions
                    HStack(spacing: 16) {
                        Button(action: {
                            shareTicket()
                        }) {
                            Label("Share", systemImage: "square.and.arrow.up")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        
                        Button(action: {
                            saveQRToPhotos()
                        }) {
                            Label("Save QR", systemImage: "photo")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.horizontal)
                    
                    // Ticket details
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Ticket Details")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        VStack(spacing: 12) {
                            DetailRow(title: "Show", value: ticket.showTitle)
                            DetailRow(title: "Venue", value: ticket.venueName)
                            DetailRow(title: "Date", value: formattedDate)
                            DetailRow(title: "Time", value: ticket.showTime)
                            DetailRow(title: "Booking ID", value: String(ticket.id.prefix(8)))
                            DetailRow(title: "Total Amount", value: formattedTotalPrice)
                        }
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Seats")
                                .font(.headline)
                                .fontWeight(.medium)
                            
                            ForEach(ticket.seats, id: \.id) { seat in
                                HStack {
                                    Text("\(seat.section)")
                                    Text("Row \(seat.row)")
                                    Text("Seat \(seat.number)")
                                    Spacer()
                                    Text(formattedSeatPrice(seat.priceInPence))
                                        .foregroundColor(.secondary)
                                }
                                .font(.subheadline)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                    
                    Spacer()
                }
                .padding()
            }
            .navigationTitle("Ticket")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
    
    private func shareTicket() {
        // Implement sharing functionality
        let shareText = "My ticket for \(ticket.showTitle) at \(ticket.venueName) on \(formattedDate)"
        // Would show share sheet with QR code and details
    }
    
    private func saveQRToPhotos() {
        // Generate QR code image and save to photos
        // Implementation would use QRCodeView's save functionality
    }
    
    private var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        if let date = formatter.date(from: ticket.showDate) {
            formatter.dateStyle = .full
            return formatter.string(from: date)
        }
        return ticket.showDate
    }
    
    private var formattedTotalPrice: String {
        let pounds = Double(ticket.totalAmount) / 100.0
        return String(format: "£%.2f", pounds)
    }
    
    private func formattedSeatPrice(_ priceInPence: Int) -> String {
        let pounds = Double(priceInPence) / 100.0
        return String(format: "£%.2f", pounds)
    }
}

// MARK: - Detail Row

struct DetailRow: View {
    let title: String
    let value: String
    
    var body: some View {
        HStack {
            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
    }
}

// MARK: - QR Scanner View (Placeholder)

struct QRScannerView: View {
    let onCodeScanned: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack {
                Text("QR Scanner")
                    .font(.title)
                Text("Camera scanning coming soon!")
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Scan QR Code")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Preview

struct TicketsView_Previews: PreviewProvider {
    static var previews: some View {
        let mockTickets = [
            UserBooking(
                id: "booking_1",
                showId: "show_1",
                showTitle: "Hamilton",
                showDate: "2024-01-15",
                showTime: "19:30",
                venueName: "Victoria Palace Theatre",
                venueAddress: "Victoria Street, London",
                seats: [
                    BookingSeat(id: "seat_1", number: "12", row: "H", section: "Orchestra", priceInPence: 12000),
                    BookingSeat(id: "seat_2", number: "13", row: "H", section: "Orchestra", priceInPence: 12000)
                ],
                totalAmount: 24000,
                status: .confirmed,
                qrCode: "booking_1_qr",
                bookingDate: Date()
            ),
            UserBooking(
                id: "booking_2",
                showId: "show_2",
                showTitle: "The Lion King",
                showDate: "2024-01-20",
                showTime: "14:30",
                venueName: "Lyceum Theatre",
                venueAddress: "Wellington Street, London",
                seats: [
                    BookingSeat(id: "seat_3", number: "5", row: "A", section: "Stalls", priceInPence: 8000)
                ],
                totalAmount: 8000,
                status: .confirmed,
                qrCode: "booking_2_qr",
                bookingDate: Date()
            )
        ]
        
        Group {
            TicketsView()
                .environmentObject(MockAuthManager())
                .previewDisplayName("Light Mode")
            
            TicketsView()
                .environmentObject(MockAuthManager())
                .preferredColorScheme(.dark)
                .previewDisplayName("Dark Mode")
        }
    }
} 