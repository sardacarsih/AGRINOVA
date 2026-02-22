import 'package:flutter/material.dart';
import '../asisten_theme.dart';

/// Atom: Status Badge
/// Badge for showing approval status
class AsistenStatusBadge extends StatelessWidget {
  final String status;
  final Color? color;

  const AsistenStatusBadge({
    super.key,
    required this.status,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final badgeColor = color ?? _getColorFromStatus(status);
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: AsistenTheme.statusBadgeDecoration(badgeColor),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          color: badgeColor,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  Color _getColorFromStatus(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return AsistenTheme.pendingOrange;
      case 'approved':
        return AsistenTheme.approvedGreen;
      case 'rejected':
        return AsistenTheme.rejectedRed;
      default:
        return AsistenTheme.primaryBlue;
    }
  }
}
