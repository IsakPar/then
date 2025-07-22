//
//  DeviceSupport.swift
//  LML
//
//  Device support utilities for responsive layouts
//  Ensures optimal experience across all iOS devices
//

import SwiftUI
import UIKit

// MARK: - Device Information
struct DeviceInfo {
    
    // MARK: - Device Types
    enum DeviceType {
        case iPhone
        case iPadMini
        case iPadRegular
        case iPadPro
        case unknown
        
        var isTablet: Bool {
            switch self {
            case .iPadMini, .iPadRegular, .iPadPro:
                return true
            case .iPhone, .unknown:
                return false
            }
        }
        
        var isPro: Bool {
            return self == .iPadPro
        }
    }
    
    // MARK: - Screen Sizes
    enum ScreenSize {
        case compact      // iPhone SE, iPhone 12 mini
        case regular      // iPhone 12, iPhone 13
        case large        // iPhone 12 Pro Max, iPhone 14 Plus
        case tablet       // iPad variants
        
        var isCompact: Bool {
            return self == .compact
        }
        
        var isTablet: Bool {
            return self == .tablet
        }
    }
    
    // MARK: - Current Device Detection
    static var current: DeviceInfo {
        let idiom = UIDevice.current.userInterfaceIdiom
        let screenSize = UIScreen.main.bounds.size
        let scale = UIScreen.main.scale
        
        let deviceType: DeviceType
        let screenSizeCategory: ScreenSize
        
        switch idiom {
        case .phone:
            deviceType = .iPhone
            screenSizeCategory = categorizePhoneScreen(screenSize)
        case .pad:
            deviceType = categorizePadDevice(screenSize)
            screenSizeCategory = .tablet
        default:
            deviceType = .unknown
            screenSizeCategory = .regular
        }
        
        return DeviceInfo(
            type: deviceType,
            screenSize: screenSizeCategory,
            physicalSize: screenSize,
            scale: scale,
            safeAreaInsets: getSafeAreaInsets(),
            orientation: getOrientation()
        )
    }
    
    let type: DeviceType
    let screenSize: ScreenSize
    let physicalSize: CGSize
    let scale: CGFloat
    let safeAreaInsets: EdgeInsets
    let orientation: UIInterfaceOrientation
    
    // MARK: - Helper Properties
    var isLandscape: Bool {
        return orientation.isLandscape
    }
    
    var isPortrait: Bool {
        return orientation.isPortrait
    }
    
    var hasNotch: Bool {
        return safeAreaInsets.top > 20
    }
    
    var hasHomeIndicator: Bool {
        return safeAreaInsets.bottom > 0
    }
    
    // MARK: - Static Helper Methods
    private static func categorizePhoneScreen(_ size: CGSize) -> ScreenSize {
        let maxDimension = max(size.width, size.height)
        
        switch maxDimension {
        case 0...736:      // iPhone SE, iPhone 8 and smaller
            return .compact
        case 737...844:    // iPhone 12, iPhone 13
            return .regular
        case 845...:       // iPhone 12 Pro Max, iPhone 14 Plus and larger
            return .large
        default:
            return .regular
        }
    }
    
    private static func categorizePadDevice(_ size: CGSize) -> DeviceType {
        let maxDimension = max(size.width, size.height)
        
        switch maxDimension {
        case 0...1080:     // iPad mini
            return .iPadMini
        case 1081...1194:  // iPad regular
            return .iPadRegular
        case 1195...:      // iPad Pro
            return .iPadPro
        default:
            return .iPadRegular
        }
    }
    
    private static func getSafeAreaInsets() -> EdgeInsets {
        guard let window = UIApplication.shared.connectedScenes
            .compactMap({ $0 as? UIWindowScene })
            .flatMap({ $0.windows })
            .first(where: { $0.isKeyWindow }) else {
            return EdgeInsets()
        }
        
        let insets = window.safeAreaInsets
        return EdgeInsets(
            top: insets.top,
            leading: insets.left,
            bottom: insets.bottom,
            trailing: insets.right
        )
    }
    
    private static func getOrientation() -> UIInterfaceOrientation {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene else {
            return .portrait
        }
        return windowScene.interfaceOrientation
    }
}

// MARK: - Responsive Layout Helper
struct ResponsiveLayout {
    let device: DeviceInfo
    
    init(device: DeviceInfo = DeviceInfo.current) {
        self.device = device
    }
    
    // MARK: - Spacing Values
    var padding: CGFloat {
        switch device.screenSize {
        case .compact: return 16
        case .regular: return 20
        case .large: return 24
        case .tablet: return 32
        }
    }
    
    var smallSpacing: CGFloat {
        switch device.screenSize {
        case .compact: return 8
        case .regular: return 12
        case .large: return 16
        case .tablet: return 20
        }
    }
    
