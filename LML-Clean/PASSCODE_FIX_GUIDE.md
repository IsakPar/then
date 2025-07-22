# 🔐 Fix Passcode Prompt Issue

## 🚨 **Problem:**
- **Build asks for computer passcode** (doesn't happen in other projects)
- **Code signing/keychain access issue** specific to this project

## 🎯 **Root Cause:**
**This Xcode project has incorrect code signing settings that require keychain access**

## 📋 **Fix Steps:**

### **Step 1: Fix Code Signing Settings**
1. **Open:** `LML-Clean/LML.xcodeproj`
2. **Select:** LML project → LML target
3. **Go to:** "Signing & Capabilities" tab
4. **Change these settings:**

   **Before (Problematic):**
   ```
   ☑️ Automatically manage signing
   Team: 24F2S7J9BU (or similar)
   Provisioning Profile: Automatic
   ```

   **After (Fixed):**
   ```
   ☑️ Automatically manage signing  
   Team: None (or your personal team)
   Bundle Identifier: com.yourname.LML (change from lml-tickets.com.LML)
   ```

### **Step 2: Change Bundle Identifier**
**Current problematic identifier:** `lml-tickets.com.LML`
**Change to simple identifier:** `com.yourname.LML` or `LML.simple`

1. **Project Settings** → **General** tab
2. **Bundle Identifier:** Change to something simple like:
   - `com.isak.LML`
   - `LML.test` 
   - `com.local.LML`

### **Step 3: Set Team to None (For Development)**
1. **Signing & Capabilities** tab
2. **Team:** Select "None" or "Add Account..." for personal
3. **Provisioning Profile:** Should show "iOS Team Provisioning Profile"

### **Step 4: Alternative - Use Personal Team**
**If you want to keep signing:**
1. **Xcode** → **Preferences** → **Accounts**
2. **Add Apple ID** (if not already added)
3. **Select your personal team** instead of `24F2S7J9BU`

### **Step 5: Clean After Changes**
```bash
# Clean build folder
Product → Clean Build Folder (Cmd+Shift+K)

# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/LML*
```

## ✅ **Expected Result:**
- 🚫 **No more passcode prompts**
- 🏗️ **Build works normally** 
- 📱 **Run on simulator** without keychain access
- ⚡ **Same as other projects**

## 🎯 **Why This Happens:**
- **Bundle ID conflict** with existing certificates
- **Team settings** requiring enterprise certificates  
- **Provisioning profile** trying to access keychain
- **This project** has different signing than your others

## 🚨 **If Still Prompting:**
**Try this nuclear option:**
1. **Delete all certificates** in Keychain Access (Developer section)
2. **Xcode** → **Preferences** → **Accounts** → **Download Manual Profiles**
3. **Set Team to None** for development builds

**This will make the project behave like your other projects!** 🔓 