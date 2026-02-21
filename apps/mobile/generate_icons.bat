@echo off
echo Generating Flutter App Icons for Agrinova Mobile...
echo.

echo Step 1: Getting Flutter dependencies...
flutter pub get

echo.
echo Step 2: Generating launcher icons...
flutter pub run flutter_launcher_icons:main

echo.
echo App icons generated successfully!
echo.
echo Generated icons include:
echo - Android: all density variants (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
echo - iOS: all required sizes for iPhone and iPad
echo - Adaptive icons for Android API 26+
echo.
pause