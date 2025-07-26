//
//  SeatMapCanvas.swift
//  LML
//
//  Organism component for interactive seat map canvas
//  Handles zoom, pan, and seat interactions
//

import SwiftUI

// MARK: - Seat Map Canvas Organism
struct SeatMapCanvas: View {
    @ObservedObject var viewModel: SeatMapViewModel
    let theaterConfig: TheaterConfig
    
    var body: some View {
        GeometryReader { geometry in
            let canvasWidth = geometry.size.width
            let canvasHeight = geometry.size.height
            let scaleX = canvasWidth / theaterConfig.viewBox.width
            let scaleY = canvasHeight / theaterConfig.viewBox.height
            let uniformScale = min(scaleX, scaleY) * 0.9 // 90% to leave some padding
            
            ScrollViewReader { proxy in
                ScrollView([.horizontal, .vertical]) {
                    ZStack {
                        theaterBackground(canvasWidth: canvasWidth, canvasHeight: canvasHeight)
                        theaterElements(scale: uniformScale)
                        seatGrid(coordinateScale: uniformScale)
                    }
                    .frame(
                        width: canvasWidth,
                        height: canvasHeight
                    )
                    .scaleEffect(viewModel.scale)
                    .offset(viewModel.offset)
                }
                .gesture(zoomAndPanGesture)
                .clipped()
                .onAppear {
                    print("🎯 Canvas setup: available(\(Int(canvasWidth))x\(Int(canvasHeight))) viewBox(\(Int(theaterConfig.viewBox.width))x\(Int(theaterConfig.viewBox.height))) scale(\(String(format: "%.2f", uniformScale)))")
                }
            }
        }
    }
    
    // MARK: - Theater Background
    private func theaterBackground(canvasWidth: CGFloat, canvasHeight: CGFloat) -> some View {
        Rectangle()
            .fill(Color(red: 0.102, green: 0.102, blue: 0.102))
            .frame(width: canvasWidth, height: canvasHeight)
    }
    
    // MARK: - Theater Elements
    private func theaterElements(scale: CGFloat) -> some View {
        ZStack {
            // Stage - properly centered above the seat layout
            TheaterStage()
                .position(x: 620 * scale, y: 50 * scale)
            
            // Aisles
            theaterAisles(scale: scale)
            
            // Section labels
            sectionLabels(scale: scale)
            
            // Wheelchair spots
            wheelchairSpots(scale: scale)
        }
    }
    
    private func theaterAisles(scale: CGFloat) -> some View {
        Group {
            // Main center aisle - separates sections vertically  
            Rectangle()
                .fill(Color(red: 0.165, green: 0.165, blue: 0.165).opacity(0.5))
                .frame(width: 20 * scale, height: 400 * scale)
                .position(x: 500 * scale, y: 400 * scale)
            
            // Left side aisle - between left and center sections
            Rectangle()
                .fill(Color(red: 0.165, green: 0.165, blue: 0.165).opacity(0.3))
                .frame(width: 30 * scale, height: 300 * scale)
                .position(x: 300 * scale, y: 350 * scale)
            
            // Right side aisle - between right and center sections  
            Rectangle()
                .fill(Color(red: 0.165, green: 0.165, blue: 0.165).opacity(0.3))
                .frame(width: 30 * scale, height: 300 * scale)
                .position(x: 700 * scale, y: 350 * scale)
            
            // Horizontal aisle - between premium and middle sections
            Rectangle()
                .fill(Color(red: 0.165, green: 0.165, blue: 0.165).opacity(0.2))
                .frame(width: 400 * scale, height: 30 * scale)
                .position(x: 500 * scale, y: 300 * scale)
            
            // Horizontal aisle - between middle and back sections
            Rectangle()
                .fill(Color(red: 0.165, green: 0.165, blue: 0.165).opacity(0.2))
                .frame(width: 400 * scale, height: 30 * scale)
                .position(x: 500 * scale, y: 550 * scale)
        }
    }
    
    private func sectionLabels(scale: CGFloat) -> some View {
        Group {
            Text("PREMIUM SECTION (150 seats)")
                .font(.system(size: 16 * scale, weight: .bold))
                .foregroundColor(.yellow)
                .position(x: 500 * scale, y: 120 * scale)
            
            Text("SIDE A (50 seats)")
                .font(.system(size: 14 * scale, weight: .bold))
                .foregroundColor(.gray)
                .position(x: 200 * scale, y: 150 * scale)
            
            Text("SIDE B (50 seats)")
                .font(.system(size: 14 * scale, weight: .bold))
                .foregroundColor(.gray)
                .position(x: 800 * scale, y: 150 * scale)
            
            Text("MIDDLE SECTION (150 seats)")
                .font(.system(size: 16 * scale, weight: .bold))
                .foregroundColor(.gray)
                .position(x: 500 * scale, y: 350 * scale)
            
            Text("BACK SECTION (102 seats)")
                .font(.system(size: 16 * scale, weight: .bold))
                .foregroundColor(.gray)
                .position(x: 500 * scale, y: 600 * scale)
        }
    }
    
