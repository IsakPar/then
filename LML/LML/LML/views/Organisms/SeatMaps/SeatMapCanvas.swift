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
            ScrollViewReader { proxy in
                ScrollView([.horizontal, .vertical]) {
                    ZStack {
                        theaterBackground
                        theaterElements
                        seatGrid
                    }
                    .frame(
                        width: theaterConfig.viewBox.width,
                        height: theaterConfig.viewBox.height
                    )
                    .scaleEffect(viewModel.scale)
                    .offset(viewModel.offset)
                }
                .gesture(zoomAndPanGesture)
                .clipped()
            }
        }
    }
    
    // MARK: - Theater Background
    private var theaterBackground: some View {
        Rectangle()
            .fill(Color(red: 0.102, green: 0.102, blue: 0.102))
            .frame(width: theaterConfig.viewBox.width, height: theaterConfig.viewBox.height)
    }
    
    // MARK: - Theater Elements
    private var theaterElements: some View {
        ZStack {
            // Stage - properly centered above the seat layout
            TheaterStage()
                .position(x: 620, y: 50)
            
            // Aisles
            theaterAisles
            
            // Section labels
            sectionLabels
            
            // Wheelchair spots
            wheelchairSpots
        }
    }
    
    private var theaterAisles: some View {
        Group {
            // Main center aisle - separates sections vertically  
            Rectangle()
                .fill(Color(red: 0.165, green: 0.165, blue: 0.165).opacity(0.5))
                .frame(width: 20, height: 400)
                .position(x: 500, y: 400)
            
            // Left side aisle - between left and center sections
            Rectangle()
                .fill(Color(red: 0.165, green: 0.165, blue: 0.165).opacity(0.3))
                .frame(width: 30, height: 300)
                .position(x: 300, y: 350)
            
            // Right side aisle - between right and center sections  
            Rectangle()
                .fill(Color(red: 0.165, green: 0.165, blue: 0.165).opacity(0.3))
                .frame(width: 30, height: 300)
                .position(x: 700, y: 350)
            
            // Horizontal aisle - between premium and middle sections
            Rectangle()
                .fill(Color(red: 0.165, green: 0.165, blue: 0.165).opacity(0.2))
                .frame(width: 400, height: 30)
                .position(x: 500, y: 300)
            
            // Horizontal aisle - between middle and back sections
            Rectangle()
                .fill(Color(red: 0.165, green: 0.165, blue: 0.165).opacity(0.2))
                .frame(width: 400, height: 30)
                .position(x: 500, y: 550)
        }
    }
    
    private var sectionLabels: some View {
        Group {
            Text("PREMIUM SECTION (150 seats)")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.yellow)
                .position(x: 500, y: 120)
            
            Text("SIDE A (50 seats)")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.gray)
                .position(x: 200, y: 150)
            
            Text("SIDE B (50 seats)")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.gray)
                .position(x: 800, y: 150)
            
            Text("MIDDLE SECTION (150 seats)")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.gray)
                .position(x: 500, y: 350)
            
            Text("BACK SECTION (102 seats)")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.gray)
                .position(x: 500, y: 600)
        }
    }
    
    private var wheelchairSpots: some View {
        Group {
            // Wheelchair spots near premium section edges
            WheelchairSpot()
                .position(x: 300, y: 140)
            
            WheelchairSpot()
                .position(x: 700, y: 140)
            
            // Wheelchair spots near side sections
            WheelchairSpot()
                .position(x: 180, y: 200)
            
            WheelchairSpot()
                .position(x: 820, y: 200)
            
            // Additional wheelchair spots near back section
            WheelchairSpot()
                .position(x: 350, y: 600)
            
            WheelchairSpot()
                .position(x: 650, y: 600)
        }
    }
    
    // MARK: - Seat Grid
    private var seatGrid: some View {
        ZStack {
            ForEach(viewModel.allSeats) { seat in
                SeatButton(seat: seat) {
                    viewModel.handleSeatSelection(seat)
                }
                .position(x: seat.x, y: seat.y)
            }
        }
        .onAppear {
            print("🎭 SeatMapCanvas rendering \(viewModel.allSeats.count) seats")
            if viewModel.allSeats.count > 0 {
                let firstSeat = viewModel.allSeats[0]
                print("🎯 First seat position: (\(firstSeat.x), \(firstSeat.y))")
                
                // Show coordinate spread for debugging
                let xCoords = viewModel.allSeats.map { $0.x }
                let yCoords = viewModel.allSeats.map { $0.y }
                if let minX = xCoords.min(), let maxX = xCoords.max(),
                   let minY = yCoords.min(), let maxY = yCoords.max() {
                    print("📏 Seat spread: X(\(Int(minX))-\(Int(maxX))) Y(\(Int(minY))-\(Int(maxY)))")
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