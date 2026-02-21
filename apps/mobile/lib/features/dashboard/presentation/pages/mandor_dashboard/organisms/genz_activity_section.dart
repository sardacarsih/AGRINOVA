// Gen Z Activity Section - Organism Component for Mandor Dashboard
// Recent activity section with empty state and list

import 'package:flutter/material.dart';
import '../mandor_theme.dart';

/// Activity type enum
enum ActivityType {
  harvest,
  approval,
  sync,
  employee,
  block,
}

/// Activity item data model
class ActivityItem {
  final String id;
  final String title;
  final String subtitle;
  final String time;
  final ActivityType type;
  final bool isSuccess;

  const ActivityItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.time,
    required this.type,
    this.isSuccess = true,
  });
}

/// Recent activity section organism
class GenZActivitySection extends StatelessWidget {
  final List<ActivityItem> items;
  final VoidCallback? onViewAll;
  final int maxItems;

  const GenZActivitySection({
    Key? key,
    this.items = const [],
    this.onViewAll,
    this.maxItems = 5,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildHeader(),
        const SizedBox(height: 14),
        items.isEmpty ? _buildEmptyState() : _buildItemsList(),
      ],
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('Aktivitas Terkini', style: MandorTheme.headingSmall),
        if (onViewAll != null)
          TextButton(
            onPressed: onViewAll,
            style: TextButton.styleFrom(
              foregroundColor: MandorTheme.forestGreen,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Lihat Semua',
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

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: MandorTheme.gray700.withOpacity(0.3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: MandorTheme.gray600.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(
            Icons.history_rounded,
            size: 48,
            color: MandorTheme.gray500,
          ),
          const SizedBox(height: 12),
          Text(
            'Belum ada aktivitas',
            style: MandorTheme.bodyLarge.copyWith(
              color: MandorTheme.gray400,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            'Mulai input panen untuk melihat aktivitas Anda',
            style: MandorTheme.bodySmall.copyWith(
              color: MandorTheme.gray500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildItemsList() {
    final displayItems = items.take(maxItems).toList();
    
    return Column(
      children: displayItems.map((item) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: _ActivityItemCard(item: item),
      )).toList(),
    );
  }
}

/// Single activity item card
class _ActivityItemCard extends StatelessWidget {
  final ActivityItem item;

  const _ActivityItemCard({
    Key? key,
    required this.item,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final config = _getConfig();
    
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: MandorTheme.gray800.withOpacity(0.6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: MandorTheme.gray700.withOpacity(0.5),
        ),
      ),
      child: Row(
        children: [
          _buildIcon(config),
          const SizedBox(width: 14),
          Expanded(child: _buildContent()),
          _buildTimeBadge(),
        ],
      ),
    );
  }

  Widget _buildIcon(_ActivityConfig config) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: config.color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        config.icon,
        color: config.color,
        size: 22,
      ),
    );
  }

  Widget _buildContent() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          item.title,
          style: MandorTheme.labelBold,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 3),
        Text(
          item.subtitle,
          style: MandorTheme.bodySmall,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildTimeBadge() {
    return Text(
      item.time,
      style: MandorTheme.bodySmall.copyWith(
        color: MandorTheme.gray500,
      ),
    );
  }

  _ActivityConfig _getConfig() {
    switch (item.type) {
      case ActivityType.harvest:
        return _ActivityConfig(
          color: MandorTheme.forestGreen,
          icon: Icons.agriculture_rounded,
        );
      case ActivityType.approval:
        return _ActivityConfig(
          color: item.isSuccess ? MandorTheme.forestGreen : MandorTheme.coralRed,
          icon: item.isSuccess ? Icons.check_circle_rounded : Icons.cancel_rounded,
        );
      case ActivityType.sync:
        return _ActivityConfig(
          color: MandorTheme.electricBlue,
          icon: Icons.sync_rounded,
        );
      case ActivityType.employee:
        return _ActivityConfig(
          color: MandorTheme.electricBlue,
          icon: Icons.people_rounded,
        );
      case ActivityType.block:
        return _ActivityConfig(
          color: MandorTheme.purpleAccent,
          icon: Icons.location_on_rounded,
        );
    }
  }
}

class _ActivityConfig {
  final Color color;
  final IconData icon;

  _ActivityConfig({
    required this.color,
    required this.icon,
  });
}
