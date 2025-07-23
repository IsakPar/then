//
//  PaymentSuccessView.swift
//  LML
//
//  Payment success screen with ticket details, QR code, and Apple Wallet integration
//

import SwiftUI
import PassKit
import CoreImage
import CoreImage.CIFilterBuiltins

struct PaymentSuccessView: View {
    let showTitle: String
    let venueTitle: String
    let showDate: String
    let showTime: String
    let selectedSeats: [BookedSeat]
    let totalAmount: Int
    let bookingReference: String
    @Environment(\.dismiss) private var dismiss
    @State private var showingAddToWallet = false
    
    var body: some View {
        NavigationView {
            ZStack {
                // Dark background
                Color(red: 0.067, green: 0.094, blue: 0.153) // #111827
                    .ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 24) {
                        // Success Header
                        successHeaderSection
                        
                        // Ticket Card
                        ticketCardSection
                        
                        // QR Code Section
                        qrCodeSection
                        
                        // Action Buttons
                        actionButtonsSection
                        
                        // Notice Section
                        noticeSection
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 20)
                    .padding(.bottom, 40)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                    .font(.system(size: 16, weight: .semibold))
                }
            }
        }
        .preferredColorScheme(.dark)
    }
    
    // MARK: - Success Header
    private var successHeaderSection: some View {
        VStack(spacing: 16) {
            // Success Icon with Animation
            ZStack {
                Circle()
                    .fill(Color(red: 0.063, green: 0.725, blue: 0.506)) // #10B981
                    .frame(width: 80, height: 80)
                
                Image(systemName: "checkmark")
                    .font(.system(size: 40, weight: .bold))
                    .foregroundColor(.white)
            }
            
            // Success Text
            VStack(spacing: 8) {
                Text("Payment Successful!")
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                
                Text("Your tickets have been confirmed")
                    .font(.system(size: 16))
                    .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
            }
        }
    }
    
    // MARK: - Ticket Card
    private var ticketCardSection: some View {
        VStack(spacing: 0) {
            // Show Header
            VStack(spacing: 12) {
                // Show Title
                Text(showTitle)
                    .font(.system(size: 22, weight: .bold))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                
                // Venue
                Text(venueTitle)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                
                // Date & Time
                HStack(spacing: 16) {
                    HStack(spacing: 8) {
                        Image(systemName: "calendar")
                            .foregroundColor(Color(red: 0.231, green: 0.510, blue: 0.965)) // #3B82F6
                        Text(formatDisplayDate(showDate))
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                    }
                    
                    HStack(spacing: 8) {
                        Image(systemName: "clock")
                            .foregroundColor(Color(red: 0.231, green: 0.510, blue: 0.965)) // #3B82F6
                        Text(showTime)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundColor(.white)
                    }
                }
            }
            .padding(.top, 20)
            .padding(.horizontal, 20)
            
            // Ticket Perforated Line
            HStack {
                ForEach(0..<20, id: \.self) { _ in
                    Circle()
                        .fill(Color(red: 0.374, green: 0.404, blue: 0.447)) // #5F6875
                        .frame(width: 4, height: 4)
                    Spacer()
                }
            }
            .padding(.vertical, 20)
            .padding(.horizontal, 20)
            
            // Seat Information
            VStack(spacing: 16) {
                HStack {
                    Text("Your Seats")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                    Spacer()
                    Text(formatPrice(totalAmount))
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(Color(red: 0.063, green: 0.725, blue: 0.506)) // #10B981
                }
                
                // Seat Details
                VStack(spacing: 12) {
                    ForEach(groupedSeats(), id: \.section) { group in
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(group.section)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.white)
                                
                                Text("\(group.seatNumbers)")
                                    .font(.system(size: 12))
                                    .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                            }
                            
                            Spacer()
                            
                            Text("£\(totalAmount / 100)")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.white)
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 16)
                        .background(Color(red: 0.122, green: 0.161, blue: 0.216)) // #1F2937
                        .cornerRadius(8)
                    }
                }
                
                // Booking Reference
                HStack {
                    Text("Booking Reference")
                        .font(.system(size: 14))
                        .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                    Spacer()
                    Text(bookingReference)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                }
                .padding(.top, 8)
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
        }
        .background(Color(red: 0.122, green: 0.161, blue: 0.216)) // #1F2937
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(red: 0.216, green: 0.255, blue: 0.318), lineWidth: 1) // #374151
        )
    }
    
    // MARK: - QR Code Section
    private var qrCodeSection: some View {
        VStack(spacing: 16) {
            Text("Entry QR Code")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.white)
            
            // QR Code
            ZStack {
                Rectangle()
                    .fill(.white)
                    .frame(width: 200, height: 200)
                    .cornerRadius(12)
                
                if let qrCodeImage = generateQRCode(from: bookingReference) {
                    Image(uiImage: qrCodeImage)
                        .interpolation(.none)
                        .resizable()
                        .frame(width: 180, height: 180)
                } else {
                    VStack {
                        Image(systemName: "qrcode")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        Text("QR Code")
                            .font(.caption)
                            .foregroundColor(.gray)
                    }
                }
            }
            
            Text("Show this QR code at the venue for entry")
                .font(.system(size: 14))
                .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 20)
        .frame(maxWidth: .infinity)
        .background(Color(red: 0.122, green: 0.161, blue: 0.216)) // #1F2937
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color(red: 0.216, green: 0.255, blue: 0.318), lineWidth: 1) // #374151
        )
    }
    
    // MARK: - Action Buttons
    private var actionButtonsSection: some View {
        VStack(spacing: 12) {
            // Add to Apple Wallet Button
            Button(action: addToAppleWallet) {
                HStack(spacing: 12) {
                    Image(systemName: "wallet.pass")
                        .font(.system(size: 18, weight: .medium))
                    Text("Add to Apple Wallet")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color.black,
                            Color(red: 0.2, green: 0.2, blue: 0.2)
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(12)
            }
            
            // Share Ticket Button
            Button(action: shareTicket) {
                HStack(spacing: 12) {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 18, weight: .medium))
                    Text("Share Ticket")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(
                    LinearGradient(
                        gradient: Gradient(colors: [
                            Color(red: 0.231, green: 0.510, blue: 0.965), // #3B82F6
                            Color(red: 0.114, green: 0.306, blue: 0.847)  // #1D4ED8
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .cornerRadius(12)
            }
        }
    }
    
    // MARK: - Notice Section
    private var noticeSection: some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                Image(systemName: "info.circle.fill")
                    .foregroundColor(Color(red: 0.231, green: 0.510, blue: 0.965)) // #3B82F6
                    .font(.system(size: 20))
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Ticket Saved")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                    
                    Text("Your ticket has been saved to the app. You can view it anytime in the Tickets tab.")
                        .font(.system(size: 14))
                        .foregroundColor(Color(red: 0.612, green: 0.639, blue: 0.686)) // #9CA3AF
                }
                
                Spacer()
            }
            .padding(16)
            .background(Color(red: 0.122, green: 0.161, blue: 0.216)) // #1F2937
            .cornerRadius(12)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color(red: 0.231, green: 0.510, blue: 0.965).opacity(0.3), lineWidth: 1)
            )
        }
    }
    
    // MARK: - Helper Methods
    
    private func formatDisplayDate(_ dateString: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        
        if let date = formatter.date(from: dateString) {
            formatter.dateFormat = "EEEE, MMM d, yyyy"
            return formatter.string(from: date)
        }
        return dateString
    }
    
    private func formatPrice(_ pence: Int) -> String {
        return "£\(pence / 100)"
    }
    
    private func groupedSeats() -> [(section: String, seatNumbers: String, totalPrice: Int)] {
        let grouped = Dictionary(grouping: selectedSeats) { $0.section }
        return grouped.map { (section, seats) in
            let numbers = seats.map { "Row \($0.row), Seat \($0.number)" }.joined(separator: ", ")
            let total = seats.reduce(0) { $0 + $1.price }
            return (section: section, seatNumbers: numbers, totalPrice: total)
        }
    }
    
    private func generateQRCode(from string: String) -> UIImage? {
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(string.utf8)
        
        if let outputImage = filter.outputImage {
            let scaledImage = outputImage.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
            if let cgImage = context.createCGImage(scaledImage, from: scaledImage.extent) {
                return UIImage(cgImage: cgImage)
            }
        }
        return nil
    }
    
    private func addToAppleWallet() {
        // For now, show a message that Apple Wallet functionality is coming soon
        // In a full implementation, you would create a PKPass object
        let alert = UIAlertController(
            title: "Apple Wallet",
            message: "Apple Wallet pass creation is coming soon! Your QR code can be saved to Photos for now.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Save QR to Photos", style: .default) { _ in
            self.saveQRCodeToPhotos()
        })
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootViewController = window.rootViewController {
            rootViewController.present(alert, animated: true)
        }
    }
    
    private func saveQRCodeToPhotos() {
        guard let qrCodeImage = generateQRCode(from: bookingReference) else { return }
        
        UIImageWriteToSavedPhotosAlbum(qrCodeImage, nil, nil, nil)
        
        // Show confirmation
        let alert = UIAlertController(
            title: "Saved!",
            message: "QR code has been saved to your Photos app.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootViewController = window.rootViewController {
            rootViewController.present(alert, animated: true)
        }
    }
    
    private func shareTicket() {
        let shareText = """
        🎭 \(showTitle) at \(venueTitle)
        📅 \(formatDisplayDate(showDate)) at \(showTime)
        🎫 Booking Reference: \(bookingReference)
        💷 Total: \(formatPrice(totalAmount))
        
        Booked with Last Minute Live!
        """
        
        var shareItems: [Any] = [shareText]
        
        // Add QR code image if available
        if let qrCodeImage = generateQRCode(from: bookingReference) {
            shareItems.append(qrCodeImage)
        }
        
        let activityVC = UIActivityViewController(activityItems: shareItems, applicationActivities: nil)
        
        // For iPad
        if UIDevice.current.userInterfaceIdiom == .pad {
            activityVC.popoverPresentationController?.sourceView = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first?.windows.first
            activityVC.popoverPresentationController?.sourceRect = CGRect(x: 100, y: 100, width: 1, height: 1)
        }
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootViewController = window.rootViewController {
            rootViewController.present(activityVC, animated: true)
        }
    }
}

// MARK: - Supporting Data Models
// BookedSeat model moved to Core/Models/DataModels.swift

// MARK: - Preview
struct PaymentSuccessView_Previews: PreviewProvider {
    static var previews: some View {
        PaymentSuccessView(
            showTitle: "Hamilton",
            venueTitle: "Victoria Palace Theatre",
            showDate: "2024-01-15",
            showTime: "7:30 PM",
            selectedSeats: [
                BookedSeat(section: "Premium", row: 1, number: 5, price: 8500),
                BookedSeat(section: "Premium", row: 1, number: 6, price: 8500)
            ],
            totalAmount: 17000,
            bookingReference: "LML123456"
        )
        .preferredColorScheme(.dark)
    }
} 