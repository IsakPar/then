//
//  ErrorView.swift
//  LML
//
//  Reusable error view component
//  Mirrors React Native Alert.alert() and error handling patterns
//

import SwiftUI

// MARK: - Error View

struct ErrorView: View {
    
    // MARK: - Action Definition
    
    struct Action {
        let title: String
        let action: () -> Void
        
        init(title: String, action: @escaping () -> Void) {
            self.title = title
            self.action = action
        }
    }
    
    // MARK: - Properties
    
    let title: String
    let message: String
    let primaryAction: Action?
    let secondaryAction: Action?
    let showBackground: Bool
    
    // MARK: - Initializers
    
    init(
        title: String = "Error",
        message: String,
        primaryAction: Action? = nil,
        secondaryAction: Action? = nil,
        showBackground: Bool = true
    ) {
        self.title = title
        self.message = message
        self.primaryAction = primaryAction
        self.secondaryAction = secondaryAction
        self.showBackground = showBackground
    }
    
    // MARK: - Body
    
    var body: some View {
        VStack(spacing: 20) {
            // Error Icon
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 50))
                .foregroundColor(.red)
            
            // Title and Message
            VStack(spacing: 8) {
                Text(title)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
                
                Text(message)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(nil)
            }
            
            // Actions
            if primaryAction != nil || secondaryAction != nil {
                VStack(spacing: 12) {
                    // Primary Action
                    if let primaryAction = primaryAction {
                        Button(action: primaryAction.action) {
                            Text(primaryAction.title)
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Color.blue)
                                .foregroundColor(.white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                    
                    // Secondary Action
                    if let secondaryAction = secondaryAction {
                        Button(action: secondaryAction.action) {
                            Text(secondaryAction.title)
                                .fontWeight(.medium)
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Color.gray.opacity(0.2))
                                .foregroundColor(.primary)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }
                }
            }
        }
        .padding()
        .background(
            showBackground ?
            Color(UIColor.systemBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(radius: 8)
            : nil
        )
    }
}

// MARK: - Network Error View

struct NetworkErrorView: View {
    
    let onRetry: () -> Void
    
    var body: some View {
        ErrorView(
            title: "Connection Error",
            message: "Unable to connect to the server. Please check your internet connection and try again.",
            primaryAction: ErrorView.Action(title: "Try Again", action: onRetry)
        )
    }
}

// MARK: - Authentication Error View

struct AuthErrorView: View {
    
    let message: String
    let onSignIn: () -> Void
    let onDismiss: (() -> Void)?
    
    init(message: String, onSignIn: @escaping () -> Void, onDismiss: (() -> Void)? = nil) {
        self.message = message
        self.onSignIn = onSignIn
        self.onDismiss = onDismiss
    }
    
    var body: some View {
        ErrorView(
            title: "Authentication Required",
            message: message,
            primaryAction: ErrorView.Action(title: "Sign In", action: onSignIn),
            secondaryAction: onDismiss != nil ? ErrorView.Action(title: "Cancel", action: onDismiss!) : nil
        )
    }
}

// MARK: - Empty State View (Not exactly an error, but similar pattern)

struct EmptyStateView: View {
    
    let title: String
    let message: String
    let systemImage: String
    let actionTitle: String?
    let action: (() -> Void)?
    
    init(
        title: String,
        message: String,
        systemImage: String = "tray",
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.title = title
        self.message = message
        self.systemImage = systemImage
        self.actionTitle = actionTitle
        self.action = action
    }
    
    var body: some View {
        VStack(spacing: 20) {
            // Empty state icon
            Image(systemName: systemImage)
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            // Title and message
            VStack(spacing: 8) {
                Text(title)
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                
                Text(message)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(nil)
            }
            
            // Action button
            if let actionTitle = actionTitle, let action = action {
                Button(action: action) {
                    Text(actionTitle)
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal)
            }
        }
        .padding()
    }
}

// MARK: - Alert-style Error Modal

struct ErrorAlert: View {
    
