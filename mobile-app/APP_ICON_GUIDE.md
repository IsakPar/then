# App Icon Setup Guide - Last Minute Live

## Current Configuration

✅ **App icon set to**: `./assets/lml-favicon.png`

The lml-favicon.png file is now configured as the main app icon for:
- **iOS App Store** - Main app icon
- **Android Google Play** - Adaptive icon foreground
- **Web** - Favicon
- **Splash Screen** - Launch screen icon

## App Store Requirements

### iOS App Store
- **Required sizes**: 1024×1024px (for App Store)
- **Format**: PNG without alpha channel
- **Background**: The yellow background in lml-favicon.png works well
- **Current setup**: ✅ Configured in app.json

### Google Play Store
- **Required sizes**: 512×512px (for Google Play Console)
- **Adaptive icon**: Uses lml-favicon.png as foreground
- **Background color**: Set to `#F7D92A` (matching the yellow theme)
- **Current setup**: ✅ Configured in app.json

## Design Guidelines

### Current Icon Features ✅
- **Simple and recognizable**: Clock symbol is clear
- **High contrast**: Dark elements on yellow background
- **Scalable**: Works well at different sizes
- **Brand consistent**: Matches LastMinuteLive branding

### App Store Best Practices ✅
- **No text in icon**: ✅ Uses symbol only
- **Rounded corners**: ✅ Handled automatically by platforms
- **Consistent style**: ✅ Matches app theme
- **Memorable design**: ✅ Distinctive clock design

## Testing Your Icon

### Before Store Submission
1. **Preview on device**: Test how it looks on actual devices
2. **Size testing**: Ensure clarity at small sizes (like in folders)
3. **Background testing**: Test on different wallpapers
4. **Platform consistency**: Check appearance on both iOS and Android

### Expo Tools
```bash
# Preview your app with new icon
npx expo start

# Generate all required icon sizes
npx expo install expo-asset
```

## Production Checklist

### iOS App Store
- [ ] Icon displays correctly in Expo Go
- [ ] No transparency or alpha channels
- [ ] 1024×1024px version available
- [ ] Looks good at all sizes (29px to 1024px)

### Google Play Store  
- [ ] Adaptive icon looks good with different backgrounds
- [ ] 512×512px version available
- [ ] Icon works in circular, square, and squircle masks
- [ ] Background color complements the icon

### Web/PWA
- [ ] Favicon displays correctly in browsers
- [ ] Works well at 16×16px, 32×32px, 48×48px
- [ ] Readable in browser tabs

## Icon Variations (for future)

If you need different versions later:
- **Monochrome version**: For special iOS features
- **High contrast version**: For accessibility
- **Alternative backgrounds**: For seasonal promotions

## File Structure
```
mobile-app/
├── assets/
│   ├── lml-favicon.png          ← Main icon (current)
│   ├── icon.png                 ← Old icon (can remove)
│   ├── adaptive-icon.png        ← Old adaptive (can remove)
│   ├── favicon.png              ← Old favicon (can remove)
│   └── splash-icon.png          ← Old splash (can remove)
└── app.json                     ← Updated configuration
```

## Next Steps

1. **Test the app**: Run `npx expo start` to see the new icon
2. **Preview on device**: Use Expo Go to test on actual devices
3. **Store submission**: Icon is ready for App Store and Google Play
4. **Cleanup**: Remove old icon files if no longer needed

Your app now has a professional, store-ready icon that represents the LastMinuteLive brand! 🎭⏰ 