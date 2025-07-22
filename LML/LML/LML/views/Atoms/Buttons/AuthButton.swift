//
//  AuthButton.swift
//  LML
//
//  Enhanced authentication button atom with animations and accessibility
//  Supports different styles with consistent UX patterns
//

import SwiftUI

// MARK: - Enhanced Auth Button Atom Component
struct AuthButton: View {
    let title: String
    let icon: String
    let style: AuthButtonStyle
    let action: () -> Void
    let isLoading: Bool
    
    @State private var isPressed = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    init(title: String, icon: String, style: AuthButtonStyle, isLoading: Bool = false, action: @escaping () -> Void) {
        self.title = title
        self.icon = icon
        self.style = style
        self.isLoading = isLoading
        self.action = action
    }
    
    var body: some View {
        Button(action: handleTap) {
            HStack(spacing: 12) {
                if isLoading {
                    loadingIndicator
                } else {
                    buttonIcon
                }
                
                buttonText
            }
            .frame(maxWidth: .infinity)
            .frame(height: style.height)
            .background(buttonBackground)
            .foregroundColor(style.foregroundColor)
            .clipShape(RoundedRectangle(cornerRadius: style.cornerRadius))
            .overlay(buttonOverlay)
            .scaleEffect(animationScale)
            .animation(
                reduceMotion ? nil : AppAnimations.buttonPress,
                value: isPressed
            )
        }
        .buttonStyle(PlainButtonStyle())
        .disabled(isLoading)
        .buttonAccessibility(
            label: accessibilityLabel,
            hint: accessibilityHint,
            isEnabled: !isLoading
        )
        .onLongPressGesture(minimumDuration: 0) { pressing in
            guard !isLoading else { return }
            withAnimation(AppAnimations.buttonPress) {
                isPressed = pressing
            }
        } perform: {
            // Long press handled by gesture
        }
    }
    
    private var buttonIcon: some View {
        Image(systemName: icon)
            .font(style.iconFont)
            .transition(.scale.combined(with: .opacity))
    }
    
    private var loadingIndicator: some View {
        ProgressView()
            .scaleEffect(0.8)
            .tint(style.foregroundColor)
            .transition(.scale.combined(with: .opacity))
    }
    
    private var buttonText: some View {
        Text(title)
            .fontWeight(style.fontWeight)
            .dynamicTypeSize(min: .small, max: .xxxLarge)
    }
    
    private var buttonBackground: some View {
        Group {
            if isLoading {
                style.background
                    .opacity(0.8)
            } else {
                style.background
            }
        }
    }
    
    private var buttonOverlay: some View {
        Group {
            if case .secondary = style {
                RoundedRectangle(cornerRadius: style.cornerRadius)
                    .stroke(style.borderColor, lineWidth: style.borderWidth)
            }
        }
    }
    
    private var animationScale: CGFloat {
        isPressed && !isLoading ? 0.96 : 1.0
    }
    
    private var accessibilityLabel: String {
        if isLoading {
            return "\(title), loading"
        }
        return title
    }
    
    private var accessibilityHint: String {
        switch style {
        case .primary:
            return "Primary action button"
        case .secondary:
            return "Secondary action button"
        case .apple:
            return "Sign in with Apple ID"
        case .google:
            return "Sign in with Google account"
        }
    }
    
    private func handleTap() {
        guard !isLoading else { return }
        
        // Provide haptic feedback based on button style
        switch style {
        case .primary:
            HapticManager.impact(.medium)
        case .secondary, .apple, .google:
            HapticManager.impact(.light)
        }
        
        action()
    }
}

// MARK: - Enhanced Auth Button Style Configuration
enum AuthButtonStyle {
    case primary
    case secondary
    case apple
    case google
    
    var height: CGFloat {
        switch self {
        case .primary, .secondary: return 56
        case .apple, .google: return 52
        }
    }
    
    var cornerRadius: CGFloat {
        switch self {
        case .primary, .secondary: return 16
        case .apple, .google: return 12
        }
    }
    
    var iconFont: Font {
        switch self {
        case .primary, .secondary: return .body
        case .apple, .google: return .title2
        }
    }
    
    var fontWeight: Font.Weight {
        switch self {
        case .primary: return .semibold
        case .secondary: return .medium
        case .apple, .google: return .medium
        }
    }
    
    var background: some View {
        Group {
            switch self {
            case .primary:
                LinearGradient(
                    colors: [Color.blue, Color.purple],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            case .secondary:
                Color.white.opacity(0.1)
            case .apple:
                Color.black
            case .google:
                Color.white
            }
        }
    }
    
    var foregroundColor: Color {
        switch self {
        case .primary, .secondary, .apple: return .white
        case .google: return .black
        }
    }
    
    var borderColor: Color {
        switch self {
        case .secondary: return .white.opacity(0.3)
        default: return .clear
        }
    }
    
    var borderWidth: CGFloat {
        switch self {
        case .secondary: return 1
        default: return 0
        }
    }
}

// MARK: - Preview
struct AuthButton_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            // Primary button
            AuthButton(
                title: "Create Account",
                icon: "star.fill",
                style: .primary,
                action: {}
            )
            
            // Secondary button
            AuthButton(
                title: "Sign In",
                icon: "person.fill",
                style: .secondary,
                action: {}
            )
            
            // Loading state
            AuthButton(
                title: "Signing In...",
                icon: "person.fill",
                style: .primary,
                isLoading: true,
                action: {}
            )
            
            // Apple button
            AuthButton(
                title: "Continue with Apple",
                icon: "apple.logo",
                style: .apple,
                action: {}
            )
            
            // Google button
            AuthButton(
                title: "Continue with Google",
                icon: "globe",
                style: .google,
                action: {}
            )
        }
        .padding()
        .background(Color(red: 0.067, green: 0.094, blue: 0.153))
        .preferredColorScheme(.dark)
    }
} 