//
//  SeatMapOptimizer.swift
//  LML
//
//  Performance optimization utilities for seat map rendering
//  Implements virtualized rendering and memory management
//

import SwiftUI
import Combine

// MARK: - Seat Map Performance Optimizer
class SeatMapOptimizer: ObservableObject {
    
    // MARK: - Performance Configuration
    struct PerformanceConfig {
        static let maxVisibleSeats = 500
        static let renderingBatchSize = 50
        static let memoryThreshold = 100_000_000 // 100MB
        static let frameRateTarget = 60.0
        
        // Gesture optimization
        static let gestureThrottleInterval: TimeInterval = 0.016 // 60fps
        static let minScaleChange: CGFloat = 0.01
        static let minOffsetChange: CGFloat = 1.0
    }
    
    // MARK: - Viewport Management
    @Published private(set) var visibleSeats: [TheaterSeat] = []
    @Published private(set) var viewportBounds: CGRect = .zero
    @Published private(set) var currentLOD: LevelOfDetail = .high
    
    private var allSeats: [TheaterSeat] = []
    private var seatSpatialIndex: SpatialIndex = SpatialIndex()
    private var lastUpdateTime: TimeInterval = 0
    private var gestureDebouncer = PassthroughSubject<Void, Never>()
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Level of Detail
    enum LevelOfDetail {
        case high    // Full detail, animations
        case medium  // Reduced detail
        case low     // Minimal detail, no animations
        
        var seatSize: CGSize {
            switch self {
            case .high: return CGSize(width: 24, height: 22)
            case .medium: return CGSize(width: 20, height: 18)
            case .low: return CGSize(width: 16, height: 14)
            }
        }
        
        var shouldAnimate: Bool {
            switch self {
            case .high: return true
            case .medium, .low: return false
            }
        }
        
        var renderQuality: Double {
            switch self {
            case .high: return 1.0
            case .medium: return 0.7
            case .low: return 0.5
            }
        }
    }
    
    init() {
        setupGestureDebouncing()
        setupMemoryMonitoring()
    }
    
    // MARK: - Seat Management
    
    func updateSeats(_ seats: [TheaterSeat]) {
        allSeats = seats
        seatSpatialIndex.updateSeats(seats)
        updateVisibleSeats()
    }
    
    func updateViewport(bounds: CGRect, scale: CGFloat) {
        let currentTime = CACurrentMediaTime()
        guard currentTime - lastUpdateTime > PerformanceConfig.gestureThrottleInterval else {
            return
        }
        
        lastUpdateTime = currentTime
        viewportBounds = bounds
        
        // Adjust LOD based on scale and seat count
        updateLevelOfDetail(scale: scale)
        
        // Trigger debounced update
        gestureDebouncer.send()
    }
    
    private func updateVisibleSeats() {
        let visible = seatSpatialIndex.seatsInBounds(viewportBounds)
        
        // Limit to performance threshold
        let limitedSeats = Array(visible.prefix(PerformanceConfig.maxVisibleSeats))
        
        DispatchQueue.main.async {
            self.visibleSeats = limitedSeats
        }
    }
    
    private func updateLevelOfDetail(scale: CGFloat) {
        let seatCount = allSeats.count
        let scaledSeatCount = Double(seatCount) * Double(scale)
        
        let newLOD: LevelOfDetail
        if scaledSeatCount > 2000 || scale > 2.5 {
            newLOD = .low
        } else if scaledSeatCount > 1000 || scale > 1.5 {
            newLOD = .medium
        } else {
            newLOD = .high
        }
        
        if newLOD != currentLOD {
            withAnimation(.easeInOut(duration: 0.2)) {
                currentLOD = newLOD
            }
        }
    }
    
    // MARK: - Performance Monitoring
    
    private func setupGestureDebouncing() {
        gestureDebouncer
            .debounce(for: .milliseconds(50), scheduler: DispatchQueue.main)
            .sink { [weak self] in
                self?.updateVisibleSeats()
            }
            .store(in: &cancellables)
    }
    
    private func setupMemoryMonitoring() {
        Timer.publish(every: 5.0, on: .main, in: .common)
            .autoconnect()
            .sink { [weak self] _ in
                self?.checkMemoryUsage()
            }
            .store(in: &cancellables)
    }
    
    private func checkMemoryUsage() {
        let memoryUsage = getMemoryUsage()
        
        if memoryUsage > PerformanceConfig.memoryThreshold {
            // Trigger memory optimization
            optimizeMemoryUsage()
        }
    }
    
    private func optimizeMemoryUsage() {
        // Force lower LOD
        withAnimation(.easeInOut(duration: 0.3)) {
            currentLOD = .low
        }
        
        // Clear non-visible seat cache
        seatSpatialIndex.clearCache()
        
        print("🧹 Memory optimization triggered")
    }
    
