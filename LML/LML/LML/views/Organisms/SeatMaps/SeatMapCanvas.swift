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
    // PHASE 3: TheaterConfig removed - all configuration now from JSON venue layout
    
    var body: some View {
        GeometryReader { geometry in
            let canvasWidth = geometry.size.width
            let canvasHeight = geometry.size.height
            
            // PHASE 3: Dynamic viewport based only on loaded venue layout
            let viewportWidth = viewModel.venueLayout?.venue.viewport.width ?? 1000.0 // Default fallback
            let viewportHeight = viewModel.venueLayout?.venue.viewport.height ?? 800.0 // Default fallback
            
            let scaleX = canvasWidth / viewportWidth
            let scaleY = canvasHeight / viewportHeight
            let uniformScale = min(scaleX, scaleY) * 0.9 // 90% to leave some padding
            
            ScrollViewReader { proxy in
                ScrollView([.horizontal, .vertical]) {
                    ZStack {
                        venueBackground(canvasWidth: canvasWidth, canvasHeight: canvasHeight)
                        
                        // PHASE 3: Only JSON-driven theater elements
                        if let venueLayout = viewModel.venueLayout {
                            jsonDrivenTheaterElements(venueLayout: venueLayout, scale: uniformScale)
                        }
                        // No hardcoded fallback - venue layout is required
                        
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
                    let venueName = viewModel.venueLayout?.venue.name ?? "Unknown"
                    print("🎯 Canvas setup: venue(\(venueName)) canvas(\(Int(canvasWidth))x\(Int(canvasHeight))) viewport(\(Int(viewportWidth))x\(Int(viewportHeight))) scale(\(String(format: "%.2f", uniformScale)))")
                }
            }
        }
    }
    
    // MARK: - Venue Background
    private func venueBackground(canvasWidth: CGFloat, canvasHeight: CGFloat) -> some View {
        Rectangle()
            .fill(Color(red: 0.102, green: 0.102, blue: 0.102))
            .frame(width: canvasWidth, height: canvasHeight)
    }
    
    // MARK: - PHASE 2: JSON-Driven Theater Elements
    private func jsonDrivenTheaterElements(venueLayout: VenueLayout, scale: CGFloat) -> some View {
        ZStack {
            // Render stage if present
            if let stage = venueLayout.stage {
                JsonDrivenStageView(stage: stage, scale: scale)
            }
            
            // Render all aisles
            JsonDrivenAislesView(aisles: venueLayout.aisles, scale: scale)
            
            // Render all section labels  
            JsonDrivenLabelsView(labels: venueLayout.sectionLabels, scale: scale)
            
            // Render all accessibility spots
            JsonDrivenAccessibilitySpotsView(spots: venueLayout.accessibilitySpots, scale: scale)
        }
    }
    
    // PHASE 3: All hardcoded theater elements removed - now 100% JSON-driven
    
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

// PHASE 3: Hardcoded components removed - all elements now JSON-driven
// - WheelchairSpot: Replaced by JsonDrivenAccessibilityView
// - TheaterConfig: Replaced by dynamic venue layout data 