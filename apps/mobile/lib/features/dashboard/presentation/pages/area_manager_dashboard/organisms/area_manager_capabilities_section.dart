import 'package:flutter/material.dart';
import '../area_manager_theme.dart';

/// Organism: Capabilities Section for Area Manager
/// Displays permissions and features as chips
class AreaManagerCapabilitiesSection extends StatelessWidget {
  final List<String> permissions;
  final List<String> features;

  const AreaManagerCapabilitiesSection({
    super.key,
    this.permissions = const [],
    this.features = const [],
  });

  // Default permissions
  static List<String> get defaultPermissions =>
      ['VIEW ALL', 'APPROVE', 'REPORTS', 'MONITORING', 'EXPORT'];

  // Default features
  static List<String> get defaultFeatures =>
      ['MONITORING', 'REPORTING', 'OVERSIGHT', 'ANALYTICS'];

  @override
  Widget build(BuildContext context) {
    final permissionList =
        permissions.isEmpty ? defaultPermissions : permissions;
    final featureList = features.isEmpty ? defaultFeatures : features;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Your Capabilities', style: AreaManagerTheme.headingMedium),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: AreaManagerTheme.whiteCardDecoration,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Permissions
              Text(
                'Permissions',
                style: AreaManagerTheme.labelStyle,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: permissionList.map((permission) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AreaManagerTheme.scaffoldBackground,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AreaManagerTheme.textMuted.withOpacity(0.3),
                      ),
                    ),
                    child: Text(
                      permission,
                      style: const TextStyle(
                        color: AreaManagerTheme.textSecondary,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),
              // Features
              Text(
                'Features',
                style: AreaManagerTheme.labelStyle,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: featureList.map((feature) {
                  return Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AreaManagerTheme.primaryTeal.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: AreaManagerTheme.primaryTeal.withOpacity(0.3),
                      ),
                    ),
                    child: Text(
                      feature,
                      style: TextStyle(
                        color: AreaManagerTheme.primaryTeal,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
