// Gen Z Pending Section - Organism Component for Mandor Dashboard
// Pending approvals section with empty state and list

import 'package:flutter/material.dart';
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
    Key? key,
    this.items = const [],
    required this.onViewAll,
    this.maxItems = 3,
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
        Text('Menunggu Persetujuan', style: MandorTheme.headingSmall),
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
        color: MandorTheme.amberOrange.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: MandorTheme.amberOrange.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Icon(
            Icons.pending_actions_rounded,
            size: 48,
            color: MandorTheme.amberOrange.withOpacity(0.5),
          ),
          const SizedBox(height: 12),
          Text(
            'Tidak ada data menunggu persetujuan',
            style: MandorTheme.bodyLarge.copyWith(
              color: MandorTheme.amberOrange,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          Text(
            'Data yang Anda input akan muncul di sini',
            style: MandorTheme.bodySmall.copyWith(
              color: MandorTheme.amberOrange.withOpacity(0.7),
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
    Key? key,
    required this.item,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: MandorTheme.gray800.withOpacity(0.6),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: MandorTheme.amberOrange.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          _buildIcon(),
          const SizedBox(width: 14),
          Expanded(child: _buildContent()),
          _buildStatusBadge(),
        ],
      ),
    );
  }

  Widget _buildIcon() {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: MandorTheme.amberOrange.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(
        item.icon ?? Icons.pending_rounded,
        color: MandorTheme.amberOrange,
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
          '${item.subtitle} • ${item.time}',
          style: MandorTheme.bodySmall,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildStatusBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: MandorTheme.amberOrange.withOpacity(0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        'PENDING',
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: MandorTheme.amberOrange,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
