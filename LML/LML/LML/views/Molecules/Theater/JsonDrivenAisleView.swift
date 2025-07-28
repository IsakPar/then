//
//  JsonDrivenAisleView.swift
//  LML
//
//  JSON-driven aisle component - renders based on AisleElement data
//  Part of Phase 2: Rendering Engine Overhaul
//

import SwiftUI

// MARK: - JSON-Driven Aisle View
struct JsonDrivenAisleView: View {
    let aisle: AisleElement
    let scale: CGFloat
    
    var body: some View {
        Rectangle()
            .fill(Color(hex: aisle.color).opacity(aisle.opacity ?? 0.5))
            .frame(
                width: aisle.dimensions.width * scale,
                height: aisle.dimensions.height * scale
            )
            .position(
                x: aisle.position.x * scale,
                y: aisle.position.y * scale
            )
    }
}

// MARK: - Multi-Aisle Renderer
struct JsonDrivenAislesView: View {
    let aisles: [AisleElement]
    let scale: CGFloat
    
    var body: some View {
        ForEach(aisles, id: \.id) { aisle in
            JsonDrivenAisleView(aisle: aisle, scale: scale)
        }
    }
} 