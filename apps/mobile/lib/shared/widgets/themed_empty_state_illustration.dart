import 'package:flutter/material.dart';

import '../../core/theme/login_theme_campaign_service.dart';

class ThemedEmptyStateIllustration extends StatelessWidget {
  final Widget fallback;
  final double height;
  final double width;
  final BoxFit fit;

  const ThemedEmptyStateIllustration({
    super.key,
    required this.fallback,
    this.height = 140,
    this.width = 180,
    this.fit = BoxFit.contain,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: LoginThemeCampaignService.instance,
      builder: (context, _) {
        final assetPath = LoginThemeCampaignService
            .instance
            .effectiveAppUi
            .emptyStateIllustration
            .asset;

        if (assetPath.trim().isEmpty) {
          return fallback;
        }

        return Image.network(
          assetPath,
          height: height,
          width: width,
          fit: fit,
          errorBuilder: (context, error, stackTrace) => fallback,
          loadingBuilder: (context, child, progress) {
            if (progress == null) return child;
            return SizedBox(
              height: height,
              width: width,
              child: const Center(
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            );
          },
        );
      },
    );
  }
}
