import 'package:flutter/material.dart';

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

  // === GLASSMORPHISM STYLES ===
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
        colors: [
          color.withValues(alpha: 0.15),
          color.withValues(alpha: 0.05),
        ],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(borderRadius),
      border: Border.all(
        color: color.withValues(alpha: 0.3),
        width: 1.5,
      ),
      boxShadow: [
        BoxShadow(
          color: color.withValues(alpha: 0.2),
          blurRadius: 12,
          spreadRadius: -2,
        ),
      ],
    );
  }

  // === TEXT STYLES ===
  static const TextStyle headingLarge = TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: softWhite,
    letterSpacing: -0.5,
  );
  
  static const TextStyle headingMedium = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w600,
    color: softWhite,
    letterSpacing: -0.3,
  );
  
  static const TextStyle headingSmall = TextStyle(
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: softWhite,
  );
  
  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w500,
    color: gray300,
  );
  
  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: gray400,
  );
  
  static const TextStyle bodySmall = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: gray500,
  );
  
  static const TextStyle labelBold = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: softWhite,
    letterSpacing: 0.5,
  );
  
  static TextStyle statValue({Color? color}) => TextStyle(
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: color ?? softWhite,
    letterSpacing: -0.5,
  );
  
  static TextStyle statLabel({Color? color}) => TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: color ?? gray400,
  );
  
  static const TextStyle labelSmall = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    color: gray500,
  );
  
  static const TextStyle labelMedium = TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: gray400,
  );
  
  static const TextStyle buttonText = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    color: softWhite,
  );
  
  /// Convenience getter for default glass card decoration
  static BoxDecoration get glassCardBox => glassCard();

  // === ICON STYLES ===
  static BoxDecoration iconContainer({
    required Color color,
    double size = 44,
  }) {
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
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
    ),
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
  static BoxDecoration activityCard = BoxDecoration(
    color: gray800.withValues(alpha: 0.6),
    borderRadius: BorderRadius.circular(14),
    border: Border.all(
      color: gray700.withValues(alpha: 0.5),
      width: 1,
    ),
  );

  // === BOTTOM NAV STYLES ===
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
  static LinearGradient shimmerGradient = LinearGradient(
    colors: [
      gray800,
      gray700,
      gray800,
    ],
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
                    Text(title, style: MandorTheme.headingMedium),
                    const SizedBox(height: 4),
                    Text(subtitle, style: MandorTheme.bodyMedium.copyWith(
                      color: Colors.white.withValues(alpha: 0.8),
                    )),
                  ],
                ),
              ),
              if (badge != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: MandorTheme.limeGreen,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    badge,
                    style: MandorTheme.labelBold.copyWith(
                      color: MandorTheme.gray900,
                      fontSize: 12,
                    ),
                  ),
                ),
            ],
          ),
          if (isOffline) ...[
            const SizedBox(height: 12),
            _buildOfflineBanner(),
          ],
        ],
      ),
    );
  }

  static Widget _buildOfflineBanner() {
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
          Icon(Icons.wifi_off_rounded, size: 16, color: MandorTheme.amberOrange),
          const SizedBox(width: 10),
          Text(
            'Mode Offline — Data disinkronkan saat online',
            style: MandorTheme.bodySmall.copyWith(
              color: MandorTheme.amberOrange,
            ),
          ),
        ],
      ),
    );
  }

  /// Build neon stat card
  static Widget buildStatCard({
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
              Text(value, style: MandorTheme.statValue(color: color)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            label,
            style: MandorTheme.statLabel(color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: MandorTheme.bodySmall.copyWith(color: color.withValues(alpha: 0.6)),
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
    required String title,
    VoidCallback? onAction,
    String actionText = 'Lihat Semua',
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: MandorTheme.headingSmall),
        if (onAction != null)
          TextButton(
            onPressed: onAction,
            style: TextButton.styleFrom(
              foregroundColor: MandorTheme.forestGreen,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(actionText, style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: MandorTheme.forestGreen,
                )),
                const SizedBox(width: 4),
                Icon(Icons.arrow_forward_ios, size: 12, color: MandorTheme.forestGreen),
              ],
            ),
          ),
      ],
    );
  }

  /// Build empty state card
  static Widget buildEmptyState({
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
            style: MandorTheme.bodyLarge.copyWith(color: stateColor),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            style: MandorTheme.bodySmall.copyWith(color: stateColor.withValues(alpha: 0.7)),
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
          color: isSelected ? MandorTheme.forestGreen.withValues(alpha: 0.15) : Colors.transparent,
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
                color: isSelected ? MandorTheme.forestGreen : MandorTheme.gray500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

