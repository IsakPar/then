//
//  HomeView.swift
//  LMLClean
//
//  Main home screen with logo and show cards
//

import SwiftUI

struct HomeView: View {
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Logo Section
                    logoSection
                    
                    // Featured Shows Section
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Featured Shows")
                            .font(.title2)
                            .fontWeight(.bold)
                            .padding(.horizontal)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 16) {
                            ForEach(mockShows) { show in
                                ShowCard(show: show)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.top)
            }
            .navigationBarHidden(true)
        }
    }
    
    // MARK: - Logo Section
    private var logoSection: some View {
        VStack(spacing: 8) {
            Text("🎭")
                .font(.system(size: 60))
            
            Text("Last Minute Live")
                .font(.title)
                .fontWeight(.bold)
                .foregroundColor(.primary)
            
            Text("Premium Theater Experiences")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 20)
    }
}

// MARK: - Show Card Component
struct ShowCard: View {
    let show: Show
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Show Image Placeholder
            RoundedRectangle(cornerRadius: 12)
                .fill(LinearGradient(
                    gradient: Gradient(colors: [.purple.opacity(0.6), .blue.opacity(0.6)]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(height: 140)
                .overlay(
                    Text(show.title.prefix(1))
                        .font(.system(size: 40, weight: .bold))
                        .foregroundColor(.white)
                )
            
            // Show Details
            VStack(alignment: .leading, spacing: 4) {
                Text(show.title)
                    .font(.headline)
                    .fontWeight(.semibold)
                    .lineLimit(2)
                
                Text(show.venue)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                HStack {
                    Text("From")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text("£\(show.minPrice)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .foregroundColor(.green)
                }
            }
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
        .onTapGesture {
            print("Tapped show: \(show.title)")
            // TODO: Navigate to seat selection
        }
    }
}

// MARK: - Preview
struct HomeView_Previews: PreviewProvider {
    static var previews: some View {
        HomeView()
    }
} 