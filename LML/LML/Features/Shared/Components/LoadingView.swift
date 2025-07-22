//
//  LoadingView.swift
//  LML
//
//  Reusable loading view component
//  Mirrors React Native ActivityIndicator and loading states
//

import SwiftUI

// MARK: - Loading View

struct LoadingView: View {
    
    let message: String
    let showBackground: Bool
    
    init(message: String = "Loading...", showBackground: Bool = true) {
        self.message = message
        self.showBackground = showBackground
    }
    
    var body: some View {
        VStack(spacing: 20) {
            ProgressView()
                .scaleEffect(1.5)
                .tint(.blue)
            
            Text(message)
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .background(
            showBackground ? 
            Color(UIColor.systemBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(radius: 4)
            : nil
        )
    }
}

// MARK: - Full Screen Loading View

struct FullScreenLoadingView: View {
    
    let message: String
    
    init(message: String = "Loading...") {
        self.message = message
    }
    
    var body: some View {
        ZStack {
            // Background
            Color.black.opacity(0.3)
                .ignoresSafeArea()
            
            // Loading content
            VStack(spacing: 20) {
                ProgressView()
                    .scaleEffect(2.0)
                    .tint(.white)
                
                Text(message)
                    .font(.headline)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
            }
            .padding(40)
            .background(
                Color.black.opacity(0.8)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            )
        }
    }
}

// MARK: - Inline Loading View

struct InlineLoadingView: View {
    
    let message: String?
    let size: CGFloat
    
    init(message: String? = nil, size: CGFloat = 20) {
        self.message = message
        self.size = size
    }
    
    var body: some View {
        HStack(spacing: 12) {
            ProgressView()
                .scaleEffect(size / 20)
                .tint(.blue)
            
            if let message = message {
                Text(message)
                    .font(.body)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Button Loading State

struct LoadingButton: View {
    
    let title: String
    let isLoading: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.8)
                        .tint(.white)
                } else {
                    Text(title)
                        .fontWeight(.semibold)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.blue)
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(isLoading)
        .opacity(isLoading ? 0.7 : 1.0)
    }
}

// MARK: - Previews

#Preview("Loading View") {
    VStack(spacing: 40) {
        LoadingView(message: "Loading shows...")
        
        LoadingView(message: "Signing you in...", showBackground: false)
        
        InlineLoadingView(message: "Refreshing data...")
        
        LoadingButton(title: "Sign In", isLoading: true) { }
        
        LoadingButton(title: "Sign In", isLoading: false) { }
    }
    .padding()
}

#Preview("Full Screen Loading") {
    FullScreenLoadingView(message: "Authenticating...")
} 