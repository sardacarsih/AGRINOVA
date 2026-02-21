import 'package:flutter/material.dart';

import '../../error/app_error.dart';

/// Graceful degradation widget for when features are unavailable
class GracefulDegradationWidget extends StatelessWidget {
  final String featureName;
  final Widget fallback;
  final String? message;
  final IconData? icon;
  final Color? iconColor;

  const GracefulDegradationWidget({
    Key? key,
    required this.featureName,
    required this.fallback,
    this.message,
    this.icon,
    this.iconColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Icon
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: (iconColor ?? Colors.grey).withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon ?? Icons.info_outline,
              size: 40,
              color: iconColor ?? Colors.grey,
            ),
          ),

          const SizedBox(height: 16),

          // Title
          Text(
            '$featureName Tidak Tersedia',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade700,
            ),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 8),

          // Message
          Text(
            message ?? 'Fitur $featureName sedang tidak tersedia. Silakan coba lagi nanti.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.grey.shade600,
            ),
            textAlign: TextAlign.center,
          ),

          const SizedBox(height: 24),

          // Fallback widget
          fallback,
        ],
      ),
    );
  }
}

/// Network-aware graceful degradation
class NetworkAwareWidget extends StatelessWidget {
  final Widget onlineChild;
  final Widget offlineChild;
  final Widget? loadingChild;
  final bool isConnected;
  final String? featureName;

  const NetworkAwareWidget({
    Key? key,
    required this.onlineChild,
    required this.offlineChild,
    this.loadingChild,
    required this.isConnected,
    this.featureName,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (loadingChild != null && isConnected == null) {
      return loadingChild!;
    }

    return isConnected ? onlineChild : offlineChild;
  }
}

/// Permission-aware graceful degradation
class PermissionAwareWidget extends StatelessWidget {
  final Widget permissionGrantedChild;
  final Widget permissionDeniedChild;
  final String permissionName;
  final String? permissionDescription;
  final VoidCallback? onRequestPermission;

  const PermissionAwareWidget({
    Key? key,
    required this.permissionGrantedChild,
    required this.permissionDeniedChild,
    required this.permissionName,
    this.permissionDescription,
    this.onRequestPermission,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // This would integrate with actual permission checking logic
    // For now, return the permission granted child
    return permissionGrantedChild;
  }
}

/// Storage-aware graceful degradation
class StorageAwareWidget extends StatelessWidget {
  final Widget storageAvailableChild;
  final Widget storageUnavailableChild;
  final String storageType;
  final String? requiredSpace;

  const StorageAwareWidget({
    Key? key,
    required this.storageAvailableChild,
    required this.storageUnavailableChild,
    required this.storageType,
    this.requiredSpace,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // This would integrate with actual storage checking logic
    // For now, return the storage available child
    return storageAvailableChild;
  }
}

/// Feature flag aware widget
class FeatureFlagWidget extends StatelessWidget {
  final Widget enabledChild;
  final Widget disabledChild;
  final String featureFlag;
  final String? featureDescription;

  const FeatureFlagWidget({
    Key? key,
    required this.enabledChild,
    required this.disabledChild,
    required this.featureFlag,
    this.featureDescription,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // This would integrate with actual feature flag service
    // For now, return the enabled child
    return enabledChild;
  }
}

/// Performance-aware widget that degrades gracefully
class PerformanceAwareWidget extends StatelessWidget {
  final Widget highPerformanceChild;
  final Widget lowPerformanceChild;
  final bool isHighPerformance;
  final String? performanceReason;

  const PerformanceAwareWidget({
    Key? key,
    required this.highPerformanceChild,
    required this.lowPerformanceChild,
    required this.isHighPerformance,
    this.performanceReason,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return isHighPerformance ? highPerformanceChild : lowPerformanceChild;
  }
}

/// Responsive widget that adapts to screen size
class ResponsiveWidget extends StatelessWidget {
  final Widget mobileChild;
  final Widget? tabletChild;
  final Widget? desktopChild;
  final Widget fallbackChild;

  const ResponsiveWidget({
    Key? key,
    required this.mobileChild,
    this.tabletChild,
    this.desktopChild,
    required this.fallbackChild,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;

    if (screenWidth >= 1200 && desktopChild != null) {
      return desktopChild!;
    } else if (screenWidth >= 800 && tabletChild != null) {
      return tabletChild!;
    } else if (screenWidth >= 600) {
      return mobileChild;
    } else {
      return fallbackChild;
    }
  }
}

/// Theme-aware widget that adapts to theme changes
class ThemeAwareWidget extends StatelessWidget {
  final Widget lightChild;
  final Widget darkChild;
  final Widget? highContrastChild;

  const ThemeAwareWidget({
    Key? key,
    required this.lightChild,
    required this.darkChild,
    this.highContrastChild,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isHighContrast = theme.brightness == Brightness.dark &&
        theme.colorScheme.primary.computeLuminance() > 0.5;

    if (isHighContrast && highContrastChild != null) {
      return highContrastChild!;
    } else if (isDark) {
      return darkChild;
    } else {
      return lightChild;
    }
  }
}

/// Loading state widget with graceful degradation
class LoadingAwareWidget extends StatelessWidget {
  final Widget child;
  final Widget? loadingChild;
  final Widget? errorChild;
  final bool isLoading;
  final bool hasError;
  final AppError? error;

  const LoadingAwareWidget({
    Key? key,
    required this.child,
    this.loadingChild,
    this.errorChild,
    required this.isLoading,
    required this.hasError,
    this.error,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return loadingChild ?? _buildDefaultLoading();
    }

    if (hasError) {
      return errorChild ?? _buildDefaultError();
    }

    return child;
  }

  Widget _buildDefaultLoading() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 16),
          Text('Memuat...'),
        ],
      ),
    );
  }

  Widget _buildDefaultError() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: Colors.red),
          SizedBox(height: 16),
          Text('Terjadi kesalahan'),
        ],
      ),
    );
  }
}

/// Connectivity-aware widget
class ConnectivityAwareWidget extends StatelessWidget {
  final Widget onlineChild;
  final Widget offlineChild;
  final Widget? connectingChild;
  final bool isOnline;
  final bool isConnecting;

  const ConnectivityAwareWidget({
    Key? key,
    required this.onlineChild,
    required this.offlineChild,
    this.connectingChild,
    required this.isOnline,
    this.isConnecting = false,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (isConnecting && connectingChild != null) {
      return connectingChild!;
    }

    return isOnline ? onlineChild : offlineChild;
  }
}

/// Battery-aware widget for power-conscious behavior
class BatteryAwareWidget extends StatelessWidget {
  final Widget normalPowerChild;
  final Widget lowPowerChild;
  final bool isLowPowerMode;
  final String? powerReason;

  const BatteryAwareWidget({
    Key? key,
    required this.normalPowerChild,
    required this.lowPowerChild,
    required this.isLowPowerMode,
    this.powerReason,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return isLowPowerMode ? lowPowerChild : normalPowerChild;
  }
}

/// Memory-aware widget for memory-conscious behavior
class MemoryAwareWidget extends StatelessWidget {
  final Widget normalMemoryChild;
  final Widget lowMemoryChild;
  final bool isLowMemory;
  final int? availableMemoryMB;

  const MemoryAwareWidget({
    Key? key,
    required this.normalMemoryChild,
    required this.lowMemoryChild,
    required this.isLowMemory,
    this.availableMemoryMB,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return isLowMemory ? lowMemoryChild : normalMemoryChild;
  }
}