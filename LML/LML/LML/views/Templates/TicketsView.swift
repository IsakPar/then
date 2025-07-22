//
//  TicketsView.swift
//  LML
//
//  Template view for tickets management
//  Refactored using Atomic Design principles
//

import SwiftUI

// MARK: - Tickets View Template
struct TicketsView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var viewModel: TicketsViewModel?
    
    var body: some View {
        NavigationView {
            ZStack {
                ticketsBackground
                
                ScrollView {
                    VStack(spacing: 24) {
                        contentForAuthState
                    }
                    .padding(.bottom, 60)
                }
            }
            .navigationTitle("Your Tickets")
            .navigationBarTitleDisplayMode(.large)
            .foregroundColor(.white)
        }
        .onAppear {
            // Initialize viewModel with environment object if not already done
            if viewModel == nil {
                viewModel = TicketsViewModel(authManager: authManager)
                print("🔍 TicketsView: Created viewModel with authManager, current state: \(authManager.authState)")
            }
        }
        .sheet(isPresented: Binding(
            get: { viewModel?.showingSignIn ?? false },
            set: { if !$0 { viewModel?.showingSignIn = false } }
        )) {
            SignInView()
        }
        .sheet(isPresented: Binding(
            get: { viewModel?.showingSignUp ?? false },
            set: { if !$0 { viewModel?.showingSignUp = false } }
        )) {
            SignUpView()
        }
        .sheet(item: Binding<Ticket?>(
            get: { viewModel?.selectedTicket },
            set: { viewModel?.selectedTicket = $0 }
        )) { ticket in
            TicketDetailView(ticket: ticket)
        }
        .alert("Error", isPresented: Binding<Bool>(
            get: { viewModel?.errorMessage != nil },
            set: { if !$0 { viewModel?.errorMessage = nil } }
        )) {
            Button("OK") { viewModel?.errorMessage = nil }
        } message: {
            Text(viewModel?.errorMessage ?? "")
        }
    }
    
    // MARK: - UI Components
    
    private var ticketsBackground: some View {
        Color(red: 0.067, green: 0.094, blue: 0.153)
            .ignoresSafeArea()
    }
    
    @ViewBuilder
    private var contentForAuthState: some View {
        if let viewModel = viewModel {
            switch viewModel.authState {
            case .loading:
                LoadingStateView(message: "Loading your tickets...")
                
            case .notAuthenticated:
                notAuthenticatedContent
                
            case .biometricRequired(let user):
                biometricRequiredContent(user: user)
                
            case .guest(let user), .authenticated(let user):
                authenticatedContent(user: user)
                
            case .error(let message):
                ErrorStateView(message: message) {
                    Task { await viewModel.refreshTickets() }
                }
            }
        } else {
            // Fallback while viewModel is being initialized
            LoadingStateView(message: "Initializing...")
        }
    }
    
    private var notAuthenticatedContent: some View {
        VStack(spacing: 32) {
            welcomeHeader
            
            AuthenticationOptions(
                onSignUp: { viewModel?.showSignUp() },
                onSignIn: { viewModel?.showSignIn() },
                onAppleSignIn: { /* TODO: Apple Sign-In */ },
                onGoogleSignIn: { /* TODO: Google Sign-In */ }
            )
            .padding(.horizontal, 24)
        }
    }
    
    private var welcomeHeader: some View {
        VStack(spacing: 16) {
            Image(systemName: "ticket.fill")
                .font(.system(size: 80))
                .foregroundColor(.white.opacity(0.8))
            
            Text("Your Tickets Await")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .multilineTextAlignment(.center)
            
            Text("Sign in to view your purchased tickets and never miss a show!")
                .font(.body)
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .padding(.top, 40)
    }
    
    private func biometricRequiredContent(user: User) -> some View {
        VStack(spacing: 24) {
            UserProfileHeader(user: user)
            
            VStack(spacing: 16) {
                Image(systemName: "faceid")
                    .font(.system(size: 80))
                    .foregroundColor(.blue)
                
                Text("Unlock Your Tickets")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                
                Text("Use biometric authentication to securely access your tickets")
                    .font(.body)
                    .foregroundColor(.white.opacity(0.7))
                    .multilineTextAlignment(.center)
                
                AuthButton(
                    title: "Unlock with Biometric",
                    icon: "faceid",
                    style: .primary,
                    action: { viewModel?.authenticateWithBiometric() }
                )
                .padding(.horizontal, 24)
            }
        }
    }
    
    private func authenticatedContent(user: User) -> some View {
        VStack(spacing: 24) {
            TicketsHeader(user: user, ticketStats: viewModel?.ticketStats ?? TicketStats(tickets: []))
            
            if viewModel?.hasTickets ?? false {
                ticketsListSection
            } else if !(viewModel?.isLoading ?? true) {
                EmptyTicketsState(user: user, onBrowseShows: { viewModel?.browseShows() })
            }
        }
        .refreshable {
            await viewModel?.refreshTickets()
        }
    }
    
    private var ticketsListSection: some View {
        LazyVStack(spacing: 12) {
            ForEach(viewModel?.sortedTickets ?? []) { ticket in
                TicketCard(ticket: ticket) {
                    viewModel?.selectTicket(ticket)
                }
            }
        }
        .padding(.horizontal, 24)
    }
}

// MARK: - Error State View
private struct ErrorStateView: View {
    let message: String
    let onRetry: () -> Void
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundColor(.orange)
            
            Text("Something went wrong")
                .font(.headline)
                .foregroundColor(.white)
            
            Text(message)
                .font(.body)
                .foregroundColor(.white.opacity(0.7))
                .multilineTextAlignment(.center)
            
            AuthButton(
                title: "Try Again",
                icon: "arrow.clockwise",
                style: .primary,
                action: onRetry
            )
            .frame(maxWidth: 200)
        }
        .padding(.horizontal, 40)
    }
}

// MARK: - Preview
struct TicketsView_Previews: PreviewProvider {
    static var previews: some View {
        TicketsView()
            .preferredColorScheme(.dark)
    }
} 