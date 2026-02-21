import 'package:flutter/material.dart';
import '../asisten_theme.dart';
import '../molecules/asisten_approval_item.dart';

/// Data class for approval items
class ApprovalItemData {
  final String id;
  final String mandorName;
  final String blok;
  final String volume;
  final String employees;
  final String time;
  final String status;

  const ApprovalItemData({
    required this.id,
    required this.mandorName,
    required this.blok,
    required this.volume,
    required this.employees,
    required this.time,
    required this.status,
  });
}

/// Organism: Pending Section
/// Displays pending approval items
class AsistenPendingSection extends StatelessWidget {
  final List<ApprovalItemData> items;
  final Function(String)? onApprove;
  final Function(String)? onReject;
  final VoidCallback? onViewAll;

  const AsistenPendingSection({
    Key? key,
    required this.items,
    this.onApprove,
    this.onReject,
    this.onViewAll,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Perlu Persetujuan', style: AsistenTheme.headingMedium),
            TextButton(
              onPressed: onViewAll,
              child: Text(
                'Lihat Semua',
                style: TextStyle(
                  color: AsistenTheme.primaryBlue,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: AsistenTheme.paddingSmall),
        if (items.isEmpty)
          Container(
            padding: const EdgeInsets.all(AsistenTheme.paddingLarge),
            decoration: AsistenTheme.whiteCardDecoration,
            child: Center(
              child: Column(
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    size: 48,
                    color: AsistenTheme.approvedGreen.withOpacity(0.5),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Tidak ada pending approval',
                    style: AsistenTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          )
        else
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: items.length > 3 ? 3 : items.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = items[index];
              return AsistenApprovalItem(
                id: item.id,
                mandorName: item.mandorName,
                blok: item.blok,
                volume: item.volume,
                employees: item.employees,
                time: item.time,
                status: item.status,
                onApprove: () => onApprove?.call(item.id),
                onReject: () => onReject?.call(item.id),
              );
            },
          ),
      ],
    );
  }
}
