//
//  HomeView.swift
//  LMLClean
//
//  Main home screen matching Expo app design exactly
//

import SwiftUI

struct HomeView: View {
    @State private var shows: [Show] = []
    @State private var isLoading = true
    private let dataService = DataService.shared
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Dark background matching Expo app
                Color(red: 0.067, green: 0.094, blue: 0.153) // #111827
                    .ignoresSafeArea()
                
                VStack(spacing: 0) {
                    // Header with Logo - matching Expo design
                    headerSection
                    
                    // Shows List - single column like Expo
                    showsListSection
                }
            }
            .preferredColorScheme(.dark)
            .onAppear {
                loadShows()
            }
        }
    }
    
    private func loadShows() {
        Task {
            do {
                let loadedShows = try await dataService.getShows()
                await MainActor.run {
                    self.shows = loadedShows
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                }
            }
        }
    }
    
    // MARK: - Header Section
    private var headerSection: some View {
        VStack(spacing: 0) {
            // Logo Container
            VStack {
                // Logo Image - using our new imageset - MODERATELY BIGGER
                Image("lml-logo")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 400, height: 120) // Reasonable bigger size, not crazy
                    .padding(.top, -15) // Moderate negative padding
                
                // Subtitle
                Text("Available Shows")
                    .font(.system(size: 16))
                    .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                    .padding(.top, -18) // Moved closer to logo
            }
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(
                    gradient: Gradient(colors: [
                        Color(red: 0.122, green: 0.161, blue: 0.216), // #1F2937
                        Color(red: 0.067, green: 0.094, blue: 0.153)  // #111827
                    ]),
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .padding(.horizontal, 20)
            .padding(.bottom, 0)
        }
    }
    
    // MARK: - Shows List Section
    private var showsListSection: some View {
        ScrollView {
            LazyVStack(spacing: 16) { // Single column with 16px spacing like Expo
                ForEach(shows) { show in
                    ShowCardExpo(show: show)
                        .padding(.horizontal, 20) // Match Expo padding
                }
            }
            .padding(.top, 15) // Match Expo marginTop
            .padding(.bottom, 80) // Space for custom bottom navigation
        }
    }
}

// MARK: - Expo-Style Show Card Component
struct ShowCardExpo: View {
    let show: Show
    
    var body: some View {
        Group {
            if isHamiltonShow {
                // Hamilton: Keep intact as reference implementation
                NavigationLink(destination: HamiltonSeatMapView()) {
                    showCardContent
                }
                .buttonStyle(PlainButtonStyle())
            } else {
                // All other shows: Use UniversalSeatMapView with dynamic theming
                NavigationLink(destination: UniversalSeatMapView(show: show)) {
                    showCardContent
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
    }
    
    // MARK: - Computed Properties
    private var isHamiltonShow: Bool {
        show.title.lowercased().contains("hamilton")
    }
    
    // Remove Lion King and Phantom specific detection - will use generic system
    // private var isLionKingShow: Bool { ... } // REMOVED
    // private var isPhantomShow: Bool { ... }   // REMOVED
    
    private var showCardContent: some View {
        VStack(spacing: 0) {
            // Image Section - 200px height like Expo
            ZStack(alignment: .bottomLeading) {
                // Show Image or Gradient Fallback
                if let imageName = getImageName(for: show.title) {
                    Image(imageName)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(height: 200)
                        .clipped()
                } else {
                    // Gradient fallback like Expo
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(red: 0.231, green: 0.510, blue: 0.965), // #3B82F6
                            Color(red: 0.114, green: 0.306, blue: 0.847)  // #1D4ED8
                        ]),
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .frame(height: 200)
                    .overlay(
                        Text(show.title)
                            .font(.system(size: 24, weight: .bold))
                            .foregroundColor(.white)
                            .multilineTextAlignment(.center)
                            .shadow(color: .black.opacity(0.5), radius: 2, x: 1, y: 1)
                    )
                }
                
                // Image Overlay - matching Expo
                Rectangle()
                    .fill(Color.black.opacity(0.6))
                    .frame(height: 50)
                    .overlay(
                        HStack {
                            Text(show.venue.name)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(.white)
                            Spacer()
                        }
                        .padding(.horizontal, 12)
                    )
            }
            .frame(height: 200)
            .clipped()
            
            // Show Info Section - matching Expo padding and styling
            VStack(alignment: .leading, spacing: 8) {
                // Show Title
                Text(show.title)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                
                // Show Date & Time
                if let firstShowTime = show.schedule.first {
                    Text("\(formatDate(firstShowTime.startTime)) at \(firstShowTime.formattedTime)")
                        .font(.system(size: 14))
                        .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                } else {
                    Text("Schedule TBA")
                        .font(.system(size: 14))
                        .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                }
                
                // Price Container
                HStack(alignment: .bottom, spacing: 0) {
                    Text("From ")
                        .font(.system(size: 16))
                        .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                    
                    Text(show.pricing.formattedMinPrice)
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506)) // #10B981
                    
                    if show.pricing.maxPrice > show.pricing.minPrice {
                        Text(" - \(show.pricing.formattedMaxPrice)")
                            .font(.system(size: 16, weight: .regular))
                            .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16) // Match Expo padding
        }
        .background(Color(red: 0.122, green: 0.161, blue: 0.216)) // #1F2937
        .cornerRadius(12) // Match Expo border radius
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(red: 0.216, green: 0.255, blue: 0.318), lineWidth: 1) // #374151
        )
        .shadow(color: Color.black.opacity(0.25), radius: 8, x: 0, y: 4)
        .scaleEffect(1.0) // Base scale for hover effect
        .animation(.easeInOut(duration: 0.15), value: false)

    }
    
    // Helper function to get image name for show - updated to use new imageset names
    private func getImageName(for title: String) -> String? {
        switch title.lowercased() {
        case let t where t.contains("hamilton"):
            return "hamilton-image"
        case let t where t.contains("lion king"):
            return "lionking-image"
        case let t where t.contains("phantom"):
            return "phantom-image"
        case let t where t.contains("chicago"):
            return "chicago-image"
        case let t where t.contains("wicked"):
            return "wicked-image"
        case let t where t.contains("mamma"):
            return "mamamia-image"
        default:
            return nil
        }
    }
    
    // Helper function to format date
    private func formattedDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        if let date = formatter.date(from: dateString) {
            formatter.dateFormat = "MMM d"
            return formatter.string(from: date)
        }
        return dateString
    }
    
    // Helper function to format Date object
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: date)
    }
}

// MARK: - Preview
struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView()
            .preferredColorScheme(.dark)
    }
} 