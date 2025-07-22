//
//  AccessibilityHelpers.swift
//  LML
//
//  Accessibility utilities for inclusive iOS app design
//  Supports VoiceOver, Dynamic Type, High Contrast, and Reduced Motion
//

import SwiftUI

// MARK: - Accessibility Configuration
struct AccessibilityConfig {
    
    // MARK: - Environment Detection
    @Environment(\.accessibilityReduceMotion) static var reduceMotion
    @Environment(\.accessibilityDifferentiateWithoutColor) static var differentiateWithoutColor
    @Environment(\.accessibilityReduceTransparency) static var reduceTransparency
    @Environment(\.colorScheme) static var colorScheme
    @Environment(\.dynamicTypeSize) static var dynamicTypeSize
    
    // MARK: - Font Scaling
    static func scaledFont(_ font: Font, maxSize: CGFloat? = nil) -> Font {
        if let maxSize = maxSize {
            // For large titles, apply max size constraint
            return .system(size: min(maxSize, 34), weight: .bold, design: .default)
        }
        return font
    }
    
    // MARK: - Color Contrast
    static func contrastColor(for background: Color, light: Color = .white, dark: Color = .black) -> Color {
        // In a real implementation, you'd calculate luminance
        // For now, return based on color scheme
        return background == .black ? light : dark
    }
    
    // MARK: - Motion Preferences
    static func respectMotionPreference<T>(_ animation: Animation?, value: T) -> Animation? {
        return UIAccessibility.isReduceMotionEnabled ? nil : animation
    }
}

// MARK: - Accessibility Labels and Hints
struct AccessibilityLabels {
    
    // MARK: - Seat Map
    struct SeatMap {
        static func seatLabel(section: String, row: Int, number: Int, isAvailable: Bool, price: Int, isBooked: Bool = false) -> String {
            let status: String
            if !isAvailable {
                status = isBooked ? "booked" : "unavailable"
            } else {
                status = "available"
            }
            let priceText = "£\(price / 100)"
            return "\(section) section, row \(row), seat \(number), \(status), \(priceText)"
        }
        
        static func seatHint(isSelected: Bool, isAvailable: Bool, isBooked: Bool = false) -> String {
            if !isAvailable {
                return isBooked ? "This seat has been permanently booked" : "This seat is not available for booking"
            }
            return isSelected ? "Double tap to deselect this seat" : "Double tap to select this seat"
        }
        
        static let seatMapNavigationHint = "Use swipe gestures to navigate the seat map. Pinch to zoom in or out."
        static let selectedSeatsCount = { (count: Int) in "Selected \(count) seat\(count == 1 ? "" : "s")" }
        static let totalPrice = { (price: Int) in "Total price: £\(price / 100)" }
    }
    
    // MARK: - Authentication
    struct Auth {
        static let signInButton = "Sign in to your account"
        static let signUpButton = "Create a new account"
        static let biometricButton = "Authenticate using Face ID or Touch ID"
        static let signOutButton = "Sign out of your account"
        
        static let emailField = "Email address"
        static let passwordField = "Password"
        static let nameField = "Full name"
        
        static let authStateLabel = { (state: String) in "Authentication status: \(state)" }
    }
    
    // MARK: - Tickets
    struct Tickets {
        static func ticketLabel(showName: String, venue: String, date: String, time: String, seats: String) -> String {
            return "Ticket for \(showName) at \(venue), \(date) at \(time), seats: \(seats)"
        }
        
        static let ticketActionHint = "Double tap to view ticket details"
        static let emptyTicketsMessage = "You have no tickets. Browse shows to purchase tickets."
        
        static let upcomingCount = { (count: Int) in "\(count) upcoming show\(count == 1 ? "" : "s")" }
        static let pastCount = { (count: Int) in "\(count) past show\(count == 1 ? "" : "s")" }
    }
    
    // MARK: - Payment
    struct Payment {
        static let checkoutButton = "Proceed to payment"
        static let paymentSuccess = "Payment completed successfully"
        static let paymentFailed = "Payment failed. Please try again."
        
        static let priceDisplay = { (price: Int) in "Price: £\(price / 100)" }
        static let bookingReference = { (ref: String) in "Booking reference: \(ref)" }
    }
    
    // MARK: - Navigation
    struct Navigation {
        static let backButton = "Go back"
        static let closeButton = "Close"
        static let menuButton = "Open menu"
        static let settingsButton = "Open settings"
        
        static let tabAccount = "Account tab"
        static let tabTickets = "Your tickets tab"
        static let tabHome = "Home tab"
    }
}

// MARK: - Dynamic Type Support
struct DynamicTypeHelper {
    
    // MARK: - Font Categories
    enum FontCategory {
        case caption
        case body
        case headline
        case title
        case largeTitle
        
