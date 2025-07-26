//
//  SeatButton.swift
//  LML
//
//  Enhanced seat button atom with animations and accessibility
//  Includes haptic feedback, VoiceOver support, and smooth transitions
//

import SwiftUI

// MARK: - Enhanced Seat Button Atom Component
struct SeatButton: View {
    let seat: TheaterSeat
    let onTap: () -> Void
    
    @State private var isPressed = false
    @Environment(\.accessibilityDifferentiateWithoutColor) private var differentiateWithoutColor
    
    var body: some View {
        Button(action: handleTap) {
            ZStack {
                seatShape
                seatOverlay
                selectionIndicator
            }
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(animationScale)
        .animation(AppAnimations.seatSelection, value: seat.isSelected)
        .animation(AppAnimations.buttonPress, value: isPressed)
        .disabled(!seat.isAvailable)
        .seatAccessibility(
            section: seat.section.name,
            row: seat.row,
            number: seat.number,
            isAvailable: seat.isAvailable,
            isSelected: seat.isSelected,
            price: seat.price,
            isBooked: isBookedSeat
        )
        .onLongPressGesture(minimumDuration: 0) { pressing in
            withAnimation(AppAnimations.buttonPress) {
                isPressed = pressing
            }
        } perform: {
            // Long press action handled by onLongPressGesture
        }
    }
    
    private var seatShape: some View {
        RoundedRectangle(cornerRadius: seatCornerRadius)
            .fill(seatFillColor)
            .frame(width: seatSize.width, height: seatSize.height)
            .overlay(
                RoundedRectangle(cornerRadius: seatCornerRadius)
                    .stroke(seatBorderColor, lineWidth: seatBorderWidth)
            )
    }
    
    private var seatOverlay: some View {
        Group {
            if !seat.isAvailable {
                // Show different icons for permanently booked vs temporarily unavailable
                Image(systemName: isBookedSeat ? "lock.fill" : "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white.opacity(0.8))
            } else if differentiateWithoutColor && seat.isSelected {
                Image(systemName: "checkmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.white)
            }
        }
    }
    
    private var selectionIndicator: some View {
        Group {
            if seat.isSelected {
                RoundedRectangle(cornerRadius: seatCornerRadius - 1)
                    .stroke(Color.white, lineWidth: 2)
                    .frame(width: seatSize.width + 4, height: seatSize.height + 4)
                    .opacity(0.9)
            }
        }
    }
    
    // MARK: - Computed Properties
    
    /// Determines if this seat is permanently booked (vs temporarily unavailable)
    private var isBookedSeat: Bool {
        // Check if seat is permanently booked (vs temporarily unavailable)
        return !seat.isAvailable
    }
    
    private var animationScale: CGFloat {
        if isPressed {
            return 0.9
        } else if seat.isSelected {
            return 1.05
        } else {
            return 1.0
        }
    }
    
    private var seatSize: CGSize {
        CGSize(width: 24, height: 22)
    }
    
    private var seatCornerRadius: CGFloat {
        4
    }
    
    private var seatBorderWidth: CGFloat {
        seat.isSelected ? 1.5 : 1.0
    }
    
    private var seatFillColor: Color {
        if !seat.isAvailable {
            // Same grey color for both booked and unavailable seats
            return .gray.opacity(0.6)
        } else if seat.isSelected {
            return seat.section.selectedColor
        } else {
            return seat.section.displayColor
        }
    }
    
    private var seatBorderColor: Color {
        if !seat.isAvailable {
            return .gray.opacity(0.4)
        } else if seat.isSelected {
            return .white.opacity(0.8)
        } else {
            return .black.opacity(0.3)
        }
    }
    
    // MARK: - Actions
    
    private func handleTap() {
        guard seat.isAvailable else { 
            // Provide haptic feedback for unavailable seat
            HapticManager.notification(.error)
            return 
        }
        
        // Provide haptic feedback for seat selection
        if seat.isSelected {
            HapticManager.impact(.light)
        } else {
            HapticManager.impact(.medium)
        }
        
        // Announce selection change for VoiceOver users
        let announcement = seat.isSelected 
            ? "Seat deselected" 
            : "Seat selected. Total: \((seat.price) / 100) pounds"
        
        VoiceOverHelper.announcement(announcement)
        
        onTap()
    }
}

// MARK: - Theater Section Extensions
extension TheaterSection {
    var displayColor: Color {
        // Use boundary manager colors for consistency
        let (_, color) = SectionBoundaryManager.shared.getSectionDisplayInfo(for: self)
        return color.opacity(0.8)
    }
    
    var selectedColor: Color {
        // Use boundary manager colors for consistency
        let (_, color) = SectionBoundaryManager.shared.getSectionDisplayInfo(for: self)
        return color
    }
}

// MARK: - Preview
struct SeatButton_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            // Available seat
            SeatButton(
                seat: TheaterSeat(
                    id: "test-1",
                    section: .premium,
                    row: 1,
                    number: 1,
                    price: 15000,
                    isAvailable: true,
                    isSelected: false,
                    x: 0,
                    y: 0,
                    width: 32,
                    height: 32
                ),
                onTap: {}
            )
            
            // Selected seat
            SeatButton(
                seat: TheaterSeat(
                    id: "test-2",
                    section: .premium,
                    row: 1,
                    number: 2,
                    price: 15000,
                    isAvailable: true,
                    isSelected: true,
                    x: 0,
                    y: 0,
                    width: 32,
                    height: 32
                ),
                onTap: {}
            )
            
            // Unavailable seat
            SeatButton(
                seat: TheaterSeat(
                    id: "test-3",
                    section: .premium,
                    row: 1,
                    number: 3,
                    price: 15000,
                    isAvailable: false,
                    isSelected: false,
                    x: 0,
                    y: 0,
                    width: 32,
                    height: 32
                ),
                onTap: {}
            )
        }
        .padding()
        .background(Color.black)
        .preferredColorScheme(.dark)
    }
} 