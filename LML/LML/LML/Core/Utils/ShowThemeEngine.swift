//
//  ShowThemeEngine.swift
//  LML
//
//  Dynamic theming engine for universal show experiences
//  Now supports web-based theme design and venue-specific branding
//

import SwiftUI
import UIKit
import Foundation

// MARK: - Show Theme Engine
@MainActor
class ShowThemeEngine: ObservableObject {
    static let shared = ShowThemeEngine()
    
    @Published var currentTheme: ShowTheme?
    @Published var isLoadingTheme = false
    
    private var themeCache: [String: ShowTheme] = [:]
    private let apiBaseURL = "https://then-production.up.railway.app"
    
    private init() {}
    
    // MARK: - Dynamic Theme Loading
    
    /// Get theme for show with API fallback to hardcoded themes
    static func getTheme(for show: Show) async -> ShowTheme {
        // Try to load theme from API first
        if let dynamicTheme = await loadDynamicTheme(for: show) {
            return dynamicTheme
        }
        
        // Fallback to hardcoded themes
        return getHardcodedTheme(for: show)
    }
    
    /// Load theme from web-based theme designer
    private static func loadDynamicTheme(for show: Show) async -> ShowTheme? {
        do {
            // Try show-specific theme first
            if let showTheme = try await fetchThemeFromAPI(showId: show.id) {
                print("🎨 Loaded show-specific theme for \(show.title)")
                return showTheme
            }
            
            // Try venue-specific theme
            if let venueTheme = try await fetchThemeFromAPI(venueId: show.venue.id) {
                print("🎨 Loaded venue-specific theme for \(show.venue.name)")
                return venueTheme
            }
            
            // Try category-specific theme
            if let categoryTheme = try await fetchThemeFromAPI(category: show.category.rawValue) {
                print("🎨 Loaded category-specific theme for \(show.category.rawValue)")
                return categoryTheme
            }
        } catch {
            print("⚠️ Failed to load dynamic theme: \(error)")
        }
        
        return nil
    }
    
    /// Fetch theme from API with different parameters
    private static func fetchThemeFromAPI(showId: String? = nil, venueId: String? = nil, category: String? = nil) async throws -> ShowTheme? {
        var urlComponents = URLComponents(string: "https://then-production.up.railway.app/api/themes")!
        var queryItems: [URLQueryItem] = []
        
        if let showId = showId {
            queryItems.append(URLQueryItem(name: "showId", value: showId))
        } else if let venueId = venueId {
            queryItems.append(URLQueryItem(name: "venueId", value: venueId))
        } else if let category = category {
            queryItems.append(URLQueryItem(name: "category", value: category))
        }
        
        urlComponents.queryItems = queryItems
        
        guard let url = urlComponents.url else {
            throw URLError(.badURL)
        }
        
        let (data, _) = try await URLSession.shared.data(from: url)
        let apiTheme = try JSONDecoder().decode(APIThemeResponse.self, from: data)
        
        return convertAPIThemeToShowTheme(apiTheme)
    }
    
    /// Convert API response to ShowTheme model
    private static func convertAPIThemeToShowTheme(_ apiTheme: APIThemeResponse) -> ShowTheme {
        let backgroundGradient = LinearGradient(
            gradient: Gradient(colors: apiTheme.backgroundColor.colors.map { Color(hex: $0) }),
            startPoint: .topLeading, // Could be dynamic from API
            endPoint: .bottomTrailing
        )
        
        return ShowTheme(
            identifier: .generic, // Could be dynamic from API
            primaryColor: Color(hex: apiTheme.primaryColor),
            accentColor: Color(hex: apiTheme.accentColor),
            backgroundColor: backgroundGradient,
            iconName: apiTheme.iconName,
            displayName: apiTheme.name,
            metadata: apiTheme.metadata
        )
    }
    
    // MARK: - Hardcoded Theme Fallbacks (Offline Support)
    
