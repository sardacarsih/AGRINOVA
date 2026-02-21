import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../shared/widgets/intro_animation/intro_animation.dart';
import '../../../../shared/widgets/app_error_screen.dart';
import '../../../../core/routes/app_routes.dart';
import '../blocs/auth_bloc.dart';
import 'login_page.dart';

/// Splash Screen with AGRINOVA Intro Animation
/// 
/// Displays the Netflix-style intro animation when the app launches,
/// then navigates directly to the appropriate screen based on auth state.
class SplashScreen extends StatefulWidget {
  final bool isInitialized;
  final String? initError;
  final VoidCallback? onRetry;
  
  const SplashScreen({
    super.key,
    this.isInitialized = false,
    this.initError,
    this.onRetry,
  });

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _isAnimationCompleted = false;
  bool _hasNavigated = false;
  bool _isListening = false;

  @override
  void didUpdateWidget(SplashScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    // When initialization becomes available and we weren't listening before
    if (widget.isInitialized && !_isListening) {
      _startListeningToAuth();
    }
  }

  void _startListeningToAuth() {
    if (_isListening) return;
    
    try {
      final authBloc = context.read<AuthBloc>();
      debugPrint('🔐 SplashScreen: AuthBloc available, listening to state');
      _isListening = true;
      
      // Check initial state
      _checkAndNavigate();
      
      // Listen to state changes
      authBloc.stream.listen((state) {
        debugPrint('🔐 SplashScreen: Auth state changed to ${state.runtimeType}');
        if (mounted) {
          _checkAndNavigate();
        }
      });
    } catch (e) {
      debugPrint('⏳ SplashScreen: AuthBloc not available yet');
    }
  }

  void _onAnimationCompleted() {
    debugPrint('🎬 SplashScreen: Animation completed');
    setState(() {
      _isAnimationCompleted = true;
    });
    
    // Try to start listening now if not already
    if (widget.isInitialized && !_isListening) {
      _startListeningToAuth();
    }
    
    _checkAndNavigate();
  }

  bool _isAuthResolved(AuthState? state) {
    if (state == null) return false;
    return state is! AuthLoading && state is! AuthInitial;
  }

  void _checkAndNavigate() {
    if (_hasNavigated || !mounted) return;
    if (!widget.isInitialized) return;
    
    // Check if AuthBloc is available
    AuthState? authState;
    try {
      authState = context.read<AuthBloc>().state;
    } catch (e) {
      return;
    }
    
    debugPrint('🧭 SplashScreen: Checking navigation...');
    debugPrint('   - isAnimationCompleted: $_isAnimationCompleted');
    debugPrint('   - authState: ${authState.runtimeType}');
    debugPrint('   - isAuthResolved: ${_isAuthResolved(authState)}');
    
    // Wait for both: animation completed AND auth resolved
    if (!_isAnimationCompleted || !_isAuthResolved(authState)) {
      debugPrint('⏳ SplashScreen: Not ready to navigate yet');
      return;
    }

    _hasNavigated = true;
    debugPrint('🚀 SplashScreen: All conditions met, navigating...');

    // Navigate based on auth state
    if (authState is AuthAuthenticated) {
      final route = AppRoutes.getDashboardRoute(authState.user.role);
      debugPrint('➡️ Navigating to dashboard: $route');
      Navigator.of(context).pushReplacementNamed(route);
    } else if (authState is AuthOfflineMode) {
      final route = AppRoutes.getDashboardRoute(authState.user.role);
      debugPrint('➡️ Navigating to dashboard (offline): $route');
      Navigator.of(context).pushReplacementNamed(route);
    } else if (authState is AuthBiometricRequired) {
      debugPrint('➡️ Showing biometric screen');
      _navigateToPage(_buildBiometricScreen(authState));
    } else if (authState is AuthError) {
      debugPrint('➡️ Navigating to login (error: ${authState.message})');
      _navigateToLoginWithError(authState.message);
    } else {
      // AuthUnauthenticated or any other state -> Login page
      debugPrint('➡️ Navigating to login (unauthenticated)');
      _navigateToPage(const LoginPage());
    }
  }
  
  void _navigateToPage(Widget targetPage) {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => targetPage,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 500),
      ),
    );
  }
  
  void _navigateToLoginWithError(String message) {
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => const LoginPage(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
        transitionDuration: const Duration(milliseconds: 500),
      ),
    );
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: Colors.red,
          ),
        );
      }
    });
  }

  Widget _buildBiometricScreen(AuthBiometricRequired state) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.fingerprint,
              size: 64,
              color: Colors.blue,
            ),
            const SizedBox(height: 16),
            Text(
              state.reason,
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: () {
                context.read<AuthBloc>().add(const AuthBiometricRequested());
              },
              child: const Text('Authenticate'),
            ),
            TextButton(
              onPressed: () {
                context.read<AuthBloc>().add(const AuthLogoutRequested());
              },
              child: const Text('Use Password'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // If initialization failed, show error screen
    if (widget.initError != null) {
      return AppErrorScreen(
        title: 'Initialization Failed',
        message: 'AgroNova could not start due to a technical issue.',
        errorDetails: widget.initError,
        onRetry: widget.onRetry,
      );
    }

    return AgrinovaIntroAnimation(
      onCompleted: _onAnimationCompleted,
    );
  }
}
