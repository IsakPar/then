//
//  QRCodeView.swift
//  Last Minute Live
//
//  QR code component for rendering ticket QR codes from local data
//  Supports offline viewing, sharing, and accessibility
//

import SwiftUI
import CoreImage.CIFilterBuiltins

struct QRCodeView: View {
    let qrCodeData: String
    let size: CGFloat
    let backgroundColor: Color
    let foregroundColor: Color
    let showBorder: Bool
    let errorCorrectionLevel: QRCodeErrorCorrectionLevel
    
    @State private var qrCodeImage: UIImage?
    @State private var isGenerating: Bool = false
    @State private var generationError: String?
    
    init(
        qrCodeData: String,
        size: CGFloat = 200,
        backgroundColor: Color = .white,
        foregroundColor: Color = .black,
        showBorder: Bool = true,
        errorCorrectionLevel: QRCodeErrorCorrectionLevel = .medium
    ) {
        self.qrCodeData = qrCodeData
        self.size = size
        self.backgroundColor = backgroundColor
        self.foregroundColor = foregroundColor
        self.showBorder = showBorder
        self.errorCorrectionLevel = errorCorrectionLevel
    }
    
    var body: some View {
        VStack(spacing: 16) {
            // QR Code Image
            qrCodeImageView
            
            // Error message
            if let generationError = generationError {
                errorView(message: generationError)
            }
        }
        .onAppear {
            generateQRCode()
        }
        .onChange(of: qrCodeData) { _ in
            generateQRCode()
        }
    }
    
    // MARK: - QR Code Image View
    
    private var qrCodeImageView: some View {
        Group {
            if isGenerating {
                loadingView
            } else if let qrCodeImage = qrCodeImage {
                qrImageView(qrCodeImage)
            } else {
                placeholderView
            }
        }
        .frame(width: size, height: size)
        .background(backgroundColor)
        .overlay(
            showBorder ? 
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.secondary.opacity(0.3), lineWidth: 1) : nil
        )
        .cornerRadius(12)
    }
    
    private var loadingView: some View {
        VStack {
            ProgressView()
                .scaleEffect(1.2)
            Text("Generating QR Code...")
                .font(.caption)
                .foregroundColor(.secondary)
                .padding(.top, 8)
        }
        .accessibilityLabel("Generating QR code")
    }
    
    private func qrImageView(_ image: UIImage) -> some View {
        Image(uiImage: image)
            .interpolation(.none)
            .resizable()
            .aspectRatio(contentMode: .fit)
            .padding(16)
            .accessibilityLabel("QR code for ticket")
            .accessibilityHint("Show this QR code at the venue for entry")
            .contextMenu {
                Button(action: {
                    shareQRCode(image)
                }) {
                    Label("Share QR Code", systemImage: "square.and.arrow.up")
                }
                
                Button(action: {
                    saveQRCodeToPhotos(image)
                }) {
                    Label("Save to Photos", systemImage: "photo")
                }
                
                Button(action: {
                    copyQRCodeData()
                }) {
                    Label("Copy Data", systemImage: "doc.on.doc")
                }
            }
    }
    
    private var placeholderView: some View {
        VStack {
            Image(systemName: "qrcode")
                .font(.system(size: 40))
                .foregroundColor(.secondary)
            Text("QR Code")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .accessibilityLabel("QR code placeholder")
    }
    
    private func errorView(message: String) -> some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(8)
        .background(Color.orange.opacity(0.1))
        .cornerRadius(8)
        .accessibilityLabel("Error: \(message)")
    }
    
    // MARK: - QR Code Generation
    
    private func generateQRCode() {
        guard !qrCodeData.isEmpty else {
            generationError = "No QR code data provided"
            return
        }
        
        isGenerating = true
        generationError = nil
        
        Task {
            do {
                let image = try await generateQRCodeImage(
                    from: qrCodeData,
                    size: size,
                    backgroundColor: backgroundColor,
                    foregroundColor: foregroundColor,
                    errorCorrectionLevel: errorCorrectionLevel
                )
                
                await MainActor.run {
                    self.qrCodeImage = image
                    self.isGenerating = false
                }
                
            } catch {
                await MainActor.run {
                    self.generationError = "Failed to generate QR code"
                    self.isGenerating = false
                }
                print("🔳 QRCodeView: Failed to generate QR code: \(error)")
            }
        }
    }
    
    private func generateQRCodeImage(
        from data: String,
        size: CGFloat,
        backgroundColor: Color,
        foregroundColor: Color,
        errorCorrectionLevel: QRCodeErrorCorrectionLevel
    ) async throws -> UIImage {
        
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let image = try createQRCodeImage(
                        data: data,
                        size: size,
                        backgroundColor: backgroundColor,
                        foregroundColor: foregroundColor,
                        errorCorrectionLevel: errorCorrectionLevel
                    )
                    continuation.resume(returning: image)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    private func createQRCodeImage(
        data: String,
        size: CGFloat,
        backgroundColor: Color,
        foregroundColor: Color,
        errorCorrectionLevel: QRCodeErrorCorrectionLevel
    ) throws -> UIImage {
        
        let context = CIContext()
        let filter = CIFilter.qrCodeGenerator()
        
        // Set input data
        guard let inputData = data.data(using: .utf8) else {
            throw QRCodeError.invalidData
        }
        filter.setValue(inputData, forKey: "inputMessage")
        
        // Set error correction level
        filter.setValue(errorCorrectionLevel.ciValue, forKey: "inputCorrectionLevel")
        
        // Generate QR code
        guard let outputImage = filter.outputImage else {
            throw QRCodeError.generationFailed
        }
        
        // Scale the image to desired size
        let scaleX = size / outputImage.extent.size.width
        let scaleY = size / outputImage.extent.size.height
        let scaledImage = outputImage.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))
        
        // Apply colors
        let colorFilter = CIFilter.falseColor()
        colorFilter.inputImage = scaledImage
        colorFilter.color0 = CIColor(color: UIColor(foregroundColor)) // QR code color
        colorFilter.color1 = CIColor(color: UIColor(backgroundColor)) // Background color
        
        guard let coloredImage = colorFilter.outputImage else {
            throw QRCodeError.coloringFailed
        }
        
        // Convert to UIImage
        guard let cgImage = context.createCGImage(coloredImage, from: coloredImage.extent) else {
            throw QRCodeError.renderingFailed
        }
        
        return UIImage(cgImage: cgImage)
    }
    
    // MARK: - Actions
    
    private func shareQRCode(_ image: UIImage) {
        let activityVC = UIActivityViewController(
            activityItems: [image, "My Last Minute Live ticket"],
            applicationActivities: nil
        )
        
        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first {
            window.rootViewController?.present(activityVC, animated: true)
        }
    }
    
    private func saveQRCodeToPhotos(_ image: UIImage) {
        UIImageWriteToSavedPhotosAlbum(image, nil, nil, nil)
    }
    
    private func copyQRCodeData() {
        UIPasteboard.general.string = qrCodeData
    }
}

