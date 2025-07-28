//
//  JsonDrivenStageView.swift
//  LML
//
//  JSON-driven stage component - renders based on StageElement data
//  Part of Phase 2: Rendering Engine Overhaul
//

import SwiftUI

// MARK: - JSON-Driven Stage View
struct JsonDrivenStageView: View {
    let stage: StageElement
    let scale: CGFloat
    
    var body: some View {
        Rectangle()
            .fill(Color(hex: stage.backgroundColor ?? "#2A2A2A"))
            .stroke(Color(hex: stage.borderColor ?? stage.backgroundColor ?? "#444444"), lineWidth: 2)
            .frame(
                width: stage.dimensions.width * scale,
                height: stage.dimensions.height * scale
            )
            .cornerRadius(8)
            .overlay(
                Text(stage.title)
                    .font(.system(size: 18 * scale, weight: .bold))
                    .foregroundColor(Color(hex: "#E0E0E0"))
            )
            .position(
                x: stage.position.x * scale,
                y: stage.position.y * scale
            )
    }
}

// MARK: - Color(hex:) extension already exists in ShowThemeEngine.swift 