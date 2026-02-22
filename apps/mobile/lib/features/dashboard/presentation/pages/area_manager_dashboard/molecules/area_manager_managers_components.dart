import 'package:flutter/material.dart';
import '../area_manager_theme.dart';

/// Summary Header Card showing active managers count and key stats
class ManagersSummaryHeader extends StatelessWidget {
  final int activeManagers;
  final int estateCount;
  final String avgTonnage;
  final String performance;

  const ManagersSummaryHeader({
    super.key,
    required this.activeManagers,
    required this.estateCount,
    required this.avgTonnage,
    required this.performance,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: AreaManagerTheme.primaryGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AreaManagerTheme.primaryTeal.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Main stat
          Text(
            '$activeManagers Manager Aktif',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          // Sub-stats row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              _buildSubStat(estateCount.toString(), 'Estate'),
              _buildDivider(),
              _buildSubStat(avgTonnage, 'avg/manager'),
              _buildDivider(),
              _buildSubStat(performance, 'Performance'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSubStat(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.8),
            fontSize: 12,
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 30,
      width: 1,
      color: Colors.white.withValues(alpha: 0.3),
    );
  }
}

/// Filter Tabs for manager categories
class ManagersFilterTabs extends StatelessWidget {
  final List<String> filters;
  final int selectedIndex;
  final ValueChanged<int> onFilterSelected;

  const ManagersFilterTabs({
    super.key,
    required this.filters,
    required this.selectedIndex,
    required this.onFilterSelected,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: filters.asMap().entries.map((entry) {
          final index = entry.key;
          final label = entry.value;
          final isSelected = index == selectedIndex;

          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => onFilterSelected(index),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: isSelected ? AreaManagerTheme.primaryTeal : Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isSelected
                        ? AreaManagerTheme.primaryTeal
                        : Colors.grey.shade300,
                  ),
                ),
                child: Text(
                  label,
                  style: TextStyle(
                    color: isSelected ? Colors.white : Colors.grey[700],
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

/// Sort Row with dropdown and grid/list toggle
class ManagersSortRow extends StatelessWidget {
  final String selectedSort;
  final bool isGridView;
  final List<String> sortOptions;
  final ValueChanged<String> onSortChanged;
  final ValueChanged<bool> onViewToggle;

  const ManagersSortRow({
    super.key,
    required this.selectedSort,
    required this.isGridView,
    required this.sortOptions,
    required this.onSortChanged,
    required this.onViewToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // Sort dropdown
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: selectedSort,
                icon: const Icon(Icons.keyboard_arrow_down, size: 20),
                isDense: true,
                style: TextStyle(
                  color: Colors.grey[800],
                  fontSize: 13,
                ),
                items: sortOptions.map((option) {
                  return DropdownMenuItem(
                    value: option,
                    child: Text('Urutkan: $option'),
                  );
                }).toList(),
                onChanged: (value) {
                  if (value != null) onSortChanged(value);
                },
              ),
            ),
          ),
          const Spacer(),
          // Grid/List toggle
          Row(
            children: [
              Icon(
                Icons.grid_view,
                size: 20,
                color: !isGridView ? Colors.grey[400] : AreaManagerTheme.primaryTeal,
              ),
              const SizedBox(width: 4),
              Switch(
                value: !isGridView,
                onChanged: (value) => onViewToggle(!value),
                activeThumbColor: AreaManagerTheme.primaryTeal,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              Icon(
                Icons.view_list,
                size: 20,
                color: isGridView ? Colors.grey[400] : AreaManagerTheme.primaryTeal,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Manager Card with medal, stats, and action buttons
class ManagerCard extends StatefulWidget {
  final String name;
  final String initials;
  final String estateName;
  final String role;
  final double performance;
  final double monthlyTonnage;
  final int teamSize;
  final bool isActive;
  final int? rank; // 1, 2, 3 for medals, null for others
  final VoidCallback? onDetail;
  final VoidCallback? onEvaluate;

  const ManagerCard({
    super.key,
    required this.name,
    required this.initials,
    required this.estateName,
    required this.role,
    required this.performance,
    required this.monthlyTonnage,
    required this.teamSize,
    this.isActive = true,
    this.rank,
    this.onDetail,
    this.onEvaluate,
  });

  @override
  State<ManagerCard> createState() => _ManagerCardState();
}

class _ManagerCardState extends State<ManagerCard> {
  bool _isExpanded = false;

  Widget? _buildMedal() {
    if (widget.rank == null) return null;

    IconData icon = Icons.emoji_events;
    Color color;
    
    switch (widget.rank) {
      case 1:
        color = const Color(0xFFFFD700); // Gold
        break;
      case 2:
        color = const Color(0xFFC0C0C0); // Silver
        break;
      case 3:
        color = const Color(0xFFCD7F32); // Bronze
        break;
      default:
        return null;
    }

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color, size: 24),
    );
  }

  Color _getPerformanceColor() {
    if (widget.performance >= 90) return const Color(0xFF22C55E); // Green
    if (widget.performance >= 85) return const Color(0xFFEAB308); // Yellow
    if (widget.performance >= 80) return const Color(0xFFF97316); // Orange
    return const Color(0xFFEF4444); // Red
  }

  Color _getStatusColor() {
    return widget.isActive ? const Color(0xFF22C55E) : const Color(0xFFF97316);
  }

  String _getStatusLabel() {
    return widget.isActive ? 'Active' : 'Review';
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        if (widget.rank != null && widget.rank! <= 3) {
          setState(() {
            _isExpanded = !_isExpanded;
          });
        }
      },
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Row(
              children: [
                // Medal (if applicable)
                if (widget.rank != null && widget.rank! <= 3) ...[
                  _buildMedal()!,
                  const SizedBox(width: 10),
                ],
                // Avatar
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: AreaManagerTheme.primaryTeal.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Text(
                      widget.initials,
                      style: TextStyle(
                        color: AreaManagerTheme.primaryTeal,
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Name and Estate
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            widget.name,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                              color: AreaManagerTheme.textPrimary,
                            ),
                          ),
                          if (widget.rank != null && widget.rank! <= 3) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: AreaManagerTheme.primaryTeal,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Text(
                                widget.role,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            Icons.location_on,
                            size: 12,
                            color: Colors.grey[500],
                          ),
                          const SizedBox(width: 2),
                          Text(
                            widget.estateName,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Performance and Status Column
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '${widget.performance.toStringAsFixed(1)}%',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: _getPerformanceColor(),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Performance',
                      style: TextStyle(
                        fontSize: 10,
                        color: Colors.grey[500],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            // Stats Row
            Padding(
              padding: const EdgeInsets.only(top: 10, left: 54),
              child: Row(
                children: [
                  Text(
                    'This month: ',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[500],
                    ),
                  ),
                  Text(
                    '${widget.monthlyTonnage.toStringAsFixed(1)} ton',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AreaManagerTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Text(
                    'Team size: ',
                    style: TextStyle(
                      fontSize: 11,
                      color: Colors.grey[500],
                    ),
                  ),
                  Text(
                    '${widget.teamSize} orang',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AreaManagerTheme.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  // Status badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getStatusLabel(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Expanded actions (for top 3 or when tapped)
            if (_isExpanded) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: widget.onDetail,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AreaManagerTheme.primaryTeal,
                        side: BorderSide(color: AreaManagerTheme.primaryTeal),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      child: const Text('Detail'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: widget.onEvaluate,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AreaManagerTheme.primaryTeal,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      child: const Text('Evaluate'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Bottom Performance Summary Card
class ManagersBottomSummary extends StatelessWidget {
  final String avgPerformance;
  final String targetAchievement;
  final VoidCallback? onEvaluateBatch;

  const ManagersBottomSummary({
    super.key,
    required this.avgPerformance,
    required this.targetAchievement,
    this.onEvaluateBatch,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Stats
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Text(
                      'Avg Performance: ',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                    Text(
                      avgPerformance,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AreaManagerTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      'Target Achievement: ',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                    Text(
                      targetAchievement,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AreaManagerTheme.textPrimary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const Spacer(),
            // FAB-like button
            ElevatedButton.icon(
              onPressed: onEvaluateBatch,
              icon: const Icon(Icons.check_circle_outline, size: 18),
              label: const Text('Evaluasi Batch'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF22C55E),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