    var mediumSpacing: CGFloat {
        switch device.screenSize {
        case .compact: return 16
        case .regular: return 20
        case .large: return 24
        case .tablet: return 32
        }
    }
    
    var largeSpacing: CGFloat {
        switch device.screenSize {
        case .compact: return 24
        case .regular: return 32
        case .large: return 40
        case .tablet: return 48
        }
    }
    
    // MARK: - Seat Map Layout
    var seatMapConfiguration: SeatMapLayoutConfig {
        switch device.type {
        case .iPhone:
            return SeatMapLayoutConfig(
                containerPadding: 16,
                seatSize: CGSize(width: 20, height: 18),
                seatSpacing: 4,
                minScale: 0.8,
                maxScale: 3.0,
                controlsHeight: 80
            )
        case .iPadMini:
            return SeatMapLayoutConfig(
                containerPadding: 24,
                seatSize: CGSize(width: 24, height: 22),
                seatSpacing: 6,
                minScale: 0.6,
                maxScale: 4.0,
                controlsHeight: 100
            )
        case .iPadRegular, .iPadPro:
            return SeatMapLayoutConfig(
                containerPadding: 32,
                seatSize: CGSize(width: 28, height: 26),
                seatSpacing: 8,
                minScale: 0.5,
                maxScale: 5.0,
                controlsHeight: 120
            )
        case .unknown:
            return SeatMapLayoutConfig(
                containerPadding: 20,
                seatSize: CGSize(width: 24, height: 22),
                seatSpacing: 6,
                minScale: 0.8,
                maxScale: 3.0,
                controlsHeight: 80
            )
        }
    }
    
    // MARK: - Typography Scaling
    var scaledFont: FontScaling {
        return FontScaling(device: device)
    }
    
    // MARK: - Grid Configuration
    var gridColumns: Int {
        switch device.type {
        case .iPhone:
            return device.isLandscape ? 2 : 1
        case .iPadMini:
            return device.isLandscape ? 3 : 2
        case .iPadRegular, .iPadPro:
            return device.isLandscape ? 4 : 3
        case .unknown:
            return 1
        }
    }
    
    var cardWidth: CGFloat {
        let availableWidth = device.physicalSize.width - (padding * 2)
        let columnSpacing = mediumSpacing * CGFloat(gridColumns - 1)
        return (availableWidth - columnSpacing) / CGFloat(gridColumns)
    }
}

// MARK: - Seat Map Layout Configuration
struct SeatMapLayoutConfig {
    let containerPadding: CGFloat
    let seatSize: CGSize
    let seatSpacing: CGFloat
    let minScale: CGFloat
    let maxScale: CGFloat
    let controlsHeight: CGFloat
}

// MARK: - Font Scaling
struct FontScaling {
    let device: DeviceInfo
    
    var scaleMultiplier: CGFloat {
        switch device.screenSize {
        case .compact: return 0.9
        case .regular: return 1.0
        case .large: return 1.1
        case .tablet: return 1.2
        }
    }
    
    func scaledFont(_ baseFont: Font) -> Font {
        // SwiftUI handles this automatically with Dynamic Type
        // This is for custom scaling if needed
        return baseFont
    }
    
    var buttonHeight: CGFloat {
        switch device.screenSize {
        case .compact: return 44
        case .regular: return 48
        case .large: return 52
        case .tablet: return 56
        }
    }
    
    var minimumTouchTarget: CGFloat {
        return 44 // Apple's recommended minimum
    }
}

// MARK: - Adaptive View Modifiers
struct AdaptiveLayoutModifier: ViewModifier {
    let device: DeviceInfo
    
    init(device: DeviceInfo = DeviceInfo.current) {
        self.device = device
    }
    
    func body(content: Content) -> some View {
        let layout = ResponsiveLayout(device: device)
        
        content
            .padding(.horizontal, layout.padding)
            .environment(\.device, device)
            .environment(\.responsiveLayout, layout)
    }
}

// MARK: - Environment Values
private struct DeviceEnvironmentKey: EnvironmentKey {
    static let defaultValue = DeviceInfo.current
}

private struct ResponsiveLayoutEnvironmentKey: EnvironmentKey {
    static let defaultValue = ResponsiveLayout()
}

extension EnvironmentValues {
    var device: DeviceInfo {
        get { self[DeviceEnvironmentKey.self] }
        set { self[DeviceEnvironmentKey.self] = newValue }
    }
    
    var responsiveLayout: ResponsiveLayout {
        get { self[ResponsiveLayoutEnvironmentKey.self] }
        set { self[ResponsiveLayoutEnvironmentKey.self] = newValue }
    }
}