    private func getMemoryUsage() -> Int {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size)/4
        
        let kerr: kern_return_t = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_,
                         task_flavor_t(MACH_TASK_BASIC_INFO),
                         $0,
                         &count)
            }
        }
        
        if kerr == KERN_SUCCESS {
            return Int(info.resident_size)
        } else {
            return 0
        }
    }
}

// MARK: - Spatial Index for Fast Seat Lookup
class SpatialIndex {
    private var seatGrid: [GridKey: [TheaterSeat]] = [:]
    private let gridSize: CGFloat = 100.0
    
    struct GridKey: Hashable {
        let x: Int
        let y: Int
    }
    
    func updateSeats(_ seats: [TheaterSeat]) {
        seatGrid.removeAll()
        
        for seat in seats {
            let key = gridKey(for: CGPoint(x: seat.x, y: seat.y))
            seatGrid[key, default: []].append(seat)
        }
    }
    
    func seatsInBounds(_ bounds: CGRect) -> [TheaterSeat] {
        let minKey = gridKey(for: CGPoint(x: bounds.minX, y: bounds.minY))
        let maxKey = gridKey(for: CGPoint(x: bounds.maxX, y: bounds.maxY))
        
        var result: [TheaterSeat] = []
        
        for x in minKey.x...maxKey.x {
            for y in minKey.y...maxKey.y {
                let key = GridKey(x: x, y: y)
                if let seats = seatGrid[key] {
                    result.append(contentsOf: seats.filter { seat in
                        bounds.contains(CGPoint(x: seat.x, y: seat.y))
                    })
                }
            }
        }
        
        return result
    }
    
    func clearCache() {
        // Keep only frequently accessed grid cells
        let frequentKeys = Set(seatGrid.keys.prefix(20))
        seatGrid = seatGrid.filter { frequentKeys.contains($0.key) }
    }
    
    private func gridKey(for point: CGPoint) -> GridKey {
        return GridKey(
            x: Int(point.x / gridSize),
            y: Int(point.y / gridSize)
        )
    }
}

// MARK: - Optimized Seat Rendering
struct OptimizedSeatView: View {
    let seat: TheaterSeat
    let lod: SeatMapOptimizer.LevelOfDetail
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            seatShape
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(lod.shouldAnimate && seat.isSelected ? 1.05 : 1.0)
        .animation(
            lod.shouldAnimate ? AppAnimations.seatSelection : nil,
            value: seat.isSelected
        )
        .disabled(!seat.isAvailable)
    }
    
    private var seatShape: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .fill(seatColor)
            .frame(width: lod.seatSize.width, height: lod.seatSize.height)
            .overlay(seatOverlay)
    }
    
    private var cornerRadius: CGFloat {
        switch lod {
        case .high: return 4
        case .medium: return 3
        case .low: return 2
        }
    }
    
    private var seatColor: Color {
        if !seat.isAvailable {
            return .gray.opacity(0.6)
        } else if seat.isSelected {
            return seat.section.selectedColor
        } else {
            return seat.section.displayColor.opacity(lod.renderQuality)
        }
    }
    
    @ViewBuilder
    private var seatOverlay: some View {
        if lod == .high {
            RoundedRectangle(cornerRadius: cornerRadius)
                .stroke(borderColor, lineWidth: borderWidth)
            
            if seat.isSelected {
                RoundedRectangle(cornerRadius: cornerRadius - 1)
                    .stroke(Color.white, lineWidth: 2)
                    .frame(
                        width: lod.seatSize.width + 4,
                        height: lod.seatSize.height + 4
                    )
            }
        }
    }
    
    private var borderColor: Color {
        if !seat.isAvailable {
            return .gray.opacity(0.4)
        } else if seat.isSelected {
            return .white.opacity(0.8)
        } else {
            return .black.opacity(0.3)
        }
    }
    
    private var borderWidth: CGFloat {
        switch lod {
        case .high: return seat.isSelected ? 1.5 : 1.0
        case .medium: return 1.0
        case .low: return 0.5
        }
    }
}

// MARK: - Performance Metrics
struct PerformanceMetrics {
    private static var frameCount = 0
    private static var lastFrameTime = CACurrentMediaTime()
    
    static func recordFrame() {
        frameCount += 1
        let currentTime = CACurrentMediaTime()
        
        if currentTime - lastFrameTime >= 1.0 {
            let fps = Double(frameCount) / (currentTime - lastFrameTime)
            
            #if DEBUG
            print("🎯 Seat Map FPS: \(Int(fps))")
            #endif
            
            frameCount = 0
            lastFrameTime = currentTime
        }
    }
    
    static func logPerformanceWarning(_ message: String) {
        #if DEBUG
        print("⚠️ Performance Warning: \(message)")
        #endif
    }
} 