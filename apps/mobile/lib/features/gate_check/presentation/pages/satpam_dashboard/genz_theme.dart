import 'package:flutter/material.dart';

/// Brightness-aware resolved colors for GenZTheme.
/// Use [GenZTheme.of] to obtain an instance based on the current brightness.
class GenZColors {
  final bool isDark;

  const GenZColors._({required this.isDark});

  // === Resolved surface colors ===
  Color get scaffoldBackground =>
      isDark ? GenZTheme.gray900 : const Color(0xFFF8FAFC);
  Color get cardBackground => isDark ? GenZTheme.gray800 : Colors.white;
  Color get surfaceOverlay => isDark
      ? Colors.white.withValues(alpha: 0.1)
      : GenZTheme.gray900.withValues(alpha: 0.04);
  Color get dialogSurface => isDark ? GenZTheme.gray800 : GenZTheme.softWhite;
  Color get inputFill =>
      isDark ? Colors.white.withValues(alpha: 0.08) : GenZTheme.gray100;
  Color get dividerSubtle => isDark ? GenZTheme.gray700 : GenZTheme.gray200;
  Color get shadowColor => isDark
      ? Colors.black.withValues(alpha: 0.1)
      : GenZTheme.gray900.withValues(alpha: 0.08);

  // === Resolved text colors ===
  Color get headingColor => isDark ? GenZTheme.softWhite : GenZTheme.gray900;
  Color get bodyColor => isDark ? GenZTheme.gray300 : GenZTheme.gray700;
  Color get bodySecondary => isDark ? GenZTheme.gray400 : GenZTheme.gray600;
  Color get bodyTertiary => isDark ? GenZTheme.gray500 : GenZTheme.gray500;

  // === Resolved border / surface ===
  Color get borderColor =>
      isDark ? Colors.white.withValues(alpha: 0.2) : GenZTheme.gray300;
  Color get navBackground => isDark
      ? GenZTheme.gray900.withValues(alpha: 0.95)
      : Colors.white.withValues(alpha: 0.98);

  // === Shimmer ===
  Color get shimmerBase => isDark ? GenZTheme.gray800 : GenZTheme.gray200;
  Color get shimmerHighlight => isDark ? GenZTheme.gray700 : GenZTheme.gray100;
}

/// Gen Z Theme for Satpam Dashboard
/// Modern, vibrant, glassmorphic design with neon accents
class GenZTheme {
  // === PRIMARY COLORS ===
  static const Color electricPurple = Color(0xFF8B5CF6);
  static const Color neoBlue = Color(0xFF3B82F6);
  static const Color mintGreen = Color(0xFF34D399);
  static const Color neutralCharcoal = Color(0xFF1F2937);
  static const Color softWhite = Color(0xFFF9FAFB);

  // === EXTENDED PALETTE ===
  static const Color deepPurple = Color(0xFF7C3AED);
  static const Color lightPurple = Color(0xFFA78BFA);
  static const Color darkBlue = Color(0xFF2563EB);
  static const Color lightBlue = Color(0xFF60A5FA);
  static const Color darkMint = Color(0xFF10B981);
  static const Color lightMint = Color(0xFF6EE7B7);
  static const Color gray100 = Color(0xFFF3F4F6);
  static const Color gray200 = Color(0xFFE5E7EB);
  static const Color gray300 = Color(0xFFD1D5DB);
  static const Color gray400 = Color(0xFF9CA3AF);
  static const Color gray500 = Color(0xFF6B7280);
  static const Color gray600 = Color(0xFF4B5563);
  static const Color gray700 = Color(0xFF374151);
  static const Color gray800 = Color(0xFF1F2937);
  static const Color gray900 = Color(0xFF111827);

  // === ADDITIONAL ACCENT COLORS (moved from inline hex) ===
  static const Color amberOrange = Color(0xFFF59E0B);
  static const Color coralRed = Color(0xFFEF4444);

