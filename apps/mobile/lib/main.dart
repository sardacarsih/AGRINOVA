import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'core/config/app_config.dart';
import 'core/di/service_locator.dart';
import 'core/init/app_initializer.dart';
import 'features/auth/presentation/blocs/auth_bloc.dart';
import 'core/theme/app_theme.dart';
import 'core/routes/app_routes.dart';
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
  String? _initError;
  AuthBloc? _authBloc;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      await AppInitializer.initialize();

      if (mounted) {
        final authBloc = ServiceLocator.get<AuthBloc>()
          ..add(const AuthCheckRequested());
        setState(() {
          _isInitialized = true;
          _authBloc = authBloc;
        });
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

  void _retry() {
    setState(() {
      _isInitialized = false;
      _initError = null;
      _authBloc = null;
    });
    _initialize();
  }

  @override
  Widget build(BuildContext context) {
    // Single MaterialApp - use a wrapper to conditionally provide AuthBloc
    return MaterialApp(
      navigatorKey: AppRoutes.navigatorKey,
      title: AppConfig.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: _buildHome(),
      onGenerateRoute: (settings) {
        // Only allow route generation after initialization
        if (!_isInitialized || _authBloc == null) {
          return null;
        }
        return AppRoutes.generateRoute(settings);
      },
      builder: (context, child) {
        Widget result = MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: const TextScaler.linear(1.0),
          ),
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
}
