import 'package:flutter/material.dart';

/// Theme constants for Area Manager Dashboard
/// Uses teal/green color scheme with light mode design
class AreaManagerTheme {
  // Primary Colors (Teal/Green Palette - matching design)
  static const Color primaryTeal = Color(0xFF0D9488);
  static const Color primaryTealDark = Color(0xFF0F766E);
  static const Color primaryTealLight = Color(0xFF14B8A6);
  static const Color primaryGreen = Color(0xFF059669);

  // Quick Action Button Colors (matching design)
  static const Color monitoringTeal = Color(0xFF0D9488);
  static const Color reportingOrange = Color(0xFFEA580C);
  static const Color managerReportsTan = Color(0xFFD4A574);
  static const Color oversightPurple = Color(0xFF7C3AED);

  // Status Colors
  static const Color activeGreen = Color(0xFF22C55E);
  static const Color alertYellow = Color(0xFFFBBF24);
  static const Color maintenanceRed = Color(0xFFEF4444);
  static const Color infoBlue = Color(0xFF0EA5E9);
  static const Color pendingOrange = Color(0xFFFF9100);

  // Background Colors (Light Mode)
  static const Color scaffoldBackground = Color(0xFFF5F5F5);
  static const Color cardBackground = Colors.white;
  static const Color surfaceColor = Colors.white;

  // Text Colors
  static const Color textPrimary = Color(0xFF1F2937);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textMuted = Color(0xFF9CA3AF);

  // Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFF0D9488), Color(0xFF14B8A6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFF0F766E), Color(0xFF0D9488)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient welcomeGradient = LinearGradient(
    colors: [Color(0xFF0D9488), Color(0xFF14B8A6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // Card Decorations
  static BoxDecoration get whiteCardDecoration => BoxDecoration(
        color: cardBackground,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      );

  static BoxDecoration coloredCardDecoration(Color color) => BoxDecoration(
        color: cardBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.2), width: 1),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      );

  static BoxDecoration statCardDecoration(Color borderColor) => BoxDecoration(
        color: cardBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border(
          left: BorderSide(color: borderColor, width: 4),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      );

  // Text Styles
  static TextStyle get headingLarge => const TextStyle(
        color: textPrimary,
        fontSize: 24,
        fontWeight: FontWeight.bold,
        letterSpacing: -0.5,
      );

  static TextStyle get headingMedium => const TextStyle(
        color: textPrimary,
        fontSize: 18,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.3,
      );

  static TextStyle get headingSmall => const TextStyle(
        color: textPrimary,
        fontSize: 16,
        fontWeight: FontWeight.w600,
      );

  static TextStyle get bodyMedium => const TextStyle(
        color: textSecondary,
        fontSize: 14,
      );

  static TextStyle get bodySmall => const TextStyle(
        color: textMuted,
        fontSize: 12,
      );

  static TextStyle get labelStyle => const TextStyle(
        color: textSecondary,
        fontSize: 12,
        fontWeight: FontWeight.w500,
      );

  // White text styles for dark backgrounds
  static TextStyle get headingWhite => const TextStyle(
        color: Colors.white,
        fontSize: 20,
        fontWeight: FontWeight.bold,
        letterSpacing: -0.3,
      );

  static TextStyle get bodyWhite => TextStyle(
        color: Colors.white.withValues(alpha: 0.9),
        fontSize: 14,
      );

  static TextStyle get bodyWhiteSmall => TextStyle(
        color: Colors.white.withValues(alpha: 0.7),
        fontSize: 12,
      );

  // Spacing
  static const double paddingSmall = 8.0;
  static const double paddingMedium = 16.0;
  static const double paddingLarge = 24.0;
  static const double sectionSpacing = 24.0;

  // Icon Sizes
  static const double iconSmall = 20.0;
  static const double iconMedium = 24.0;
  static const double iconLarge = 32.0;

  // Helper Methods
  static BoxDecoration cardDecoration({Color? color}) {
    return coloredCardDecoration(color ?? primaryTeal);
  }

  static BoxDecoration get mapCardDecoration => BoxDecoration(
        color: cardBackground,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      );

  // Performance Bar Colors
  static Color getPerformanceColor(double percentage) {
    if (percentage >= 90) return activeGreen;
    if (percentage >= 80) return primaryTeal;
    if (percentage >= 70) return alertYellow;
    return maintenanceRed;
  }

  // Badge/Chip Decoration
  static BoxDecoration chipDecoration(Color color) => BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      );

  static BoxDecoration badgeDecoration(Color color) => BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(8),
      );
}

