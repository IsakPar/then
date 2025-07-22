//
//  ShowCardView.swift
//  Last Minute Live
//
//  Reusable show card component for displaying show information
//  Features image loading, pricing, venue details, and accessibility
//

import SwiftUI

struct ShowCardView: View {
    let show: Show
    @State private var isImageLoaded = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Show image with placeholder
            showImageSection
            
            // Show details
            showDetailsSection
        }
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityHint("Tap to view seat selection for this show")
    }
    
    // MARK: - Show Image Section
    
    private var showImageSection: some View {
        ZStack {
            // Background color while loading
            Rectangle()
                .fill(LinearGradient(
                    gradient: Gradient(colors: [
                        Color.blue.opacity(0.3),
                        Color.purple.opacity(0.3)
                    ]),
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(height: 120)
            
            // Show image
            AsyncImage(url: imageURL) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 120)
                    .clipped()
                    .onAppear {
                        isImageLoaded = true
                    }
            } placeholder: {
                VStack {
                    Image(systemName: "theatermasks")
                        .font(.title)
                        .foregroundColor(.white)
                    Text(show.title)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.white)
                        .multilineTextAlignment(.center)
                        .lineLimit(2)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            
            // Price badge overlay
            VStack {
                HStack {
                    Spacer()
                    priceBadge
                }
                Spacer()
            }
            .padding(8)
        }
        .frame(height: 120)
        .cornerRadius(12, corners: [.topLeft, .topRight])
    }
    
    // MARK: - Show Details Section
    
    private var showDetailsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Title
            Text(show.title)
                .font(.headline)
                .fontWeight(.semibold)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
            
            // Venue info
            HStack {
                Image(systemName: "location.fill")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(show.venueName)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            
            // Date and time
            HStack {
                Image(systemName: "calendar")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(formattedDateTime)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
            
            // Duration if available
            if let duration = show.durationMinutes {
                HStack {
                    Image(systemName: "clock")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text("\(duration) minutes")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer(minLength: 4)
            
            // Price range
            HStack {
                Text("From")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(formattedMinPrice)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundColor(.primary)
                
                Spacer()
                
                // Availability indicator
                availabilityIndicator
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
    }
    
    // MARK: - Supporting Components
    
    private var priceBadge: some View {
        Text(formattedMinPrice)
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundColor(.white)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color.black.opacity(0.7))
            .cornerRadius(8)
    }
    
    private var availabilityIndicator: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(show.isActive ? Color.green : Color.red)
                .frame(width: 8, height: 8)
            
            Text(show.isActive ? "Available" : "Sold Out")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundColor(show.isActive ? .green : .red)
        }
    }
    
    // MARK: - Computed Properties
    
    private var imageURL: URL? {
        if let imageUrl = show.imageUrl {
            return URL(string: imageUrl)
        }
        
        // Fallback to a default image based on show title
        let imageName = show.title.lowercased()
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "the", with: "")
        
        // These would be actual image URLs in production
        switch imageName {
        case let name where name.contains("hamilton"):
            return URL(string: "https://example.com/images/hamilton.jpg")
        case let name where name.contains("lionking"):
            return URL(string: "https://example.com/images/lionking.jpg")
        case let name where name.contains("wicked"):
            return URL(string: "https://example.com/images/wicked.jpg")
        case let name where name.contains("phantom"):
            return URL(string: "https://example.com/images/phantom.jpg")
        default:
            return nil
        }
    }
    
    private var formattedDateTime: String {
        guard let date = DateFormatter.yearMonthDay.date(from: show.date) else {
            return "\(show.date) at \(show.time)"
        }
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "MMM d"
        let formattedDate = dateFormatter.string(from: date)
        
        return "\(formattedDate) at \(show.time)"
    }
    
    private var formattedMinPrice: String {
        let pounds = Double(show.minPrice) / 100.0
        return String(format: "£%.0f", pounds)
    }
    
    private var accessibilityLabel: String {
        let priceText = formattedMinPrice
        let dateTime = formattedDateTime
        let venue = show.venueName
        let status = show.isActive ? "Available" : "Sold out"
        
        return "\(show.title), \(venue), \(dateTime), from \(priceText), \(status)"
    }
}

// MARK: - Corner Radius Extension

extension View {
    func cornerRadius(_ radius: CGFloat, corners: UIRectCorner) -> some View {
        clipShape(RoundedCorner(radius: radius, corners: corners))
    }
}

struct RoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners

    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - Date Formatter Extension

private extension DateFormatter {
    static let yearMonthDay: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

// MARK: - Preview

struct ShowCardView_Previews: PreviewProvider {
    static var previews: some View {
        let mockShow = Show(
            id: "1",
            title: "Hamilton",
            description: "The acclaimed musical about Alexander Hamilton",
            date: "2024-01-15",
            time: "19:30",
            imageUrl: nil,
            venueId: "venue1",
            venueName: "Victoria Palace Theatre",
            venueAddress: "Victoria Street, London",
            seatMapId: "map1",
            minPrice: 4500, // £45
            maxPrice: 15000, // £150
            isActive: true,
            seatPricing: nil,
            durationMinutes: 165
        )
        
        Group {
            HStack(spacing: 16) {
                ShowCardView(show: mockShow)
                ShowCardView(show: mockShow)
            }
            .padding()
            .background(Color(.systemGroupedBackground))
            .previewDisplayName("Light Mode")
            
            HStack(spacing: 16) {
                ShowCardView(show: mockShow)
                ShowCardView(show: mockShow)
            }
            .padding()
            .background(Color(.systemGroupedBackground))
            .preferredColorScheme(.dark)
            .previewDisplayName("Dark Mode")
            
            ShowCardView(show: mockShow)
                .frame(width: 180)
                .padding()
                .background(Color(.systemGroupedBackground))
                .previewDisplayName("Single Card")
        }
    }
} 