# Xcode Project Setup Guide

This guide walks you through creating the native iOS app for Last Minute Live using the templates and reference files in this `app-swift` folder.

## 🚀 Quick Start

### Step 1: Create New Xcode Project
1. **Open Xcode** (15.0 or later)
2. **File → New → Project**
3. **Choose iOS → App**
4. **Configure your project:**
   - **Product Name**: `Last Minute Live`
   - **Bundle Identifier**: `com.isakpar.lastminutelive`
   - **Language**: Swift
   - **Interface**: SwiftUI
   - **Deployment Target**: iOS 15.0
   - **Use Core Data**: No (we'll add manually if needed)
   - **Include Tests**: Yes

### Step 2: Project Structure Setup
1. **Delete** the default `ContentView.swift` file (we have a better one)
2. **Create folder structure** in Xcode to match our template:
   ```
   LastMinuteLive/
   ├── App/
   ├── Core/
   │   ├── Network/
   │   ├── Auth/
   │   ├── Storage/
   │   └── Utils/
   ├── Features/
   │   ├── Authentication/
   │   ├── Home/
   │   ├── SeatSelection/
   │   ├── Payment/
   │   ├── Profile/
   │   └── Shared/
   ├── Resources/
   └── Supporting Files/
   ```

### Step 3: Copy Template Files
Copy the following files from `templates/` to your Xcode project:

#### Core App Files:
- `App/LastMinuteLiveApp.swift` → Replace the default App file
- `App/ContentView.swift` → Main content view

#### Core Infrastructure:
- `Core/Network/APIClient.swift` → Main networking layer
- `Core/Network/NetworkModels.swift` → All data models
- `Core/Auth/AuthManager.swift` → Authentication manager
- `Core/Auth/KeychainManager.swift` → Secure storage

#### Configuration:
- `Resources/Info.plist.template` → Replace Info.plist content

### Step 4: Add Dependencies
Add these Swift Package Manager dependencies:

1. **Xcode → File → Add Package Dependencies**
2. **Add these URLs:**
   ```
   https://github.com/Alamofire/Alamofire
   https://github.com/stripe/stripe-ios
   https://github.com/google/GoogleSignIn-iOS
   https://github.com/kishikawakatsumi/KeychainAccess
   ```

### Step 5: Configure Capabilities
1. **Signing & Capabilities tab** in project settings
2. **Add capabilities:**
   - **Sign in with Apple**
   - **Keychain Sharing**
   - **Push Notifications**
   - **Background Modes** (Background processing, Remote notifications)

### Step 6: Update Info.plist
1. **Replace Info.plist content** with our template
2. **Update placeholders:**
   - Replace `YOUR_IOS_CLIENT_ID` with actual Google client ID
   - Verify bundle identifier matches your project

### Step 7: Add GoogleService-Info.plist
1. **Download from Google Cloud Console**
2. **Add to Xcode project** in Resources folder
3. **Ensure it's added to target**

## 📱 Implementation Roadmap

### Phase 1: Core Foundation (Week 1-2)
- [x] Project setup and dependencies
- [ ] Complete API client implementation
- [ ] Finish authentication manager
- [ ] Test basic networking

### Phase 2: Authentication Flow (Week 2-3)
- [ ] Login screen implementation
- [ ] Signup screen implementation
- [ ] Email verification flow
- [ ] Apple Sign In integration
- [ ] Biometric authentication

### Phase 3: Core App Features (Week 3-5)
- [ ] Home screen with shows list
- [ ] Show detail screen
- [ ] Seat selection interface
- [ ] Payment integration
- [ ] Booking confirmation

### Phase 4: Advanced Features (Week 5-6)
- [ ] User profile and bookings
- [ ] QR code generation
- [ ] Push notifications
- [ ] Deep linking
- [ ] Performance optimization

## 🔧 Key Implementation Notes

### API Client Usage
```swift
// In your ViewModels, use the API client like this:
@EnvironmentObject var apiClient: APIClient

// Login example
let response = try await apiClient.login(credentials: LoginRequest(
    email: email, 
    password: password
))
```

### Authentication State
```swift
// Access auth state in any view:
@EnvironmentObject var authManager: AuthManager

// Check if user is authenticated
if authManager.isAuthenticated {
    // Show main app
} else {
    // Show login screen
}
```

### Error Handling
```swift
// All API calls use proper Swift error handling
do {
    let shows = try await apiClient.getShows()
    // Handle success
} catch {
    // Handle error
    print("Error: \(error.localizedDescription)")
}
```

## 🎯 Feature Mapping

### From React Native → Swift
- **LoginScreen.tsx** → `Features/Authentication/Views/LoginView.swift`
- **HomeScreen.tsx** → `Features/Home/Views/HomeView.swift`
- **SeatSelectionScreen.tsx** → `Features/SeatSelection/Views/SeatSelectionView.swift`
- **PaymentWebViewScreen.tsx** → `Features/Payment/Views/PaymentView.swift`
- **TicketsScreen.tsx** → `Features/Profile/Views/TicketsView.swift`

### Architecture Pattern
- **MVVM**: Views, ViewModels, Models
- **Combine**: For reactive data flow
- **SwiftUI**: For modern iOS UI
- **Async/Await**: For networking

## 🧪 Testing Strategy

### Unit Tests
```swift
// Test API client methods
func testLogin() async throws {
    let apiClient = APIClient()
    let response = try await apiClient.login(credentials: LoginRequest(
        email: "test@example.com",
        password: "password"
    ))
    XCTAssertTrue(response.success)
}
```

### UI Tests
```swift
// Test critical user flows
func testLoginFlow() throws {
    let app = XCUIApplication()
    app.launch()
    
    app.textFields["Email"].tap()
    app.textFields["Email"].typeText("test@example.com")
    
    app.secureTextFields["Password"].tap()
    app.secureTextFields["Password"].typeText("password")
    
    app.buttons["Login"].tap()
    
    XCTAssertTrue(app.staticTexts["Welcome"].exists)
}
```

## 🚀 Build and Deploy

### Development
```bash
# Build for simulator
⌘+B

# Run on device
⌘+R
```

### Distribution
1. **Archive** (⌘+⇧+B)
2. **Upload to App Store Connect**
3. **TestFlight** for beta testing
4. **App Store** for production

## 🔍 Debug and Monitor

### Logging
- **API calls**: Detailed logging in APIClient
- **Auth flows**: Comprehensive auth logging
- **Errors**: Structured error handling

### Performance
- **Launch time**: Target <2 seconds
- **Memory usage**: Monitor in Instruments
- **Network efficiency**: Batch API calls

## 📚 Reference Files

- `reference-files/react-native-api-reference.md` - Complete API mapping
- `SWIFT_APP_MIGRATION_PLAN.md` - Overall migration strategy
- `README.md` - Project overview

## 🐛 Common Issues

### Build Issues
1. **Missing GoogleService-Info.plist** → Add from Google Console
2. **Signing errors** → Check Apple Developer account
3. **Dependency conflicts** → Use latest stable versions

### Runtime Issues
1. **API connection fails** → Check server URL and network
2. **Authentication fails** → Verify JWT token handling
3. **Keychain errors** → Check entitlements and capabilities

## 📞 Support

- **Migration Questions**: Check `SWIFT_APP_MIGRATION_PLAN.md`
- **API Issues**: Reference `react-native-api-reference.md`
- **Build Problems**: Check Apple Developer documentation

---

**Remember**: Keep the existing `mobile-app` folder untouched until this Swift app is fully tested and deployed in production! This ensures we have a working fallback at all times. 