  // === NEON GRADIENTS ===
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [electricPurple, neoBlue],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient secondaryGradient = LinearGradient(
    colors: [neoBlue, mintGreen],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [mintGreen, electricPurple],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  @Deprecated('Use backgroundGradientFor(context) instead')
  static const LinearGradient darkGradient = LinearGradient(
    colors: [gray900, gray800],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  static const LinearGradient neonPurpleGlow = LinearGradient(
    colors: [Color(0xFF8B5CF6), Color(0xFFC084FC)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient neonBlueGlow = LinearGradient(
    colors: [Color(0xFF3B82F6), Color(0xFF93C5FD)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient neonMintGlow = LinearGradient(
    colors: [Color(0xFF34D399), Color(0xFF6EE7B7)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // ──────────────────────────────────────────────
  // Brightness-aware resolver
  // ──────────────────────────────────────────────

  /// Returns resolved colors based on the current [BuildContext] brightness.
  static GenZColors of(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return GenZColors._(isDark: isDark);
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
      fontSize: 32,
      fontWeight: FontWeight.w700,
      color: color ?? c.headingColor,
      letterSpacing: -1,
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
    final accent = accentColor ?? electricPurple;
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
            color: electricPurple.withValues(alpha: 0.1),
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
        color: (accentColor ?? electricPurple).withValues(alpha: 0.3),
        width: 1.5,
      ),
      boxShadow: [
        BoxShadow(
          color: (accentColor ?? electricPurple).withValues(alpha: 0.15),
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
    fontSize: 32,
    fontWeight: FontWeight.w700,
    color: color ?? softWhite,
    letterSpacing: -1,
  );

  @Deprecated('Use statLabelFor(context) instead')
  static TextStyle statLabel({Color? color}) => TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: color ?? gray400,
  );

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
    backgroundColor: electricPurple,
    foregroundColor: softWhite,
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    elevation: 0,
  );

  static ButtonStyle secondaryButton = ElevatedButton.styleFrom(
    backgroundColor: Colors.transparent,
    foregroundColor: electricPurple,
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: BorderSide(
        color: electricPurple.withValues(alpha: 0.5),
        width: 1.5,
      ),
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
        color: electricPurple.withValues(alpha: 0.1),
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
}

/// Gen Z Themed Widgets for Satpam Dashboard
class GenZWidgets {
  /// Build glassmorphic header card
  static Widget buildGlassHeader({
    required BuildContext context,
    required String title,
    required String subtitle,
    required IconData icon,
    String? badge,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: GenZTheme.primaryGradient,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: GenZTheme.electricPurple.withValues(alpha: 0.3),
            blurRadius: 20,
            spreadRadius: -5,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
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
                Text(title, style: GenZTheme.headingMediumFor(context)),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: GenZTheme.bodyMediumFor(
                    context,
                  ).copyWith(color: Colors.white.withValues(alpha: 0.8)),
                ),
              ],
            ),
          ),
          if (badge != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: GenZTheme.mintGreen,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                badge,
                style: GenZTheme.labelBoldFor(
                  context,
                ).copyWith(color: GenZTheme.gray900, fontSize: 12),
              ),
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
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: GenZTheme.neonStatCard(color: color),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: GenZTheme.iconContainer(color: color),
                child: Icon(icon, color: Colors.white, size: 20),
              ),
              Text(value, style: GenZTheme.statValueFor(context, color: color)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            label,
            style: GenZTheme.statLabelFor(context, color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: GenZTheme.bodySmallFor(
                context,
              ).copyWith(color: color.withValues(alpha: 0.6)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ],
      ),
    );
  }

  /// Build activity item card
  static Widget buildActivityCard({
    required BuildContext context,
    required String plate,
    required String action,
    required String time,
    required String driver,
  }) {
    final isEntry = action.toLowerCase() == 'entry';
    final color = isEntry ? GenZTheme.mintGreen : GenZTheme.neoBlue;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: GenZTheme.activityCardFor(context),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              isEntry ? Icons.login_rounded : Icons.logout_rounded,
              color: color,
              size: 22,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(plate, style: GenZTheme.labelBoldFor(context)),
                const SizedBox(height: 3),
                Text('$driver • $time', style: GenZTheme.bodySmallFor(context)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              isEntry ? 'MASUK' : 'KELUAR',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: color,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Build section header with action
  static Widget buildSectionHeader({
    required BuildContext context,
    required String title,
    required VoidCallback onAction,
    String actionText = 'Lihat Semua',
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: GenZTheme.headingSmallFor(context)),
        TextButton(
          onPressed: onAction,
          style: TextButton.styleFrom(
            foregroundColor: GenZTheme.electricPurple,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                actionText,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: GenZTheme.electricPurple,
                ),
              ),
              const SizedBox(width: 4),
              Icon(
                Icons.arrow_forward_ios,
                size: 12,
                color: GenZTheme.electricPurple,
              ),
            ],
          ),
        ),
      ],
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
              ? GenZTheme.electricPurple.withValues(alpha: 0.15)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: isSelected ? GenZTheme.electricPurple : GenZTheme.gray500,
              size: 24,
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                color: isSelected
                    ? GenZTheme.electricPurple
                    : GenZTheme.gray500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build time badge
  static Widget buildTimeBadge(BuildContext context, String time) {
    final c = GenZTheme.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: c.cardBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: GenZTheme.electricPurple.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.access_time_rounded,
            size: 16,
            color: GenZTheme.electricPurple,
          ),
          const SizedBox(width: 8),
          Text(
            time,
            style: GenZTheme.labelBoldFor(
              context,
            ).copyWith(color: GenZTheme.electricPurple, fontSize: 15),
          ),
        ],
      ),
    );
  }

  /// Build shift info card
  static Widget buildShiftInfoCard({
    required BuildContext context,
    required String shiftInfo,
    required String currentTime,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: GenZTheme.mintGreen.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: GenZTheme.mintGreen.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(
            Icons.work_history_rounded,
            color: GenZTheme.mintGreen,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              shiftInfo,
              style: GenZTheme.bodyMediumFor(
                context,
              ).copyWith(color: GenZTheme.mintGreen),
            ),
          ),
          buildTimeBadge(context, currentTime),
        ],
      ),
    );
  }

  /// Build offline mode banner
  static Widget buildOfflineBanner(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.wifi_off_rounded, size: 18, color: Colors.orange[400]),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Mode Offline — Data di-sync saat terhubung',
              style: GenZTheme.bodySmallFor(
                context,
              ).copyWith(color: Colors.orange[400]),
            ),
          ),
        ],
      ),
    );
  }
}
