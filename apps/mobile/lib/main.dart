import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/config/app_config.dart';
import 'core/di/service_locator.dart';
import 'core/init/app_initializer.dart';
import 'core/services/app_update_manager.dart';
import 'features/auth/presentation/blocs/auth_bloc.dart';
import 'features/auth/presentation/pages/unauthorized_page.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/login_theme_campaign_service.dart';
import 'core/theme/theme_mode_service.dart';
import 'core/routes/app_routes.dart';
import 'core/routes/route_guards.dart';
import 'features/auth/presentation/pages/splash_screen.dart';
import 'shared/widgets/app_bloc_observer.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Required for DateFormat with explicit locale, e.g. DateFormat(..., 'id_ID')
  await initializeDateFormatting('id_ID');

  // Set BLoC observer for debugging
  Bloc.observer = AppBlocObserver();

  runApp(const AgrinovaApp());
}

/// Root widget that handles initialization and provides AuthBloc globally
class AgrinovaApp extends StatefulWidget {
  const AgrinovaApp({super.key});

  @override
  State<AgrinovaApp> createState() => _AgrinovaAppState();
}

class _AgrinovaAppState extends State<AgrinovaApp> {
  bool _isInitialized = false;
  bool _isUpdateManagerInitialized = false;
  bool _isUpdateManagerInitializing = false;
  bool _shouldInitUpdateManagerAfterInit = false;
  DateTime? _lastUpdateManagerInitFailure;
  String? _initError;
  AuthBloc? _authBloc;
  late final _StartupNavigationObserver _startupNavigationObserver;

