import 'package:flutter/material.dart';

/// Brightness-aware resolved colors for MandorTheme.
/// Use [MandorTheme.of] to obtain an instance based on the current brightness.
class MandorColors {
  final bool isDark;

  const MandorColors._({required this.isDark});

  // === Resolved surface colors ===
  Color get scaffoldBackground =>
      isDark ? MandorTheme.gray900 : const Color(0xFFF8FAFC);
  Color get cardBackground => isDark ? MandorTheme.gray800 : Colors.white;
  Color get surfaceOverlay => isDark
      ? Colors.white.withValues(alpha: 0.1)
      : MandorTheme.gray900.withValues(alpha: 0.04);
  Color get dialogSurface =>
      isDark ? MandorTheme.gray800 : MandorTheme.softWhite;
  Color get inputFill =>
      isDark ? Colors.white.withValues(alpha: 0.08) : MandorTheme.gray100;
  Color get dividerSubtle => isDark ? MandorTheme.gray700 : MandorTheme.gray200;
  Color get shadowColor => isDark
      ? Colors.black.withValues(alpha: 0.1)
      : MandorTheme.gray900.withValues(alpha: 0.08);

  // === Resolved text colors ===
  Color get headingColor =>
      isDark ? MandorTheme.softWhite : MandorTheme.gray900;
  Color get bodyColor => isDark ? MandorTheme.gray300 : MandorTheme.gray700;
  Color get bodySecondary => isDark ? MandorTheme.gray400 : MandorTheme.gray600;
  Color get bodyTertiary => isDark ? MandorTheme.gray500 : MandorTheme.gray500;

  // === Resolved border / surface ===
  Color get borderColor =>
      isDark ? Colors.white.withValues(alpha: 0.2) : MandorTheme.gray300;
  Color get navBackground => isDark
      ? MandorTheme.gray900.withValues(alpha: 0.95)
      : Colors.white.withValues(alpha: 0.98);

  // === Shimmer ===
  Color get shimmerBase => isDark ? MandorTheme.gray800 : MandorTheme.gray200;
  Color get shimmerHighlight =>
      isDark ? MandorTheme.gray700 : MandorTheme.gray100;
}

/// Gen Z Theme for Mandor Dashboard
/// Modern, vibrant, glassmorphic design with green harvest accents
class MandorTheme {
  // === PRIMARY COLORS (Green-based for Harvest/Agriculture) ===
  static const Color forestGreen = Color(0xFF22C55E);
  static const Color emeraldGreen = Color(0xFF10B981);
  static const Color limeGreen = Color(0xFF84CC16);
  static const Color darkGreen = Color(0xFF166534);

  // === ACCENT COLORS ===
  static const Color electricBlue = Color(0xFF3B82F6);
  static const Color skyBlue = Color(0xFF0EA5E9);
  static const Color amberOrange = Color(0xFFF59E0B);
  static const Color coralRed = Color(0xFFEF4444);
  static const Color purpleAccent = Color(0xFF8B5CF6);

  // === NEUTRAL PALETTE ===
  static const Color softWhite = Color(0xFFF9FAFB);
  static const Color gray100 = Color(0xFFF3F4F6);
  static const Color gray200 = Color(0xFFE5E7EB);
  static const Color gray300 = Color(0xFFD1D5DB);
  static const Color gray400 = Color(0xFF9CA3AF);
  static const Color gray500 = Color(0xFF6B7280);
  static const Color gray600 = Color(0xFF4B5563);
  static const Color gray700 = Color(0xFF374151);
  static const Color gray800 = Color(0xFF1F2937);
  static const Color gray900 = Color(0xFF111827);