// MARK: - View Extensions
extension View {
    func adaptiveLayout() -> some View {
        modifier(AdaptiveLayoutModifier())
    }
    
    func responsivePadding() -> some View {
        modifier(ResponsivePaddingModifier())
    }
    
    func deviceSpecific<iPhone: View, iPad: View>(
        iPhone: () -> iPhone,
        iPad: () -> iPad
    ) -> some View {
        modifier(DeviceSpecificModifier(iPhone: iPhone(), iPad: iPad()))
    }
}

// MARK: - Responsive Padding Modifier
struct ResponsivePaddingModifier: ViewModifier {
    @Environment(\.responsiveLayout) private var layout
    
    func body(content: Content) -> some View {
        content.padding(.horizontal, layout.padding)
    }
}

// MARK: - Device Specific Content Modifier
struct DeviceSpecificModifier<iPhone: View, iPad: View>: ViewModifier {
    let iPhone: iPhone
    let iPad: iPad
    
    @Environment(\.device) private var device
    
    func body(content: Content) -> some View {
        Group {
            if device.type.isTablet {
                self.iPad
            } else {
                self.iPhone
            }
        }
    }
}

// MARK: - Orientation Observer
class OrientationObserver: ObservableObject {
    @Published var orientation: UIInterfaceOrientation = .portrait
    @Published var device: DeviceInfo = DeviceInfo.current
    
    init() {
        updateOrientation()
        
        NotificationCenter.default.addObserver(
            forName: UIDevice.orientationDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.updateOrientation()
        }
    }
    
    private func updateOrientation() {
        device = DeviceInfo.current
        orientation = device.orientation
    }
}

// MARK: - Adaptive Grid
struct AdaptiveGrid<Content: View>: View {
    let content: Content
    
    @Environment(\.responsiveLayout) private var layout
    @Environment(\.device) private var device
    
    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }
    
    var body: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: layout.mediumSpacing), count: layout.gridColumns),
            spacing: layout.mediumSpacing
        ) {
            content
        }
    }
}

// MARK: - Safe Area Adaptive
struct SafeAreaAdaptive<Content: View>: View {
    let content: Content
    let edges: Edge.Set
    
    @Environment(\.device) private var device
    
    init(edges: Edge.Set = .all, @ViewBuilder content: () -> Content) {
        self.edges = edges
        self.content = content()
    }
    
    var body: some View {
        content
            .padding(.top, edges.contains(.top) ? device.safeAreaInsets.top : 0)
            .padding(.bottom, edges.contains(.bottom) ? device.safeAreaInsets.bottom : 0)
            .padding(.leading, edges.contains(.leading) ? device.safeAreaInsets.leading : 0)
            .padding(.trailing, edges.contains(.trailing) ? device.safeAreaInsets.trailing : 0)
    }
}

// MARK: - Preview Helper
#if DEBUG
struct DevicePreview<Content: View>: View {
    let content: Content
    let devices: [DeviceInfo.DeviceType]
    
    init(devices: [DeviceInfo.DeviceType] = [.iPhone, .iPadRegular], @ViewBuilder content: () -> Content) {
        self.devices = devices
        self.content = content()
    }
    
    var body: some View {
        ForEach(devices, id: \.self) { deviceType in
            content
                .environment(\.device, mockDevice(for: deviceType))
                .previewDisplayName(deviceType.previewName)
        }
    }
    
    private func mockDevice(for type: DeviceInfo.DeviceType) -> DeviceInfo {
        let size: CGSize
        let screenSize: DeviceInfo.ScreenSize
        
        switch type {
        case .iPhone:
            size = CGSize(width: 390, height: 844)
            screenSize = .regular
        case .iPadMini:
            size = CGSize(width: 744, height: 1133)
            screenSize = .tablet
        case .iPadRegular:
            size = CGSize(width: 820, height: 1180)
            screenSize = .tablet
        case .iPadPro:
            size = CGSize(width: 1024, height: 1366)
            screenSize = .tablet
        case .unknown:
            size = CGSize(width: 390, height: 844)
            screenSize = .regular
        }
        
        return DeviceInfo(
            type: type,
            screenSize: screenSize,
            physicalSize: size,
            scale: 3.0,
            safeAreaInsets: EdgeInsets(top: 47, leading: 0, bottom: 34, trailing: 0),
            orientation: .portrait
        )
    }
}

extension DeviceInfo.DeviceType {
    var previewName: String {
        switch self {
        case .iPhone: return "iPhone"
        case .iPadMini: return "iPad mini"
        case .iPadRegular: return "iPad"
        case .iPadPro: return "iPad Pro"
        case .unknown: return "Unknown"
        }
    }
}
#endif 