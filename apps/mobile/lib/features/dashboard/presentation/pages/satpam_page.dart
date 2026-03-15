import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../gate_check/presentation/pages/enhanced_satpam_dashboard.dart';
import '../../../../core/theme/runtime_theme_slot_resolver.dart';
import '../../../../shared/widgets/auth_listener_wrapper.dart';

/// Satpam Page - wrapper that routes to EnhancedSatpamDashboard.
class SatpamPage extends StatelessWidget {
  static final Logger _logger = Logger();

  const SatpamPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AuthListenerWrapper(
      child: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is AuthAuthenticated) {
            _logger.i(
              'Loading Satpam Dashboard for user: ${state.user.username}',
            );
            return const EnhancedSatpamDashboard();
          }

          return _buildLoadingScreen(context);
        },
      ),
    );
  }

  Widget _buildLoadingScreen(BuildContext context) {
    final navbarBg = RuntimeThemeSlotResolver.navbarBackground(
      context,
      fallback: Theme.of(context).primaryColor,
    );
    final navbarFg = RuntimeThemeSlotResolver.navbarForeground(
      context,
      fallback: Colors.white,
    );
    return Scaffold(
      appBar: AppBar(
        title: Text('Dashboard Satpam', style: TextStyle(color: navbarFg)),
        flexibleSpace: RuntimeThemeSlotResolver.hasNavbarBackground
            ? Container(color: navbarBg)
            : null,
        backgroundColor: RuntimeThemeSlotResolver.hasNavbarBackground
            ? Colors.transparent
            : navbarBg,
        foregroundColor: navbarFg,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Memuat dashboard...'),
          ],
        ),
      ),
    );
  }
}
