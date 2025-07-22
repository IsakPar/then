# Xcode Project Setup Guide
## Last Minute Live iOS App Configuration

### Step 1: Add Swift Package Dependencies

1. **Open your LML.xcodeproj in Xcode**

2. **Add Swift Package Manager Dependencies:**
   - Go to `File` → `Add Package Dependencies`
   - Add these packages one by one:

   **Alamofire (Networking)**
   ```
   https://github.com/Alamofire/Alamofire.git
   ```
   - Version: 5.8.0 or later
   - Target: LML

   **Google Sign-In**
   ```
   https://github.com/google/GoogleSignIn-iOS
   ```
   - Version: 7.0.0 or later
   - Target: LML

   **Keychain Access**
   ```
   https://github.com/kishikawakatsumi/KeychainAccess
   ```
   - Version: 4.2.2 or later
   - Target: LML

   **Optional: Stripe iOS SDK (for payments)**
   ```
   https://github.com/stripe/stripe-ios
   ```
   - Version: 23.0.0 or later
   - Target: LML

### Step 2: Project Structure Setup

1. **Create Folder Structure in Xcode:**
   - Right-click on the LML folder in Xcode navigator
   - Select "New Group" and create this structure:

   ```
   LML/
   ├── App/
   │   ├── LastMinuteLiveApp.swift ✅
   │   └── ContentView.swift ✅
   ├── Core/
   │   ├── Network/
   │   │   ├── APIClient.swift ✅
   │   │   └── NetworkModels.swift ✅
   │   └── Auth/
   │       ├── AuthManager.swift ✅
   │       └── KeychainManager.swift ✅
   ├── Features/
   │   ├── Authentication/
   │   │   └── (Future screens)
   │   ├── Home/
   │   │   └── (Future screens)
   │   └── Profile/
   │       └── (Future screens)
   └── Resources/
       ├── Assets.xcassets ✅
       └── Info.plist ✅
   ```

2. **Move Existing Files:**
   - Drag the files we created into their proper groups:
     - `LastMinuteLiveApp.swift` → App/
     - `ContentView.swift` → App/
     - `APIClient.swift` → Core/Network/
     - `NetworkModels.swift` → Core/Network/
     - `AuthManager.swift` → Core/Auth/
     - `KeychainManager.swift` → Core/Auth/

### Step 3: Info.plist Configuration

Add these permissions and configurations to your Info.plist:

```xml
<!-- Network Security -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>localhost</key>
        <dict>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <true/>
        </dict>
        <key>then-production.up.railway.app</key>
        <dict>
            <key>NSExceptionRequiresForwardSecrecy</key>
            <false/>
        </dict>
    </dict>
</dict>

<!-- Face ID Usage -->
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to securely access your Last Minute Live account</string>

<!-- Camera (for QR code scanning) -->
<key>NSCameraUsageDescription</key>
<string>Scan QR codes for ticket verification</string>

<!-- Location (for venue finding) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Find shows and venues near your location</string>

<!-- Push Notifications -->
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>

<!-- URL Schemes for Deep Linking -->
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>lastminutelive</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>lastminutelive</string>
        </array>
    </dict>
</array>

<!-- Google Sign-In URL Scheme (Add your REVERSED_CLIENT_ID) -->
<dict>
    <key>CFBundleURLName</key>
    <string>google</string>
    <key>CFBundleURLSchemes</key>
    <array>
        <string>YOUR_REVERSED_CLIENT_ID_HERE</string>
    </array>
</dict>
```

### Step 4: Build Settings Configuration

1. **iOS Deployment Target:**
   - Set to iOS 15.0 or later
   - Project Settings → Deployment Info → iOS Deployment Target

2. **Swift Version:**
   - Ensure Swift 5.9 or later
   - Build Settings → Swift Compiler - Language → Swift Language Version

3. **Bundle Identifier:**
   - Set to: `com.isakpar.lastminutelive`
   - Project Settings → General → Bundle Identifier

### Step 5: Add GoogleService-Info.plist

1. **Download from Firebase Console:**
   - Go to Firebase Console for your project
   - Download GoogleService-Info.plist
   - Drag it into your Xcode project (make sure to add to target)

2. **If you don't have Firebase setup yet:**
   - Create a temporary GoogleService-Info.plist with basic structure
   - Update the URL scheme in Info.plist with your actual REVERSED_CLIENT_ID

### Step 6: Test Build

1. **Clean and Build:**
   - `Product` → `Clean Build Folder` (Cmd+Shift+K)
   - `Product` → `Build` (Cmd+B)

2. **Fix Any Import Issues:**
   - If you see import errors, make sure packages are properly added
   - Check that all files are added to the LML target

### Step 7: Run on Simulator

1. **Select Simulator:**
   - Choose iPhone 15 Pro or later (for Face ID support)
   - iOS 15.0+ simulator

2. **Run the App:**
   - `Product` → `Run` (Cmd+R)
   - You should see the splash screen, then placeholder content

### Step 8: Test Core Infrastructure

Once the app builds and runs:

1. **Check Console Output:**
   - Look for initialization messages:
     - "🌐 API Client initialized with baseURL..."
     - "🔐 AuthManager initialized - State: ..."
     - "📱 ContentView: Appeared"

2. **Test Navigation:**
   - The app should show tabs: Shows, Tickets, Account
   - Navigation should work between tabs

3. **Test API Connectivity:**
   - The app will try to connect to your backend
   - Make sure your backend is running on localhost:3001

### Step 9: Development Configuration

For development with localhost backend:

1. **Update API Environment:**
   - The APIClient defaults to production
   - For local development, you can modify the init in APIClient.swift temporarily:
   ```swift
   init(environment: APIEnvironment = .development) // Change this line
   ```

2. **Test API Connection:**
   - The app should connect to http://localhost:3001
   - Check network logs in console

### Troubleshooting

**Common Issues:**

1. **Build Errors:**
   - Missing dependencies → Re-add Swift packages
   - Import errors → Check target membership
   - Syntax errors → Verify Swift version (5.9+)

2. **Runtime Errors:**
   - Network errors → Check backend is running
   - Keychain errors → Normal on first run
   - Google Sign-In errors → Check GoogleService-Info.plist

3. **Simulator Issues:**
   - Face ID not available → Use iPhone 15 Pro simulator
   - Deep links not working → Test on device later

### Next Steps After Setup

Once Xcode is configured and the app builds:

1. **Test Authentication Flow** (placeholder UI)
2. **Implement Actual Authentication Screens**
3. **Add Show Listing Views**
4. **Implement Seat Selection**
5. **Add Payment Integration**

---

## Quick Setup Checklist

- [ ] Add Swift Package Dependencies (Alamofire, GoogleSignIn, KeychainAccess)
- [ ] Create folder structure in Xcode
- [ ] Move files to proper groups
- [ ] Configure Info.plist permissions
- [ ] Set iOS deployment target (15.0+)
- [ ] Add GoogleService-Info.plist
- [ ] Build project successfully
- [ ] Run on simulator
- [ ] Verify console logs
- [ ] Test basic navigation

The app should now display the foundation UI with working tab navigation and be ready for feature implementation! 