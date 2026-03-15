import 'package:flutter/material.dart';

import 'login_theme_campaign_service.dart';

class RuntimeThemeSlotResolver {
  static bool get hasNavbarBackground =>
      _parseColor(
        LoginThemeCampaignService.instance.effectiveAppUi.navbar.backgroundColor,
      ) !=
      null;

  static bool get hasFooterBackground =>
      _parseColor(
        LoginThemeCampaignService.instance.effectiveAppUi.footer.backgroundColor,
      ) !=
      null;

  static bool get hasFooterBorder =>
      _parseColor(
        LoginThemeCampaignService.instance.effectiveAppUi.footer.borderColor,
      ) !=
      null;

  static bool get hasSidebarBackground =>
      _parseColor(
        LoginThemeCampaignService.instance.effectiveAppUi.sidebar.backgroundColor,
      ) !=
      null;

  static Color navbarBackground(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.navbar.backgroundColor,
        ) ??
        fallback ??
        Theme.of(context).appBarTheme.backgroundColor ??
        Theme.of(context).colorScheme.primary;
  }

  static Color navbarForeground(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.navbar.foregroundColor,
        ) ??
        fallback ??
        Theme.of(context).appBarTheme.foregroundColor ??
        Theme.of(context).colorScheme.onPrimary;
  }

  static Color navbarIcon(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.navbar.iconColor,
        ) ??
        fallback ??
        navbarForeground(context);
  }

  static Color sidebarBackground(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.sidebar.backgroundColor,
        ) ??
        fallback ??
        Theme.of(context).drawerTheme.backgroundColor ??
        Theme.of(context).cardColor;
  }

  static Color sidebarForeground(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.sidebar.foregroundColor,
        ) ??
        fallback ??
        Theme.of(context).popupMenuTheme.textStyle?.color ??
        Theme.of(context).colorScheme.onSurface;
  }

  static Color sidebarIcon(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.sidebar.iconColor,
        ) ??
        fallback ??
        sidebarForeground(context);
  }

  static Color? sidebarBorder() {
    return _parseColor(
      LoginThemeCampaignService.instance.effectiveAppUi.sidebar.borderColor,
    );
  }

  static Color footerBackground(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.footer.backgroundColor,
        ) ??
        fallback ??
        Theme.of(context).bottomNavigationBarTheme.backgroundColor ??
        Theme.of(context).cardColor;
  }

  static Color footerSelected(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.footer.accentColor,
        ) ??
        fallback ??
        Theme.of(context).bottomNavigationBarTheme.selectedItemColor ??
        Theme.of(context).colorScheme.primary;
  }

  static Color footerUnselected(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService
              .instance
              .effectiveAppUi
              .footer
              .foregroundColor,
        ) ??
        fallback ??
        Theme.of(context).bottomNavigationBarTheme.unselectedItemColor ??
        Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7);
  }

  static Color footerBorder(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.footer.borderColor,
        ) ??
        fallback ??
        Theme.of(context).dividerColor;
  }

  static Color dashboardBackground(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService
              .instance
              .effectiveAppUi
              .dashboard
              .backgroundColor,
        ) ??
        fallback ??
        Theme.of(context).scaffoldBackgroundColor;
  }

  static Color dashboardSurface(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService
              .instance
              .effectiveAppUi
              .dashboard
              .foregroundColor,
        ) ??
        fallback ??
        Theme.of(context).cardColor;
  }

  static Color dashboardBorder(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.dashboard.borderColor,
        ) ??
        fallback ??
        Theme.of(context).dividerColor;
  }

  static Color dashboardAccent(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.dashboard.accentColor,
        ) ??
        fallback ??
        Theme.of(context).colorScheme.primary;
  }

  static Color dashboardText(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService.instance.effectiveAppUi.dashboard.textColor,
        ) ??
        fallback ??
        Theme.of(context).colorScheme.onSurface;
  }

  static Color notificationBannerBackground(
    BuildContext context, {
    Color? fallback,
  }) {
    return _parseColor(
          LoginThemeCampaignService
              .instance
              .effectiveAppUi
              .notificationBanner
              .backgroundColor,
        ) ??
        fallback ??
        Theme.of(context).snackBarTheme.backgroundColor ??
        Theme.of(context).colorScheme.inverseSurface;
  }

  static Color notificationBannerText(
    BuildContext context, {
    Color? fallback,
  }) {
    return _parseColor(
          LoginThemeCampaignService
              .instance
              .effectiveAppUi
              .notificationBanner
              .textColor,
        ) ??
        fallback ??
        Theme.of(context).snackBarTheme.contentTextStyle?.color ??
        Theme.of(context).colorScheme.onInverseSurface;
  }

  static Color modalBackground(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService
              .instance
              .effectiveAppUi
              .modalAccent
              .backgroundColor,
        ) ??
        fallback ??
        Theme.of(context).dialogTheme.backgroundColor ??
        Theme.of(context).colorScheme.surface;
  }

  static Color modalAccent(BuildContext context, {Color? fallback}) {
    return _parseColor(
          LoginThemeCampaignService
              .instance
              .effectiveAppUi
              .modalAccent
              .accentColor,
        ) ??
        fallback ??
        Theme.of(context).colorScheme.secondary;
  }

  static Color? _parseColor(String raw) {
    final normalized = raw.trim();
    if (normalized.isEmpty) return null;

    var hex = normalized.toLowerCase();
    if (hex.startsWith('#')) {
      hex = hex.substring(1);
    } else if (hex.startsWith('0x')) {
      hex = hex.substring(2);
    } else {
      return null;
    }

    if (hex.length == 6) {
      hex = 'ff$hex';
    }
    if (hex.length != 8) {
      return null;
    }

    final value = int.tryParse(hex, radix: 16);
    if (value == null) return null;
    return Color(value);
  }
}
