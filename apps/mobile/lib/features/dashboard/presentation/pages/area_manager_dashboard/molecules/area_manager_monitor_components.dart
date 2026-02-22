import 'package:flutter/material.dart';
import '../area_manager_theme.dart';

/// Summary Stats Bar with 4 items (Estate, Today, Manager, Efficiency)
class AreaManagerMonitorSummaryBar extends StatelessWidget {
  final int estateCount;
  final String todayProduction;
  final int managerCount;
  final String efficiency;

  const AreaManagerMonitorSummaryBar({
    super.key,
    required this.estateCount,
    required this.todayProduction,
    required this.managerCount,
    required this.efficiency,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildStatItem(
            icon: Icons.park,
            iconColor: AreaManagerTheme.primaryTeal,
            value: estateCount.toString(),
            label: 'Estate',
          ),
          _buildDivider(),
          _buildStatItem(
            icon: Icons.trending_up,
            iconColor: AreaManagerTheme.primaryGreen,
            value: todayProduction,
            label: 'Today',
            suffix: 'ton',
          ),
          _buildDivider(),
          _buildStatItem(
            icon: Icons.person,
            iconColor: AreaManagerTheme.infoBlue,
            value: managerCount.toString(),
            label: 'Manager',
          ),
          _buildDivider(),
          _buildStatItem(
            icon: Icons.verified_user,
            iconColor: AreaManagerTheme.activeGreen,
            value: efficiency,
            label: 'Efficiency',
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required Color iconColor,
    required String value,
    required String label,
    String? suffix,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: iconColor, size: 16),
            const SizedBox(width: 4),
            Text(
              suffix != null ? '$value $suffix' : value,
              style: TextStyle(
                color: iconColor,
                fontWeight: FontWeight.bold,
                fontSize: 13,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: Colors.grey[600],
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 30,
      width: 1,
      color: Colors.grey[300],
    );
  }
}

/// Filter Tabs (Semua, Active, Alert, Maintenance)
class AreaManagerMonitorFilterTabs extends StatelessWidget {
  final List<String> filters;
  final int selectedIndex;
  final ValueChanged<int> onFilterSelected;

  const AreaManagerMonitorFilterTabs({
    super.key,
    required this.filters,
    required this.selectedIndex,
    required this.onFilterSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: filters.asMap().entries.map((entry) {
          final index = entry.key;
          final label = entry.value;
          final isSelected = index == selectedIndex;

          return GestureDetector(
            onTap: () => onFilterSelected(index),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                border: Border(
                  bottom: BorderSide(
                    color: isSelected
                        ? AreaManagerTheme.primaryTeal
                        : Colors.transparent,
                    width: 2,
                  ),
                ),
              ),
              child: Text(
                label,
                style: TextStyle(
                  color: isSelected
                      ? AreaManagerTheme.primaryTeal
                      : Colors.grey[600],
                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  fontSize: 14,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

/// Estate Card for the grid view
class AreaManagerEstateCard extends StatelessWidget {
  final String estateName;
  final String location;
  final String managerName;
  final double todayProduction;
  final double efficiency;
  final double targetProgress;
  final bool isEfficiencyUp;
  final bool isActive;
  final VoidCallback? onViewDetail;

  const AreaManagerEstateCard({
    super.key,
    required this.estateName,
    required this.location,
    required this.managerName,
    required this.todayProduction,
    required this.efficiency,
    required this.targetProgress,
    this.isEfficiencyUp = true,
    this.isActive = true,
    this.onViewDetail,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with status and estate info
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status indicator
              Container(
                width: 8,
                height: 8,
                margin: const EdgeInsets.only(top: 4),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isActive
                      ? AreaManagerTheme.activeGreen
                      : AreaManagerTheme.alertYellow,
                ),
              ),
              const SizedBox(width: 8),
              // Estate icon
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: AreaManagerTheme.primaryTeal.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(
                  Icons.business,
                  color: AreaManagerTheme.primaryTeal,
                  size: 18,
                ),
              ),
              const SizedBox(width: 8),
              // Estate name and location
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      estateName,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: AreaManagerTheme.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    Text(
                      location,
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.grey[500],
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 4),

          // Manager info
          Row(
            children: [
              Icon(Icons.person_outline, size: 12, color: Colors.grey[500]),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  managerName,
                  style: TextStyle(
                    fontSize: 10,
                    color: Colors.grey[600],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Production and Efficiency row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Production
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      "Today's production",
                      style: TextStyle(
                        fontSize: 9,
                        color: Colors.grey[500],
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${todayProduction.toStringAsFixed(1)} ton',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: AreaManagerTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              // Efficiency with mini chart
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'Efficiency',
                    style: TextStyle(
                      fontSize: 9,
                      color: Colors.grey[500],
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      // Mini trend chart
                      _buildMiniChart(isEfficiencyUp),
                      const SizedBox(width: 4),
                      Text(
                        '${efficiency.toStringAsFixed(1)}%',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                          color: isEfficiencyUp
                              ? AreaManagerTheme.activeGreen
                              : AreaManagerTheme.maintenanceRed,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 8),

          // Target progress
          Row(
            children: [
              Text(
                'Target progress',
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.grey[600],
                ),
              ),
              const Spacer(),
              Text(
                '${targetProgress.toInt()}%',
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: AreaManagerTheme.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: targetProgress / 100,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(
                AreaManagerTheme.primaryTeal,
              ),
              minHeight: 6,
            ),
          ),

          const SizedBox(height: 10),

          // View Detail button
          Center(
            child: OutlinedButton(
              onPressed: onViewDetail,
              style: OutlinedButton.styleFrom(
                foregroundColor: AreaManagerTheme.primaryTeal,
                side: BorderSide(color: AreaManagerTheme.primaryTeal),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                minimumSize: const Size(0, 28),
              ),
              child: const Text(
                'View Detail',
                style: TextStyle(fontSize: 11),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniChart(bool isUp) {
    return CustomPaint(
      size: const Size(30, 16),
      painter: _MiniChartPainter(isUp: isUp),
    );
  }
}

class _MiniChartPainter extends CustomPainter {
  final bool isUp;

  _MiniChartPainter({required this.isUp});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = isUp
          ? AreaManagerTheme.activeGreen
          : AreaManagerTheme.maintenanceRed
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();

    if (isUp) {
      // Upward trend
      path.moveTo(0, size.height * 0.8);
      path.lineTo(size.width * 0.3, size.height * 0.5);
      path.lineTo(size.width * 0.5, size.height * 0.6);
      path.lineTo(size.width * 0.7, size.height * 0.3);
      path.lineTo(size.width, size.height * 0.2);
    } else {
      // Downward trend
      path.moveTo(0, size.height * 0.2);
      path.lineTo(size.width * 0.3, size.height * 0.4);
      path.lineTo(size.width * 0.5, size.height * 0.3);
      path.lineTo(size.width * 0.7, size.height * 0.6);
      path.lineTo(size.width, size.height * 0.8);
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Floating Total Card at the bottom
class AreaManagerFloatingTotalCard extends StatelessWidget {
  final double totalToday;
  final double targetTon;
  final double targetPercentage;

  const AreaManagerFloatingTotalCard({
    super.key,
    required this.totalToday,
    required this.targetTon,
    required this.targetPercentage,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Left side - Total today
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Total Hari Ini:',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${totalToday.toStringAsFixed(1)} ton',
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AreaManagerTheme.textPrimary,
                  ),
                ),
              ],
            ),
          ),
          // Right side - Target with progress
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Target: ${targetTon.toInt()} ton (${targetPercentage.toInt()}%)',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: targetPercentage / 100,
                    backgroundColor: Colors.grey[200],
                    valueColor: AlwaysStoppedAnimation<Color>(
                      AreaManagerTheme.primaryTeal,
                    ),
                    minHeight: 8,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

