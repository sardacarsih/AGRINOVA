import 'package:flutter/material.dart';

import '../services/unified_secure_storage_service.dart';

/// Manages app theme mode and persists preference to unified config storage.
class ThemeModeService extends ChangeNotifier {
  ThemeModeService._();

  static final ThemeModeService instance = ThemeModeService._();

  ThemeMode _themeMode = ThemeMode.system;
  bool _initialized = false;

  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == ThemeMode.dark;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      final config = await UnifiedSecureStorageService.getUnifiedConfig();
      _themeMode = _parseThemeMode(config.themeMode);
    } catch (error) {
      debugPrint('ThemeModeService initialize failed: $error');
      _themeMode = ThemeMode.system;
    } finally {
      _initialized = true;
      notifyListeners();
    }
  }

  Future<void> setDarkMode(bool enabled) {
    return setThemeMode(enabled ? ThemeMode.dark : ThemeMode.light);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    if (_initialized && _themeMode == mode) return;

    _themeMode = mode;
    _initialized = true;
    notifyListeners();

    try {
      final currentConfig =
          await UnifiedSecureStorageService.getUnifiedConfig();
      await UnifiedSecureStorageService.updateUnifiedConfig(
        currentConfig.copyWith(themeMode: _toStorageValue(mode)),
      );
    } catch (error) {
      debugPrint('ThemeModeService persist failed: $error');
    }
  }

  ThemeMode _parseThemeMode(String? rawMode) {
    switch (rawMode) {
      case 'dark':
        return ThemeMode.dark;
      case 'light':
        return ThemeMode.light;
      case 'system':
      default:
        return ThemeMode.system;
    }
  }

  String _toStorageValue(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
        return 'system';
    }
  }
}
