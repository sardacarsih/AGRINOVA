import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../features/auth/presentation/blocs/auth_bloc.dart';

/// Shared Auth Listener Wrapper
/// 
/// This widget provides a unified logout handling mechanism for all role pages.
/// When the user logs out (AuthUnauthenticated state), it navigates to the login page.
/// 
/// Usage:
/// ```dart
/// AuthListenerWrapper(
///   child: YourDashboardWidget(),
/// )
/// ```
class AuthListenerWrapper extends StatelessWidget {
  static final Logger _logger = Logger();
  
  final Widget child;

  const AuthListenerWrapper({
    Key? key,
    required this.child,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthUnauthenticated) {
          _logger.i('User logged out, navigating to login page');
          Navigator.of(context).pushNamedAndRemoveUntil('/login', (route) => false);
        }
      },
      child: child,
    );
  }
}