    private func wheelchairSpots(scale: CGFloat) -> some View {
        Group {
            // Wheelchair spots near premium section edges
            WheelchairSpot()
                .position(x: 300 * scale, y: 140 * scale)
            
            WheelchairSpot()
                .position(x: 700 * scale, y: 140 * scale)
            
            // Wheelchair spots near side sections
            WheelchairSpot()
                .position(x: 180 * scale, y: 200 * scale)
            
            WheelchairSpot()
                .position(x: 820 * scale, y: 200 * scale)
            
            // Additional wheelchair spots near back section
            WheelchairSpot()
                .position(x: 350 * scale, y: 600 * scale)
            
            WheelchairSpot()
                .position(x: 650 * scale, y: 600 * scale)
        }
    }
    
    // MARK: - Seat Grid
    private func seatGrid(coordinateScale: CGFloat) -> some View {
        ZStack {
            ForEach(viewModel.allSeats) { seat in
                SeatButton(seat: seat) {
                    viewModel.handleSeatSelection(seat)
                }
                .position(x: seat.x * coordinateScale, y: seat.y * coordinateScale)
            }
        }
        .onAppear {
            print("🎭 SeatMapCanvas rendering \(viewModel.allSeats.count) seats with coordinate scale \(String(format: "%.2f", coordinateScale))")
            if viewModel.allSeats.count > 0 {
                let firstSeat = viewModel.allSeats[0]
                let scaledX = firstSeat.x * coordinateScale
                let scaledY = firstSeat.y * coordinateScale
                print("🎯 First seat: JSON(\(Int(firstSeat.x)),\(Int(firstSeat.y))) → Canvas(\(Int(scaledX)),\(Int(scaledY)))")
                
                // Show coordinate spread for debugging
                let xCoords = viewModel.allSeats.map { $0.x * coordinateScale }
                let yCoords = viewModel.allSeats.map { $0.y * coordinateScale }
                if let minX = xCoords.min(), let maxX = xCoords.max(),
                   let minY = yCoords.min(), let maxY = yCoords.max() {
                    print("📏 Scaled seat spread: X(\(Int(minX))-\(Int(maxX))) Y(\(Int(minY))-\(Int(maxY)))")
                }
                
                // Show sample row positions for debugging
                let orchestraSeats = viewModel.allSeats.filter { $0.section == .premium }
                let rowASeats = orchestraSeats.filter { $0.row == 1 }
                let rowHSeats = orchestraSeats.filter { $0.row == 8 }
                if let rowASeat = rowASeats.first, let rowHSeat = rowHSeats.first {
                    print("🎭 Row positions: A(\(Int(rowASeat.y * coordinateScale))) H(\(Int(rowHSeat.y * coordinateScale)))")
                }
            }
        }
    }
    
    // MARK: - Gestures
    private var zoomAndPanGesture: some Gesture {
        SimultaneousGesture(
            MagnificationGesture()
                .onChanged { value in
                    viewModel.updateScale(value)
                }
                .onEnded { _ in
                    viewModel.endScaleGesture()
                },
            DragGesture()
                .onChanged { value in
                    viewModel.updateOffset(value.translation)
                }
                .onEnded { _ in
                    viewModel.endDragGesture()
                }
        )
    }
}

// MARK: - Wheelchair Spot Component
struct WheelchairSpot: View {
    var body: some View {
        Rectangle()
            .fill(.blue)
            .frame(width: 24, height: 22)
            .cornerRadius(4)
            .overlay(
                Text("♿")
                    .font(.system(size: 16))
                    .foregroundColor(.white)
            )
            .overlay(
                Rectangle()
                    .stroke(Color.blue.opacity(0.7), lineWidth: 1)
                    .cornerRadius(4)
            )
    }
}

// MARK: - Theater Configuration
struct TheaterConfig {
    // Standardized ViewBox to match JSON coordinate space (1000x800)
    let viewBox = CGRect(x: 0, y: 0, width: 1000, height: 800)
    let totalSeats = 502
    let seatSize = CGSize(width: 24, height: 22)
    let seatSpacing: CGFloat = 30
    let rowSpacing: CGFloat = 28
} 