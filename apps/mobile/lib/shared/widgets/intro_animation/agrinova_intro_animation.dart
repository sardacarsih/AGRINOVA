import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'agrinova_intro_theme.dart';
import 'vignette_background.dart';

/// A Netflix-style intro animation for the AGRINOVA brand.
///
/// This widget displays an animated logo with:
/// - Fade-in effect
/// - Zoom-in effect with smooth easing
/// - Gradient shimmer sweeping across letters
/// - Subtle glow pulse effect
/// - Fade-out transition
///
/// Usage:
/// ```dart
/// AgrinovaIntroAnimation(
///   onCompleted: () => Navigator.pushReplacement(context, ...),
/// )
/// ```
class AgrinovaIntroAnimation extends StatefulWidget {
  /// Callback when the animation completes.
  final VoidCallback? onCompleted;

  /// Total duration of the animation.
  final Duration duration;

  /// Whether to hide system UI during animation.
  final bool immersiveMode;

  /// Whether to auto-start the animation.
  final bool autoStart;

  const AgrinovaIntroAnimation({
    super.key,
    this.onCompleted,
    this.duration = AgrinovaIntroTheme.animationDuration,
    this.immersiveMode = true,
    this.autoStart = true,
  });

  @override
  State<AgrinovaIntroAnimation> createState() => _AgrinovaIntroAnimationState();
}

