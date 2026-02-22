import 'package:flutter/material.dart';

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
    fontSize: 32,
    fontWeight: FontWeight.w700,
    color: color ?? softWhite,
    letterSpacing: -1,
  );
  
  static TextStyle statLabel({Color? color}) => TextStyle(
    fontSize: 13,
    fontWeight: FontWeight.w500,
    color: color ?? gray400,
  );

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
    backgroundColor: electricPurple,
    foregroundColor: softWhite,
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
    ),
    elevation: 0,
  );
  
  static ButtonStyle secondaryButton = ElevatedButton.styleFrom(
    backgroundColor: Colors.transparent,
    foregroundColor: electricPurple,
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(14),
      side: BorderSide(color: electricPurple.withValues(alpha: 0.5), width: 1.5),
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
        color: electricPurple.withValues(alpha: 0.1),
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
}

/// Gen Z Themed Widgets for Satpam Dashboard
class GenZWidgets {
  /// Build glassmorphic header card
  static Widget buildGlassHeader({
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
                Text(title, style: GenZTheme.headingMedium),
                const SizedBox(height: 4),
                Text(subtitle, style: GenZTheme.bodyMedium.copyWith(
                  color: Colors.white.withValues(alpha: 0.8),
                )),
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
                style: GenZTheme.labelBold.copyWith(
                  color: GenZTheme.gray900,
                  fontSize: 12,
                ),
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
              Text(value, style: GenZTheme.statValue(color: color)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            label,
            style: GenZTheme.statLabel(color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: GenZTheme.bodySmall.copyWith(color: color.withValues(alpha: 0.6)),
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
      decoration: GenZTheme.activityCard,
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
                Text(
                  plate,
                  style: GenZTheme.labelBold,
                ),
                const SizedBox(height: 3),
                Text(
                  '$driver • $time',
                  style: GenZTheme.bodySmall,
                ),
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
    required String title,
    required VoidCallback onAction,
    String actionText = 'Lihat Semua',
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: GenZTheme.headingSmall),
        TextButton(
          onPressed: onAction,
          style: TextButton.styleFrom(
            foregroundColor: GenZTheme.electricPurple,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(actionText, style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: GenZTheme.electricPurple,
              )),
              const SizedBox(width: 4),
              Icon(Icons.arrow_forward_ios, size: 12, color: GenZTheme.electricPurple),
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
          color: isSelected ? GenZTheme.electricPurple.withValues(alpha: 0.15) : Colors.transparent,
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
                color: isSelected ? GenZTheme.electricPurple : GenZTheme.gray500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Build time badge
  static Widget buildTimeBadge(String time) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: GenZTheme.gray800,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: GenZTheme.electricPurple.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.access_time_rounded, size: 16, color: GenZTheme.electricPurple),
          const SizedBox(width: 8),
          Text(
            time,
            style: GenZTheme.labelBold.copyWith(
              color: GenZTheme.electricPurple,
              fontSize: 15,
            ),
          ),
        ],
      ),
    );
  }

  /// Build shift info card
  static Widget buildShiftInfoCard({
    required String shiftInfo,
    required String currentTime,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: GenZTheme.mintGreen.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: GenZTheme.mintGreen.withValues(alpha: 0.3),
        ),
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
              style: GenZTheme.bodyMedium.copyWith(
                color: GenZTheme.mintGreen,
              ),
            ),
          ),
          buildTimeBadge(currentTime),
        ],
      ),
    );
  }

  /// Build offline mode banner
  static Widget buildOfflineBanner() {
    return Container(
      margin: const EdgeInsets.only(top: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: Colors.orange.withValues(alpha: 0.3),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.wifi_off_rounded, size: 18, color: Colors.orange[400]),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Mode Offline — Data di-sync saat terhubung',
              style: GenZTheme.bodySmall.copyWith(
                color: Colors.orange[400],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

