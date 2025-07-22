# 🚀 Complete Migration Plan - LML-Clean → LML

## 🎯 **Goal:**
Move all working files from `LML-Clean` (working project) to `LML` (original project location) and clean up dependencies.

## 📋 **Two-Project Situation:**
- **`/LML/`** - Original project (BROKEN - heavy dependencies, build issues)
- **`/LML-Clean/`** - Working project (CLEAN - logo, navigation, show cards working)

## 🧹 **Phase 1: Clean the Original LML Project**

### **Step 1: Remove All Heavy Dependencies from LML Project**
```bash
# 1. Open original LML project
open /Users/isakparild/Desktop/theone/LML/LML.xcodeproj
```

**In Xcode (LML project):**
1. **Project Settings** → **LML Target** → **Package Dependencies**
2. **Remove ALL packages** (click `-` for each):
   - ❌ Firebase
   - ❌ Stripe 
   - ❌ Alamofire
   - ❌ AlamofireDynamic
   - ❌ GoogleSignIn
   - ❌ KeychainAccess

### **Step 2: Clear All Source Files from LML**
```bash
# Back up the original (just in case)
mv /Users/isakparild/Desktop/theone/LML /Users/isakparild/Desktop/theone/LML-BACKUP

# Create fresh LML directory
mkdir -p /Users/isakparild/Desktop/theone/LML/LML/LML
```

### **Step 3: Copy Xcode Project File**
```bash
# Copy the project structure
cp -r /Users/isakparild/Desktop/theone/LML-BACKUP/LML.xcodeproj /Users/isakparild/Desktop/theone/LML/
cp -r /Users/isakparild/Desktop/theone/LML-BACKUP/LMLTests /Users/isakparild/Desktop/theone/LML/
cp -r /Users/isakparild/Desktop/theone/LML-BACKUP/LMLUITests /Users/isakparild/Desktop/theone/LML/
```

## 📂 **Phase 2: Copy Working Files from LML-Clean**

### **Step 4: Copy All Working Source Files**
```bash
# Copy the working app structure
cp -r /Users/isakparild/Desktop/theone/LML-Clean/LML/LML/* /Users/isakparild/Desktop/theone/LML/LML/LML/
```

**This copies:**
- ✅ `app/LMLCleanApp.swift` (working app entry)
- ✅ `views/` folder (ContentView, HomeView, AccountView, TicketsView)
- ✅ `models/Show.swift` (show data)
- ✅ `Assets.xcassets/` (logo + all show images)

### **Step 5: Update Main App File Name**
```bash
# Rename to match original project expectations
cd /Users/isakparild/Desktop/theone/LML/LML/LML/app
mv LMLCleanApp.swift LMLApp.swift
```

**Update the struct name in LMLApp.swift:**
```swift
// Change from:
struct LMLCleanApp: App {

// To:
struct LMLApp: App {
```

## 🛠️ **Phase 3: Fix Project Configuration**

### **Step 6: Open Migrated Project**
```bash
open /Users/isakparild/Desktop/theone/LML/LML.xcodeproj
```

### **Step 7: Fix Bundle Identifier & Signing**
**In Xcode:**
1. **Project Settings** → **LML Target** → **General**
2. **Bundle Identifier:** Change from `lml-tickets.com.LML` to `com.isak.LML`
3. **Signing & Capabilities** → **Team:** Set to "None" or personal Apple ID

### **Step 8: Clean All Build Data**
```bash
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData/LML*

# In Xcode
Product → Clean Build Folder (Cmd+Shift+K)
```

## ✅ **Phase 4: Test the Migration**

### **Step 9: Build & Run**
**In Xcode:**
```bash
Product → Build (Cmd+B)
Product → Run (Cmd+R)
```

**Expected Results:**
- ✅ **Build succeeds** (no dependency conflicts)
- ✅ **Logo appears** (bigger size, properly styled)
- ✅ **Show cards** display with real images
- ✅ **Bottom navigation** works (Account, Home, Tickets)
- ✅ **No passcode prompts**

## 📁 **Final File Structure:**
```
/LML/
├── LML.xcodeproj                    ✅ (Original project, cleaned)
├── LML/LML/
│   ├── app/
│   │   └── LMLApp.swift            ✅ (Renamed from LMLCleanApp.swift)
│   ├── views/
│   │   ├── ContentView.swift       ✅ (Working navigation)
│   │   ├── HomeView.swift          ✅ (Logo + show cards)
│   │   ├── AccountView.swift       ✅ (Placeholder)
│   │   └── TicketsView.swift       ✅ (Placeholder)
│   ├── models/
│   │   └── Show.swift              ✅ (Mock show data)
│   └── Assets.xcassets/            ✅ (Logo + all show images)
├── LMLTests/                       ✅ (Original test structure)
└── LMLUITests/                     ✅ (Original UI test structure)
```

## 🗑️ **Phase 5: Cleanup (Optional)**

### **Step 10: Remove Old Projects**
**Once migration is confirmed working:**
```bash
# Remove the broken backup
rm -rf /Users/isakparild/Desktop/theone/LML-BACKUP

# Remove the temporary clean project
rm -rf /Users/isakparild/Desktop/theone/LML-Clean
```

## 🎯 **Benefits After Migration:**
- ✅ **Original project location** preserved
- ✅ **No heavy dependencies** (fast builds)
- ✅ **Working logo & navigation** 
- ✅ **Real show images** displaying
- ✅ **Clean codebase** for complex seat map
- ✅ **No passcode prompts**
- ✅ **Ready for production features**

## 🚨 **If Migration Fails:**
**Rollback plan:**
```bash
# Restore original if needed
mv /Users/isakparild/Desktop/theone/LML-BACKUP /Users/isakparild/Desktop/theone/LML
```

**Contact me with error messages and I'll provide specific fixes!**

## 🎉 **Success Criteria:**
**Migration complete when:**
- 🏗️ **Builds without errors** in original LML project
- 🎭 **Logo displays** (bigger size)
- 📱 **Navigation works** (3 tabs)
- 🖼️ **Show images** load correctly
- 🔐 **No passcode prompts** during build

**This gives you your original project back, but clean and working!** ✨ 