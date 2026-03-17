// Gen Z Pending Section - Organism Component for Mandor Dashboard
// Pending approvals section with empty state and list

import 'package:flutter/material.dart';
import '../../../../../../core/theme/runtime_mobile_theme.dart';
import '../mandor_theme.dart';

/// Pending item data model
class PendingItem {
  final String id;
  final String title;
  final String subtitle;
  final String time;
  final String status;
  final IconData? icon;

  const PendingItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.time,
    this.status = 'pending',
    this.icon,
  });
}

/// Pending approvals section organism
class GenZPendingSection extends StatelessWidget {
  final List<PendingItem> items;
  final VoidCallback onViewAll;
  final int maxItems;

  const GenZPendingSection({
    super.key,
    this.items = const [],
    required this.onViewAll,
    this.maxItems = 3,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildHeader(context),
        const SizedBox(height: 14),
        items.isEmpty ? _buildEmptyState(context) : _buildItemsList(),
      ],
    );
  }

  Widget _buildHeader(BuildContext context) {
    final runtimeTheme = RuntimeMobileTheme.of(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text('Menunggu Persetujuan', style: MandorTheme.headingSmallFor(context)),
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
    final runtimeTheme = RuntimeMobileTheme.of(context);
    final warning = runtimeTheme.warning;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: runtimeTheme.cardTint(warning, lightAlpha: 0.08, darkAlpha: 0.18),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: runtimeTheme.borderTint(warning, lightAlpha: 0.2, darkAlpha: 0.34),
        ),
      ),
      child: Column(
        children: [
          Icon(
            Icons.pending_actions_rounded,
            size: 48,
            color: warning.withValues(alpha: 0.6),
          ),
          const SizedBox(height: 12),
          Text(
            'Tidak ada data menunggu persetujuan',
            style: MandorTheme.bodyLargeFor(context).copyWith(
              color: warning,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            'Data yang Anda input akan muncul di sini',
            style: MandorTheme.bodySmallFor(context).copyWith(
              color: warning.withValues(alpha: 0.75),
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
        child: _PendingItemCard(item: item),
      )).toList(),
    );
  }
}

/// Single pending item card
class _PendingItemCard extends StatelessWidget {
  final PendingItem item;

  const _PendingItemCard({
    required this.item,
  });

  @override
  Widget build(BuildContext context) {
    final theme = MandorTheme.of(context);
    final runtimeTheme = RuntimeMobileTheme.of(context);
    final warning = runtimeTheme.warning;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.cardBackground.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: runtimeTheme.borderTint(
            warning,
            lightAlpha: 0.2,
            darkAlpha: 0.34,
          ),
        ),
      ),
      child: Row(
        children: [
          _buildIcon(context),
          const SizedBox(width: 14),
          Expanded(child: _buildContent(context)),
          _buildStatusBadge(context),
        ],
      ),
    );
  }

  Widget _buildIcon(BuildContext context) {
    final runtimeTheme = RuntimeMobileTheme.of(context);
    final warning = runtimeTheme.warning;
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: runtimeTheme.iconTint(
          warning,
          lightAlpha: 0.16,
          darkAlpha: 0.24,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        item.icon ?? Icons.pending_rounded,
        color: warning,
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
          '${item.subtitle} • ${item.time}',
          style: MandorTheme.bodySmallFor(context),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildStatusBadge(BuildContext context) {
    final runtimeTheme = RuntimeMobileTheme.of(context);
    final warning = runtimeTheme.warning;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: runtimeTheme.iconTint(
          warning,
          lightAlpha: 0.16,
          darkAlpha: 0.24,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        'PENDING',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: warning,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