  // === NEON GRADIENTS ===
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [forestGreen, emeraldGreen],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient secondaryGradient = LinearGradient(
    colors: [emeraldGreen, electricBlue],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [limeGreen, forestGreen],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  @Deprecated('Use backgroundGradientFor(context) instead')
  static const LinearGradient darkGradient = LinearGradient(
    colors: [gray900, gray800],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient neonGreenGlow = LinearGradient(
    colors: [Color(0xFF22C55E), Color(0xFF4ADE80)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient neonBlueGlow = LinearGradient(
    colors: [Color(0xFF3B82F6), Color(0xFF60A5FA)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ──────────────────────────────────────────────
  // Brightness-aware resolver
  // ──────────────────────────────────────────────

  /// Returns resolved colors based on the current [BuildContext] brightness.
  static MandorColors of(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return MandorColors._(isDark: isDark);
  }

  // ──────────────────────────────────────────────
  // Brightness-aware text styles
  // ──────────────────────────────────────────────

  static TextStyle headingLargeFor(BuildContext context) {
    final c = of(context);
    return TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      color: c.headingColor,
      letterSpacing: -0.5,
    );
  }

  static TextStyle headingMediumFor(BuildContext context) {
    final c = of(context);
    return TextStyle(
      fontSize: 22,
      fontWeight: FontWeight.w600,
      color: c.headingColor,
      letterSpacing: -0.3,
    );
  }

  static TextStyle headingSmallFor(BuildContext context) {
    final c = of(context);
    return TextStyle(
      fontSize: 18,
      fontWeight: FontWeight.w600,
      color: c.headingColor,
    );
  }

  static TextStyle bodyLargeFor(BuildContext context) {
    final c = of(context);
    return TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w500,
      color: c.bodyColor,
    );
  }

  static TextStyle bodyMediumFor(BuildContext context) {
    final c = of(context);
    return TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w400,
      color: c.bodySecondary,
    );
  }

  static TextStyle bodySmallFor(BuildContext context) {
    final c = of(context);
    return TextStyle(
      fontSize: 12,
      fontWeight: FontWeight.w400,
      color: c.bodyTertiary,
    );
  }

  static TextStyle labelBoldFor(BuildContext context) {
    final c = of(context);
    return TextStyle(
      fontSize: 14,
      fontWeight: FontWeight.w600,
      color: c.headingColor,
      letterSpacing: 0.5,
    );
  }

  static TextStyle statValueFor(BuildContext context, {Color? color}) {
    final c = of(context);
    return TextStyle(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      color: color ?? c.headingColor,
      letterSpacing: -0.5,
    );
  }

  static TextStyle statLabelFor(BuildContext context, {Color? color}) {
    final c = of(context);
    return TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w500,
      color: color ?? c.bodySecondary,
    );
  }

  static TextStyle labelSmallFor(BuildContext context) {
    final c = of(context);
    return TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w500,
      color: c.bodyTertiary,
    );
  }

  static TextStyle labelMediumFor(BuildContext context) {
    final c = of(context);
    return TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w500,
      color: c.bodySecondary,
    );
  }

