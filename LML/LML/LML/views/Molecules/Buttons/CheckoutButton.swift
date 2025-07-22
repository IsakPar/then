//
//  CheckoutButton.swift
//  LML
//
//  Molecule component for checkout button
//  Handles different states: disabled, loading, enabled with price
//

import SwiftUI

// MARK: - Checkout Button Molecule
struct CheckoutButton: View {
    let selectedSeatsCount: Int
    let totalPrice: Int
    let isLoading: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.8)
                } else if selectedSeatsCount > 0 {
                    Image(systemName: "creditcard.fill")
                        .font(.system(size: 16, weight: .medium))
                }
                
                Text(buttonText)
                    .font(.system(size: 16, weight: .semibold))
                
                if selectedSeatsCount > 0 && !isLoading {
                    Text("• \(formatPrice(totalPrice))")
                        .font(.system(size: 16, weight: .bold))
                }
            }
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(backgroundGradient)
            .cornerRadius(12)
            .animation(.easeInOut(duration: 0.3), value: selectedSeatsCount == 0)
            .animation(.easeInOut(duration: 0.3), value: isLoading)
        }
        .disabled(selectedSeatsCount == 0 || isLoading)
        .padding(.horizontal, 20)
    }
    
    private var buttonText: String {
        if isLoading {
            return "Loading Stripe Payment..."
        } else if selectedSeatsCount == 0 {
            return "Select seats to continue"
        } else {
            return "Continue to Checkout"
        }
    }
    
    private var backgroundGradient: LinearGradient {
        if selectedSeatsCount == 0 || isLoading {
            return LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.374, green: 0.404, blue: 0.447), // Gray
                    Color(red: 0.374, green: 0.404, blue: 0.447)
                ]),
                startPoint: .leading,
                endPoint: .trailing
            )
        } else {
            return LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.231, green: 0.510, blue: 0.965), // Blue
                    Color(red: 0.114, green: 0.306, blue: 0.847)  // Darker blue
                ]),
                startPoint: .leading,
                endPoint: .trailing
            )
        }
    }
    
    private func formatPrice(_ pence: Int) -> String {
        return "£\(pence / 100)"
    }
} 