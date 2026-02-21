import 'package:flutter/material.dart';

/// Enhanced Responsive Text Widget for Gate Check UI
/// 
/// Provides consistent text validation, overflow handling, and responsive
/// behavior across different screen sizes and orientations
class ResponsiveTextWidget extends StatelessWidget {
  final String text;
  final TextStyle? style;
  final int? maxLines;
  final TextOverflow overflow;
  final TextAlign textAlign;
  final bool isEmphasized;
  final Color? color;
  final double? fontSize;
  final FontWeight? fontWeight;
  final bool adaptToWidth;
  final double? minFontSize;

  const ResponsiveTextWidget({
    Key? key,
    required this.text,
    this.style,
    this.maxLines = 1,
    this.overflow = TextOverflow.ellipsis,
    this.textAlign = TextAlign.start,
    this.isEmphasized = false,
    this.color,
    this.fontSize,
    this.fontWeight,
    this.adaptToWidth = true,
    this.minFontSize = 10.0,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final screenWidth = MediaQuery.of(context).size.width;
        final isSmallScreen = screenWidth < 360;
        final isMediumScreen = screenWidth < 768;
        
        // Calculate responsive font size
        double responsiveFontSize = fontSize ?? _getDefaultFontSize(context, isSmallScreen, isMediumScreen);
        
        // Ensure minimum font size
        if (minFontSize != null && responsiveFontSize < minFontSize!) {
          responsiveFontSize = minFontSize!;
        }
        
        // Adjust font size based on available width if requested
        if (adaptToWidth && constraints.maxWidth < 100) {
          responsiveFontSize = responsiveFontSize * 0.9;
        }
        
        final effectiveStyle = _buildEffectiveTextStyle(
          context,
          responsiveFontSize,
          isSmallScreen,
          isMediumScreen,
        );
        
        return Text(
          text,
          style: effectiveStyle,
          maxLines: maxLines,
          overflow: overflow,
          textAlign: textAlign,
          textScaleFactor: _getTextScaleFactor(isSmallScreen),
        );
      },
    );
  }

  double _getDefaultFontSize(BuildContext context, bool isSmallScreen, bool isMediumScreen) {
    if (isEmphasized) {
      if (isSmallScreen) return 14.0;
      if (isMediumScreen) return 16.0;
      return 18.0;
    } else {
      if (isSmallScreen) return 12.0;
      if (isMediumScreen) return 14.0;
      return 16.0;
    }
  }

  TextStyle _buildEffectiveTextStyle(
    BuildContext context,
    double responsiveFontSize,
    bool isSmallScreen,
    bool isMediumScreen,
  ) {
    final baseStyle = style ?? Theme.of(context).textTheme.bodyMedium;
    
    return baseStyle!.copyWith(
      fontSize: responsiveFontSize,
      color: color ?? baseStyle.color,
      fontWeight: fontWeight ?? (isEmphasized ? FontWeight.bold : baseStyle.fontWeight),
      height: isSmallScreen ? 1.2 : 1.4, // Tighter line height on small screens
    );
  }

  double _getTextScaleFactor(bool isSmallScreen) {
    // Prevent text from scaling too large on small screens
    return isSmallScreen ? 1.0 : 1.0;
  }
}

/// Specialized widgets for common gate check text scenarios
class GateCheckTextWidgets {
  /// Text widget for direction labels (MASUK/KELUAR)
  static Widget buildDirectionLabel({
    required String direction,
    required Color color,
    bool isSelected = false,
    bool isCompact = false,
  }) {
    return ResponsiveTextWidget(
      text: direction,
      color: isSelected ? color : Colors.grey[700],
      fontWeight: FontWeight.bold,
      fontSize: isCompact ? 12.0 : 14.0,
      minFontSize: 10.0,
      isEmphasized: true,
      maxLines: 1,
    );
  }

  /// Text widget for action buttons
  static Widget buildActionButtonLabel({
    required String label,
    bool isLoading = false,
    bool isCompact = false,
  }) {
    return ResponsiveTextWidget(
      text: label,
      fontWeight: FontWeight.w600,
      fontSize: isCompact ? 12.0 : 14.0,
      minFontSize: 10.0,
      maxLines: 1,
      textAlign: TextAlign.center,
    );
  }

  /// Text widget for status messages
  static Widget buildStatusMessage({
    required String message,
    required Color color,
    bool isError = false,
    bool isCompact = false,
  }) {
    return ResponsiveTextWidget(
      text: message,
      color: color,
      fontWeight: isError ? FontWeight.bold : FontWeight.w500,
      fontSize: isCompact ? 11.0 : 13.0,
      minFontSize: 9.0,
      maxLines: 2,
      textAlign: TextAlign.start,
    );
  }

  /// Text widget for statistics titles
  static Widget buildStatTitle({
    required String title,
    required Color color,
    bool isCompact = false,
  }) {
    return ResponsiveTextWidget(
      text: title,
      color: color,
      fontWeight: FontWeight.w600,
      fontSize: isCompact ? 11.0 : 13.0,
      minFontSize: 9.0,
      maxLines: 2,
      textAlign: TextAlign.start,
    );
  }

  /// Text widget for statistics values
  static Widget buildStatValue({
    required String value,
    required Color color,
    bool isCompact = false,
  }) {
    return ResponsiveTextWidget(
      text: value,
      color: color,
      fontWeight: FontWeight.bold,
      fontSize: isCompact ? 16.0 : 20.0,
      minFontSize: 14.0,
      maxLines: 1,
      textAlign: TextAlign.center,
      isEmphasized: true,
    );
  }
}