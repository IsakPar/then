//
//  TheaterStage.swift
//  LML
//
//  Molecule component for theater stage visualization
//  Reusable across different theater layouts
//

import SwiftUI

// MARK: - Theater Stage Molecule
struct TheaterStage: View {
    let title: String
    let width: CGFloat
    let height: CGFloat
    
    init(title: String = "STAGE", width: CGFloat = 300, height: CGFloat = 40) {
        self.title = title
        self.width = width
        self.height = height
    }
    
    var body: some View {
        StageShape(width: width, height: height)
            .fill(Color(red: 0.165, green: 0.165, blue: 0.165))
            .stroke(Color(red: 0.267, green: 0.267, blue: 0.267), lineWidth: 2)
            .overlay(
                Text(title)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Color(red: 0.8, green: 0.8, blue: 0.8))
            )
    }
}

// MARK: - Stage Shape
struct StageShape: Shape {
    let width: CGFloat
    let height: CGFloat
    
    init(width: CGFloat = 300, height: CGFloat = 40) {
        self.width = width
        self.height = height
    }
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        // Create a rounded rectangle stage shape that fits in 1000x800 space
        let cornerRadius: CGFloat = 8
        let stageRect = CGRect(x: 0, y: 0, width: width, height: height)
        path.addRoundedRect(in: stageRect, cornerSize: CGSize(width: cornerRadius, height: cornerRadius))
        return path
    }
} 