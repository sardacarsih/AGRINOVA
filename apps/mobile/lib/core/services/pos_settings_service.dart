import 'dart:async';
import 'package:logger/logger.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// POS (gate position) settings data
class POSSettings {
  final String posNumber;
  final String posName;

  const POSSettings({
    this.posNumber = 'MAIN_GATE',
    this.posName = 'Gerbang Utama',
  });
}

/// Service for managing POS number (gate position) settings.
/// Uses SharedPreferences for persistence.
class POSSettingsService {
  static final Logger _logger = Logger();
  static POSSettingsService? _instance;
  static final _controller = StreamController<POSSettings>.broadcast();

  static const String _posNumberKey = 'pos_number';
  static const String _posNameKey = 'pos_name';

  POSSettingsService._internal();

  static POSSettingsService get instance {
    _instance ??= POSSettingsService._internal();
    return _instance!;
  }

  /// Stream of POS settings changes
  static Stream<POSSettings> get settingsStream => _controller.stream;

  /// Get current POS settings
  static Future<POSSettings> getSettings() async {
    final prefs = await SharedPreferences.getInstance();
    return POSSettings(
      posNumber: prefs.getString(_posNumberKey) ?? 'MAIN_GATE',
      posName: prefs.getString(_posNameKey) ?? 'Gerbang Utama',
    );
  }

  /// Save POS settings
  static Future<void> saveSettings({
    required String posNumber,
    required String posName,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_posNumberKey, posNumber.trim());
    await prefs.setString(_posNameKey, posName.trim());
    final settings = POSSettings(
      posNumber: posNumber.trim(),
      posName: posName.trim(),
    );
    _controller.add(settings);
    _logger.i('POS settings saved: $posNumber / $posName');
  }

  /// Reset to defaults
  static Future<POSSettings> resetToDefaults() async {
    const defaults = POSSettings();
    await saveSettings(
      posNumber: defaults.posNumber,
      posName: defaults.posName,
    );
    _logger.i('POS settings reset to defaults');
    return defaults;
  }
}
