//
//  AnimationHelpers.swift
//  LML
//
//  Animation helper utilities for consistent app-wide animations
//  Provides pre-configured animations and transition effects
//

import SwiftUI

// MARK: - Animation Presets
struct AppAnimations {
    
    // MARK: - Common Animations
    static let fastEaseInOut = Animation.easeInOut(duration: 0.2)
    static let standardEaseInOut = Animation.easeInOut(duration: 0.3)
    static let slowEaseInOut = Animation.easeInOut(duration: 0.5)
    
    static let springBouncy = Animation.spring(response: 0.6, dampingFraction: 0.7, blendDuration: 0)
    static let springSnappy = Animation.spring(response: 0.4, dampingFraction: 0.8, blendDuration: 0)
    static let springGentle = Animation.spring(response: 0.8, dampingFraction: 0.9, blendDuration: 0)
    
    // MARK: - Specific Use Cases
    static let seatSelection = Animation.spring(response: 0.3, dampingFraction: 0.6, blendDuration: 0)
    static let buttonPress = Animation.easeInOut(duration: 0.15)
    static let slideTransition = Animation.easeInOut(duration: 0.35)
    static let fadeTransition = Animation.easeInOut(duration: 0.25)
    static let scaleTransition = Animation.spring(response: 0.4, dampingFraction: 0.7, blendDuration: 0)
    
    // MARK: - Loading States
    static let loadingPulse = Animation.easeInOut(duration: 1.0).repeatForever(autoreverses: true)
    static let shimmerEffect = Animation.linear(duration: 1.5).repeatForever(autoreverses: false)
    
    // MARK: - Error States
    static let errorShake = Animation.linear(duration: 0.1).repeatCount(3, autoreverses: true)
    static let errorBounce = Animation.spring(response: 0.3, dampingFraction: 0.3, blendDuration: 0)
}

// MARK: - Custom Animation Modifiers
struct ScaleButtonStyle: ButtonStyle {
    let scaleAmount: CGFloat
    let animationSpeed: Double
    
    init(scaleAmount: CGFloat = 0.95, animationSpeed: Double = 0.15) {
        self.scaleAmount = scaleAmount
        self.animationSpeed = animationSpeed
    }
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? scaleAmount : 1.0)
            .animation(.easeInOut(duration: animationSpeed), value: configuration.isPressed)
    }
}

struct BounceButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 1.1 : 1.0)
            .animation(AppAnimations.springBouncy, value: configuration.isPressed)
    }
}

// MARK: - Animated Containers
struct SlideInView<Content: View>: View {
    let content: Content
    let edge: Edge
    let animationDelay: Double
    
    @State private var isVisible = false
    
    init(from edge: Edge = .bottom, delay: Double = 0, @ViewBuilder content: () -> Content) {
        self.edge = edge
        self.animationDelay = delay
        self.content = content()
    }
    
    var body: some View {
        content
            .offset(
                x: edge == .leading ? (isVisible ? 0 : -100) : (edge == .trailing ? (isVisible ? 0 : 100) : 0),
                y: edge == .top ? (isVisible ? 0 : -100) : (edge == .bottom ? (isVisible ? 0 : 100) : 0)
            )
            .opacity(isVisible ? 1 : 0)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + animationDelay) {
                    withAnimation(AppAnimations.slideTransition) {
                        isVisible = true
                    }
                }
            }
    }
}

struct FadeInView<Content: View>: View {
    let content: Content
    let animationDelay: Double
    
    @State private var isVisible = false
    
    init(delay: Double = 0, @ViewBuilder content: () -> Content) {
        self.animationDelay = delay
        self.content = content()
    }
    
    var body: some View {
        content
            .opacity(isVisible ? 1 : 0)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + animationDelay) {
                    withAnimation(AppAnimations.fadeTransition) {
                        isVisible = true
                    }
                }
            }
    }
}

// MARK: - Skeleton Loading Views
struct SkeletonView: View {
    @State private var isAnimating = false
    
    let cornerRadius: CGFloat
    let height: CGFloat
    
    init(cornerRadius: CGFloat = 8, height: CGFloat = 20) {
        self.cornerRadius = cornerRadius
        self.height = height
    }
    
    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius)
            .fill(
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.1),
                        Color.white.opacity(0.2),
                        Color.white.opacity(0.1)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(height: height)
            .offset(x: isAnimating ? 100 : -100)
            .onAppear {
                withAnimation(AppAnimations.shimmerEffect) {
                    isAnimating = true
                }
            }
    }
}

struct SkeletonCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SkeletonView(height: 24)
                .frame(width: 200)
            
            SkeletonView(height: 16)
                .frame(width: 150)
            
            SkeletonView(height: 16)
                .frame(width: 100)
            
            HStack {
                SkeletonView(height: 40)
                    .frame(width: 60)
                Spacer()
                SkeletonView(height: 32)
                    .frame(width: 80)
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.05))
        )
    }
}

// MARK: - Haptic Feedback Helpers
struct HapticManager {
    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .medium) {
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
    }
    
    static func selection() {
        let generator = UISelectionFeedbackGenerator()
        generator.selectionChanged()
    }
    
    static func notification(_ type: UINotificationFeedbackGenerator.FeedbackType) {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(type)
    }
}

// MARK: - View Extensions for Animations
extension View {
    func animatedScale(isPressed: Bool, scale: CGFloat = 0.95) -> some View {
        self.scaleEffect(isPressed ? scale : 1.0)
            .animation(AppAnimations.buttonPress, value: isPressed)
    }
    
    func pulseEffect() -> some View {
        self.scaleEffect(1.0)
            .animation(AppAnimations.loadingPulse, value: UUID())
    }
    
    func slideInFromEdge(_ edge: Edge, delay: Double = 0) -> some View {
        SlideInView(from: edge, delay: delay) {
            self
        }
    }
    
    func fadeIn(delay: Double = 0) -> some View {
        FadeInView(delay: delay) {
            self
        }
    }
    
    func shake(_ isShaking: Bool) -> some View {
        self.offset(x: isShaking ? 5 : 0)
            .animation(
                isShaking ? AppAnimations.errorShake : .default,
                value: isShaking
            )
    }
} 