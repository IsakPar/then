# Getting Bundle ID from Xcode

## 🎯 **Goal**
Connect your freshly pushed GitHub repo to Xcode to get the bundle ID needed for Google OAuth setup.

## 📋 **Prerequisites**
- ✅ Code pushed to GitHub (completed)
- ✅ Xcode installed on your Mac
- ✅ Apple Developer account (free account works)

## 🔧 **Step-by-Step Instructions**

### Step 1: Clone Your Repo in Xcode
1. **Open Xcode**
2. **File** → **Clone Repository**
3. **Enter your GitHub URL**: `https://github.com/IsakPar/then.git`
4. **Select branch**: `main` (everything is now on main branch)
5. **Choose location** and click **Clone**

### Step 2: Open the Mobile App
1. **Navigate to the mobile-app folder** in your cloned repository
2. **Open** `mobile-app/ios/YourApp.xcworkspace` (if it exists)
3. **OR** create a new iOS project:
   - **File** → **New** → **Project**
   - **Select iOS** → **App**
   - **Product Name**: `LastMinuteLive`
   - **Bundle Identifier**: This will be auto-generated (e.g., `com.yourname.lastminutelive`)

### Step 3: Find Your Bundle ID
1. **Select your project** in the navigator (top-left)
2. **Select your target** (under TARGETS)
3. **Go to General tab**
4. **Find "Bundle Identifier"** - this is what you need!

**Example Bundle ID formats:**
- `com.yourname.lastminutelive`
- `com.yourcompany.lastminutelive`
- `com.isakparild.lastminutelive`

### Step 4: Copy Bundle ID
1. **Copy the Bundle Identifier** (e.g., `com.yourname.lastminutelive`)
2. **Save it** - you'll need this for Google OAuth setup

### Step 5: Update Your Mobile App Configuration
Once you have your Bundle ID, update your `mobile-app/app.json`:

```json
{
  "expo": {
    "name": "LastMinuteLive",
    "slug": "lastminutelive",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "YOUR_BUNDLE_ID_HERE"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "package": "com.yourname.lastminutelive"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    }
  }
}
```

## 🔧 **Alternative Method: Using Expo CLI**

If you prefer using Expo CLI:

```bash
# Navigate to mobile-app directory
cd mobile-app

# Install Expo CLI if not installed
npm install -g @expo/cli

# Generate bundle identifier
expo prebuild

# Check the generated bundle ID in mobile-app/ios/YourApp.xcodeproj
```

## 🎯 **What to Do Next**

Once you have your Bundle ID:

1. **Update** `mobile-app/app.json` with your bundle ID
2. **Run** the Google OAuth setup from `GOOGLE_AUTH_AND_EMAIL_SETUP.md`
3. **Add your bundle ID** to Google Cloud Console OAuth credentials
4. **Configure** your mobile app authentication

## 🚨 **Important Notes**

- **Bundle ID must be unique** across all iOS apps
- **Use reverse domain notation** (e.g., `com.yourname.appname`)
- **Cannot be changed easily** once published to App Store
- **Save your Bundle ID** - you'll need it for various configurations

## 🆘 **If You Need Help**

If you encounter issues:
1. **Check** that your Apple Developer account is properly set up
2. **Ensure** Xcode is updated to latest version
3. **Try** creating a new iOS project with a simple Bundle ID
4. **Contact** me with the specific error message

---

**Next Step**: Once you have your Bundle ID, we'll complete the Google OAuth setup! 🎉 