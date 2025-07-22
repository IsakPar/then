//
//  PriceTag.swift
//  LML
//
//  Reusable price display atom component
//  Handles price formatting and styling consistently
//

import SwiftUI

// MARK: - Price Tag Atom Component
struct PriceTag: View {
    let amount: Int
    let style: PriceStyle
    
    init(amount: Int, style: PriceStyle = .standard) {
        self.amount = amount
        self.style = style
    }
    
    var body: some View {
        Text(formatPrice(amount))
            .font(style.font)
            .foregroundColor(style.color)
            .fontWeight(style.weight)
    }
    
    private func formatPrice(_ pence: Int) -> String {
        return "£\(pence / 100)"
    }
}

// MARK: - Price Style Configuration
enum PriceStyle {
    case standard
    case large
    case small
    case highlighted
    
    var font: Font {
        switch self {
        case .standard: return .system(size: 16)
        case .large: return .system(size: 20)
        case .small: return .system(size: 14)
        case .highlighted: return .system(size: 18)
        }
    }
    
    var color: Color {
        switch self {
        case .standard: return .white
        case .large: return Color(red: 0.063, green: 0.725, blue: 0.506) // Green
        case .small: return Color(red: 0.612, green: 0.639, blue: 0.686) // Gray
        case .highlighted: return Color(red: 0.063, green: 0.725, blue: 0.506) // Green
        }
    }
    
    var weight: Font.Weight {
        switch self {
        case .standard: return .medium
        case .large, .highlighted: return .bold
        case .small: return .regular
        }
    }
} 