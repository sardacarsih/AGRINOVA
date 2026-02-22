import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../../core/services/role_service.dart';
import '../../../../shared/widgets/logout_menu_widget.dart';
import '../../../../shared/widgets/auth_listener_wrapper.dart';

class GradingPage extends StatelessWidget {
  static final Logger _logger = Logger();

  const GradingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AuthListenerWrapper(
      child: BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is AuthAuthenticated) {
          _logger.i('Loading Grading dashboard for user: ${state.user.username}');
          
          return Scaffold(
            appBar: AppBar(
              title: Text('Dashboard Grading'),
              backgroundColor: Colors.pink[600],
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
            body: _buildGradingDashboard(context, state),
            floatingActionButton: FloatingActionButton.extended(
              onPressed: () => _navigateToInspection(context),
              icon: Icon(Icons.verified),
              label: Text('Inspeksi Baru'),
              backgroundColor: Colors.pink[600],
              foregroundColor: Colors.white,
            ),
          );
        }

        return _buildLoadingScreen();
      },
      ),
    );
  }

  Widget _buildGradingDashboard(BuildContext context, AuthAuthenticated state) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildWelcomeSection(context, state),
          SizedBox(height: 24),
          _buildTodaysSummary(context),
          SizedBox(height: 24),
          _buildPendingApprovals(context),
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
          colors: [Colors.pink[600]!, Colors.pink[400]!],
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
              Icon(Icons.verified, color: Colors.white, size: 32),
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
                      'Grading - ${state.user.estate ?? 'Estate'}',
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
              'Total Inspeksi',
              '38',
              Icons.verified,
              Colors.pink,
            ),
            _buildSummaryCard(
              context,
              'Pending Approval',
              '8',
              Icons.pending,
              Colors.orange,
            ),
            _buildSummaryCard(
              context,
              'Rata-rata Mutu',
              'A',
              Icons.grade,
              Colors.green,
            ),
            _buildSummaryCard(
              context,
              'Status',
              'Aktif',
              Icons.check_circle,
              Colors.blue,
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

  Widget _buildPendingApprovals(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Menunggu Persetujuan',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        SizedBox(height: 12),
        Container(
          width: double.infinity,
          padding: EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.orange[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.orange[200]!),
          ),
          child: Column(
            children: [
              Icon(
                Icons.pending_actions,
                size: 48,
                color: Colors.orange[400],
              ),
              SizedBox(height: 12),
              Text(
                'Tidak ada data menunggu persetujuan',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.orange[700],
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Data inspeksi yang perlu disetujui akan muncul di sini',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Colors.orange[600],
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
      appBar: AppBar(title: Text('Dashboard Grading')),
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

  void _navigateToInspection(BuildContext context) {
    Navigator.pushNamed(context, '/grading/inspection');
  }
}

