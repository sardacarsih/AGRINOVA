import 'package:flutter/material.dart';
import 'agrinova_intro_theme.dart';

/// A background widget that creates a soft vignette effect.
/// The vignette gradually darkens from the center towards the edges,
/// creating a cinematic, focused appearance.
class VignetteBackground extends StatelessWidget {
  /// The background color at the center
  final Color backgroundColor;

  /// Optional child widget to display on top of the background
  final Widget? child;

  const VignetteBackground({
    super.key,
    this.backgroundColor = AgrinovaIntroTheme.backgroundDark,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        color: backgroundColor,
        gradient: AgrinovaIntroTheme.vignetteGradient,
      ),
      child: child,
    );
  }
}

/// A more advanced vignette background with subtle animation capability.
/// Can be used for breathing/pulsing background effects.
class AnimatedVignetteBackground extends StatelessWidget {
  /// The current animation value (0.0 to 1.0)
  final double animationValue;

  /// The background color at the center
  final Color backgroundColor;

  /// Optional child widget
  final Widget? child;

  const AnimatedVignetteBackground({
    super.key,
    required this.animationValue,
    this.backgroundColor = AgrinovaIntroTheme.backgroundDark,
    this.child,
  });

  @override
  Widget build(BuildContext context) {
    // Subtle radius variation based on animation
    final radius = 1.2 + (0.1 * animationValue);

    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: BoxDecoration(
        gradient: RadialGradient(
          center: Alignment.center,
          radius: radius,
          colors: [
            backgroundColor,
            backgroundColor.withValues(alpha: 0.95),
            AgrinovaIntroTheme.pureBlack.withValues(alpha: 0.98),
            AgrinovaIntroTheme.pureBlack,
          ],
          stops: const [0.0, 0.5, 0.8, 1.0],
        ),
      ),
      child: child,
    );
  }
}
