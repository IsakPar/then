//
//  EmptyTicketsState.swift
//  LML
//
//  Molecule component for empty tickets state
//  Displays when user has no tickets with call-to-action
//

import SwiftUI

// MARK: - Empty Tickets State Molecule
struct EmptyTicketsState: View {
    let user: User
    let onBrowseShows: () -> Void
    
    var body: some View {
        VStack(spacing: 32) {
            emptyStateHeader
            callToActionSection
        }
        .padding(.horizontal, 40)
    }
    
    private var emptyStateHeader: some View {
        VStack(spacing: 20) {
            Image(systemName: "ticket")
                .font(.system(size: 80))
                .foregroundColor(.white.opacity(0.3))
            
            VStack(spacing: 12) {
                Text("No Tickets Yet")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text("You haven't purchased any tickets yet. Browse our amazing shows to get started!")
                    .font(.body)
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                    .lineLimit(nil)
            }
        }
    }
    
    private var callToActionSection: some View {
        VStack(spacing: 16) {
            AuthButton(
                title: "Browse Shows",
                icon: "theatermasks",
                style: .primary,
                action: onBrowseShows
            )
            
            Text("Or explore our recommendations based on your preferences")
                .font(.caption)
                .foregroundColor(.white.opacity(0.5))
                .multilineTextAlignment(.center)
        }
    }
} 