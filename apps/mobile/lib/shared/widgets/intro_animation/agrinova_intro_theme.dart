import 'package:flutter/material.dart';

/// Centralized theme configuration for the AGRINOVA intro animation.
/// Contains brand colors, gradients, and typography settings.
class AgrinovaIntroTheme {
  AgrinovaIntroTheme._();

  // ═══════════════════════════════════════════════════════════════════════════
  // BRAND COLORS (Green-Tech Palette)
  // ═══════════════════════════════════════════════════════════════════════════

  /// Spring Green - Primary bright accent
  static const Color springGreen = Color(0xFF00FF7F);

  /// Tech Green - Secondary accent
  static const Color techGreen = Color(0xFF0CE67A);

  /// Deep Forest - Dark accent
  static const Color deepForest = Color(0xFF007F3D);

  /// Near-black background
  static const Color backgroundDark = Color(0xFF0A0A0A);

  /// Pure black for vignette edges
  static const Color pureBlack = Color(0xFF000000);

  /// Glow color (slightly transparent spring green)
  static const Color glowColor = Color(0x8000FF7F);

  // ═══════════════════════════════════════════════════════════════════════════
  // GRADIENT CONFIGURATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Main shimmer gradient colors (transparent → bright → transparent)
  static const List<Color> shimmerGradientColors = [
    Colors.transparent,
    Color(0x4000FF7F), // 25% opacity spring green
    Color(0x8000FF7F), // 50% opacity spring green
    Color(0xCC0CE67A), // 80% opacity tech green
    Color(0x8000FF7F), // 50% opacity spring green
    Color(0x4000FF7F), // 25% opacity spring green
    Colors.transparent,
  ];

  /// Gradient stops for smooth shimmer transition
  static const List<double> shimmerGradientStops = [
    0.0,
    0.2,
    0.35,
    0.5,
    0.65,
    0.8,
    1.0,
  ];

  /// Text gradient for the AGRINOVA logo
  static const LinearGradient textGradient = LinearGradient(
    colors: [
      springGreen,
      techGreen,
      deepForest,
      techGreen,
      springGreen,
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Vignette radial gradient (center light, edges dark)
  static RadialGradient vignetteGradient = RadialGradient(
    center: Alignment.center,
    radius: 1.2,
    colors: [
      backgroundDark,
      backgroundDark.withValues(alpha: 0.95),
      pureBlack.withValues(alpha: 0.98),
      pureBlack,
    ],
    stops: const [0.0, 0.5, 0.8, 1.0],
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // TYPOGRAPHY
  // ═══════════════════════════════════════════════════════════════════════════

  /// Get the AGRINOVA text style based on screen width
  static TextStyle getLogoTextStyle(double screenWidth) {
    // Responsive font size calculation
    double fontSize;
    if (screenWidth < 360) {
      fontSize = 36;
    } else if (screenWidth < 480) {
      fontSize = 48;
    } else if (screenWidth < 720) {
      fontSize = 56;
    } else {
      fontSize = 72;
    }

    return TextStyle(
      fontFamily: 'Poppins',
      fontSize: fontSize,
      fontWeight: FontWeight.w800,
      letterSpacing: 8.0,
      color: Colors.white,
      shadows: [
        Shadow(
          color: glowColor,
          blurRadius: 20,
        ),
        Shadow(
          color: springGreen.withValues(alpha: 0.3),
          blurRadius: 40,
        ),
      ],
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANIMATION CONSTANTS
  // ═══════════════════════════════════════════════════════════════════════════

  /// Total animation duration
  static const Duration animationDuration = Duration(milliseconds: 5000);

  /// Fade-in phase (0.0 - 0.25)
  static const double fadeInStart = 0.0;
  static const double fadeInEnd = 0.25;

  /// Zoom phase (0.0 - 0.5)
  static const double zoomStart = 0.0;
  static const double zoomEnd = 0.5;

  /// Shimmer phase (0.15 - 0.75)
  static const double shimmerStart = 0.15;
  static const double shimmerEnd = 0.75;

  /// Glow pulse phase (0.3 - 0.6)
  static const double glowStart = 0.3;
  static const double glowEnd = 0.6;

  /// Fade-out phase (0.8 - 1.0)
  static const double fadeOutStart = 0.8;
  static const double fadeOutEnd = 1.0;

  /// Initial scale for zoom effect
  static const double initialScale = 0.8;

  /// Final scale for zoom effect
  static const double finalScale = 1.0;

  /// Shimmer gradient width relative to text
  static const double shimmerWidth = 0.4;
}
