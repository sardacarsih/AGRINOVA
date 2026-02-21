import 'package:flutter/material.dart';
import '../asisten_theme.dart';
import '../atoms/asisten_stat_indicator.dart';
import '../../../../../../../shared/widgets/current_user_avatar.dart';

/// Organism: Welcome Section
/// Header section with user greeting and quick metrics
class AsistenWelcomeSection extends StatelessWidget {
  final String userName;
  final String? division;
  final String? estateName;
  final int pendingCount;
  final int approvedCount;
  final int rejectedCount;

  const AsistenWelcomeSection({
    super.key,
    required this.userName,
    this.division,
    this.estateName,
    required this.pendingCount,
    required this.approvedCount,
    required this.rejectedCount,
  });

  @override
  Widget build(BuildContext context) {
    final totalReviewed = approvedCount + rejectedCount;
    final approvalRate = totalReviewed == 0
        ? '0%'
        : '${((approvedCount / totalReviewed) * 100).toStringAsFixed(0)}%';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AsistenTheme.paddingLarge),
      decoration: BoxDecoration(
        gradient: AsistenTheme.welcomeGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AsistenTheme.primaryBlue.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const CurrentUserAvatar(
                  size: 56,
                  shape: BoxShape.rectangle,
                  borderRadius: BorderRadius.all(Radius.circular(10)),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Selamat Datang, $userName!',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Asisten - ${division ?? "Divisi"}',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 14,
                      ),
                    ),
                    if (estateName != null)
                      Text(
                        'Estate: $estateName',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontSize: 13,
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AsistenTheme.paddingMedium,
              vertical: 12,
            ),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                AsistenStatIndicator(
                  value: pendingCount.toString(),
                  label: 'Pending',
                ),
                _divider(),
                AsistenStatIndicator(
                  value: approvedCount.toString(),
                  label: 'Approved',
                ),
                _divider(),
                AsistenStatIndicator(
                  value: approvalRate,
                  label: 'Rate',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _divider() {
    return Container(
      height: 30,
      width: 1,
      color: Colors.white.withValues(alpha: 0.3),
    );
  }
}