  static TextStyle buttonTextFor(BuildContext context) {
    final c = of(context);
    return TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w600,
      color: c.headingColor,
    );
  }

  // ──────────────────────────────────────────────
  // Brightness-aware decorations
  // ──────────────────────────────────────────────

  static BoxDecoration glassCardFor(
    BuildContext context, {
    double borderRadius = 20,
    Color? borderColor,
    double blurStrength = 10,
  }) {
    final c = of(context);
    if (c.isDark) {
      return BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: borderColor ?? Colors.white.withValues(alpha: 0.2),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: blurStrength,
            spreadRadius: 0,
          ),
        ],
      );
    }
    return BoxDecoration(
      color: c.cardBackground.withValues(alpha: 0.88),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(color: borderColor ?? c.borderColor, width: 1),
      boxShadow: [
        BoxShadow(
          color: c.shadowColor.withValues(alpha: 0.4),
          blurRadius: blurStrength,
          spreadRadius: 0,
        ),
      ],
    );
  }

  static BoxDecoration filledCardFor(
    BuildContext context, {
    double borderRadius = 20,
    Color? accentColor,
  }) {
    final c = of(context);
    final accent = accentColor ?? forestGreen;
    if (c.isDark) {
      return BoxDecoration(
        gradient: LinearGradient(
          colors: [
            gray800.withValues(alpha: 0.8),
            gray900.withValues(alpha: 0.9),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: accent.withValues(alpha: 0.3), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: accent.withValues(alpha: 0.15),
            blurRadius: 20,
            spreadRadius: -5,
          ),
        ],
      );
    }
    return BoxDecoration(
      color: c.cardBackground,
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(color: c.dividerSubtle, width: 1),
      boxShadow: [
        BoxShadow(
          color: accent.withValues(alpha: 0.08),
          blurRadius: 20,
          spreadRadius: -5,
        ),
      ],
    );
  }

  static LinearGradient backgroundGradientFor(BuildContext context) {
    final c = of(context);
    if (c.isDark) {
      return const LinearGradient(
        colors: [gray900, gray800],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      );
    }
    return const LinearGradient(
      colors: [Color(0xFFF8FAFC), Color(0xFFF1F5F9)],
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
    );
  }

  static BoxDecoration bottomNavDecorationFor(BuildContext context) {
    final c = of(context);
    if (c.isDark) {
      return BoxDecoration(
        color: gray900.withValues(alpha: 0.95),
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
        boxShadow: [
          BoxShadow(
            color: forestGreen.withValues(alpha: 0.1),
            blurRadius: 20,
            spreadRadius: 0,
            offset: const Offset(0, -5),
          ),
        ],
      );
    }
    return BoxDecoration(
      color: c.navBackground,
      borderRadius: const BorderRadius.only(
        topLeft: Radius.circular(24),
        topRight: Radius.circular(24),
      ),
      boxShadow: [
        BoxShadow(
          color: c.shadowColor,
          blurRadius: 20,
          spreadRadius: 0,
          offset: const Offset(0, -5),
        ),
      ],
    );
  }

  static BoxDecoration activityCardFor(BuildContext context) {
    final c = of(context);
    if (c.isDark) {
      return BoxDecoration(
        color: gray800.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: gray700.withValues(alpha: 0.5), width: 1),
      );
    }
    return BoxDecoration(
      color: c.cardBackground,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: c.dividerSubtle, width: 1),
      boxShadow: [
        BoxShadow(
          color: c.shadowColor.withValues(alpha: 0.35),
          blurRadius: 8,
          spreadRadius: 0,
        ),
      ],
    );
  }

  static LinearGradient shimmerGradientFor(BuildContext context) {
    final c = of(context);
    return LinearGradient(
      colors: [c.shimmerBase, c.shimmerHighlight, c.shimmerBase],
      stops: const [0.0, 0.5, 1.0],
      begin: const Alignment(-1.0, -0.3),
      end: const Alignment(1.0, 0.3),
    );
  }

  // ──────────────────────────────────────────────
  // Legacy static members (kept for compatibility)
  // ──────────────────────────────────────────────

  // === GLASSMORPHISM STYLES ===
  @Deprecated('Use glassCardFor(context) instead')
  static BoxDecoration glassCard({
    double borderRadius = 20,
    Color? borderColor,
    double blurStrength = 10,
  }) {
    return BoxDecoration(
      color: Colors.white.withValues(alpha: 0.1),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: borderColor ?? Colors.white.withValues(alpha: 0.2),
        width: 1.5,
      ),
      boxShadow: [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.1),
          blurRadius: blurStrength,
          spreadRadius: 0,
        ),
      ],
    );
  }

  @Deprecated('Use filledCardFor(context) instead')
  static BoxDecoration glassCardDark({
    double borderRadius = 20,
    Color? accentColor,
  }) {
    return BoxDecoration(
      gradient: LinearGradient(
        colors: [
          gray800.withValues(alpha: 0.8),
          gray900.withValues(alpha: 0.9),
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: (accentColor ?? forestGreen).withValues(alpha: 0.3),
        width: 1.5,
      ),
      boxShadow: [
        BoxShadow(
          color: (accentColor ?? forestGreen).withValues(alpha: 0.15),
          blurRadius: 20,
          spreadRadius: -5,
        ),
      ],
    );
  }

  // === NEON STAT CARD ===
  static BoxDecoration neonStatCard({
    required Color color,
    double borderRadius = 16,
  }) {
    return BoxDecoration(
      gradient: LinearGradient(
        colors: [color.withValues(alpha: 0.15), color.withValues(alpha: 0.05)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(color: color.withValues(alpha: 0.3), width: 1.5),
      boxShadow: [
        BoxShadow(
          color: color.withValues(alpha: 0.2),
          blurRadius: 12,
          spreadRadius: -2,
        ),
      ],
    );
  }

  // === TEXT STYLES (dark-only legacy) ===
  @Deprecated('Use headingLargeFor(context) instead')
  static const TextStyle headingLarge = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: softWhite,
    letterSpacing: -0.5,
  );

  @Deprecated('Use headingMediumFor(context) instead')
  static const TextStyle headingMedium = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w600,
    color: softWhite,
    letterSpacing: -0.3,
  );

  @Deprecated('Use headingSmallFor(context) instead')
  static const TextStyle headingSmall = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: softWhite,
  );

  @Deprecated('Use bodyLargeFor(context) instead')
  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    color: gray300,
  );

  @Deprecated('Use bodyMediumFor(context) instead')
  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: gray400,
  );

  @Deprecated('Use bodySmallFor(context) instead')
  static const TextStyle bodySmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: gray500,
  );

  @Deprecated('Use labelBoldFor(context) instead')
  static const TextStyle labelBold = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: softWhite,
    letterSpacing: 0.5,
  );

  @Deprecated('Use statValueFor(context) instead')
  static TextStyle statValue({Color? color}) => TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: color ?? softWhite,
    letterSpacing: -0.5,
  );

  @Deprecated('Use statLabelFor(context) instead')
  static TextStyle statLabel({Color? color}) => TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: color ?? gray400,
  );

  @Deprecated('Use labelSmallFor(context) instead')
  static const TextStyle labelSmall = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    color: gray500,
  );

  @Deprecated('Use labelMediumFor(context) instead')
  static const TextStyle labelMedium = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: gray400,
  );

  @Deprecated('Use buttonTextFor(context) instead')
  static const TextStyle buttonText = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: softWhite,
  );

  /// Convenience getter for default glass card decoration
  @Deprecated('Use glassCardFor(context) instead')
  static BoxDecoration get glassCardBox => glassCard();

  // === ICON STYLES ===
  static BoxDecoration iconContainer({required Color color, double size = 44}) {
    return BoxDecoration(
      gradient: LinearGradient(
        colors: [color, color.withValues(alpha: 0.7)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(14),
      boxShadow: [
        BoxShadow(
          color: color.withValues(alpha: 0.4),
          blurRadius: 12,
          spreadRadius: -2,
        ),
      ],
    );
  }

  // === BUTTON STYLES ===
  static ButtonStyle primaryButton = ElevatedButton.styleFrom(
    backgroundColor: forestGreen,
    foregroundColor: softWhite,
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    elevation: 0,
  );

  static ButtonStyle secondaryButton = ElevatedButton.styleFrom(
    backgroundColor: Colors.transparent,
    foregroundColor: forestGreen,
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: BorderSide(color: forestGreen.withValues(alpha: 0.5), width: 1.5),
    ),
    elevation: 0,
  );

  // === ACTIVITY CARD STYLES ===
  @Deprecated('Use activityCardFor(context) instead')
  static BoxDecoration activityCard = BoxDecoration(
    color: gray800.withValues(alpha: 0.6),
    borderRadius: BorderRadius.circular(14),
    border: Border.all(color: gray700.withValues(alpha: 0.5), width: 1),
  );

  // === BOTTOM NAV STYLES ===
  @Deprecated('Use bottomNavDecorationFor(context) instead')
  static BoxDecoration bottomNavDecoration = BoxDecoration(
    color: gray900.withValues(alpha: 0.95),
    borderRadius: const BorderRadius.only(
      topLeft: Radius.circular(24),
      topRight: Radius.circular(24),
    ),
    boxShadow: [
      BoxShadow(
        color: forestGreen.withValues(alpha: 0.1),
        blurRadius: 20,
        spreadRadius: 0,
        offset: const Offset(0, -5),
      ),
    ],
  );

  // === SHIMMER/LOADING EFFECT ===
  @Deprecated('Use shimmerGradientFor(context) instead')
  static LinearGradient shimmerGradient = LinearGradient(
    colors: [gray800, gray700, gray800],
    stops: const [0.0, 0.5, 1.0],
    begin: const Alignment(-1.0, -0.3),
    end: const Alignment(1.0, 0.3),
  );

  // === APP BAR GRADIENT ===
  static BoxDecoration appBarGradient = BoxDecoration(
    gradient: LinearGradient(
      colors: [darkGreen, forestGreen],
      begin: Alignment.centerLeft,
      end: Alignment.centerRight,
    ),
  );
}