  @override
  void initState() {
    super.initState();
    _startupNavigationObserver = _StartupNavigationObserver(
      onPostSplashRouteSettled: _onPostSplashRouteSettled,
    );
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      await AppInitializer.initialize();
      await ThemeModeService.instance.initialize();
      await LoginThemeCampaignService.instance.initialize();
      try {
        await LoginThemeCampaignService.instance
            .refresh(force: true)
            .timeout(const Duration(seconds: 2));
      } catch (error) {
        debugPrint('LoginThemeCampaignService startup refresh skipped: $error');
      }

      if (mounted) {
        final authBloc = ServiceLocator.get<AuthBloc>()
          ..add(const AuthCheckRequested());
        setState(() {
          _isInitialized = true;
          _authBloc = authBloc;
        });

        if (_shouldInitUpdateManagerAfterInit) {
          _shouldInitUpdateManagerAfterInit = false;
          WidgetsBinding.instance.addPostFrameCallback((_) {
            _initializeAppUpdateManagerFromNavigatorContext();
          });
        }
      }
    } catch (e) {
      debugPrint('❌ Failed to initialize: $e');
      if (mounted) {
        setState(() {
          _initError = e.toString();
        });
      }
    }
  }

  void _onPostSplashRouteSettled() {
    if (!mounted) return;
    if (!_isInitialized) {
      _shouldInitUpdateManagerAfterInit = true;
      return;
    }
    _initializeAppUpdateManagerFromNavigatorContext();
  }

  void _initializeAppUpdateManagerFromNavigatorContext() {
    final appContext = AppRoutes.navigatorKey.currentContext;
    if (appContext == null) {
      return;
    }
    _initializeAppUpdateManager(appContext);
  }

  void _initializeAppUpdateManager(BuildContext appContext) {
    final lastFailure = _lastUpdateManagerInitFailure;
    if (lastFailure != null &&
        DateTime.now().difference(lastFailure) < const Duration(seconds: 30)) {
      return;
    }

    if (_isUpdateManagerInitialized || _isUpdateManagerInitializing) return;
    _isUpdateManagerInitializing = true;

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) {
        _isUpdateManagerInitializing = false;
        return;
      }

      var initialized = false;

      try {
        final manager = AppUpdateManager();
        manager.updateContext(appContext);
        await manager.initialize(appContext);
        initialized = true;
      } catch (e) {
        _lastUpdateManagerInitFailure = DateTime.now();
        debugPrint('Failed to initialize AppUpdateManager: $e');
      } finally {
        if (mounted) {
          setState(() {
            if (initialized) {
              _isUpdateManagerInitialized = true;
              _lastUpdateManagerInitFailure = null;
            }
            _isUpdateManagerInitializing = false;
          });
        } else {
          _isUpdateManagerInitializing = false;
        }
      }
    });
  }

  void _retry() {
    if (_isUpdateManagerInitialized || _isUpdateManagerInitializing) {
      AppUpdateManager().dispose();
    }
    _startupNavigationObserver.resetPostSplashTracking();
    setState(() {
      _isInitialized = false;
      _isUpdateManagerInitialized = false;
      _isUpdateManagerInitializing = false;
      _shouldInitUpdateManagerAfterInit = false;
      _initError = null;
      _authBloc = null;
    });
    _initialize();
  }

  @override
  void dispose() {
    if (_isUpdateManagerInitialized || _isUpdateManagerInitializing) {
      AppUpdateManager().dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([
        ThemeModeService.instance,
        LoginThemeCampaignService.instance,
      ]),
      builder: (context, child) => MaterialApp(
        navigatorKey: AppRoutes.navigatorKey,
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        theme: _buildRuntimeAwareTheme(Brightness.light),
        darkTheme: _buildRuntimeAwareTheme(Brightness.dark),
        themeMode: ThemeModeService.instance.themeMode,
        localizationsDelegates: const [
          GlobalMaterialLocalizations.delegate,
          GlobalWidgetsLocalizations.delegate,
          GlobalCupertinoLocalizations.delegate,
        ],
        supportedLocales: const [Locale('id', 'ID'), Locale('en', 'US')],
        home: _buildHome(),
        onGenerateRoute: (settings) {
          // Only allow route generation after initialization
          if (!_isInitialized || _authBloc == null) {
            return null;
          }
          return _generateGuardedRoute(settings);
        },
        navigatorObservers: [_startupNavigationObserver],
        builder: (context, child) {
          Widget result = MediaQuery(
            data: MediaQuery.of(
              context,
            ).copyWith(textScaler: const TextScaler.linear(1.0)),
            child: child!,
          );

          // Wrap with BlocProvider if AuthBloc is available
          if (_authBloc != null) {
            result = BlocProvider<AuthBloc>.value(
              value: _authBloc!,
              child: result,
            );
          }

          return result;
        },
      ),
    );
  }

  Widget _buildHome() {
    return SplashScreen(
      key: const ValueKey('splash'), // Keep same key to prevent recreation
      isInitialized: _isInitialized,
      initError: _initError,
      onRetry: _retry,
    );
  }

  String? _getCurrentUserRole() {
    final state = _authBloc?.state;
    if (state is AuthAuthenticated) {
      return state.user.role;
    }
    if (state is AuthOfflineMode) {
      return state.user.role;
    }
    return null;
  }

  Route<dynamic> _generateGuardedRoute(RouteSettings settings) {
    final routeName = settings.name;
    if (routeName == null || routeName.isEmpty) {
      return AppRoutes.generateRoute(settings);
    }

    if (!RouteGuard.isKnownRoute(routeName)) {
      return AppRoutes.generateRoute(settings);
    }

    final userRole = _getCurrentUserRole();
    if (!RouteGuard.canAccessRoute(routeName, userRole)) {
      if (userRole == null) {
        return AppRoutes.generateRoute(
          const RouteSettings(name: AppRoutes.login),
        );
      }

      return MaterialPageRoute(
        settings: settings,
        builder: (_) =>
            UnauthorizedPage(attemptedRoute: routeName, userRole: userRole),
      );
    }

    return AppRoutes.generateRoute(settings);
  }

  ThemeData _buildRuntimeAwareTheme(Brightness brightness) {
    final baseTheme = brightness == Brightness.dark
        ? AppTheme.darkTheme
        : AppTheme.lightTheme;
    return _applyRuntimeAppUiTheme(
      baseTheme,
      LoginThemeCampaignService.instance.effectiveAppUi,
    );
  }

  ThemeData _applyRuntimeAppUiTheme(
    ThemeData baseTheme,
    LoginThemeAppUi appUi,
  ) {
    final navbarBackground = _parseThemeColor(
      appUi.navbar.backgroundColor,
      fallback: baseTheme.appBarTheme.backgroundColor,
    );
    final navbarForeground = _parseThemeColor(
      appUi.navbar.foregroundColor,
      fallback: baseTheme.appBarTheme.foregroundColor,
    );
    final sidebarBackground = _parseThemeColor(
      appUi.sidebar.backgroundColor,
      fallback: baseTheme.drawerTheme.backgroundColor,
    );
    final sidebarForeground = _parseThemeColor(
      appUi.sidebar.foregroundColor,
      fallback:
          baseTheme.popupMenuTheme.textStyle?.color ??
          baseTheme.colorScheme.onSurface,
    );
    final sidebarBorder = _parseThemeColor(appUi.sidebar.borderColor);
    final footerBackground = _parseThemeColor(
      appUi.footer.backgroundColor,
      fallback: baseTheme.bottomNavigationBarTheme.backgroundColor,
    );
    final footerSelected = _parseThemeColor(
      appUi.footer.accentColor,
      fallback: baseTheme.bottomNavigationBarTheme.selectedItemColor,
    );
    final footerUnselected = _parseThemeColor(
      appUi.footer.foregroundColor,
      fallback: baseTheme.bottomNavigationBarTheme.unselectedItemColor,
    );
    final dashboardBackground = _parseThemeColor(
      appUi.dashboard.backgroundColor,
      fallback: baseTheme.scaffoldBackgroundColor,
    );
    final dashboardSurface = _parseThemeColor(
      appUi.dashboard.foregroundColor,
      fallback: baseTheme.cardTheme.color,
    );
    final notificationBackground = _parseThemeColor(
      appUi.notificationBanner.backgroundColor,
      fallback: baseTheme.snackBarTheme.backgroundColor,
    );
    final notificationText = _parseThemeColor(
      appUi.notificationBanner.textColor,
      fallback: baseTheme.snackBarTheme.contentTextStyle?.color,
    );
    final modalBackground = _parseThemeColor(
      appUi.modalAccent.backgroundColor,
      fallback: baseTheme.dialogTheme.backgroundColor,
    );
    final modalAccent = _parseThemeColor(
      appUi.modalAccent.accentColor,
      fallback: baseTheme.colorScheme.secondary,
    );

    return baseTheme.copyWith(
      appBarTheme: baseTheme.appBarTheme.copyWith(
        backgroundColor: navbarBackground,
        foregroundColor: navbarForeground,
        iconTheme: baseTheme.appBarTheme.iconTheme?.copyWith(
          color: _parseThemeColor(
            appUi.navbar.iconColor,
            fallback: navbarForeground,
          ),
        ),
      ),
      drawerTheme: baseTheme.drawerTheme.copyWith(
        backgroundColor: sidebarBackground,
      ),
      popupMenuTheme: baseTheme.popupMenuTheme.copyWith(
        color: sidebarBackground,
        textStyle:
            (baseTheme.popupMenuTheme.textStyle ??
                    baseTheme.textTheme.bodyMedium)
                ?.copyWith(color: sidebarForeground),
        shape: sidebarBorder == null
            ? baseTheme.popupMenuTheme.shape
            : RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: sidebarBorder),
              ),
      ),
      bottomNavigationBarTheme: baseTheme.bottomNavigationBarTheme.copyWith(
        backgroundColor: footerBackground,
        selectedItemColor: footerSelected,
        unselectedItemColor: footerUnselected,
      ),
      navigationBarTheme: baseTheme.navigationBarTheme.copyWith(
        backgroundColor: footerBackground,
        indicatorColor: _parseThemeColor(
          appUi.footer.borderColor,
          fallback: baseTheme.navigationBarTheme.indicatorColor,
        ),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return IconThemeData(color: footerSelected);
          }
          return IconThemeData(color: footerUnselected);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return TextStyle(color: footerSelected);
          }
          return TextStyle(color: footerUnselected);
        }),
      ),
      scaffoldBackgroundColor: dashboardBackground ?? baseTheme.scaffoldBackgroundColor,
      cardTheme: baseTheme.cardTheme.copyWith(color: dashboardSurface),
      snackBarTheme: baseTheme.snackBarTheme.copyWith(
        backgroundColor: notificationBackground,
        contentTextStyle: baseTheme.snackBarTheme.contentTextStyle?.copyWith(
          color: notificationText,
        ),
      ),
      dialogTheme: baseTheme.dialogTheme.copyWith(
        backgroundColor: modalBackground,
      ),
      bottomSheetTheme: baseTheme.bottomSheetTheme.copyWith(
        backgroundColor: modalBackground,
      ),
      colorScheme: baseTheme.colorScheme.copyWith(
        secondary: modalAccent ?? baseTheme.colorScheme.secondary,
      ),
    );
  }

  Color? _parseThemeColor(String raw, {Color? fallback}) {
    final normalized = raw.trim();
    if (normalized.isEmpty) return fallback;

    var hex = normalized.toLowerCase();
    if (hex.startsWith('#')) {
      hex = hex.substring(1);
    } else if (hex.startsWith('0x')) {
      hex = hex.substring(2);
    } else {
      return fallback;
    }

    if (hex.length == 6) {
      hex = 'ff$hex';
    }
    if (hex.length != 8) {
      return fallback;
    }

    final value = int.tryParse(hex, radix: 16);
    if (value == null) {
      return fallback;
    }
    return Color(value);
  }
}

class _StartupNavigationObserver extends NavigatorObserver {
  _StartupNavigationObserver({required this.onPostSplashRouteSettled});

  final VoidCallback onPostSplashRouteSettled;
  bool _hasSeenInitialRoute = false;
  bool _hasNotifiedPostSplashRoute = false;

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    if (!_hasSeenInitialRoute) {
      _hasSeenInitialRoute = true;
      return;
    }

    _notifyPostSplashRouteOnce();
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    _hasSeenInitialRoute = true;
    if (oldRoute != null) {
      _notifyPostSplashRouteOnce();
    }
  }

  void _notifyPostSplashRouteOnce() {
    if (_hasNotifiedPostSplashRoute) return;
    _hasNotifiedPostSplashRoute = true;

    WidgetsBinding.instance.addPostFrameCallback((_) {
      onPostSplashRouteSettled();
    });
  }

  void resetPostSplashTracking() {
    _hasSeenInitialRoute = false;
    _hasNotifiedPostSplashRoute = false;
  }
}
