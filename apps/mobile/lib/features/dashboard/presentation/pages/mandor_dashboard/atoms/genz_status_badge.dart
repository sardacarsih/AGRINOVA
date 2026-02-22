// Gen Z Status Badge - Atomic Component for Mandor Dashboard
// Status indicators for offline, sync, and approval status

import 'package:flutter/material.dart';
import '../mandor_theme.dart';

/// Status badge types
enum StatusBadgeType {
  offline,
  syncing,
  synced,
  pending,
  approved,
  rejected,
}

/// A status badge for displaying various states
class GenZStatusBadge extends StatelessWidget {
  final StatusBadgeType type;
  final String? customLabel;
  final bool compact;

  const GenZStatusBadge({
    super.key,
    required this.type,
    this.customLabel,
    this.compact = false,
  });

  /// Offline mode badge
  factory GenZStatusBadge.offline({bool compact = false}) {
    return GenZStatusBadge(type: StatusBadgeType.offline, compact: compact);
  }

  /// Syncing in progress badge
  factory GenZStatusBadge.syncing({bool compact = false}) {
    return GenZStatusBadge(type: StatusBadgeType.syncing, compact: compact);
  }

  /// Successfully synced badge
  factory GenZStatusBadge.synced({bool compact = false}) {
    return GenZStatusBadge(type: StatusBadgeType.synced, compact: compact);
  }

  /// Pending approval badge
  factory GenZStatusBadge.pending({bool compact = false}) {
    return GenZStatusBadge(type: StatusBadgeType.pending, compact: compact);
  }

  /// Approved badge
  factory GenZStatusBadge.approved({bool compact = false}) {
    return GenZStatusBadge(type: StatusBadgeType.approved, compact: compact);
  }

  /// Rejected badge
  factory GenZStatusBadge.rejected({bool compact = false}) {
    return GenZStatusBadge(type: StatusBadgeType.rejected, compact: compact);
  }

  @override
  Widget build(BuildContext context) {
    final config = _getConfig();
    
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 8 : 12,
        vertical: compact ? 4 : 6,
      ),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(compact ? 8 : 20),
        border: Border.all(
          color: config.color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (type == StatusBadgeType.syncing)
            SizedBox(
              width: compact ? 10 : 12,
              height: compact ? 10 : 12,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(config.color),
              ),
            )
          else
            Icon(
              config.icon,
              size: compact ? 12 : 14,
              color: config.color,
            ),
          SizedBox(width: compact ? 4 : 6),
          Text(
            customLabel ?? config.label,
            style: TextStyle(
              fontSize: compact ? 10 : 12,
              fontWeight: FontWeight.w600,
              color: config.color,
            ),
          ),
        ],
      ),
    );
  }

  _BadgeConfig _getConfig() {
    switch (type) {
      case StatusBadgeType.offline:
        return _BadgeConfig(
          color: MandorTheme.amberOrange,
          icon: Icons.wifi_off_rounded,
          label: 'Offline',
        );
      case StatusBadgeType.syncing:
        return _BadgeConfig(
          color: MandorTheme.electricBlue,
          icon: Icons.sync_rounded,
          label: 'Syncing...',
        );
      case StatusBadgeType.synced:
        return _BadgeConfig(
          color: MandorTheme.forestGreen,
          icon: Icons.cloud_done_rounded,
          label: 'Synced',
        );
      case StatusBadgeType.pending:
        return _BadgeConfig(
          color: MandorTheme.amberOrange,
          icon: Icons.pending_rounded,
          label: 'Pending',
        );
      case StatusBadgeType.approved:
        return _BadgeConfig(
          color: MandorTheme.forestGreen,
          icon: Icons.check_circle_rounded,
          label: 'Approved',
        );
      case StatusBadgeType.rejected:
        return _BadgeConfig(
          color: MandorTheme.coralRed,
          icon: Icons.cancel_rounded,
          label: 'Rejected',
        );
    }
  }
}

class _BadgeConfig {
  final Color color;
  final IconData icon;
  final String label;

  _BadgeConfig({
    required this.color,
    required this.icon,
    required this.label,
  });
}

/// Offline mode banner widget
class GenZOfflineBanner extends StatelessWidget {
  final String? message;

  const GenZOfflineBanner({
    super.key,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: MandorTheme.amberOrange.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: MandorTheme.amberOrange.withValues(alpha: 0.25),
        ),
      ),
      child: Row(
        children: [
          Icon(
            Icons.wifi_off_rounded,
            size: 18,
            color: MandorTheme.amberOrange,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message ?? 'Mode Offline — Data disinkronkan saat online',
              style: MandorTheme.bodySmall.copyWith(
                color: MandorTheme.amberOrange,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

