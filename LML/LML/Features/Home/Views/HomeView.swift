//
//  HomeView.swift
//  Last Minute Live
//
//  Main home screen for show discovery and browsing
//  Implements local-first loading with offline cache fallback
//

import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @EnvironmentObject private var authManager: AuthManager
    @State private var searchText = ""
    @State private var showingProfile = false
    
    var body: some View {
        NavigationView {
            ZStack {
                // Background
                Color(.systemGroupedBackground)
                    .ignoresSafeArea()
                
                ScrollView {
                    LazyVStack(spacing: 16) {
                        // Header section
                        headerSection
                        
                        // Search section
                        searchSection
                        
                        // Quick filters
                        if !viewModel.shows.isEmpty {
                            quickFiltersSection
                        }
                        
                        // Offline indicator
                        if viewModel.isOfflineMode {
                            offlineIndicator
                        }
                        
                        // Shows content
                        showsContentSection
                        
                        // Cache status (debug)
                        if viewModel.showCacheStatus {
                            cacheStatusSection
                        }
                    }
                    .padding(.horizontal)
                }
                .refreshable {
                    await viewModel.refreshShows(force: true)
                }
            }
            .navigationTitle("Last Minute Live")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        showingProfile = true
                    }) {
                        AsyncImage(url: URL(string: "https://via.placeholder.com/32")) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                        } placeholder: {
                            Image(systemName: "person.circle.fill")
                                .font(.title2)
                        }
                        .frame(width: 32, height: 32)
                        .clipShape(Circle())
                    }
                    .accessibilityLabel("Profile")
                }
                
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        viewModel.toggleCacheStatusDisplay()
                    }) {
                        Image(systemName: "info.circle")
                            .foregroundColor(.secondary)
                    }
                    .accessibilityLabel("Cache info")
                }
            }
            .onAppear {
                viewModel.setAuthManager(authManager)
                Task {
                    await viewModel.loadShows()
                }
            }
            .sheet(isPresented: $showingProfile) {
                AccountView()
            }
            .searchable(text: $searchText, prompt: "Search shows...")
            .onChange(of: searchText) { newValue in
                viewModel.updateSearchQuery(newValue)
            }
        }
    }
    
    // MARK: - Header Section
    
    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading) {
                    Text("Hello, \(authManager.currentUser?.name ?? "Theater Lover")!")
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    Text("Discover amazing last-minute theater deals")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Location indicator
                HStack {
                    Image(systemName: "location.fill")
                        .foregroundColor(.blue)
                        .font(.caption)
                    Text("London")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Stats row
            HStack(spacing: 20) {
                StatView(
                    title: "Available",
                    value: "\(viewModel.availableShowsCount)",
                    color: .green
                )
                
                StatView(
                    title: "Tonight",
                    value: "\(viewModel.tonightShowsCount)",
                    color: .orange
                )
                
                StatView(
                    title: "This Week",
                    value: "\(viewModel.thisWeekShowsCount)",
                    color: .blue
                )
                
                Spacer()
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
    
    // MARK: - Search Section
    
    private var searchSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            if !searchText.isEmpty {
                HStack {
                    Text("Search Results")
                        .font(.headline)
                    
                    Spacer()
                    
                    Text("\(viewModel.filteredShows.count) shows")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
    }
    
    // MARK: - Quick Filters
    
    private var quickFiltersSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(viewModel.quickFilters, id: \.title) { filter in
                    QuickFilterButton(
                        filter: filter,
                        isSelected: viewModel.selectedFilter == filter.type
                    ) {
                        viewModel.selectFilter(filter.type)
                    }
                }
            }
            .padding(.horizontal)
        }
    }
    
    // MARK: - Offline Indicator
    
    private var offlineIndicator: some View {
        HStack {
            Image(systemName: "wifi.slash")
                .foregroundColor(.orange)
            Text("You're offline - showing saved shows")
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
        }
        .padding()
        .background(Color.orange.opacity(0.1))
        .cornerRadius(8)
    }
    
    // MARK: - Shows Content
    
    private var showsContentSection: some View {
        Group {
            if viewModel.isLoading && viewModel.shows.isEmpty {
                loadingView
            } else if viewModel.shows.isEmpty {
                emptyStateView
            } else {
                showsGridView
            }
        }
    }
    
    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)
            Text("Loading amazing shows...")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 200)
    }
    
    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "theatermasks")
                .font(.system(size: 50))
                .foregroundColor(.secondary)
            
            Text("No shows found")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Check back later for new shows or try adjusting your search.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
            
            Button("Refresh") {
                Task {
                    await viewModel.refreshShows(force: true)
                }
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 200)
        .padding()
    }
    
    private var showsGridView: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 16) {
            ForEach(viewModel.filteredShows) { show in
                NavigationLink(destination: SeatSelectionView(show: show)) {
                    ShowCardView(show: show)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
    }
    
    // MARK: - Cache Status Section
    
    private var cacheStatusSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Cache Status")
                .font(.headline)
            
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Last sync:")
                    Spacer()
                    Text(viewModel.lastSyncText)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Cache size:")
                    Spacer()
                    Text(viewModel.cacheSizeText)
                        .foregroundColor(.secondary)
                }
                
                HStack {
                    Text("Offline mode:")
                    Spacer()
                    Text(viewModel.isOfflineMode ? "Yes" : "No")
                        .foregroundColor(viewModel.isOfflineMode ? .orange : .green)
                }
            }
            .font(.caption)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(8)
    }
}

// MARK: - Supporting Views

struct StatView: View {
    let title: String
    let value: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct QuickFilterButton: View {
    let filter: QuickFilter
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Image(systemName: filter.icon)
                    .font(.caption)
                Text(filter.title)
                    .font(.caption)
                    .fontWeight(.medium)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.blue : Color(.secondarySystemBackground))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(16)
        }
    }
}

// MARK: - Preview

struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            HomeView()
                .environmentObject(MockAuthManager())
                .previewDisplayName("Light Mode")
            
            HomeView()
                .environmentObject(MockAuthManager())
                .preferredColorScheme(.dark)
                .previewDisplayName("Dark Mode")
            
            HomeView()
                .environmentObject(MockAuthManager())
                .previewDevice("iPhone SE (3rd generation)")
                .previewDisplayName("iPhone SE")
        }
    }
} 