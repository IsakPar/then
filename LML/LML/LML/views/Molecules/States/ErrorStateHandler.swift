//
//  ErrorStateHandler.swift
//  LML
//
//  Comprehensive error state handler molecule
//  Provides consistent error handling and recovery options
//

import SwiftUI

// MARK: - Error State Handler Molecule
struct ErrorStateHandler: View {
    let error: AppError
    let onRetry: (() -> Void)?
    let onDismiss: (() -> Void)?
    
    init(error: AppError, onRetry: (() -> Void)? = nil, onDismiss: (() -> Void)? = nil) {
        self.error = error
        self.onRetry = onRetry
        self.onDismiss = onDismiss
    }
    
    var body: some View {
        VStack(spacing: 20) {
            errorIcon
            errorContent
            errorActions
        }
        .padding(.horizontal, 40)
        .multilineTextAlignment(.center)
    }
    
    private var errorIcon: some View {
        Image(systemName: error.iconName)
            .font(.system(size: 60))
            .foregroundColor(error.iconColor)
    }
    
    private var errorContent: some View {
        VStack(spacing: 12) {
            Text(error.title)
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(.white)
            
            Text(error.message)
                .font(.body)
                .foregroundColor(.white.opacity(0.8))
                .fixedSize(horizontal: false, vertical: true)
        }
    }
    
    private var errorActions: some View {
        VStack(spacing: 12) {
            if let onRetry = onRetry, error.isRetryable {
                AuthButton(
                    title: "Try Again",
                    icon: "arrow.clockwise",
                    style: .primary,
                    action: onRetry
                )
                .frame(maxWidth: 200)
            }
            
            if let onDismiss = onDismiss {
                Button("Dismiss", action: onDismiss)
                    .foregroundColor(.white.opacity(0.6))
                    .font(.subheadline)
            }
        }
    }
}

// MARK: - App Error Model
enum AppError: LocalizedError {
    case authentication(AuthError)
    case network(APIError)
    case data(DataError)
    case payment(String)
    case biometric(String)
    case unknown(String)
    
    var title: String {
        switch self {
        case .authentication:
            return "Authentication Error"
        case .network:
            return "Connection Error"
        case .data:
            return "Data Error"
        case .payment:
            return "Payment Error"
        case .biometric:
            return "Biometric Error"
        case .unknown:
            return "Something Went Wrong"
        }
    }
    
    var message: String {
        switch self {
        case .authentication(let error):
            return error.localizedDescription
        case .network(let error):
            return error.localizedDescription
        case .data(let error):
            return error.localizedDescription
        case .payment(let message):
            return message
        case .biometric(let message):
            return message
        case .unknown(let message):
            return message
        }
    }
    
    var iconName: String {
        switch self {
        case .authentication:
            return "person.circle.fill.badge.xmark"
        case .network:
            return "wifi.exclamationmark"
        case .data:
            return "externaldrive.fill.badge.xmark"
        case .payment:
            return "creditcard.trianglebadge.exclamationmark"
        case .biometric:
            return "faceid"
        case .unknown:
            return "exclamationmark.triangle"
        }
    }
    
    var iconColor: Color {
        switch self {
        case .authentication:
            return .orange
        case .network:
            return .red
        case .data:
            return .yellow
        case .payment:
            return .purple
        case .biometric:
            return .blue
        case .unknown:
            return .gray
        }
    }
    
    var isRetryable: Bool {
        switch self {
        case .network, .data, .unknown:
            return true
        case .authentication, .payment, .biometric:
            return false
        }
    }
    
    var errorDescription: String? {
        return message
    }
}

// MARK: - Error Handler Extension
extension View {
    func errorAlert(error: Binding<AppError?>, onRetry: (() -> Void)? = nil) -> some View {
        alert("Error", isPresented: Binding<Bool>(
            get: { error.wrappedValue != nil },
            set: { if !$0 { error.wrappedValue = nil } }
        )) {
            if let onRetry = onRetry, error.wrappedValue?.isRetryable == true {
                Button("Try Again", action: onRetry)
                Button("Cancel", role: .cancel) { error.wrappedValue = nil }
            } else {
                Button("OK") { error.wrappedValue = nil }
            }
        } message: {
            if let appError = error.wrappedValue {
                Text(appError.message)
            }
        }
    }
} 