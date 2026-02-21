import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../gate_check/presentation/pages/enhanced_satpam_dashboard.dart';
import '../../../../shared/widgets/auth_listener_wrapper.dart';

/// Satpam Page - wrapper that routes to EnhancedSatpamDashboard.
class SatpamPage extends StatelessWidget {
  static final Logger _logger = Logger();

  const SatpamPage({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AuthListenerWrapper(
      child: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is AuthAuthenticated) {
            _logger.i('Loading Satpam Dashboard for user: ${state.user.username}');
            return const EnhancedSatpamDashboard();
          }

          return _buildLoadingScreen();
        },
      ),
    );
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      appBar: AppBar(title: Text('Dashboard Satpam')),
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
