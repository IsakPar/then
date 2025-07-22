# 🤖 Automated Migration Script

## ⚡ **Quick Terminal Migration**

**If you prefer to run commands instead of manual steps:**

### **Option 1: Full Automated Script**
```bash
#!/bin/bash

echo "🚀 Starting LML-Clean → LML migration..."

# Navigate to project root
cd /Users/isakparild/Desktop/theone

# Step 1: Backup original LML project
echo "📦 Backing up original LML project..."
mv LML LML-BACKUP

# Step 2: Create new LML directory structure
echo "📁 Creating clean LML structure..."
mkdir -p LML/LML/LML

# Step 3: Copy Xcode project files (without dependencies)
echo "📋 Copying project structure..."
cp -r LML-BACKUP/LML.xcodeproj LML/
cp -r LML-BACKUP/LMLTests LML/ 2>/dev/null || true
cp -r LML-BACKUP/LMLUITests LML/ 2>/dev/null || true

# Step 4: Copy all working files from LML-Clean
echo "✅ Copying working files..."
cp -r LML-Clean/LML/LML/* LML/LML/LML/

# Step 5: Rename main app file
echo "🔄 Renaming app file..."
cd LML/LML/LML/app
mv LMLCleanApp.swift LMLApp.swift

# Step 6: Update app struct name
echo "✏️ Updating app struct name..."
sed -i '' 's/struct LMLCleanApp: App/struct LMLApp: App/g' LMLApp.swift

# Step 7: Clean build data
echo "🧹 Cleaning build data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/LML*

echo "✨ Migration complete! Now open LML/LML.xcodeproj in Xcode"
echo "📱 Remember to:"
echo "   1. Fix Bundle ID (com.isak.LML)"
echo "   2. Set Team to None"
echo "   3. Remove any remaining dependencies"
echo "   4. Build & Run!"
```

### **Option 2: Step-by-Step Commands**
**Run these one by one:**

```bash
# 1. Navigate to project root
cd /Users/isakparild/Desktop/theone

# 2. Backup original
mv LML LML-BACKUP

# 3. Create new structure
mkdir -p LML/LML/LML

# 4. Copy project files
cp -r LML-BACKUP/LML.xcodeproj LML/
cp -r LML-BACKUP/LMLTests LML/
cp -r LML-BACKUP/LMLUITests LML/

# 5. Copy working source files
cp -r LML-Clean/LML/LML/* LML/LML/LML/

# 6. Rename main app file
cd LML/LML/LML/app
mv LMLCleanApp.swift LMLApp.swift

# 7. Update struct name in file
sed -i '' 's/struct LMLCleanApp: App/struct LMLApp: App/g' LMLApp.swift

# 8. Clean build data
rm -rf ~/Library/Developer/Xcode/DerivedData/LML*

# 9. Open in Xcode
open ../../../LML.xcodeproj
```

### **Option 3: Manual Verification**
**After running script, verify these files exist:**

```bash
# Check structure
ls -la /Users/isakparild/Desktop/theone/LML/
ls -la /Users/isakparild/Desktop/theone/LML/LML/LML/

# Should see:
# ✅ LML.xcodeproj
# ✅ LML/LML/app/LMLApp.swift
# ✅ LML/LML/views/ (folder)
# ✅ LML/LML/models/Show.swift
# ✅ LML/LML/Assets.xcassets/ (folder)
```

## 🎯 **After Migration:**

### **In Xcode:**
1. **Open:** `LML/LML.xcodeproj`
2. **Project Settings** → **LML Target**
3. **Remove dependencies** if any remain
4. **Fix Bundle ID:** `com.isak.LML`
5. **Set Team:** None
6. **Build & Run**

## ✅ **Success Check:**
```bash
# If this shows your files, migration worked:
find /Users/isakparild/Desktop/theone/LML -name "*.swift" -type f
```

**Should output:**
```
/Users/.../LML/LML/LML/app/LMLApp.swift
/Users/.../LML/LML/LML/views/ContentView.swift
/Users/.../LML/LML/LML/views/HomeView.swift
/Users/.../LML/LML/LML/views/AccountView.swift
/Users/.../LML/LML/LML/views/TicketsView.swift
/Users/.../LML/LML/LML/models/Show.swift
```

## 🚨 **If Script Fails:**
```bash
# Restore original and try manual approach
mv /Users/isakparild/Desktop/theone/LML-BACKUP /Users/isakparild/Desktop/theone/LML
```

**This automated approach does 90% of the migration work for you!** 🤖✨ 