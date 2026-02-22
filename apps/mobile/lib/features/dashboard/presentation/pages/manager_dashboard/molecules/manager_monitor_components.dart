import 'package:flutter/material.dart';
import '../manager_theme.dart';

// --- Monitor Summary Card ---
class MonitorSummaryCard extends StatelessWidget {
  final int totalTeam;
  final int totalMandor;
  final int totalAsisten;
  final int totalPemanen;
  final double efficiency;

  const MonitorSummaryCard({
    super.key,
    required this.totalTeam,
    required this.totalMandor,
    required this.totalAsisten,
    required this.totalPemanen,
    required this.efficiency,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: ManagerTheme.primaryGradient,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: ManagerTheme.primaryPurple.withValues(alpha: 0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background decoration circles
          Positioned(
            right: -20,
            top: -20,
            child: CircleAvatar(
              radius: 60,
              backgroundColor: Colors.white.withValues(alpha: 0.1),
            ),
          ),
          Positioned(
            left: -30,
            bottom: -30,
            child: CircleAvatar(
              radius: 50,
              backgroundColor: Colors.white.withValues(alpha: 0.1),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Total Tim: $totalTeam orang',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildStatItem(Icons.assignment_ind,
                        totalAsisten.toString(), 'Asisten'),
                    _buildDivider(),
                    _buildStatItem(
                        Icons.person, totalMandor.toString(), 'Mandor'),
                    _buildDivider(),
                    _buildStatItem(
                        Icons.agriculture, totalPemanen.toString(), 'Pemanen'),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'Efisiensi:',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$efficiency%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_upward,
                          color: Colors.white, size: 16),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 24),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
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

// --- Monitor Filter Tabs ---
class MonitorFilterTabs extends StatelessWidget {
  final List<String> filters;
  final int selectedIndex;
  final ValueChanged<int> onFilterSelected;

  const MonitorFilterTabs({
    super.key,
    required this.filters,
    required this.selectedIndex,
    required this.onFilterSelected,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        children: filters.asMap().entries.map((entry) {
          final index = entry.key;
          final label = entry.value;
          final isSelected = index == selectedIndex;

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: ChoiceChip(
              label: Text(label),
              selected: isSelected,
              onSelected: (selected) {
                if (selected) onFilterSelected(index);
              },
              backgroundColor: Colors.grey[200],
              selectedColor: ManagerTheme.primaryPurple,
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : Colors.grey[700],
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(
                  color: isSelected
                      ? ManagerTheme.primaryPurple
                      : Colors.transparent,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// --- Monitor Sort Bar ---
class MonitorSortBar extends StatelessWidget {
  final VoidCallback onToggleView;
  final bool isGridView;

  const MonitorSortBar({
    super.key,
    required this.onToggleView,
    required this.isGridView,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey[300]!),
          ),
          child: Row(
            children: [
              Text(
                'Urutkan: Performa',
                style: TextStyle(
                  color: Colors.grey[700],
                  fontSize: 14,
                ),
              ),
              const SizedBox(width: 4),
              Icon(Icons.keyboard_arrow_down,
                  size: 20, color: Colors.grey[700]),
            ],
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              _buildViewIcon(Icons.list, !isGridView),
              _buildViewIcon(Icons.grid_view, isGridView),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildViewIcon(IconData icon, bool isActive) {
    return GestureDetector(
      onTap: onToggleView,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isActive ? ManagerTheme.primaryPurple : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 20,
          color: isActive ? Colors.white : Colors.grey[600],
        ),
      ),
    );
  }
}

// --- Monitor Employee Card ---
class MonitorEmployeeCard extends StatelessWidget {
  final String name;
  final String role;
  final String division;
  final double performance;
  final double production;
  final bool isActive;
  final String initials;
  final Color avatarColor;
  final VoidCallback? onDetail;
  final VoidCallback? onEvaluate;

  const MonitorEmployeeCard({
    super.key,
    required this.name,
    required this.role,
    required this.division,
    required this.performance,
    required this.production,
    required this.isActive,
    required this.initials,
    required this.avatarColor,
    this.onDetail,
    this.onEvaluate,
  });

  Color _getRoleColor(String role) {
    switch (role.toLowerCase()) {
      case 'mandor':
        return Colors.blue[700]!;
      case 'asisten':
        return Colors.orange[700]!;
      default:
        return Colors.grey[700]!;
    }
  }

  Color _getRoleBgColor(String role) {
    switch (role.toLowerCase()) {
      case 'mandor':
        return Colors.blue[50]!;
      case 'asisten':
        return Colors.orange[50]!;
      default:
        return Colors.grey[100]!;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: avatarColor,
                child: Text(
                  initials,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Colors.black87,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: _getRoleBgColor(role),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            role,
                            style: TextStyle(
                              fontSize: 10,
                              color: _getRoleColor(role),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          division,
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
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '$performance%',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                      color: ManagerTheme.primaryPurple,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Production: $production ton',
                    style: TextStyle(
                      fontSize: 10,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isActive ? Colors.green : Colors.red,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isActive ? 'Active' : 'Inactive',
                        style: TextStyle(
                          fontSize: 10,
                          color: isActive ? Colors.green : Colors.red,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onDetail,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: ManagerTheme.primaryPurple,
                    side: BorderSide(color: ManagerTheme.primaryPurple),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 0),
                  ),
                  child: const Text('Detail'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: onEvaluate,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: ManagerTheme.primaryPurple,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 0),
                    elevation: 0,
                  ),
                  child: const Text('Evaluate'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

