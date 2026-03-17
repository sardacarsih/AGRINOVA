import 'package:flutter/material.dart';

import 'login_theme_campaign_service.dart';

class RuntimeMobileTheme {
  final Color primary;
  final Color onPrimary;
  final Color success;
  final Color warning;
  final Color info;
  final Color danger;
  final Color surface;
  final Color onSurface;
  final Color scaffoldBackground;

  const RuntimeMobileTheme._({
    required this.primary,
    required this.onPrimary,
    required this.success,
    required this.warning,
    required this.info,
    required this.danger,
    required this.surface,
    required this.onSurface,
    required this.scaffoldBackground,
  });

  factory RuntimeMobileTheme.of(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final baseTheme = Theme.of(context);
    final tokens = LoginThemeCampaignService.instance.resolveTokens(
      brightness: brightness,
    );
    final appUi = LoginThemeCampaignService.instance.effectiveAppUi;
    final seedColor =
        _parseColor(appUi.dashboard.accentColor) ??
        _parseColor(appUi.navbar.accentColor) ??
        _parseColor(appUi.footer.accentColor) ??
        _parseColor(appUi.dashboard.foregroundColor) ??
        tokens.link;

    final generated = ColorScheme.fromSeed(
      seedColor: seedColor,
      brightness: brightness,
    );
    final scaffoldBackground =
        _parseColor(appUi.dashboard.backgroundColor) ??
        baseTheme.scaffoldBackgroundColor;

    return RuntimeMobileTheme._(
      primary: generated.primary,
      onPrimary: generated.onPrimary,
      success: generated.primary,
      warning: generated.tertiary,
      info: generated.secondary,
      danger: generated.error,
      surface:
          _parseColor(appUi.dashboard.foregroundColor) ?? generated.surface,
      onSurface: _parseColor(appUi.dashboard.textColor) ?? generated.onSurface,
      scaffoldBackground: scaffoldBackground,
    );
  }

  Color cardTint(Color color, {double lightAlpha = 0.14, double darkAlpha = 0.2}) {
    final luminance = scaffoldBackground.computeLuminance();
    final alpha = luminance > 0.5 ? lightAlpha : darkAlpha;
    return color.withValues(alpha: alpha);
  }

  Color borderTint(Color color, {double lightAlpha = 0.28, double darkAlpha = 0.34}) {
    final luminance = scaffoldBackground.computeLuminance();
    final alpha = luminance > 0.5 ? lightAlpha : darkAlpha;
    return color.withValues(alpha: alpha);
  }

  Color iconTint(Color color, {double lightAlpha = 0.18, double darkAlpha = 0.24}) {
    final luminance = scaffoldBackground.computeLuminance();
    final alpha = luminance > 0.5 ? lightAlpha : darkAlpha;
    return color.withValues(alpha: alpha);
  }

  static Color? _parseColor(String raw) {
    final normalized = raw.trim();
    if (normalized.isEmpty) return null;

    var hex = normalized.toLowerCase();
    if (hex.startsWith('#')) {
      hex = hex.substring(1);
    } else if (hex.startsWith('0x')) {
      hex = hex.substring(2);
    } else {
      return null;
    }

    if (hex.length == 6) {
      hex = 'ff$hex';
    }
    if (hex.length != 8) {
      return null;
    }

    final value = int.tryParse(hex, radix: 16);
    if (value == null) return null;
    return Color(value);
  }
}
