import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../blocs/auth_bloc.dart';
import '../../../../core/routes/app_routes.dart';
import 'login_page.dart';

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthAuthenticated) {
          // Navigate to role-based dashboard
          final route = AppRoutes.getDashboardRoute(state.user.role);
          Navigator.of(context).pushReplacementNamed(route);
        } else if (state is AuthError) {
          // Show error message
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: Colors.red,
            ),
          );
        }
      },
      child: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is AuthLoading || state is AuthInitial) {
            return const Scaffold(
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text('Loading...'),
                  ],
                ),
              ),
            );
          }

          if (state is AuthAuthenticated) {
            // This will be handled by the listener above
            return const Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            );
          }

          if (state is AuthBiometricRequired) {
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

          if (state is AuthOfflineMode) {
            return Scaffold(
              appBar: AppBar(
                title: const Text('Offline Mode'),
                backgroundColor: Colors.orange,
              ),
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(
                      Icons.wifi_off,
                      size: 64,
                      color: Colors.orange,
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'You are in offline mode',
                      style: TextStyle(fontSize: 18),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Last sync: ${_formatDate(state.lastSync)}',
                      style: const TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: () {
                        // Navigate to role-based dashboard
                        final route = AppRoutes.getDashboardRoute(state.user.role);
                        Navigator.of(context).pushReplacementNamed(route);
                      },
                      child: const Text('Continue Offline'),
                    ),
                  ],
                ),
              ),
            );
          }

          // Default to login page
          return const LoginPage();
        },
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}