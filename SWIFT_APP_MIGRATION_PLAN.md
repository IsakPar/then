# Swift iOS App Migration Plan

## Overview
This plan outlines the complete migration from React Native/Expo to a native Swift iOS application, providing access to full iOS capabilities and improved performance.

## Project Structure

### New Folder: `app-swift/`
```
app-swift/
├── LastMinuteLive.xcodeproj
├── LastMinuteLive/
│   ├── App/
│   │   ├── LastMinuteLiveApp.swift
│   │   ├── ContentView.swift
│   │   └── AppDelegate.swift
│   ├── Core/
│   │   ├── Network/
│   │   │   ├── APIClient.swift
│   │   │   ├── APIEndpoints.swift
│   │   │   └── NetworkModels.swift
│   │   ├── Auth/
│   │   │   ├── AuthManager.swift
│   │   │   ├── KeychainManager.swift
│   │   │   └── JWTTokenManager.swift
│   │   ├── Storage/
│   │   │   ├── UserDefaults+Extensions.swift
│   │   │   └── CoreDataManager.swift
│   │   └── Utils/
│   │       ├── Extensions/
│   │       ├── Constants.swift
│   │       └── DateFormatter+Extensions.swift
│   ├── Features/
│   │   ├── Authentication/
│   │   │   ├── Views/
│   │   │   │   ├── LoginView.swift
│   │   │   │   ├── SignupView.swift
│   │   │   │   └── EmailVerificationView.swift
│   │   │   ├── ViewModels/
│   │   │   │   ├── LoginViewModel.swift
│   │   │   │   └── SignupViewModel.swift
│   │   │   └── Models/
│   │   │       └── AuthModels.swift
│   │   ├── Home/
│   │   │   ├── Views/
│   │   │   │   ├── HomeView.swift
│   │   │   │   └── ShowCardView.swift
│   │   │   ├── ViewModels/
│   │   │   │   └── HomeViewModel.swift
│   │   │   └── Models/
│   │   │       └── Show.swift
│   │   ├── SeatSelection/
│   │   │   ├── Views/
│   │   │   │   ├── SeatSelectionView.swift
│   │   │   │   └── SeatMapView.swift
│   │   │   ├── ViewModels/
│   │   │   │   └── SeatSelectionViewModel.swift
│   │   │   └── Components/
│   │   │       ├── InteractiveSeatMap.swift
│   │   │       └── SeatLegend.swift
│   │   ├── Payment/
│   │   │   ├── Views/
│   │   │   │   ├── PaymentView.swift
│   │   │   │   ├── PaymentSuccessView.swift
│   │   │   │   └── PaymentCancelView.swift
│   │   │   ├── ViewModels/
│   │   │   │   └── PaymentViewModel.swift
│   │   │   └── Stripe/
│   │   │       └── StripePaymentManager.swift
│   │   ├── Profile/
│   │   │   ├── Views/
│   │   │   │   ├── AccountView.swift
│   │   │   │   └── TicketsView.swift
│   │   │   └── ViewModels/
│   │   │       ├── AccountViewModel.swift
│   │   │       └── TicketsViewModel.swift
│   │   └── Shared/
│   │       ├── Views/
│   │       │   ├── LoadingView.swift
│   │       │   ├── ErrorView.swift
│   │       │   └── CustomButton.swift
│   │       └── Components/
│   │           ├── NavigationBarModifier.swift
│   │           └── AlertModifier.swift
│   ├── Resources/
│   │   ├── Assets.xcassets
│   │   ├── Info.plist
│   │   └── GoogleService-Info.plist
│   └── Supporting Files/
│       ├── LaunchScreen.storyboard
│       └── Localizable.strings
├── LastMinuteLiveTests/
└── LastMinuteLiveUITests/
```

## Phase 1: Project Setup & Architecture

### 1.1 Create Xcode Project
- **App Name**: Last Minute Live
- **Bundle ID**: `com.isakpar.lastminutelive` (matching current React Native app)
- **Deployment Target**: iOS 15.0+
- **Architecture**: SwiftUI + Combine + MVVM
- **Language**: Swift 5.9+

### 1.2 Dependencies (Swift Package Manager)
```swift
// Package.swift equivalent dependencies
dependencies: [
    .package(url: "https://github.com/Alamofire/Alamofire.git", from: "5.8.0"),
    .package(url: "https://github.com/stripe/stripe-ios", from: "23.0.0"),
    .package(url: "https://github.com/google/GoogleSignIn-iOS", from: "7.0.0"),
    .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "10.0.0"),
    .package(url: "https://github.com/kishikawakatsumi/KeychainAccess", from: "4.2.2")
]
```

### 1.3 Architecture Setup
- **Pattern**: MVVM with Combine for reactive programming
- **Dependency Injection**: Manual DI container
- **Navigation**: SwiftUI NavigationStack (iOS 16+) with backwards compatibility
- **State Management**: @StateObject, @ObservableObject, @Published

## Phase 2: Core Infrastructure

### 2.1 Networking Layer
Replicate the current `ApiClient` functionality:

```swift
// APIClient.swift
class APIClient: ObservableObject {
    private let baseURL = "https://then-production.up.railway.app"
    private let session = URLSession.shared
    @Published var authToken: String?
    
    // Methods to implement:
    // - login, signup, socialAuth
    // - getShows, getShow, getShowSeats
    // - reserveSeats, getBookingConfirmation
    // - getUserBookings, verifyToken
}
```

