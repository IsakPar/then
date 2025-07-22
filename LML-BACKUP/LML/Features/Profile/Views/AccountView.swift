//
//  AccountView.swift
//  Last Minute Live
//
//  User account and profile screen
//  Shows user information, settings, and sign out functionality
//

import SwiftUI

struct AccountView: View {
    @EnvironmentObject private var authManager: AuthManager
    @Environment(\.dismiss) private var dismiss
    @State private var showingSignOutAlert = false
    
    var body: some View {
        NavigationView {
            List {
                // Profile section
                profileSection
                
                // Account actions
                accountActionsSection
                
                // App info
                appInfoSection
            }
            .listStyle(InsetGroupedListStyle())
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .alert("Sign Out", isPresented: $showingSignOutAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    Task {
                        await signOut()
                    }
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
        }
    }
    
    // MARK: - Profile Section
    
    private var profileSection: some View {
        Section {
            HStack {
                // Avatar
                AsyncImage(url: URL(string: "https://via.placeholder.com/60")) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: 40))
                        .foregroundColor(.gray)
                }
                .frame(width: 60, height: 60)
                .clipShape(Circle())
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(authManager.currentUser?.name ?? "User")
                        .font(.headline)
                    
                    Text(authManager.currentUser?.email ?? "No email")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Text(authManager.currentUser?.role.rawValue.capitalized ?? "Customer")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.1))
                        .foregroundColor(.blue)
                        .cornerRadius(4)
                }
                
                Spacer()
            }
            .padding(.vertical, 8)
        }
    }
    
    // MARK: - Account Actions Section
    
    private var accountActionsSection: some View {
        Section("Account") {
            NavigationLink(destination: BookingsView()) {
                Label("My Bookings", systemImage: "ticket")
            }
            
            NavigationLink(destination: SettingsView()) {
                Label("Settings", systemImage: "gear")
            }
            
            Button(action: {
                showingSignOutAlert = true
            }) {
                Label("Sign Out", systemImage: "arrow.right.square")
                    .foregroundColor(.red)
            }
        }
    }
    
    // MARK: - App Info Section
    
    private var appInfoSection: some View {
        Section("About") {
            HStack {
                Text("Version")
                Spacer()
                Text("1.0.0")
                    .foregroundColor(.secondary)
            }
            
            HStack {
                Text("Build")
                Spacer()
                Text("1")
                    .foregroundColor(.secondary)
            }
            
            NavigationLink(destination: SupportView()) {
                Label("Support", systemImage: "questionmark.circle")
            }
            
            NavigationLink(destination: TermsView()) {
                Label("Terms & Privacy", systemImage: "doc.text")
            }
        }
    }
    
    // MARK: - Actions
    
    private func signOut() async {
        do {
            try await authManager.signOut()
            dismiss()
        } catch {
            print("Failed to sign out: \(error)")
        }
    }
}

// MARK: - Placeholder Views

struct BookingsView: View {
    var body: some View {
        Text("My Bookings - Coming Soon")
            .navigationTitle("My Bookings")
            .navigationBarTitleDisplayMode(.large)
    }
}

struct SettingsView: View {
    var body: some View {
        Text("Settings - Coming Soon")
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
    }
}

struct SupportView: View {
    var body: some View {
        Text("Support - Coming Soon")
            .navigationTitle("Support")
            .navigationBarTitleDisplayMode(.large)
    }
}

struct TermsView: View {
    var body: some View {
        Text("Terms & Privacy - Coming Soon")
            .navigationTitle("Terms & Privacy")
            .navigationBarTitleDisplayMode(.large)
    }
}

// MARK: - Preview

struct AccountView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            AccountView()
                .environmentObject(MockAuthManager())
                .previewDisplayName("Light Mode")
            
            AccountView()
                .environmentObject(MockAuthManager())
                .preferredColorScheme(.dark)
                .previewDisplayName("Dark Mode")
        }
    }
} 