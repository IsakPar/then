//
//  LoadingStateView.swift
//  LML
//
//  Enhanced loading state molecule with skeleton screens
//  Provides smooth loading experiences and accessibility support
//

import SwiftUI

// MARK: - Enhanced Loading State View Molecule
struct LoadingStateView: View {
    let message: String
    let style: LoadingStyle
    let showSkeleton: Bool
    
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    init(message: String = "Loading...", style: LoadingStyle = .standard, showSkeleton: Bool = false) {
        self.message = message
        self.style = style
        self.showSkeleton = showSkeleton
    }
    
    var body: some View {
        Group {
            if showSkeleton {
                skeletonContent
            } else {
                traditionalLoadingContent
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Loading content")
        .accessibilityHint(message)
    }
    
    private var traditionalLoadingContent: some View {
        VStack(spacing: style.spacing) {
            loadingIndicator
            loadingText
        }
        .fadeIn(delay: 0.1)
    }
    
    private var loadingIndicator: some View {
        ProgressView()
            .scaleEffect(style.scale)
            .tint(style.color)
            .animation(
                reduceMotion ? nil : AppAnimations.loadingPulse,
                value: UUID()
            )
    }
    
    private var loadingText: some View {
        Text(message)
            .font(style.font)
            .foregroundColor(style.textColor)
            .multilineTextAlignment(.center)
            .dynamicTypeSize(min: .small, max: .xxxLarge)
    }
    
    private var skeletonContent: some View {
        VStack(spacing: 16) {
            ForEach(0..<style.skeletonItemCount, id: \.self) { index in
                SkeletonCard()
                    .fadeIn(delay: Double(index) * 0.1)
            }
        }
    }
}

// MARK: - Enhanced Loading Style Configuration
enum LoadingStyle {
    case standard
    case large
    case compact
    case tickets
    case seatMap
    
    var spacing: CGFloat {
        switch self {
        case .standard: return 20
        case .large: return 24
        case .compact: return 12
        case .tickets, .seatMap: return 16
        }
    }
    
    var scale: CGFloat {
        switch self {
        case .standard: return 1.5
        case .large: return 2.0
        case .compact: return 1.0
        case .tickets: return 1.2
        case .seatMap: return 1.8
        }
    }
    
    var font: Font {
        switch self {
        case .standard: return .headline
        case .large: return .title3
        case .compact: return .subheadline
        case .tickets: return .body
        case .seatMap: return .title2
        }
    }
    
    var color: Color {
        switch self {
        case .seatMap: return .blue
        default: return .white
        }
    }
    
    var textColor: Color {
        return .white.opacity(0.8)
    }
    
    var skeletonItemCount: Int {
        switch self {
        case .tickets: return 3
        case .seatMap: return 1
        case .large: return 2
        default: return 1
        }
    }
}

// MARK: - Specialized Loading Views
struct TicketsLoadingView: View {
    var body: some View {
        VStack(spacing: 12) {
            ForEach(0..<3, id: \.self) { index in
                TicketSkeletonCard()
                    .fadeIn(delay: Double(index) * 0.15)
            }
        }
        .padding(.horizontal, 24)
    }
}

struct SeatMapLoadingView: View {
    var body: some View {
        VStack(spacing: 20) {
            // Theater stage skeleton
            SkeletonView(cornerRadius: 8, height: 40)
                .frame(width: 200)
                .fadeIn(delay: 0.1)
            
            // Seat map skeleton
            VStack(spacing: 8) {
                ForEach(0..<8, id: \.self) { row in
                    HStack(spacing: 4) {
                        ForEach(0..<12, id: \.self) { seat in
                            RoundedRectangle(cornerRadius: 4)
                                .fill(Color.white.opacity(0.1))
                                .frame(width: 20, height: 18)
                                .fadeIn(delay: Double(row * 12 + seat) * 0.005)
                        }
                    }
                }
            }
            .fadeIn(delay: 0.3)
            
            // Controls skeleton
            HStack {
                SkeletonView(cornerRadius: 8, height: 32)
                    .frame(width: 100)
                Spacer()
                SkeletonView(cornerRadius: 16, height: 44)
                    .frame(width: 120)
            }
            .padding(.horizontal, 24)
            .fadeIn(delay: 0.5)
        }
    }
}

struct TicketSkeletonCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    SkeletonView(height: 20)
                        .frame(width: 150)
                    SkeletonView(height: 16)
                        .frame(width: 120)
                }
                Spacer()
                SkeletonView(cornerRadius: 12, height: 24)
                    .frame(width: 80)
            }
            
            VStack(alignment: .leading, spacing: 6) {
                SkeletonView(height: 14)
                    .frame(width: 100)
                SkeletonView(height: 14)
                    .frame(width: 80)
                SkeletonView(height: 14)
                    .frame(width: 120)
            }
            
            HStack {
                SkeletonView(height: 24)
                    .frame(width: 60)
                Spacer()
                SkeletonView(height: 16)
                    .frame(width: 90)
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.white.opacity(0.1), lineWidth: 1)
                )
        )
    }
}

// MARK: - Loading State Manager
class LoadingStateManager: ObservableObject {
    @Published var isLoading = false
    @Published var loadingMessage = "Loading..."
    @Published var loadingStyle: LoadingStyle = .standard
    
    func setLoading(_ loading: Bool, message: String = "Loading...", style: LoadingStyle = .standard) {
        withAnimation(AppAnimations.fadeTransition) {
            isLoading = loading
            loadingMessage = message
            loadingStyle = style
        }
    }
    
    func showTicketsLoading() {
        setLoading(true, message: "Loading your tickets...", style: .tickets)
    }
    
    func showSeatMapLoading() {
        setLoading(true, message: "Loading seat map...", style: .seatMap)
    }
    
    func showAuthLoading() {
        setLoading(true, message: "Authenticating...", style: .standard)
    }
    
    func hideLoading() {
        setLoading(false)
    }
}

// MARK: - Preview
struct LoadingStateView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 40) {
            LoadingStateView()
            
            LoadingStateView(
                message: "Loading your tickets...",
                style: .tickets,
                showSkeleton: true
            )
            
            TicketsLoadingView()
        }
        .padding()
        .background(Color(red: 0.067, green: 0.094, blue: 0.153))
        .preferredColorScheme(.dark)
    }
} 