    /// Get hardcoded theme as fallback
    static func getHardcodedTheme(for show: Show) -> ShowTheme {
        let themeIdentifier = determineThemeIdentifier(for: show)
        
        switch themeIdentifier {
        case .hamilton:
            return hamiltonTheme
        case .phantom:
            return phantomTheme
        case .lionKing:
            return lionKingTheme
        case .chicago:
            return chicagoTheme
        case .wicked:
            return wickedTheme
        case .generic:
            return genericTheme(for: show.category)
        }
    }
    
    private static func determineThemeIdentifier(for show: Show) -> ThemeIdentifier {
        let title = show.title.lowercased()
        
        if title.contains("hamilton") {
            return .hamilton
        } else if title.contains("phantom") {
            return .phantom
        } else if title.contains("lion king") || title.contains("lionking") {
            return .lionKing
        } else if title.contains("chicago") {
            return .chicago
        } else if title.contains("wicked") {
            return .wicked
        } else {
            return .generic
        }
    }
    
    // MARK: - Predefined Themes (Fallbacks)
    
    private static var hamiltonTheme: ShowTheme {
        ShowTheme(
            identifier: .hamilton,
            primaryColor: Color(red: 0.8, green: 0.6, blue: 0.2),
            accentColor: Color(red: 0.6, green: 0.3, blue: 0.1),
            backgroundColor: LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.1, green: 0.1, blue: 0.12),
                    Color(red: 0.15, green: 0.12, blue: 0.08)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            iconName: "star.fill",
            displayName: "Hamilton Classic"
        )
    }
    
    private static var phantomTheme: ShowTheme {
        ShowTheme(
            identifier: .phantom,
            primaryColor: Color(red: 1.0, green: 0.84, blue: 0.0),
            accentColor: Color(red: 0.8, green: 0.1, blue: 0.1),
            backgroundColor: LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.05, green: 0.05, blue: 0.08),
                    Color(red: 0.08, green: 0.06, blue: 0.10),
                    Color(red: 0.06, green: 0.04, blue: 0.08)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            iconName: "theatermasks",
            displayName: "Phantom Elegance"
        )
    }
    
    private static var lionKingTheme: ShowTheme {
        ShowTheme(
            identifier: .lionKing,
            primaryColor: Color(red: 1.0, green: 0.6, blue: 0.0),
            accentColor: Color(red: 0.8, green: 0.4, blue: 0.0),
            backgroundColor: LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.2, green: 0.1, blue: 0.05),
                    Color(red: 0.3, green: 0.2, blue: 0.1),
                    Color(red: 0.25, green: 0.15, blue: 0.08)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            iconName: "crown.fill",
            displayName: "Pride Rock"
        )
    }
    
    private static var chicagoTheme: ShowTheme {
        ShowTheme(
            identifier: .chicago,
            primaryColor: Color(red: 0.9, green: 0.1, blue: 0.1),
            accentColor: Color(red: 0.1, green: 0.1, blue: 0.1),
            backgroundColor: LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.15, green: 0.05, blue: 0.05),
                    Color(red: 0.1, green: 0.1, blue: 0.1),
                    Color(red: 0.2, green: 0.05, blue: 0.05)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            iconName: "music.note",
            displayName: "All That Jazz"
        )
    }
    
    private static var wickedTheme: ShowTheme {
        ShowTheme(
            identifier: .wicked,
            primaryColor: Color(red: 0.2, green: 0.8, blue: 0.2),
            accentColor: Color(red: 0.8, green: 0.6, blue: 0.8),
            backgroundColor: LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.05, green: 0.15, blue: 0.05),
                    Color(red: 0.1, green: 0.08, blue: 0.15),
                    Color(red: 0.08, green: 0.12, blue: 0.08)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            iconName: "sparkles",
            displayName: "Defying Gravity"
        )
    }
    
    private static func genericTheme(for category: ShowCategory) -> ShowTheme {
        switch category {
        case .musical:
            return ShowTheme(
                identifier: .generic,
                primaryColor: Color(red: 0.3, green: 0.6, blue: 0.9),
                accentColor: Color(red: 0.2, green: 0.4, blue: 0.7),
                backgroundColor: LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.08, green: 0.08, blue: 0.12),
                        Color(red: 0.12, green: 0.1, blue: 0.15)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                iconName: "music.note",
                displayName: "Musical Magic"
            )
        default:
            return ShowTheme(
                identifier: .generic,
                primaryColor: Color(red: 0.5, green: 0.5, blue: 0.8),
                accentColor: Color(red: 0.3, green: 0.3, blue: 0.6),
                backgroundColor: LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.1, green: 0.1, blue: 0.12),
                        Color(red: 0.12, green: 0.12, blue: 0.15)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                iconName: "star.fill",
                displayName: "Live Performance"
            )
        }
    }
}

