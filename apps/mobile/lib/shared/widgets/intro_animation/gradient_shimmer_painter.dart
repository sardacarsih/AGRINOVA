import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'agrinova_intro_theme.dart';

/// Custom painter for the gradient shimmer effect that sweeps across text.
/// This painter creates a moving linear gradient that simulates a light
/// streak passing through the letters.
class GradientShimmerPainter extends CustomPainter {
  /// The current animation progress (0.0 to 1.0)
  final double progress;

  /// Width of the shimmer gradient relative to the total width
  final double shimmerWidth;

  GradientShimmerPainter({
    required this.progress,
    this.shimmerWidth = AgrinovaIntroTheme.shimmerWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    // Calculate the shimmer position based on progress
    // Start from -shimmerWidth and end at 1.0 + shimmerWidth
    // This ensures the shimmer fully passes through the entire text
    final double start = -shimmerWidth + (progress * (1.0 + shimmerWidth * 2));
    final double end = start + shimmerWidth;

    // Create the gradient shader
    final shader = ui.Gradient.linear(
      Offset(size.width * start, 0),
      Offset(size.width * end, size.height),
      AgrinovaIntroTheme.shimmerGradientColors,
      AgrinovaIntroTheme.shimmerGradientStops,
      TileMode.clamp,
    );

    // Create paint with the gradient shader
    final paint = Paint()
      ..shader = shader
      ..blendMode = BlendMode.srcIn;

    // Draw a rectangle covering the entire canvas
    canvas.drawRect(
      Rect.fromLTWH(0, 0, size.width, size.height),
      paint,
    );
  }

  @override
  bool shouldRepaint(GradientShimmerPainter oldDelegate) {
    // Only repaint if progress changed (performance optimization)
    return oldDelegate.progress != progress;
  }
}

/// A widget that applies the shimmer effect to its child using ShaderMask.
/// This is used to create the light streak effect on the AGRINOVA text.
class ShimmerOverlay extends StatelessWidget {
  /// The current animation progress (0.0 to 1.0)
  final double progress;

  /// Whether the shimmer is currently active
  final bool isActive;

  /// The child widget to apply the shimmer to
  final Widget child;

  const ShimmerOverlay({
    super.key,
    required this.progress,
    required this.isActive,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    if (!isActive) {
      return child;
    }

    return ShaderMask(
      shaderCallback: (bounds) {
        // Calculate normalized progress for the shimmer sweep
        final normalizedProgress = ((progress - AgrinovaIntroTheme.shimmerStart) /
                (AgrinovaIntroTheme.shimmerEnd - AgrinovaIntroTheme.shimmerStart))
            .clamp(0.0, 1.0);

        // Calculate gradient position
        final shimmerWidth = AgrinovaIntroTheme.shimmerWidth;
        final start = -shimmerWidth + (normalizedProgress * (1.0 + shimmerWidth * 2));
        final end = start + shimmerWidth;

        return LinearGradient(
          begin: Alignment(start * 2 - 1, -1),
          end: Alignment(end * 2 - 1, 1),
          colors: const [
            Colors.white,
            Color(0xFFFFFFFF),
            Color(0xFF00FF7F), // Bright green at center
            Color(0xFFFFFFFF),
            Colors.white,
          ],
          stops: const [0.0, 0.35, 0.5, 0.65, 1.0],
        ).createShader(bounds);
      },
      blendMode: BlendMode.srcATop,
      child: child,
    );
  }
}
