# Resources Folder

## Seat Map JSON Files

This folder contains seat map data files for different shows:

- `SeatMaps/lion-king-lyceum.json` - Lion King theater layout
- (Future: hamilton-victoria-palace.json, phantom-her-majestys.json, etc.)

## How to Add to Xcode

1. **Drag this entire `Resources` folder into your Xcode project**
2. **Select "Create folder references"** (not "Create groups")
3. **Ensure "Add to target"** is checked for your main app target

## Usage in Code

```swift
// Load Lion King seat map
Task {
    await viewModel.loadShow("lion-king")
}
```

## JSON Format

Each seat map JSON follows this structure:
- `layout`: Stage position and viewport settings
- `sections`: Theater sections with colors and pricing
- `seats`: Individual seat coordinates and status
- `pricing`: Price tiers and fees
- `accessibility_features`: Wheelchair access info

The `SeatMapJSONService` automatically converts these JSON files to `TheaterSeat` models that work with your existing iOS seat map components. 