class _AgrinovaIntroAnimationState extends State<AgrinovaIntroAnimation>
    with TickerProviderStateMixin {
  late AnimationController _mainController;
  late AnimationController _glowController;

  // Animation instances
  late Animation<double> _fadeInAnimation;
  late Animation<double> _zoomAnimation;
  late Animation<double> _shimmerAnimation;
  late Animation<double> _fadeOutAnimation;
  late Animation<double> _glowAnimation;

  bool _hasCompleted = false;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();

    if (widget.immersiveMode) {
      _enterImmersiveMode();
    }

    if (widget.autoStart) {
      // Small delay to ensure widget is mounted
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _startAnimation();
      });
    }
  }

  void _initializeAnimations() {
    // Main animation controller
    _mainController = AnimationController(
      duration: widget.duration,
      vsync: this,
    );

    // Glow pulse controller (loops during glow phase)
    _glowController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    // Fade-in animation (0.0 - 0.25)
    _fadeInAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(
          AgrinovaIntroTheme.fadeInStart,
          AgrinovaIntroTheme.fadeInEnd,
          curve: Curves.easeOut,
        ),
      ),
    );

    // Zoom animation (0.0 - 0.5)
    _zoomAnimation = Tween<double>(
      begin: AgrinovaIntroTheme.initialScale,
      end: AgrinovaIntroTheme.finalScale,
    ).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(
          AgrinovaIntroTheme.zoomStart,
          AgrinovaIntroTheme.zoomEnd,
          curve: Curves.easeOutCubic,
        ),
      ),
    );

    // Shimmer animation (0.15 - 0.75)
    _shimmerAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(
          AgrinovaIntroTheme.shimmerStart,
          AgrinovaIntroTheme.shimmerEnd,
          curve: Curves.easeInOut,
        ),
      ),
    );

    // Fade-out animation (0.8 - 1.0)
    _fadeOutAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(
        parent: _mainController,
        curve: const Interval(
          AgrinovaIntroTheme.fadeOutStart,
          AgrinovaIntroTheme.fadeOutEnd,
          curve: Curves.easeIn,
        ),
      ),
    );

    // Glow pulse animation
    _glowAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _glowController,
        curve: Curves.easeInOut,
      ),
    );

    // Listen for completion
    _mainController.addStatusListener((status) {
      if (status == AnimationStatus.completed && !_hasCompleted) {
        _hasCompleted = true;
        _glowController.stop();
        widget.onCompleted?.call();
      }
    });

    // Listen for glow phase
    _mainController.addListener(() {
      final progress = _mainController.value;
      if (progress >= AgrinovaIntroTheme.glowStart &&
          progress < AgrinovaIntroTheme.glowEnd) {
        if (!_glowController.isAnimating) {
          _glowController.repeat(reverse: true);
        }
      } else {
        if (_glowController.isAnimating) {
          _glowController.stop();
          _glowController.value = 0;
        }
      }
    });
  }

  void _startAnimation() {
    _mainController.forward();
  }

  void _enterImmersiveMode() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersive);
  }

  void _exitImmersiveMode() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  }

  @override
  void dispose() {
    if (widget.immersiveMode) {
      _exitImmersiveMode();
    }
    _mainController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: Listenable.merge([_mainController, _glowController]),
        builder: (context, child) {
          // Calculate current opacity (fade-in then fade-out)
          final opacity = _mainController.value < AgrinovaIntroTheme.fadeOutStart
              ? _fadeInAnimation.value
              : _fadeOutAnimation.value;

          // Calculate shimmer progress
          final shimmerProgress = _shimmerAnimation.value;
          final isShimmerActive =
              _mainController.value >= AgrinovaIntroTheme.shimmerStart &&
                  _mainController.value <= AgrinovaIntroTheme.shimmerEnd;

          // Calculate glow intensity
          final glowIntensity = _glowAnimation.value;
          final isGlowActive =
              _mainController.value >= AgrinovaIntroTheme.glowStart &&
                  _mainController.value <= AgrinovaIntroTheme.glowEnd;

          return VignetteBackground(
            child: Center(
              child: Opacity(
                opacity: opacity.clamp(0.0, 1.0),
                child: Transform.scale(
                  scale: _zoomAnimation.value,
                  child: _buildLogoWithEffects(
                    screenWidth: screenWidth,
                    shimmerProgress: shimmerProgress,
                    isShimmerActive: isShimmerActive,
                    glowIntensity: glowIntensity,
                    isGlowActive: isGlowActive,
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildLogoWithEffects({
    required double screenWidth,
    required double shimmerProgress,
    required bool isShimmerActive,
    required double glowIntensity,
    required bool isGlowActive,
  }) {
    final textStyle = AgrinovaIntroTheme.getLogoTextStyle(screenWidth);

    return Stack(
      alignment: Alignment.center,
      children: [
        // Blur glow layer (behind text)
        if (isGlowActive)
          ImageFiltered(
            imageFilter: ImageFilter.blur(
              sigmaX: 30 + (20 * glowIntensity),
              sigmaY: 30 + (20 * glowIntensity),
            ),
            child: Text(
              'AGRINOVA',
              style: textStyle.copyWith(
                color: AgrinovaIntroTheme.springGreen
                    .withValues(alpha: 0.5 + (0.3 * glowIntensity)),
              ),
            ),
          ),

        // Main text with shimmer effect
        ShaderMask(
          shaderCallback: (bounds) {
            if (!isShimmerActive) {
              // No shimmer - just show the text gradient
              return AgrinovaIntroTheme.textGradient.createShader(bounds);
            }

            // Calculate shimmer position
            final shimmerWidth = AgrinovaIntroTheme.shimmerWidth;
            final start = -shimmerWidth + (shimmerProgress * (1.0 + shimmerWidth * 2));

            return LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [
                AgrinovaIntroTheme.springGreen,
                AgrinovaIntroTheme.techGreen,
                Colors.white.withValues(alpha: 0.9), // Bright shimmer center
                AgrinovaIntroTheme.techGreen,
                AgrinovaIntroTheme.springGreen,
              ],
              stops: [
                (start - 0.1).clamp(0.0, 1.0),
                (start).clamp(0.0, 1.0),
                (start + shimmerWidth / 2).clamp(0.0, 1.0),
                (start + shimmerWidth).clamp(0.0, 1.0),
                (start + shimmerWidth + 0.1).clamp(0.0, 1.0),
              ],
            ).createShader(bounds);
          },
          blendMode: BlendMode.srcIn,
          child: Text(
            'AGRINOVA',
            style: textStyle,
          ),
        ),

        // Subtle highlight overlay
        if (isShimmerActive)
          Positioned.fill(
            child: CustomPaint(
              painter: _HighlightPainter(
                progress: shimmerProgress,
                color: Colors.white.withValues(alpha: 0.1),
              ),
            ),
          ),
      ],
    );
  }

  /// Restart the animation from the beginning.
  void restart() {
    _hasCompleted = false;
    _mainController.reset();
    _glowController.reset();
    _mainController.forward();
  }
}

/// Custom painter for subtle highlight effect.
class _HighlightPainter extends CustomPainter {
  final double progress;
  final Color color;

  _HighlightPainter({
    required this.progress,
    required this.color,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(
      size.width * progress,
      size.height / 2,
    );

    final paint = Paint()
      ..shader = RadialGradient(
        colors: [
          color,
          color.withValues(alpha: 0),
        ],
      ).createShader(Rect.fromCircle(center: center, radius: size.height));

    canvas.drawCircle(center, size.height, paint);
  }

  @override
  bool shouldRepaint(_HighlightPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

/// Extension to provide easy access to the animation controller.
extension _AgrinovaIntroAnimationExtension
    on GlobalKey<_AgrinovaIntroAnimationState> {
  /// Restart the animation.
  // ignore: unused_element
  void restart() {
    currentState?.restart();
  }
}