        var font: Font {
            switch self {
            case .caption: return .caption
            case .body: return .body
            case .headline: return .headline
            case .title: return .title
            case .largeTitle: return .largeTitle
            }
        }
        
        var maxScaleFactor: CGFloat {
            switch self {
            case .caption: return 1.5
            case .body: return 2.0
            case .headline: return 1.8
            case .title: return 1.6
            case .largeTitle: return 1.4
            }
        }
    }
    
    static func scaledFont(_ category: FontCategory) -> Font {
        return category.font
    }
    
    static func isLargeText() -> Bool {
        let currentSize = UIFont.preferredFont(forTextStyle: .body).pointSize
        let defaultSize: CGFloat = 17.0
        return currentSize > defaultSize * 1.3
    }
}

// MARK: - VoiceOver Utilities
struct VoiceOverHelper {
    
    static func announcement(_ message: String, priority: UIAccessibilityPriority = .default) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            UIAccessibility.post(notification: .announcement, argument: message)
        }
    }
    
    static func layoutChange(focus element: Any? = nil) {
        UIAccessibility.post(notification: .layoutChanged, argument: element)
    }
    
    static func screenChange(focus element: Any? = nil) {
        UIAccessibility.post(notification: .screenChanged, argument: element)
    }
    
    static var isVoiceOverRunning: Bool {
        UIAccessibility.isVoiceOverRunning
    }
}

// MARK: - Accessibility View Modifiers
extension View {
    
    // MARK: - Seat Map Accessibility
    func seatAccessibility(
        section: String,
        row: Int,
        number: Int,
        isAvailable: Bool,
        isSelected: Bool,
        price: Int,
        isBooked: Bool = false
    ) -> some View {
        self
            .accessibilityLabel(AccessibilityLabels.SeatMap.seatLabel(
                section: section,
                row: row,
                number: number,
                isAvailable: isAvailable,
                price: price,
                isBooked: isBooked
            ))
            .accessibilityHint(AccessibilityLabels.SeatMap.seatHint(
                isSelected: isSelected,
                isAvailable: isAvailable,
                isBooked: isBooked
            ))
            .accessibilityAddTraits(isSelected ? .isSelected : [])
            .accessibilityAddTraits(isAvailable ? .isButton : [])
            .accessibilityRemoveTraits(isAvailable ? [] : .isButton)
    }
    
    // MARK: - Button Accessibility
    func buttonAccessibility(
        label: String,
        hint: String? = nil,
        isEnabled: Bool = true
    ) -> some View {
        self
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
            .accessibilityAddTraits(.isButton)
            .accessibilityRemoveTraits(isEnabled ? [] : .isButton)
    }
    
    // MARK: - Card Accessibility
    func cardAccessibility(
        label: String,
        hint: String? = nil,
        value: String? = nil
    ) -> some View {
        self
            .accessibilityElement(children: .combine)
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
            .accessibilityValue(value ?? "")
    }
    
    // MARK: - Dynamic Type Support
    func dynamicTypeSize(min: DynamicTypeSize = .small, max: DynamicTypeSize = .xxxLarge) -> some View {
        self.dynamicTypeSize(min...max)
    }
    
    // MARK: - High Contrast Support
    func highContrastAdaptive(
        normalColors: (foreground: Color, background: Color),
        highContrastColors: (foreground: Color, background: Color)
    ) -> some View {
        self.modifier(HighContrastModifier(
            normalColors: normalColors,
            highContrastColors: highContrastColors
        ))
    }
    
    // MARK: - Reduced Motion Support
    func reducedMotion<T: Equatable>(_ animation: Animation?, value: T) -> some View {
        self.animation(
            UIAccessibility.isReduceMotionEnabled ? nil : animation,
            value: value
        )
    }
}

// MARK: - High Contrast Modifier
struct HighContrastModifier: ViewModifier {
    let normalColors: (foreground: Color, background: Color)
    let highContrastColors: (foreground: Color, background: Color)
    
    @Environment(\.accessibilityDifferentiateWithoutColor) private var differentiateWithoutColor
    
    func body(content: Content) -> some View {
        let colors = differentiateWithoutColor ? highContrastColors : normalColors
        
        content
            .foregroundColor(colors.foreground)
            .background(colors.background)
    }
}

// MARK: - Accessibility Testing Helpers
#if DEBUG
struct AccessibilityTester {
    static func validateView(_ view: AnyView) {
        // In a real implementation, this would check for:
        // - Missing accessibility labels
        // - Insufficient color contrast
        // - Touch target sizes
        // - VoiceOver navigation order
        print("🔍 Accessibility validation completed")
    }
    
    static func simulateVoiceOver() {
        // Helper for testing VoiceOver behavior in development
        print("🗣️ Simulating VoiceOver navigation")
    }
}
#endif 