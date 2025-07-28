//
//  JsonDrivenAccessibilityView.swift
//  LML
//
//  JSON-driven accessibility component - renders based on AccessibilitySpot data
//  Part of Phase 2: Rendering Engine Overhaul
//

import SwiftUI

// MARK: - JSON-Driven Accessibility Spot View
struct JsonDrivenAccessibilityView: View {
    let spot: AccessibilitySpot
    let scale: CGFloat
    
    var body: some View {
        Rectangle()
            .fill(Color(hex: spot.backgroundColor ?? "#0066CC"))
            .frame(
                width: (spot.size?.width ?? 24) * scale,
                height: (spot.size?.height ?? 22) * scale
            )
            .cornerRadius(4)
            .overlay(
                Text(spot.type.symbol)
                    .font(.system(size: 16 * scale))
                    .foregroundColor(Color(hex: spot.textColor ?? "#FFFFFF"))
            )
            .overlay(
                Rectangle()
                    .stroke(Color(hex: spot.borderColor ?? "#0066CC").opacity(0.7), lineWidth: 1)
                    .cornerRadius(4)
            )
            .position(
                x: spot.position.x * scale,
                y: spot.position.y * scale
            )
    }
}

// MARK: - Multi-Accessibility Renderer
struct JsonDrivenAccessibilitySpotsView: View {
    let spots: [AccessibilitySpot]
    let scale: CGFloat
    
    var body: some View {
        ForEach(spots, id: \.id) { spot in
            JsonDrivenAccessibilityView(spot: spot, scale: scale)
        }
    }
}

// MARK: - Accessibility Type Extension
extension AccessibilityType {
    var symbol: String {
        switch self {
        case .wheelchair: return "♿"
        case .hearingLoop: return "👂"
        case .guideDog: return "🐕"
        case .companion: return "👥"
        case .assistiveListening: return "🎧"
        case .serviceAnimal: return "🐕‍🦺"
        case .other: return "♿"
        }
    }
} 