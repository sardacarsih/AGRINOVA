# App Icons Setup - Agrinova Mobile

## Overview
This document outlines the app icon configuration for the Agrinova Mobile Flutter application.

## Icon Assets

### Source Image
- **Main Icon**: `assets/images/ksk.png`
- **Format**: PNG with transparent background
- **Design**: KSK palm oil company logo with green color scheme
- **Recommended Size**: 1024x1024px (will be automatically resized)

## Configuration

### Flutter Launcher Icons Plugin
The app uses `flutter_launcher_icons` plugin for automatic icon generation:

```yaml
flutter_launcher_icons:
  android: "launcher_icon"
  ios: true
  image_path: "assets/images/ksk.png"
  min_sdk_android: 21
  web:
    generate: true
    image_path: "assets/images/ksk.png"
    background_color: "#ffffff"
    theme_color: "#2E7D32"
  windows:
    generate: true
    image_path: "assets/images/ksk.png"
    icon_size: 48
  macos:
    generate: true
    image_path: "assets/images/ksk.png"
```

## Generated Icons

### Android Icons
**Standard Icons** (all density variants):
- `mipmap-mdpi/launcher_icon.png` (48x48px)
- `mipmap-hdpi/launcher_icon.png` (72x72px)
- `mipmap-xhdpi/launcher_icon.png` (96x96px)
- `mipmap-xxhdpi/launcher_icon.png` (144x144px)
- `mipmap-xxxhdpi/launcher_icon.png` (192x192px)

**Adaptive Icons** (Android API 26+):
- `mipmap-anydpi-v26/launcher_icon.xml`
- `mipmap-anydpi-v26/launcher_icon_round.xml`
- Background color: `#FFFFFF`
- Theme color: `#2E7D32` (Green)

### iOS Icons
**Generated in**: `ios/Runner/Assets.xcassets/AppIcon.appiconset/`
- iPhone: 20x20, 29x29, 40x40, 60x60 (@1x, @2x, @3x)
- iPad: 20x20, 29x29, 40x40, 76x76, 83.5x83.5 (@1x, @2x)
- App Store: 1024x1024 (@1x)

## Color Scheme

### Primary Colors
- **Primary Green**: `#2E7D32`
- **Dark Green**: `#1B5E20`
- **Accent Green**: `#4CAF50`
- **Background**: `#FFFFFF`

### Usage
- Icon background: White (`#FFFFFF`)
- App theme: Green (`#2E7D32`)
- Status bar: Green (`#2E7D32`)

## Installation & Generation

### Prerequisites
1. Ensure `flutter_launcher_icons: ^0.13.1` is in `pubspec.yaml`
2. Source image `assets/images/ksk.png` exists

### Generate Icons
```bash
# Option 1: Using batch script (Windows)
./generate_icons.bat

# Option 2: Manual commands
flutter pub get
flutter pub run flutter_launcher_icons:main
```

### Verification
1. Check generated files in `android/app/src/main/res/mipmap-*/`
2. Check generated files in `ios/Runner/Assets.xcassets/AppIcon.appiconset/`
3. Verify `AndroidManifest.xml` references `@mipmap/launcher_icon`
4. Verify `Info.plist` has correct app name: "Agrinova Mobile"

## Platform-Specific Configuration

### Android
- **Manifest**: Uses `@mipmap/launcher_icon`
- **Adaptive Icons**: Supported from API 26+
- **Minimum SDK**: 21 (Android 5.0 Lollipop)

### iOS
- **Bundle Name**: `agrinova_mobile`
- **Display Name**: `Agrinova Mobile`
- **Icon Asset Catalog**: `AppIcon.appiconset`

## Troubleshooting

### Common Issues
1. **Icons not updating**: Clean build folder and rebuild
2. **Wrong icon showing**: Check AndroidManifest.xml icon reference
3. **iOS icons missing**: Verify Info.plist and Assets.xcassets structure

### Clean Build Commands
```bash
# Flutter clean
flutter clean
flutter pub get

# Android clean (if using Android Studio)
cd android && ./gradlew clean

# iOS clean (if using Xcode)
cd ios && rm -rf build/
```

## Security & Privacy

### Permissions (icons-related)
The app icons setup includes privacy configuration:
- Camera usage description (for icon display in photo permissions)
- Location usage description (for GPS-based icon contexts)
- Biometric authentication description (for secure icon access)

## Maintenance

### Updating Icons
1. Replace `assets/images/ksk.png` with new source image
2. Run `flutter pub run flutter_launcher_icons:main`
3. Test on both Android and iOS devices
4. Commit updated generated files

### Version Control
**Include in Git**:
- Source image: `assets/images/ksk.png`
- Configuration: `pubspec.yaml`
- Generated Android icons: `android/app/src/main/res/mipmap-*/`
- Generated iOS icons: `ios/Runner/Assets.xcassets/`

## Quality Guidelines

### Icon Design
- **Format**: PNG with transparency
- **Minimum Size**: 1024x1024px
- **Style**: Flat design with clear branding
- **Background**: Transparent or white
- **Content**: Avoid text, use symbols/logos

### Brand Consistency
- Use official KSK palm oil logo
- Maintain green color scheme (#2E7D32)
- Ensure readability at small sizes (16x16px)
- Test on light and dark system themes

## Testing Checklist

### Android Testing
- [ ] Icons display correctly in launcher
- [ ] Adaptive icons work on API 26+ devices
- [ ] Icons scale properly across all densities
- [ ] App name "Agrinova Mobile" displays correctly

### iOS Testing
- [ ] Icons display correctly on home screen
- [ ] Icons work on all supported device sizes
- [ ] App Store icon (1024x1024) displays correctly
- [ ] Settings app shows correct icon and name

### Cross-Platform Testing
- [ ] Icons maintain consistent branding
- [ ] Color scheme matches app theme
- [ ] Icons are crisp at all sizes
- [ ] No pixelation or artifacts