    @Binding var isPresented: Bool
    let title: String
    let message: String
    let primaryButtonTitle: String
    let secondaryButtonTitle: String?
    let primaryAction: () -> Void
    let secondaryAction: (() -> Void)?
    
    init(
        isPresented: Binding<Bool>,
        title: String = "Error",
        message: String,
        primaryButtonTitle: String = "OK",
        secondaryButtonTitle: String? = nil,
        primaryAction: @escaping () -> Void = {},
        secondaryAction: (() -> Void)? = nil
    ) {
        self._isPresented = isPresented
        self.title = title
        self.message = message
        self.primaryButtonTitle = primaryButtonTitle
        self.secondaryButtonTitle = secondaryButtonTitle
        self.primaryAction = primaryAction
        self.secondaryAction = secondaryAction
    }
    
    var body: some View {
        ZStack {
            // Background overlay
            Color.black.opacity(0.4)
                .ignoresSafeArea()
                .onTapGesture {
                    isPresented = false
                }
            
            // Alert content
            VStack(spacing: 16) {
                // Title
                Text(title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
                
                // Message
                Text(message)
                    .font(.body)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineLimit(nil)
                
                // Buttons
                VStack(spacing: 8) {
                    // Primary button
                    Button(action: {
                        primaryAction()
                        isPresented = false
                    }) {
                        Text(primaryButtonTitle)
                            .fontWeight(.semibold)
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    
                    // Secondary button
                    if let secondaryButtonTitle = secondaryButtonTitle {
                        Button(action: {
                            secondaryAction?()
                            isPresented = false
                        }) {
                            Text(secondaryButtonTitle)
                                .fontWeight(.medium)
                                .frame(maxWidth: .infinity)
                                .frame(height: 44)
                                .background(Color.gray.opacity(0.2))
                                .foregroundColor(.primary)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                    }
                }
            }
            .padding(20)
            .background(
                Color(UIColor.systemBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            )
            .padding(.horizontal, 40)
        }
    }
}

// MARK: - Convenience View Modifier

extension View {
    func errorAlert(
        isPresented: Binding<Bool>,
        title: String = "Error",
        message: String,
        primaryButtonTitle: String = "OK",
        secondaryButtonTitle: String? = nil,
        primaryAction: @escaping () -> Void = {},
        secondaryAction: (() -> Void)? = nil
    ) -> some View {
        ZStack {
            self
            
            if isPresented.wrappedValue {
                ErrorAlert(
                    isPresented: isPresented,
                    title: title,
                    message: message,
                    primaryButtonTitle: primaryButtonTitle,
                    secondaryButtonTitle: secondaryButtonTitle,
                    primaryAction: primaryAction,
                    secondaryAction: secondaryAction
                )
            }
        }
    }
}

// MARK: - Previews

#Preview("Error Views") {
    ScrollView {
        VStack(spacing: 40) {
            ErrorView(
                title: "Network Error",
                message: "Unable to connect to the server. Please check your internet connection and try again.",
                primaryAction: ErrorView.Action(title: "Try Again") { },
                secondaryAction: ErrorView.Action(title: "Cancel") { }
            )
            
            NetworkErrorView(onRetry: { })
            
            AuthErrorView(
                message: "You need to sign in to view your bookings.",
                onSignIn: { },
                onDismiss: { }
            )
            
            EmptyStateView(
                title: "No Shows Available",
                message: "There are no shows available at the moment. Please check back later.",
                systemImage: "ticket",
                actionTitle: "Refresh",
                action: { }
            )
        }
        .padding()
    }
}

#Preview("Error Alert") {
    VStack {
        Text("Main Content")
    }
    .errorAlert(
        isPresented: .constant(true),
        title: "Authentication Error",
        message: "Your session has expired. Please sign in again to continue.",
        primaryButtonTitle: "Sign In",
        secondaryButtonTitle: "Cancel",
        primaryAction: { },
        secondaryAction: { }
    )
} 