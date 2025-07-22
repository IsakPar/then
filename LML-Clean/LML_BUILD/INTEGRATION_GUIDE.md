# 🚀 LML Clean Files - Manual Xcode Integration Guide

## 📂 What's in LML_BUILD:

```
LML_BUILD/
├── App/
│   └── LMLCleanApp.swift           # Main app entry point
├── Views/
│   ├── ContentView.swift           # Tab navigation (3 tabs)
│   ├── HomeView.swift              # Beautiful home page with show cards
│   ├── TicketsView.swift           # Placeholder tickets screen
│   └── AccountView.swift           # Placeholder account screen
├── Models/
│   └── Show.swift                  # Show model + 6 mock theater shows
├── Services/                       # (Empty - ready for expansion)
├── GoogleService-Info.plist        # Firebase configuration
├── Info.plist                      # Custom iOS app configuration
└── INTEGRATION_GUIDE.md           # This file
```

## 🛠️ Manual Integration Steps:

### Step 1: Open Your Xcode Project
- Open your existing Xcode project
- Make sure you're in the project navigator

### Step 2: Replace Main App File
1. **Delete** the default app file (probably `LMLApp.swift` or similar)
2. **Drag** `App/LMLCleanApp.swift` into your project
3. **Choose**: "Copy items if needed" ✅
4. **Add to target**: Make sure your app target is selected ✅

### Step 3: Replace ContentView
1. **Replace** the default `ContentView.swift` with our `Views/ContentView.swift`
2. Our version has bottom tab navigation (Home, Tickets, Account)

### Step 4: Add New View Files
**Drag these files into your project:**
- `Views/HomeView.swift` (Main page with show cards)
- `Views/TicketsView.swift` (Placeholder)
- `Views/AccountView.swift` (Placeholder)

**For each file:**
- ✅ Copy items if needed
- ✅ Add to your app target

### Step 5: Add Models
**Drag** `Models/Show.swift` into your project
- Contains Show struct + 6 mock theater shows
- Ready for your complex seat map integration

### Step 6: Add Firebase Configuration
**Drag** `GoogleService-Info.plist` into your project
- ✅ Copy items if needed
- ✅ Add to your app target
- **Important**: Must be in the app bundle, not just the project

### Step 7: Update Info.plist (Optional)
You can either:
- **Replace** your Info.plist with our custom one, OR
- **Keep** your existing one (should work fine)

### Step 8: Add Firebase Dependency
1. **File → Add Package Dependencies**
2. **URL**: `https://github.com/firebase/firebase-ios-sdk`
3. **Add Product**: `FirebaseCore`
4. **Click**: Add Package

### Step 9: Test Build
1. **Select** iPhone simulator
2. **Press** `Cmd + R` to build and run
3. **Expected result**: Beautiful home page with 6 theater show cards!

## 🎯 What You Should See:

### Home Tab:
- 🎭 Theater logo at top
- "Last Minute Live" title
- Grid of 6 show cards:
  - Hamilton (Victoria Palace Theatre) - From £45
  - The Lion King (Lyceum Theatre) - From £35
  - Phantom of the Opera (Her Majesty's Theatre) - From £25
  - Chicago (Phoenix Theatre) - From £30
  - Wicked (Apollo Victoria Theatre) - From £40
  - Mamma Mia! (Novello Theatre) - From £28

### Bottom Navigation:
- **Home** tab (house icon) - Show cards page
- **Tickets** tab (ticket icon) - Placeholder
- **Account** tab (person icon) - Placeholder with sign-in

## 🔧 Troubleshooting:

### Firebase Errors:
- Make sure `GoogleService-Info.plist` is added to app target
- Check Firebase dependency is properly added

### Build Errors:
- Make sure all Swift files are added to your app target
- Check that import statements work (SwiftUI, FirebaseCore)

### Missing Show Cards:
- Make sure `Show.swift` is included in build
- Check that `mockShows` array is accessible

## ✅ Success Indicators:
- App builds without errors
- Home page shows logo + 6 show cards
- Can tap between tabs (Home, Tickets, Account)
- Show cards display with proper formatting
- Console shows "🔥 Firebase configured" on launch

## 🚀 Next: Complex Seat Map
Once this is working, we'll add navigation from show cards to your complex seat selection screen!

---
**Ready for integration!** 🎉 