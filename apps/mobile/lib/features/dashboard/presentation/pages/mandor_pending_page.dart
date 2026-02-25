import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../auth/presentation/blocs/auth_bloc.dart';
import 'mandor_dashboard/mandor_theme.dart';
import 'mandor_dashboard/organisms/genz_riwayat_tab.dart';

class MandorPendingPage extends StatelessWidget {
  const MandorPendingPage({super.key});

  @override
  Widget build(BuildContext context) {
    final focusHarvestId = _extractFocusHarvestId(context);

    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, authState) {
        String? mandorId;
        String? role;

        if (authState is AuthAuthenticated) {
          mandorId = authState.user.id;
          role = authState.user.role;
        } else if (authState is AuthOfflineMode) {
          mandorId = authState.user.id;
          role = authState.user.role;
        }

        return Scaffold(
          backgroundColor: MandorTheme.gray900,
          appBar: AppBar(
            title: const Text(
              'Pending Persetujuan',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18),
            ),
            backgroundColor: MandorTheme.darkGreen,
            foregroundColor: Colors.white,
            elevation: 0,
          ),
          body: _buildBody(
            context: context,
            mandorId: mandorId,
            role: role,
            focusHarvestId: focusHarvestId,
          ),
        );
      },
    );
  }

  Widget _buildBody({
    required BuildContext context,
    required String? mandorId,
    required String? role,
    required String? focusHarvestId,
  }) {
    if (mandorId == null || mandorId.trim().isEmpty) {
      return Center(
        child: CircularProgressIndicator(
          valueColor: AlwaysStoppedAnimation<Color>(MandorTheme.forestGreen),
        ),
      );
    }

    if ((role ?? '').toUpperCase() != 'MANDOR') {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            'Halaman ini hanya untuk role Mandor.',
            style: MandorTheme.bodyMedium,
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return GenZRiwayatTab(
      mandorId: mandorId,
      initialFilter: 'Pending',
      focusHarvestId: focusHarvestId,
      autoOpenFocusedHarvest: true,
    );
  }

  String? _extractFocusHarvestId(BuildContext context) {
    final arguments = ModalRoute.of(context)?.settings.arguments;
    if (arguments is! Map) {
      return null;
    }

    final normalized = arguments.map(
      (key, value) => MapEntry(key.toString(), value),
    );
    final panenId = normalized['panenId'] ?? normalized['panen_id'];
    if (panenId is String && panenId.trim().isNotEmpty) {
      return panenId.trim();
    }

    return null;
  }
}
