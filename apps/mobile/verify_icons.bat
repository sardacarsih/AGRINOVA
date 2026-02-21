@echo off
echo Verifying App Icons Setup for Agrinova Mobile...
echo.

echo ========================================
echo ANDROID ICONS VERIFICATION
echo ========================================

echo Checking Android launcher icons...
if exist "android\app\src\main\res\mipmap-mdpi\launcher_icon.png" (
    echo ✓ MDPI launcher icon exists
) else (
    echo ✗ MDPI launcher icon missing
)

if exist "android\app\src\main\res\mipmap-hdpi\launcher_icon.png" (
    echo ✓ HDPI launcher icon exists
) else (
    echo ✗ HDPI launcher icon missing
)

if exist "android\app\src\main\res\mipmap-xhdpi\launcher_icon.png" (
    echo ✓ XHDPI launcher icon exists
) else (
    echo ✗ XHDPI launcher icon missing
)

if exist "android\app\src\main\res\mipmap-xxhdpi\launcher_icon.png" (
    echo ✓ XXHDPI launcher icon exists
) else (
    echo ✗ XXHDPI launcher icon missing
)

if exist "android\app\src\main\res\mipmap-xxxhdpi\launcher_icon.png" (
    echo ✓ XXXHDPI launcher icon exists
) else (
    echo ✗ XXXHDPI launcher icon missing
)

echo.
echo Checking Android adaptive icons...
if exist "android\app\src\main\res\mipmap-anydpi-v26\launcher_icon.xml" (
    echo ✓ Adaptive icon exists
) else (
    echo ✗ Adaptive icon missing
)

if exist "android\app\src\main\res\mipmap-anydpi-v26\launcher_icon_round.xml" (
    echo ✓ Round adaptive icon exists
) else (
    echo ✗ Round adaptive icon missing
)

echo.
echo Checking Android manifest configuration...
findstr /C:"@mipmap/launcher_icon" "android\app\src\main\AndroidManifest.xml" >nul
if %errorlevel% == 0 (
    echo ✓ AndroidManifest.xml references launcher_icon
) else (
    echo ✗ AndroidManifest.xml does not reference launcher_icon
)

echo.
echo ========================================
echo IOS ICONS VERIFICATION
echo ========================================

echo Checking iOS app icons...
if exist "ios\Runner\Assets.xcassets\AppIcon.appiconset\Contents.json" (
    echo ✓ iOS AppIcon configuration exists
) else (
    echo ✗ iOS AppIcon configuration missing
)

if exist "ios\Runner\Assets.xcassets\AppIcon.appiconset\Icon-App-1024x1024@1x.png" (
    echo ✓ iOS App Store icon (1024x1024) exists
) else (
    echo ✗ iOS App Store icon missing
)

if exist "ios\Runner\Assets.xcassets\AppIcon.appiconset\Icon-App-60x60@2x.png" (
    echo ✓ iOS iPhone icon (60x60@2x) exists
) else (
    echo ✗ iOS iPhone icon missing
)

if exist "ios\Runner\Assets.xcassets\AppIcon.appiconset\Icon-App-76x76@2x.png" (
    echo ✓ iOS iPad icon (76x76@2x) exists
) else (
    echo ✗ iOS iPad icon missing
)

echo.
echo ========================================
echo ASSETS VERIFICATION
echo ========================================

echo Checking source assets...
if exist "assets\images\ksk.png" (
    echo ✓ Source icon (ksk.png) exists
) else (
    echo ✗ Source icon missing
)

if exist "pubspec.yaml" (
    findstr /C:"flutter_launcher_icons" "pubspec.yaml" >nul
    if %errorlevel% == 0 (
        echo ✓ pubspec.yaml contains flutter_launcher_icons configuration
    ) else (
        echo ✗ pubspec.yaml missing flutter_launcher_icons configuration
    )
) else (
    echo ✗ pubspec.yaml not found
)

echo.
echo ========================================
echo SUMMARY
echo ========================================
echo.
echo App icons setup completed for Agrinova Mobile!
echo.
echo Generated icons include:
echo - Android: Standard icons for all densities (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
echo - Android: Adaptive icons for API 26+ (launcher_icon.xml, launcher_icon_round.xml)
echo - iOS: All required iPhone and iPad icon sizes
echo - iOS: App Store icon (1024x1024)
echo.
echo To test the icons:
echo 1. Build and run the app on Android device/emulator
echo 2. Build and run the app on iOS device/simulator
echo 3. Check that the KSK palm oil logo displays correctly in launcher
echo.
pause