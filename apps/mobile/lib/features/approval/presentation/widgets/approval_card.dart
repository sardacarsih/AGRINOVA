import 'package:flutter/material.dart';
import '../../domain/entities/approval_item.dart';
// Import AsistenTheme from dashboard feature for consistency
import '../../../dashboard/presentation/pages/asisten_dashboard/asisten_theme.dart';

class ApprovalCard extends StatelessWidget {
  final ApprovalItem item;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const ApprovalCard({
    super.key,
    required this.item,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
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
          // Header: ID and Time
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                item.id,
                style: TextStyle(
                  color: AsistenTheme.textSecondary,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                item.elapsedTime,
                style: TextStyle(
                  color: AsistenTheme.textSecondary,
                  fontSize: 12,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Divider(color: Colors.grey[100], height: 1),
          const SizedBox(height: 12),

          
          // Content
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Photo (if available)
              if (item.hasPhoto &&
                  item.photoUrls != null &&
                  item.photoUrls!.isNotEmpty) ...[
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    item.photoUrls!.first,
                    width: 80,
                    height: 80,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        width: 80,
                        height: 80,
                        color: Colors.grey[200],
                        child: Icon(Icons.broken_image,
                            color: Colors.grey[400], size: 24),
                      );
                    },
                    loadingBuilder: (context, child, loadingProgress) {
                      if (loadingProgress == null) return child;
                      return Container(
                        width: 80,
                        height: 80,
                        color: Colors.grey[200],
                        child: Center(
                          child: CircularProgressIndicator(
                            value: loadingProgress.expectedTotalBytes != null
                                ? loadingProgress.cumulativeBytesLoaded /
                                    loadingProgress.expectedTotalBytes!
                                : null,
                            strokeWidth: 2,
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(width: 12),
              ],
              // Left: Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Mandor Name
                    Row(
                      children: [
                        Icon(Icons.person,
                            size: 16, color: AsistenTheme.textPrimary),
                        const SizedBox(width: 8),
                        Text(
                          item.mandorName,
                          style: TextStyle(
                            color: AsistenTheme.textPrimary,
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Block
                    Row(
                      children: [
                        Icon(Icons.location_on,
                            size: 16, color: AsistenTheme.textSecondary),
                        const SizedBox(width: 8),
                        Text(
                          'Blok ${item.blockName}',
                          style: TextStyle(
                            color: AsistenTheme.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // Weight
                    Row(
                      children: [
                        Icon(Icons.scale,
                            size: 16, color: AsistenTheme.textSecondary),
                        const SizedBox(width: 8),
                        Text(
                          '${item.weight} ton',
                          style: TextStyle(
                            color: AsistenTheme.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),

                    // People
                    Row(
                      children: [
                        Icon(Icons.groups,
                            size: 16, color: AsistenTheme.textSecondary),
                        const SizedBox(width: 8),
                        Text(
                          '${item.employeeCount} orang',
                          style: TextStyle(
                            color: AsistenTheme.textSecondary,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Actions
          if (item.status == 'PENDING')
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: onApprove,
                    icon:
                        const Icon(Icons.check, size: 18, color: Colors.white),
                    label: const Text('Setuju'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AsistenTheme.approvedGreen,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onReject,
                    icon: Icon(Icons.close,
                        size: 18, color: AsistenTheme.rejectedRed),
                    label: Text('Tolak'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AsistenTheme.rejectedRed,
                      side: BorderSide(color: AsistenTheme.rejectedRed),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            )
          else
            _buildStatusBadge(item.status),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color;
    String text;
    IconData icon;

    switch (status) {
      case 'APPROVED':
        color = AsistenTheme.approvedGreen;
        text = 'Disetujui';
        icon = Icons.check_circle;
        break;
      case 'REJECTED':
        color = AsistenTheme.rejectedRed;
        text = 'Ditolak';
        icon = Icons.cancel;
        break;
      default:
        color = AsistenTheme.pendingOrange;
        text = 'Pending';
        icon = Icons.pending;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Text(
            text,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ],
      ),
    );
  }
}