### 2.2 Authentication System
Implement secure token storage and management:

```swift
// AuthManager.swift
class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    
    private let keychainManager = KeychainManager()
    private let apiClient = APIClient()
    
    // Methods to implement:
    // - login, signup, logout
    // - socialAuth (Apple, Google)
    // - token refresh, verification
}
```

### 2.3 Data Models
Convert TypeScript interfaces to Swift structs:

```swift
// Models/Show.swift
struct Show: Codable, Identifiable {
    let id: String
    let title: String
    let description: String
    let date: String
    let time: String
    let venue_name: String
    let location: String
    let imageUrl: String
    let min_price: Int
    let max_price: Int
    let seatMapId: String
    let seat_pricing: [SeatPricing]
}
```

## Phase 3: Core Screens Implementation

### 3.1 Authentication Screens
- **LoginView**: Email/password login with social auth buttons
- **SignupView**: Registration form with validation
- **EmailVerificationView**: Email confirmation flow

### 3.2 Main App Screens
- **HomeView**: Shows list with search and filtering
- **SeatSelectionView**: Interactive seat map with selection
- **PaymentView**: Stripe payment integration
- **AccountView**: Profile management and settings
- **TicketsView**: User bookings and QR codes

### 3.3 Navigation Structure
```swift
// ContentView.swift
struct ContentView: View {
    @StateObject private var authManager = AuthManager()
    
    var body: some View {
        Group {
            if authManager.isAuthenticated {
                MainTabView()
            } else {
                AuthenticationView()
            }
        }
        .environmentObject(authManager)
    }
}
```

## Phase 4: Advanced Features

### 4.1 Native iOS Features
- **Apple Sign In**: Native integration using AuthenticationServices
- **Face ID/Touch ID**: Biometric authentication for secure login
- **Push Notifications**: Booking confirmations and show reminders
- **Deep Linking**: Direct navigation to specific shows/bookings
- **Widgets**: Show upcoming bookings on home screen
- **Shortcuts**: Siri integration for quick actions

### 4.2 Interactive Seat Map
Custom SwiftUI component using:
- **Canvas**: For high-performance seat rendering
- **Gesture Recognition**: Pan, zoom, tap gestures
- **Core Graphics**: Custom seat shapes and colors
- **Animation**: Smooth selection feedback

```swift
// SeatMapView.swift
struct SeatMapView: UIViewRepresentable {
    @Binding var selectedSeats: Set<String>
    let seats: [Seat]
    let sections: [Section]
    
    func makeUIView(context: Context) -> SeatMapUIView {
        SeatMapUIView(seats: seats, sections: sections)
    }
}
```

### 4.3 Payment Integration
Native Stripe implementation:
- **Apple Pay**: One-tap payments
- **Card Input**: Native card form
- **3D Secure**: Built-in authentication
- **Payment Intent**: Secure server-side confirmation

## Phase 5: Testing & Quality

### 5.1 Unit Tests
- API client functionality
- Authentication flows
- Data model transformations
- Business logic validation

### 5.2 UI Tests
- Critical user flows
- Payment process
- Seat selection accuracy
- Authentication scenarios

### 5.3 Performance Testing
- Launch time optimization
- Memory usage monitoring
- Network request efficiency
- Seat map rendering performance

## Phase 6: Deployment & Distribution

### 6.1 App Store Configuration
- **App Store Connect**: Project setup
- **Certificates**: Distribution certificates
- **Provisioning Profiles**: App Store distribution
- **App Review**: Guidelines compliance

### 6.2 CI/CD Pipeline
- **Xcode Cloud**: Automated building and testing
- **TestFlight**: Beta distribution
- **Fastlane**: Deployment automation

## Migration Strategy

### Parallel Development Approach
1. **Keep React Native app running** for immediate needs
2. **Develop Swift app incrementally** with feature parity
3. **Test extensively** before switching users
4. **Gradual rollout** starting with beta users
5. **Monitor metrics** to ensure improved performance

### Feature Parity Checklist
- [ ] User authentication (email, Google, Apple)
- [ ] Show browsing and search
- [ ] Interactive seat selection
- [ ] Stripe payment processing
- [ ] Booking management
- [ ] Email verification
- [ ] Push notifications
- [ ] Deep linking
- [ ] Offline capability (basic)

### Key Advantages of Native Swift
1. **Performance**: 60fps animations, instant app launch
2. **Native Features**: Face ID, Apple Pay, Widgets, Shortcuts
3. **Better UX**: Platform-consistent design and interactions
4. **App Store Optimization**: Better rankings and discoverability
5. **Maintenance**: Single codebase for iOS, easier debugging
6. **Future-Proof**: Access to latest iOS features immediately

### Timeline Estimate
- **Phase 1-2 (Setup & Core)**: 2-3 weeks
- **Phase 3 (Core Screens)**: 3-4 weeks  
- **Phase 4 (Advanced Features)**: 2-3 weeks
- **Phase 5-6 (Testing & Deployment)**: 1-2 weeks
- **Total**: 8-12 weeks for complete migration

### Risk Mitigation
- **Maintain API compatibility** between apps
- **Implement feature flags** for gradual rollout
- **Keep React Native app** as fallback
- **Extensive testing** on multiple devices
- **Monitor crash reports** and user feedback

This plan provides a comprehensive roadmap for creating a production-ready native Swift iOS app that will significantly improve performance and user experience while leveraging iOS-specific features. 