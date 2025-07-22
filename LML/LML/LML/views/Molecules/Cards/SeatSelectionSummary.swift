//
//  SeatSelectionSummary.swift
//  LML
//
//  Molecule component for seat selection summary
//  Combines multiple atoms to show selection details
//

import SwiftUI

// MARK: - Seat Selection Summary Molecule
struct SeatSelectionSummary: View {
    let selectedSeats: [TheaterSeat]
    
    var body: some View {
        VStack(spacing: 8) {
            if !selectedSeats.isEmpty {
                selectionHeader
                groupedSeatsDetails
                totalSeparator
                totalPrice
            }
        }
    }
    
    private var selectionHeader: some View {
        HStack {
            Image(systemName: "cart.fill")
                .foregroundColor(.white)
                .font(.system(size: 18, weight: .medium))
            
            Text("\(selectedSeats.count) seat\(selectedSeats.count == 1 ? "" : "s") selected")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
            
            Spacer()
        }
        .padding(.horizontal, 20)
    }
    
    private var groupedSeatsDetails: some View {
        VStack(spacing: 8) {
            ForEach(groupedSeats, id: \.section) { group in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(group.section.displayName)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                        
                        Text(formatSeatDetails(group.seats))
                            .font(.system(size: 12))
                            .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686))
                    }
                    
                    Spacer()
                    
                    PriceTag(amount: group.totalPrice, style: .highlighted)
                }
                .padding(.horizontal, 20)
            }
        }
    }
    
    private var totalSeparator: some View {
        Rectangle()
            .fill(Color(red: 0.216, green: 0.255, blue: 0.318))
            .frame(height: 1)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
    }
    
    private var totalPrice: some View {
        HStack {
            Text("Total")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
            
            Spacer()
            
            PriceTag(amount: totalAmount, style: .large)
        }
        .padding(.horizontal, 20)
    }
    
    // MARK: - Computed Properties
    private var groupedSeats: [(section: TheaterSection, seats: [TheaterSeat], totalPrice: Int)] {
        let grouped = Dictionary(grouping: selectedSeats) { $0.section }
        return grouped.map { (section, seats) in
            (section: section, seats: seats, totalPrice: seats.reduce(0) { $0 + $1.price })
        }.sorted(by: { $0.totalPrice > $1.totalPrice })
    }
    
    private var totalAmount: Int {
        selectedSeats.reduce(0) { $0 + $1.price }
    }
    
    // MARK: - Helper Methods
    private func formatSeatDetails(_ seats: [TheaterSeat]) -> String {
        if seats.count == 1 {
            let seat = seats[0]
            return "Row \(seat.row), Seat \(seat.number)"
        } else {
            // Group by row for cleaner display
            let seatsByRow = Dictionary(grouping: seats) { $0.row }
            let sortedRows = seatsByRow.keys.sorted()
            
            let rowDetails = sortedRows.map { row in
                let rowSeats = seatsByRow[row]!.sorted { $0.number < $1.number }
                let seatNumbers = rowSeats.map { "\($0.number)" }.joined(separator: ", ")
                return "Row \(row): \(seatNumbers)"
            }
            
            return rowDetails.joined(separator: " • ")
        }
    }
} 