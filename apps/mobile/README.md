# agrinova_mobile

A new Flutter project.

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.

## Android build toolchain

To avoid `:app:checkReleaseAarMetadata` failures with newer AndroidX packages,
keep these versions aligned:

- Android Gradle Plugin (AGP): `8.9.1` in `apps/mobile/android/settings.gradle`
- Gradle wrapper: `8.11.1` in `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`
- Kotlin Android plugin: `2.1.0` in `apps/mobile/android/settings.gradle`

If you see errors like:
- `Dependency 'androidx.core:core-ktx:1.17.0' requires Android Gradle plugin 8.9.1 or higher`

Update AGP and Gradle wrapper together, then run:

```bash
cd apps/mobile/android
./gradlew :app:checkReleaseAarMetadata
```

## Local patched dependency

This app uses a local path dependency for `flutter_bluetooth_serial_plus` at
`apps/mobile/packages/flutter_bluetooth_serial_plus`.

Reason:
- upstream plugin still uses deprecated Android APIs and triggers Java deprecation warnings.
- this repo vendors a patched copy to keep behavior stable while reducing deprecation warnings in build logs.
