//
//  UserAvatar.swift
//  LML
//
//  Reusable user avatar atom component
//  Handles different sizes and fallback states
//

import SwiftUI

// MARK: - User Avatar Atom Component
struct UserAvatar: View {
    let size: AvatarSize
    let imageUrl: String?
    let fallbackIcon: String
    
    init(size: AvatarSize = .medium, imageUrl: String? = nil, fallbackIcon: String = "person.circle.fill") {
        self.size = size
        self.imageUrl = imageUrl
        self.fallbackIcon = fallbackIcon
    }
    
    var body: some View {
        Group {
            if let imageUrl = imageUrl, !imageUrl.isEmpty {
                // TODO: Replace with AsyncImage when adding networking
                Image(systemName: fallbackIcon)
                    .font(.system(size: size.iconSize))
                    .foregroundColor(size.color)
            } else {
                Image(systemName: fallbackIcon)
                    .font(.system(size: size.iconSize))
                    .foregroundColor(size.color)
            }
        }
        .frame(width: size.frameSize, height: size.frameSize)
    }
}

// MARK: - Avatar Size Configuration
enum AvatarSize {
    case small
    case medium
    case large
    case extraLarge
    
    var frameSize: CGFloat {
        switch self {
        case .small: return 40
        case .medium: return 60
        case .large: return 80
        case .extraLarge: return 100
        }
    }
    
    var iconSize: CGFloat {
        switch self {
        case .small: return 40
        case .medium: return 60
        case .large: return 80
        case .extraLarge: return 100
        }
    }
    
    var color: Color {
        return .white.opacity(0.8)
    }
} 