// MARK: - Error Correction Levels

enum QRCodeErrorCorrectionLevel: String, CaseIterable {
    case low = "L"
    case medium = "M"
    case quartile = "Q"
    case high = "H"
    
    var ciValue: String {
        return self.rawValue
    }
    
    var description: String {
        switch self {
        case .low:
            return "Low (~7%)"
        case .medium:
            return "Medium (~15%)"
        case .quartile:
            return "Quartile (~25%)"
        case .high:
            return "High (~30%)"
        }
    }
}

// MARK: - QR Code Errors

enum QRCodeError: LocalizedError {
    case invalidData
    case generationFailed
    case coloringFailed
    case renderingFailed
    
    var errorDescription: String? {
        switch self {
        case .invalidData:
            return "Invalid QR code data"
        case .generationFailed:
            return "Failed to generate QR code"
        case .coloringFailed:
            return "Failed to apply colors to QR code"
        case .renderingFailed:
            return "Failed to render QR code image"
        }
    }
}

// MARK: - Ticket QR Code View

struct TicketQRCodeView: View {
    let userBooking: UserBooking
    let size: CGFloat
    
    init(userBooking: UserBooking, size: CGFloat = 250) {
        self.userBooking = userBooking
        self.size = size
    }
    
    var body: some View {
        VStack(spacing: 16) {
            // Header
            VStack(spacing: 8) {
                Text("Your Ticket")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Text("Show this QR code at the venue")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            
            // QR Code
            QRCodeView(
                qrCodeData: userBooking.qrCode,
                size: size,
                errorCorrectionLevel: .high // High error correction for ticket scanning
            )
            
            // Ticket info
            VStack(spacing: 4) {
                Text(userBooking.showTitle)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .multilineTextAlignment(.center)
                
                Text("\(userBooking.showDate) at \(userBooking.showTime)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text(userBooking.venueName)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Seat details
            VStack(spacing: 2) {
                Text("Seats:")
                    .font(.caption)
                    .fontWeight(.medium)
                
                ForEach(userBooking.seats, id: \.id) { seat in
                    Text("\(seat.section) - Row \(seat.row), Seat \(seat.number)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Booking reference
            Text("Booking: \(String(userBooking.id.prefix(8)))")
                .font(.caption2)
                .foregroundColor(.secondary)
                .padding(.top, 8)
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 4)
    }
}

// MARK: - Mini QR Code View

struct MiniQRCodeView: View {
    let qrCodeData: String
    let size: CGFloat
    
    init(qrCodeData: String, size: CGFloat = 60) {
        self.qrCodeData = qrCodeData
        self.size = size
    }
    
    var body: some View {
        QRCodeView(
            qrCodeData: qrCodeData,
            size: size,
            showBorder: false,
            errorCorrectionLevel: .medium
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Preview

struct QRCodeView_Previews: PreviewProvider {
    static var previews: some View {
        let mockBooking = UserBooking(
            id: "booking_123",
            showId: "show_1",
            showTitle: "Hamilton",
            showDate: "2024-01-15",
            showTime: "19:30",
            venueName: "Victoria Palace Theatre",
            venueAddress: "Victoria Street, London",
            seats: [
                BookingSeat(
                    id: "seat_1",
                    number: "12",
                    row: "H",
                    section: "Orchestra",
                    priceInPence: 12000
                ),
                BookingSeat(
                    id: "seat_2",
                    number: "13",
                    row: "H",
                    section: "Orchestra",
                    priceInPence: 12000
                )
            ],
            totalAmount: 24000,
            status: .confirmed,
            qrCode: """
            {
                "bookingId": "booking_123",
                "timestamp": "2024-01-15T10:30:00Z",
                "checksum": "abc123"
            }
            """,
            bookingDate: Date()
        )
        
        Group {
            VStack(spacing: 20) {
                TicketQRCodeView(userBooking: mockBooking)
                
                HStack {
                    QRCodeView(qrCodeData: "https://lastminutelive.com/verify/booking_123")
                    MiniQRCodeView(qrCodeData: "booking_123")
                }
            }
            .padding()
            .previewDisplayName("Light Mode")
            
            VStack(spacing: 20) {
                TicketQRCodeView(userBooking: mockBooking)
            }
            .padding()
            .preferredColorScheme(.dark)
            .previewDisplayName("Dark Mode")
        }
    }
} 