// MARK: - API Models
struct APIThemeResponse: Codable {
    let id: String
    let name: String
    let primaryColor: String
    let accentColor: String
    let backgroundColor: APIBackgroundColor
    let iconName: String
    let textColors: [String: String]?
    let buttonStyles: [String: String]?
    let seatColors: [String: String]?
    let isActive: Bool
    let metadata: APIThemeMetadata?
}

struct APIBackgroundColor: Codable {
    let colors: [String]
    let startPoint: String?
    let endPoint: String?
}

public struct APIThemeMetadata: Codable {
    let venueId: String?
    let showId: String?
    let category: String?
    let createdBy: String?
    let lastModified: String?
}

// MARK: - Enhanced Show Theme Model
public struct ShowTheme {
    let identifier: ThemeIdentifier
    let primaryColor: Color
    let accentColor: Color
    let backgroundColor: LinearGradient
    let iconName: String
    let displayName: String
    let metadata: APIThemeMetadata?
    
    public init(identifier: ThemeIdentifier, primaryColor: Color, accentColor: Color, backgroundColor: LinearGradient, iconName: String, displayName: String, metadata: APIThemeMetadata? = nil) {
        self.identifier = identifier
        self.primaryColor = primaryColor
        self.accentColor = accentColor
        self.backgroundColor = backgroundColor
        self.iconName = iconName
        self.displayName = displayName
        self.metadata = metadata
    }
    
    // Computed theme variations
    var headerTextColor: Color {
        return .white
    }
    
    var secondaryTextColor: Color {
        return Color.white.opacity(0.8)
    }
    
    var buttonBackgroundColor: Color {
        return primaryColor
    }
    
    var buttonTextColor: Color {
        // Choose text color based on primary color brightness
        // Use a more compatible approach for Color to UIColor conversion
        #if canImport(UIKit)
        let uiColor = UIColor(primaryColor)
        if let components = uiColor.cgColor.components, components.count >= 3 {
            let brightness = (components[0] * 0.299 + components[1] * 0.587 + components[2] * 0.114)
            return brightness > 0.5 ? .black : .white
        }
        #endif
        
        // Fallback for other platforms or if conversion fails
        return .white
    }
    
    var selectedSeatColor: Color {
        return primaryColor
    }
    
    var availableSeatColor: Color {
        return Color.white.opacity(0.8)
    }
    
    var unavailableSeatColor: Color {
        return Color.gray.opacity(0.5)
    }
}

// MARK: - Color Extension for Hex Support
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Theme Identifier
public enum ThemeIdentifier: String, CaseIterable {
    case hamilton = "hamilton"
    case phantom = "phantom"
    case lionKing = "lionking"
    case chicago = "chicago"
    case wicked = "wicked"
    case generic = "generic"
    
    var displayName: String {
        switch self {
        case .hamilton: return "Hamilton"
        case .phantom: return "Phantom of the Opera"
        case .lionKing: return "The Lion King"
        case .chicago: return "Chicago"
        case .wicked: return "Wicked"
        case .generic: return "Generic"
        }
    }
} 