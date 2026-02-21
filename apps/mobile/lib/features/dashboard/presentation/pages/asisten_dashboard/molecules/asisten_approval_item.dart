import 'package:flutter/material.dart';
import '../asisten_theme.dart';
import '../atoms/asisten_status_badge.dart';

/// Molecule: Approval Item Card
/// Card showing pending approval item details
class AsistenApprovalItem extends StatelessWidget {
  final String id;
  final String mandorName;
  final String blok;
  final String volume;
  final String employees;
  final String time;
  final String status;
  final VoidCallback? onApprove;
  final VoidCallback? onReject;
  final VoidCallback? onTap;

  const AsistenApprovalItem({
    Key? key,
    required this.id,
    required this.mandorName,
    required this.blok,
    required this.volume,
    required this.employees,
    required this.time,
    required this.status,
    this.onApprove,
    this.onReject,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(AsistenTheme.paddingMedium),
        decoration: AsistenTheme.whiteCardDecoration,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AsistenTheme.primaryBlue.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.person_outline,
                        color: AsistenTheme.primaryBlue,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          mandorName,
                          style: const TextStyle(
                            color: AsistenTheme.textPrimary,
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          'Blok $blok',
                          style: AsistenTheme.bodySmall,
                        ),
                      ],
                    ),
                  ],
                ),
                AsistenStatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 12),
            // Details row
            Row(
              children: [
                _buildDetail(Icons.scale, volume),
                const SizedBox(width: 16),
                _buildDetail(Icons.people_outline, employees),
                const Spacer(),
                Text(
                  time,
                  style: AsistenTheme.bodySmall,
                ),
              ],
            ),
            if (status.toLowerCase() == 'pending') ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: onReject,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AsistenTheme.rejectedRed,
                        side: BorderSide(color: AsistenTheme.rejectedRed.withOpacity(0.5)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      child: const Text('Tolak', style: TextStyle(fontSize: 12)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: onApprove,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AsistenTheme.approvedGreen,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      child: const Text('Setuju', style: TextStyle(fontSize: 12)),
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

  Widget _buildDetail(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 16, color: AsistenTheme.textMuted),
        const SizedBox(width: 4),
        Text(text, style: AsistenTheme.bodySmall),
      ],
    );
  }
}
