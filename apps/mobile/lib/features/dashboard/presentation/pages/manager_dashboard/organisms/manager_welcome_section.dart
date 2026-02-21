import 'package:flutter/material.dart';
import '../manager_theme.dart';
import '../../../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../../../../shared/widgets/current_user_avatar.dart';
import '../../../../data/models/manager_dashboard_models.dart';

/// Organism: Welcome Section
/// Header section with user greeting and quick metrics
class ManagerWelcomeSection extends StatelessWidget {
  final AuthAuthenticated state;
  final ManagerDashboardStats? stats;

  const ManagerWelcomeSection({
    super.key,
    required this.state,
    this.stats,
  });

  @override
  Widget build(BuildContext context) {
    final monthlyProductionText = stats != null
        ? '${stats!.monthlyProduction.toStringAsFixed(0)} ton'
        : '--';
    final targetAchievementText = stats != null
        ? '${stats!.targetAchievement.toStringAsFixed(1)}%'
        : '--';
    final teamText = stats != null ? '${stats!.totalEmployees} org' : '--';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(ManagerTheme.paddingLarge),
      decoration: BoxDecoration(
        gradient: ManagerTheme.welcomeGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: ManagerTheme.primaryPurple.withOpacity(0.3),
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
                  color: Colors.white.withOpacity(0.2),
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
                      'Selamat Datang, Pak ${_getFirstName()}!',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Manager - Estate Operations',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.85),
                        fontSize: 14,
                      ),
                    ),
                    Text(
                      'Estate: ${state.user.estate ?? 'Kebun Utara'}',
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.75),
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
              horizontal: ManagerTheme.paddingMedium,
              vertical: 12,
            ),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildMetric(monthlyProductionText, 'Produksi Bulan'),
                _divider(),
                _buildMetric(targetAchievementText, 'Target Tercapai'),
                _divider(),
                _buildMetric(teamText, 'Tim Aktif'),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getFirstName() {
    final fullName = state.user.fullName;
    return fullName.split(' ').first;
  }

  Widget _buildMetric(String value, String label) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withOpacity(0.75),
            fontSize: 11,
          ),
        ),
      ],
    );
  }

  Widget _divider() {
    return Container(
      height: 30,
      width: 1,
      color: Colors.white.withOpacity(0.3),
    );
  }
}
