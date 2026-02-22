import 'package:flutter/material.dart';

/// Theme constants for Asisten Dashboard
/// Uses blue color scheme with light mode design
class AsistenTheme {
  // Primary Colors (Blue Palette)
  static const Color primaryBlue = Color(0xFF2563EB);
  static const Color primaryBlueDark = Color(0xFF1D4ED8);
  static const Color primaryBlueLight = Color(0xFF3B82F6);
  
  // Action Button Colors
  static const Color approvalBlue = Color(0xFF2563EB);
  static const Color qualityCheckTeal = Color(0xFF0D9488);
  static const Color monitoringPurple = Color(0xFF7C3AED);
  static const Color reportsOrange = Color(0xFFEA580C);
  static const Color historyGray = Color(0xFF6B7280);
  static const Color batchApprovalCyan = Color(0xFF0891B2);
  
  // Status Colors
  static const Color pendingOrange = Color(0xFFF59E0B);
  static const Color approvedGreen = Color(0xFF10B981);
  static const Color rejectedRed = Color(0xFFEF4444);
  static const Color infoColor = Color(0xFF0EA5E9);
  
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
    colors: [Color(0xFF2563EB), Color(0xFF3B82F6)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  
  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFF1D4ED8), Color(0xFF2563EB)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient welcomeGradient = LinearGradient(
    colors: [Color(0xFF2563EB), Color(0xFF60A5FA)],
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
    border: Border.all(color: color.withValues(alpha: 0.1), width: 1),
    boxShadow: [
      BoxShadow(
        color: color.withValues(alpha: 0.08),
        blurRadius: 8,
        offset: const Offset(0, 2),
      ),
    ],
  );
  
  // Glassmorphism (for welcome card)
  static BoxDecoration glassDecoration({Color? color, double opacity = 0.15}) {
    return BoxDecoration(
      color: (color ?? primaryBlue).withValues(alpha: opacity),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(
        color: (color ?? primaryBlue).withValues(alpha: 0.4),
        width: 1,
      ),
    );
  }
  
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

  static TextStyle get bodyMedium => const TextStyle(
    color: textSecondary,
    fontSize: 14,
  );

  static TextStyle get bodySmall => const TextStyle(
    color: textMuted,
    fontSize: 12,
  );

  static TextStyle get labelMedium => const TextStyle(
    color: textSecondary,
    fontSize: 13,
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

  // Spacing
  static const double paddingSmall = 8.0;
  static const double paddingMedium = 16.0;
  static const double paddingLarge = 24.0;
  static const double paddingXLarge = 32.0;
  static const double sectionSpacing = 24.0;

  // Icon Sizes
  static const double iconSmall = 20.0;
  static const double iconMedium = 24.0;
  static const double iconLarge = 32.0;

  // Helper Decorations
  static BoxDecoration cardDecoration({Color? color}) {
    return coloredCardDecoration(color ?? primaryBlue);
  }
  
  static BoxDecoration get headerDecoration => const BoxDecoration(
    gradient: headerGradient,
  );

  static BoxDecoration get pendingItemDecoration => BoxDecoration(
    color: pendingOrange.withValues(alpha: 0.1),
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: pendingOrange.withValues(alpha: 0.3)),
  );

  // Status Badge Decoration
  static BoxDecoration statusBadgeDecoration(Color color) => BoxDecoration(
    color: color.withValues(alpha: 0.1),
    borderRadius: BorderRadius.circular(20),
    border: Border.all(color: color.withValues(alpha: 0.3)),
  );
  
  // Text Style Helpers
  static TextStyle cardValue(Color color) {
    return const TextStyle(
      color: textPrimary,
      fontSize: 22,
      fontWeight: FontWeight.bold,
    );
  }
  
  static TextStyle cardLabel(Color color) {
    return const TextStyle(
      color: textSecondary,
      fontSize: 12,
      fontWeight: FontWeight.w500,
    );
  }
}

