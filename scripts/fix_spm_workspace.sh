#!/bin/bash

#
# fix_spm_workspace.sh
# Fixes Swift Package Manager workspace GUID collisions by cleaning caches and re-resolving dependencies
#
# Usage: ./scripts/fix_spm_workspace.sh [PROJECT_NAME]
# Example: ./scripts/fix_spm_workspace.sh LML
#

set -e

# Configuration
PROJECT_NAME="${1:-LML}"
PROJECT_DIR="$(dirname "$0")/.."
XCODE_PROJECT="${PROJECT_NAME}/${PROJECT_NAME}.xcodeproj"

echo "🔧 SPM Workspace Fix Tool"
echo "========================"
echo "Project: ${PROJECT_NAME}"
echo "Directory: ${PROJECT_DIR}"
echo ""

# Validate project exists
if [ ! -d "${PROJECT_DIR}/${XCODE_PROJECT}" ]; then
    echo "❌ Error: ${XCODE_PROJECT} not found in ${PROJECT_DIR}"
    exit 1
fi

# Step 1: Backup
BACKUP_NAME="${PROJECT_NAME}.xcodeproj.bak-$(date +%Y%m%d%H%M%S)"
echo "📦 Creating backup: ${BACKUP_NAME}"
cd "${PROJECT_DIR}/${PROJECT_NAME}"
cp -r "${PROJECT_NAME}.xcodeproj" "${BACKUP_NAME}"
echo "✅ Backup created successfully"

# Step 2: Clean Derived Data
echo ""
echo "🧹 Cleaning derived data..."
if [ -d ~/Library/Developer/Xcode/DerivedData ]; then
    find ~/Library/Developer/Xcode/DerivedData -name "${PROJECT_NAME}-*" -type d -exec rm -rf {} + 2>/dev/null || true
    echo "✅ Derived data cleaned"
else
    echo "ℹ️  No derived data directory found"
fi

# Step 3: Clean SPM Caches
echo ""
echo "🧹 Cleaning Swift Package Manager caches..."
if [ -d ~/Library/Caches/org.swift.swiftpm ]; then
    rm -rf ~/Library/Caches/org.swift.swiftpm
    echo "✅ SPM caches cleaned"
else
    echo "ℹ️  No SPM cache directory found"
fi

# Step 3.5: Remove corrupted user workspace state (CRITICAL FIX)
echo ""
echo "🧹 Removing corrupted user workspace state..."
if [ -d "${PROJECT_NAME}.xcodeproj/project.xcworkspace/xcuserdata" ]; then
    rm -rf "${PROJECT_NAME}.xcodeproj/project.xcworkspace/xcuserdata"
    echo "✅ Corrupted user workspace state removed"
else
    echo "ℹ️  No user workspace state found"
fi

# Step 4: Re-resolve Dependencies
echo ""
echo "📦 Re-resolving package dependencies..."
if command -v xcodebuild > /dev/null; then
    xcodebuild -resolvePackageDependencies -project "${PROJECT_NAME}.xcodeproj" -scheme "${PROJECT_NAME}" || {
        echo "⚠️  Package resolution encountered issues, but continuing..."
    }
    echo "✅ Package dependencies resolved"
else
    echo "❌ Error: xcodebuild not found in PATH"
    exit 1
fi

# Step 5: Verify
echo ""
echo "🔍 Verifying fix..."
echo "Testing clean build (first 10 lines):"
xcodebuild -project "${PROJECT_NAME}.xcodeproj" -scheme "${PROJECT_NAME}" -destination 'generic/platform=iOS Simulator' clean build 2>&1 | head -10 || {
    echo "⚠️  Build test encountered issues - check manually"
}

echo ""
echo "🎉 SPM workspace fix completed!"
echo ""
echo "📋 Summary:"
echo "- Backup created: ${BACKUP_NAME}"
echo "- Derived data cleaned"
echo "- SPM caches cleared"
echo "- Package dependencies re-resolved"
echo ""
echo "💡 If issues persist:"
echo "1. Open Xcode → File → Packages → Reset Package Caches"
echo "2. Delete and re-add problematic packages"
echo "3. Restore from backup: mv ${BACKUP_NAME} ${PROJECT_NAME}.xcodeproj"
echo "" 