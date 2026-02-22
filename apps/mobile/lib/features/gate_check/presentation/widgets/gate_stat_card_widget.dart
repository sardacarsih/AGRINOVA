import 'package:flutter/material.dart';

/// Enhanced Gate Statistics Card Widget
/// 
/// Provides improved text validation and positioning for gate statistics
/// with proper overflow handling and responsive design
class GateStatCardWidget extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final String? subtitle;
  final bool isCompact;
  final VoidCallback? onTap;

  const GateStatCardWidget({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.subtitle,
    this.isCompact = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(isCompact ? 10 : 12),
      child: Container(
        padding: EdgeInsets.all(isCompact ? 12 : 16),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(isCompact ? 10 : 12),
          border: Border.all(color: color.withValues(alpha: 0.3)),
        ),
        child: LayoutBuilder(
          builder: (context, constraints) {
            // Determine layout based on available width
            if (constraints.maxWidth < 140) {
              return _buildCompactLayout(context);
            } else {
              return _buildNormalLayout(context);
            }
          },
        ),
      ),
    );
  }

  Widget _buildNormalLayout(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Top row with icon and value
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              icon,
              color: color,
              size: isCompact ? 20 : 24,
            ),
            Expanded(
              child: Text(
                value,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                  fontSize: isCompact ? 18 : 20,
                ),
                textAlign: TextAlign.right,
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ),
          ],
        ),
        
        SizedBox(height: isCompact ? 8 : 12),
        
        // Bottom section with title and subtitle
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w600,
                fontSize: isCompact ? 12 : 13,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(
                subtitle!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: color.withValues(alpha: 0.7),
                  fontSize: isCompact ? 10 : 11,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ],
    );
  }

  Widget _buildCompactLayout(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Icon positioned above text
        Icon(
          icon,
          color: color,
          size: 20,
        ),
        const SizedBox(height: 4),
        
        // Title text positioned below icon
        Text(
          title,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w600,
            fontSize: 11,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          textAlign: TextAlign.center,
        ),
        
        const SizedBox(height: 2),
        
        // Value displayed prominently
        Text(
          value,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
          overflow: TextOverflow.ellipsis,
          maxLines: 1,
          textAlign: TextAlign.center,
        ),
        
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle!,
            style: TextStyle(
              color: color.withValues(alpha: 0.7),
              fontSize: 9,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );
  }
}

/// Factory methods for common gate statistics
class GateStatCards {
  static Widget buildVehiclesInsideCard({
    required int count,
    required int pendingExit,
    bool isCompact = false,
    VoidCallback? onTap,
  }) {
    return GateStatCardWidget(
      title: 'Kendaraan di Dalam',
      value: count.toString(),
      icon: Icons.local_shipping,
      color: Colors.orange,
      subtitle: '$pendingExit menunggu keluar',
      isCompact: isCompact,
      onTap: onTap,
    );
  }

  static Widget buildTodayEntriesCard({
    required int count,
    bool isCompact = false,
    VoidCallback? onTap,
  }) {
    return GateStatCardWidget(
      title: 'Masuk Hari Ini',
      value: count.toString(),
      icon: Icons.login,
      color: Colors.green,
      isCompact: isCompact,
      onTap: onTap,
    );
  }

  static Widget buildTodayExitsCard({
    required int count,
    bool isCompact = false,
    VoidCallback? onTap,
  }) {
    return GateStatCardWidget(
      title: 'Keluar Hari Ini',
      value: count.toString(),
      icon: Icons.logout,
      color: Colors.blue,
      isCompact: isCompact,
      onTap: onTap,
    );
  }

  static Widget buildComplianceCard({
    required double rate,
    required int violations,
    bool isCompact = false,
    VoidCallback? onTap,
  }) {
    return GateStatCardWidget(
      title: 'Tingkat Kepatuhan',
      value: '${rate.toStringAsFixed(1)}%',
      icon: Icons.verified,
      color: Colors.purple,
      subtitle: '$violations pelanggaran',
      isCompact: isCompact,
      onTap: onTap,
    );
  }
}
