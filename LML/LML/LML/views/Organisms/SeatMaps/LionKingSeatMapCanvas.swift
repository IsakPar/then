//
//  LionKingSeatMapCanvas.swift
//  LML
//
//  Organism component for Lion King interactive seat map canvas
//  Handles transformed coordinates and Lion King-specific theater layout
//

import SwiftUI

// MARK: - Lion King Seat Map Canvas
struct LionKingSeatMapCanvas: View {
    @ObservedObject var viewModel: LionKingSeatMapViewModel
    let theaterConfig: LionKingTheaterConfig
    
    var body: some View {
        GeometryReader { geometry in
            ScrollViewReader { proxy in
                ScrollView([.horizontal, .vertical]) {
                    ZStack {
                        theaterBackground
                        visualSeparators
                        lionKingStage
                        sectionLabels
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
    
    // MARK: - Lion King Stage
    private var lionKingStage: some View {
        ZStack {
            // Stage platform
            RoundedRectangle(cornerRadius: 8)
                .fill(LinearGradient(
                    colors: [Color.orange.opacity(0.8), Color.yellow.opacity(0.6)],
                    startPoint: .top,
                    endPoint: .bottom
                ))
                .frame(
                    width: theaterConfig.stage.size.width,
                    height: theaterConfig.stage.size.height
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(Color.orange, lineWidth: 2)
                )
            
            // Stage label
            Text(theaterConfig.stage.label)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(.black)
        }
        .position(
            x: theaterConfig.stage.position.x,
            y: theaterConfig.stage.position.y
        )
    }
    
    // MARK: - Visual Separators
    private var visualSeparators: some View {
        ZStack {
            ForEach(SectionBoundaryManager.shared.getVisualSeparators(), id: \.position.x) { separator in
                Rectangle()
                    .fill(Color.gray.opacity(separator.opacity))
                    .frame(width: separator.size.width, height: separator.size.height)
                    .position(separator.position)
            }
        }
    }
    
    // MARK: - Section Labels
    private var sectionLabels: some View {
        ZStack {
            // Update labels to use boundary manager info
            let boundaryManager = SectionBoundaryManager.shared
            
            // Orchestra label (Premium section)
            let orchestraInfo = boundaryManager.getSectionDisplayInfo(for: .premium)
            let orchestraBounds = boundaryManager.getBounds(for: .premium)
            sectionLabel(
                orchestraInfo.name, 
                position: CGPoint(x: orchestraBounds.xRange.lowerBound + 300, y: orchestraBounds.yRange.upperBound + 20), 
                color: orchestraInfo.color.opacity(0.8)
            )
            
            // Mezzanine label (Middle section)
            let mezzanineInfo = boundaryManager.getSectionDisplayInfo(for: .middle)
            let mezzanineBounds = boundaryManager.getBounds(for: .middle)
            sectionLabel(
                mezzanineInfo.name, 
                position: CGPoint(x: mezzanineBounds.xRange.lowerBound + 250, y: mezzanineBounds.yRange.upperBound + 20), 
                color: mezzanineInfo.color.opacity(0.8)
            )
            
            // Balcony label (Back section)
            let balconyInfo = boundaryManager.getSectionDisplayInfo(for: .back)
            let balconyBounds = boundaryManager.getBounds(for: .back)
            sectionLabel(
                balconyInfo.name, 
                position: CGPoint(x: balconyBounds.xRange.lowerBound + 200, y: balconyBounds.yRange.upperBound + 20), 
                color: balconyInfo.color.opacity(0.8)
            )
            
            // Boxes label (Side A section)
            let boxesInfo = boundaryManager.getSectionDisplayInfo(for: .sideA)
            let boxesBounds = boundaryManager.getBounds(for: .sideA)
            sectionLabel(
                boxesInfo.name, 
                position: CGPoint(x: boxesBounds.xRange.lowerBound + 70, y: boxesBounds.yRange.lowerBound - 20), 
                color: boxesInfo.color.opacity(0.8)
            )
        }
    }
    
    private func sectionLabel(_ text: String, position: CGPoint, color: Color) -> some View {
        Text(text)
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(color)
            .cornerRadius(6)
            .position(position)
    }
    
    // MARK: - Seat Grid
    private var seatGrid: some View {
        ZStack {
            ForEach(viewModel.allSeats, id: \.id) { seat in
                SeatButton(seat: seat) {
                    viewModel.toggleSeat(seat)
                }
                .position(x: seat.x, y: seat.y)
            }
        }
        .onAppear {
            print("🎭 LionKingSeatMapCanvas rendering \(viewModel.allSeats.count) seats")
            if viewModel.allSeats.count > 0 {
                let firstSeat = viewModel.allSeats[0]
                print("🎯 First seat position: (\(firstSeat.x), \(firstSeat.y))")
            }
        }
    }
    
    // MARK: - Zoom and Pan Gesture
    private var zoomAndPanGesture: some Gesture {
        SimultaneousGesture(
            MagnificationGesture()
                .onChanged { value in
                    viewModel.scale = max(0.5, min(value, 3.0))
                },
            DragGesture()
                .onChanged { value in
                    viewModel.offset = value.translation
                }
        )
    }
}



// MARK: - Preview
#Preview {
    LionKingSeatMapCanvas(
        viewModel: LionKingSeatMapViewModel(),
        theaterConfig: LionKingTheaterConfig()
    )
} 