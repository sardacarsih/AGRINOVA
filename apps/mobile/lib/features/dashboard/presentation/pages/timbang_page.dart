import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../core/services/role_service.dart';
import '../../../../shared/widgets/logout_menu_widget.dart';
import '../../../../shared/widgets/auth_listener_wrapper.dart';

class TimbangPage extends StatelessWidget {
  static final Logger _logger = Logger();

  const TimbangPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AuthListenerWrapper(
      child: BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is AuthAuthenticated) {
          _logger.i('Loading Timbangan dashboard for user: ${state.user.username}');
          
          return Scaffold(
            appBar: AppBar(
              title: Text('Dashboard Timbangan'),
              backgroundColor: Colors.teal[600],
              foregroundColor: Colors.white,
              actions: [
                IconButton(
                  icon: Icon(Icons.sync),
                  onPressed: () => _handleSync(context, state.isOfflineMode),
                  tooltip: 'Sync Data',
                ),
                if (state.isOfflineMode)
                  Container(
                    margin: EdgeInsets.only(right: 8),
                    child: Chip(
                      label: Text('Offline', style: TextStyle(fontSize: 12)),
                      backgroundColor: Colors.orange[100],
                      labelStyle: TextStyle(color: Colors.orange[800]),
                    ),
                  ),
                LogoutMenuWidget(
                  username: state.user.username,
                  role: RoleService.getRoleDisplayName(state.user.role),
                ),
              ],
            ),
            body: _buildTimbangDashboard(context, state),
            floatingActionButton: FloatingActionButton.extended(
              onPressed: () => _navigateToWeighing(context),
              icon: Icon(Icons.scale),
              label: Text('Timbang Baru'),
              backgroundColor: Colors.teal[600],
              foregroundColor: Colors.white,
            ),
          );
        }

        return _buildLoadingScreen();
      },
      ),
    );
  }

  Widget _buildTimbangDashboard(BuildContext context, AuthAuthenticated state) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildWelcomeSection(context, state),
          SizedBox(height: 24),
          _buildTodaysSummary(context),
          SizedBox(height: 24),
          _buildRecentWeighing(context),
        ],
      ),
    );
  }

  Widget _buildWelcomeSection(BuildContext context, AuthAuthenticated state) {
    return Container(
      width: double.infinity,
      padding: EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.teal[600]!, Colors.teal[400]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.scale, color: Colors.white, size: 32),
              SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Selamat Datang, ${state.user.fullName}!',
                      style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      'Timbangan - ${state.user.estate ?? 'Estate'}',
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.white.withValues(alpha: 0.9),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTodaysSummary(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Ringkasan Hari Ini',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        SizedBox(height: 12),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: NeverScrollableScrollPhysics(),
          childAspectRatio: 1.5,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          children: [
            _buildSummaryCard(
              context,
              'Total Timbang',
              '42',
              Icons.scale,
              Colors.teal,
            ),
            _buildSummaryCard(
              context,
              'Total Berat',
              '12.5 ton',
              Icons.fitness_center,
              Colors.blue,
            ),
            _buildSummaryCard(
              context,
              'Kendaraan',
              '38',
              Icons.local_shipping,
              Colors.orange,
            ),
            _buildSummaryCard(
              context,
              'Status',
              'Aktif',
              Icons.check_circle,
              Colors.green,
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSummaryCard(
    BuildContext context,
    String title,
    String value,
    IconData icon,
    Color color,
  ) {
    return Container(
      padding: EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Icon(icon, color: color, size: 24),
              Text(
                value,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: color,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          Text(
            title,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w500,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildRecentWeighing(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Riwayat Timbang Terkini',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.grey[100],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey[300]!),
          ),
          child: Column(
            children: [
              Icon(
                Icons.history,
                size: 48,
                color: Colors.grey[400],
              ),
              SizedBox(height: 12),
              Text(
                'Belum ada data penimbangan',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.grey[600],
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Mulai timbang TBS untuk melihat riwayat',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.grey[500],
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      appBar: AppBar(title: Text('Dashboard Timbangan')),
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

  void _handleSync(BuildContext context, bool isOffline) {
    if (isOffline) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Mode offline - Data akan disinkronkan saat online'),
          backgroundColor: Colors.orange,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              ),
              SizedBox(width: 12),
              Text('Menyinkronkan data...'),
            ],
          ),
        ),
      );
    }
  }

  void _navigateToWeighing(BuildContext context) {
    Navigator.pushNamed(context, '/weighing/input');
  }
}

