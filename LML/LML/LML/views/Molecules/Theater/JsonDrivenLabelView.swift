//
//  JsonDrivenLabelView.swift
//  LML
//
//  JSON-driven label component - renders based on LabelElement data
//  Part of Phase 2: Rendering Engine Overhaul
//

import SwiftUI

// MARK: - JSON-Driven Label View
struct JsonDrivenLabelView: View {
    let label: LabelElement
    let scale: CGFloat
    
    var body: some View {
        Text(label.text)
            .font(.system(
                size: label.fontSize * scale, 
                weight: Font.Weight.from(string: label.fontWeight?.rawValue ?? "regular")
            ))
            .foregroundColor(Color(hex: label.colorHex))
            .position(
                x: label.position.x * scale,
                y: label.position.y * scale
            )
    }
}

// MARK: - Multi-Label Renderer
struct JsonDrivenLabelsView: View {
    let labels: [LabelElement]
    let scale: CGFloat
    
    var body: some View {
        ForEach(labels, id: \.id) { label in
            JsonDrivenLabelView(label: label, scale: scale)
        }
    }
}

// MARK: - Font Weight Extension
extension Font.Weight {
    static func from(string: String) -> Font.Weight {
        switch string.lowercased() {
        case "ultralight": return .ultraLight
        case "thin": return .thin
        case "light": return .light
        case "regular": return .regular
        case "medium": return .medium
        case "semibold": return .semibold
        case "bold": return .bold
        case "heavy": return .heavy
        case "black": return .black
        default: return .regular
        }
    }
} 