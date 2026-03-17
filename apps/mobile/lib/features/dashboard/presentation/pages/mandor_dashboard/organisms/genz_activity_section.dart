// Gen Z Activity Section - Organism Component for Mandor Dashboard
// Recent activity section with empty state and list

import 'package:flutter/material.dart';
import '../../../../../../core/theme/runtime_mobile_theme.dart';
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
    super.key,
    this.items = const [],
    this.onViewAll,
    this.maxItems = 5,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildHeader(context),
        const SizedBox(height: 14),
        items.isEmpty ? _buildEmptyState(context) : _buildItemsList(context),
      ],
    );
  }

  Widget _buildHeader(BuildContext context) {
    final runtimeTheme = RuntimeMobileTheme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('Aktivitas Terkini', style: MandorTheme.headingSmallFor(context)),
        if (onViewAll != null)
          TextButton(
            onPressed: onViewAll,
            style: TextButton.styleFrom(
              foregroundColor: runtimeTheme.success,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Lihat Semua',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: runtimeTheme.success,
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  Icons.arrow_forward_ios,
                  size: 12,
                  color: runtimeTheme.success,
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = MandorTheme.of(context);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.borderColor.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.borderColor.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Icon(
            Icons.history_rounded,
            size: 48,
            color: theme.bodyTertiary,
          ),
          const SizedBox(height: 12),
          Text(
            'Belum ada aktivitas',
            style: MandorTheme.bodyLargeFor(context).copyWith(
              color: theme.bodySecondary,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            'Mulai input panen untuk melihat aktivitas Anda',
            style: MandorTheme.bodySmallFor(context).copyWith(
              color: theme.bodyTertiary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildItemsList(BuildContext context) {
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
    required this.item,
  });

  @override
  Widget build(BuildContext context) {
    final runtimeTheme = RuntimeMobileTheme.of(context);
    final config = _getConfig(context);
    final theme = MandorTheme.of(context);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.cardBackground.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: runtimeTheme.borderTint(
            config.color,
            lightAlpha: 0.22,
            darkAlpha: 0.32,
          ),
        ),
      ),
      child: Row(
        children: [
          _buildIcon(context, config),
          const SizedBox(width: 14),
          Expanded(child: _buildContent(context)),
          _buildTimeBadge(context),
        ],
      ),
    );
  }

  Widget _buildIcon(BuildContext context, _ActivityConfig config) {
    final runtimeTheme = RuntimeMobileTheme.of(context);
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: runtimeTheme.iconTint(
          config.color,
          lightAlpha: 0.16,
          darkAlpha: 0.24,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        config.icon,
        color: config.color,
        size: 22,
      ),
    );
  }

  Widget _buildContent(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          item.title,
          style: MandorTheme.labelBoldFor(context),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 3),
        Text(
          item.subtitle,
          style: MandorTheme.bodySmallFor(context),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildTimeBadge(BuildContext context) {
    return Text(
      item.time,
      style: MandorTheme.bodySmallFor(context).copyWith(
        color: MandorTheme.of(context).bodyTertiary,
      ),
    );
  }

  _ActivityConfig _getConfig(BuildContext context) {
    final runtimeTheme = RuntimeMobileTheme.of(context);
    switch (item.type) {
      case ActivityType.harvest:
        return _ActivityConfig(
          color: runtimeTheme.success,
          icon: Icons.agriculture_rounded,
        );
      case ActivityType.approval:
        return _ActivityConfig(
          color: item.isSuccess ? runtimeTheme.success : runtimeTheme.danger,
          icon: item.isSuccess ? Icons.check_circle_rounded : Icons.cancel_rounded,
        );
      case ActivityType.sync:
        return _ActivityConfig(
          color: runtimeTheme.info,
          icon: Icons.sync_rounded,
        );
      case ActivityType.employee:
        return _ActivityConfig(
          color: runtimeTheme.info,
          icon: Icons.people_rounded,
        );
      case ActivityType.block:
        return _ActivityConfig(
          color: runtimeTheme.primary,
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
