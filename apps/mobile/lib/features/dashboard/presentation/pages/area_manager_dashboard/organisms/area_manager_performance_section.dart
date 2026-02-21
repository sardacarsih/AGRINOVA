import 'package:flutter/material.dart';
import '../area_manager_theme.dart';
import '../molecules/area_manager_performance_bar.dart';

/// Estate performance data model
class EstatePerformance {
  final String name;
  final double percentage;
  final Color? color;

  const EstatePerformance({
    required this.name,
    required this.percentage,
    this.color,
  });
}

/// Organism: Estate Performance Ranking Section for Area Manager
/// Horizontal progress bars showing estate rankings
class AreaManagerPerformanceSection extends StatelessWidget {
  final List<EstatePerformance> performances;

  const AreaManagerPerformanceSection({
    super.key,
    this.performances = const [],
  });

  // Default performance data
  static List<EstatePerformance> get defaultPerformances => const [
        EstatePerformance(name: 'Estate Utara', percentage: 95),
        EstatePerformance(name: 'Estate Timur', percentage: 88),
        EstatePerformance(name: 'Estate Selatan', percentage: 82),
        EstatePerformance(
          name: 'Estate Barat',
          percentage: 78,
          color: Color(0xFFEA580C),
        ),
        EstatePerformance(name: 'Estate Tengah', percentage: 91),
      ];

  @override
  Widget build(BuildContext context) {
    final items = performances.isEmpty ? defaultPerformances : performances;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Estate Performance Ranking',
            style: AreaManagerTheme.headingMedium),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                AreaManagerTheme.primaryTealDark,
                AreaManagerTheme.primaryTeal,
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AreaManagerTheme.primaryTeal.withOpacity(0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: items
                .map((item) => AreaManagerPerformanceBar(
                      estateName: item.name,
                      percentage: item.percentage,
                      barColor: item.color,
                    ))
                .toList(),
          ),
        ),
      ],
    );
  }
}