/// Mandor Themed Widgets Helper
class MandorWidgets {
  /// Build glassmorphic header card
  static Widget buildGlassHeader({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    String? badge,
    bool isOffline = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: MandorTheme.primaryGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: MandorTheme.forestGreen.withValues(alpha: 0.3),
            blurRadius: 20,
            spreadRadius: -5,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(icon, color: Colors.white, size: 28),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: MandorTheme.headingMediumFor(context)),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: MandorTheme.bodyMediumFor(
                        context,
                      ).copyWith(color: Colors.white.withValues(alpha: 0.8)),
                    ),
                  ],
                ),
              ),
              if (badge != null)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: MandorTheme.limeGreen,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    badge,
                    style: MandorTheme.labelBoldFor(
                      context,
                    ).copyWith(color: MandorTheme.gray900, fontSize: 12),
                  ),
                ),
            ],
          ),
          if (isOffline) ...[
            const SizedBox(height: 12),
            _buildOfflineBanner(context),
          ],
        ],
      ),
    );
  }

  static Widget _buildOfflineBanner(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: MandorTheme.amberOrange.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: MandorTheme.amberOrange.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.wifi_off_rounded,
            size: 16,
            color: MandorTheme.amberOrange,
          ),
          const SizedBox(width: 10),
          Text(
            'Mode Offline — Data disinkronkan saat online',
            style: MandorTheme.bodySmallFor(
              context,
            ).copyWith(color: MandorTheme.amberOrange),
          ),
        ],
      ),
    );
  }

  /// Build neon stat card
  static Widget buildStatCard({
    required BuildContext context,
    required String value,
    required String label,
    required IconData icon,
    required Color color,
    String? subtitle,
    VoidCallback? onTap,
  }) {
    final card = Container(
      padding: const EdgeInsets.all(16),
      decoration: MandorTheme.neonStatCard(color: color),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: MandorTheme.iconContainer(color: color),
                child: Icon(icon, color: Colors.white, size: 20),
              ),
              Text(
                value,
                style: MandorTheme.statValueFor(context, color: color),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            label,
            style: MandorTheme.statLabelFor(context, color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: MandorTheme.bodySmallFor(
                context,
              ).copyWith(color: color.withValues(alpha: 0.6)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: card,
      );
    }
    return card;
  }

  /// Build section header with action
  static Widget buildSectionHeader({
    required BuildContext context,
    required String title,
    VoidCallback? onAction,
    String actionText = 'Lihat Semua',
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: MandorTheme.headingSmallFor(context)),
        if (onAction != null)
          TextButton(
            onPressed: onAction,
            style: TextButton.styleFrom(
              foregroundColor: MandorTheme.forestGreen,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  actionText,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: MandorTheme.forestGreen,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.arrow_forward_ios,
                  size: 12,
                  color: MandorTheme.forestGreen,
                ),
              ],
            ),
          ),
      ],
    );
  }

  /// Build empty state card
  static Widget buildEmptyState({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    Color? color,
  }) {
    final stateColor = color ?? MandorTheme.gray500;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: stateColor.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: stateColor.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, size: 48, color: stateColor.withValues(alpha: 0.5)),
          const SizedBox(height: 12),
          Text(
            title,
            style: MandorTheme.bodyLargeFor(
              context,
            ).copyWith(color: stateColor),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: MandorTheme.bodySmallFor(
              context,
            ).copyWith(color: stateColor.withValues(alpha: 0.7)),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  /// Build bottom navigation item
  static Widget buildNavItem({
    required IconData icon,
    required String label,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? MandorTheme.forestGreen.withValues(alpha: 0.15)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? MandorTheme.forestGreen : MandorTheme.gray500,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                color: isSelected
                    ? MandorTheme.forestGreen
                    : MandorTheme.gray500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
