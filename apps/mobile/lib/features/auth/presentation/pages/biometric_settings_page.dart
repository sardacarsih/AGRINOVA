import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/services/biometric_auth_service.dart';
import '../blocs/biometric_auth_bloc.dart';
import '../widgets/biometric_auth_widget.dart';

class BiometricSettingsPage extends StatefulWidget {
  const BiometricSettingsPage({super.key});

  @override
  State<BiometricSettingsPage> createState() => _BiometricSettingsPageState();
}

class _BiometricSettingsPageState extends State<BiometricSettingsPage> {
  @override
  void initState() {
    super.initState();
    context.read<BiometricAuthBloc>().add(const BiometricStatusRequested());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pengaturan Biometrik'),
        backgroundColor: Theme.of(context).colorScheme.primary,
        foregroundColor: Colors.white,
      ),
      body: BlocBuilder<BiometricAuthBloc, BiometricAuthState>(
        builder: (context, state) {
          if (state is BiometricAuthLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }

          if (state is BiometricAuthError) {
            return _buildErrorView(state.message);
          }

          if (state is BiometricStatusLoaded) {
            return _buildSettingsView(context, state);
          }

          if (state is BiometricCapabilitiesLoaded) {
            return _buildCapabilitiesView(context, state);
          }

          return _buildInitialView(context);
        },
      ),
    );
  }

  Widget _buildErrorView(String message) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.error_outline,
            size: 64,
            color: Colors.red,
          ),
          const SizedBox(height: 16),
          Text(
            'Terjadi Kesalahan',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Colors.grey[600],
              ),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              context.read<BiometricAuthBloc>().add(
                const BiometricStatusRequested(),
              );
            },
            child: const Text('Coba Lagi'),
          ),
        ],
      ),
    );
  }

  Widget _buildInitialView(BuildContext context) {
    return Center(
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
            'Pengaturan Biometrik',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          const Text(
            'Memuat informasi biometrik...',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              context.read<BiometricAuthBloc>().add(
                const BiometricCapabilitiesRequested(),
              );
            },
            child: const Text('Periksa Kemampuan'),
          ),
        ],
      ),
    );
  }

  Widget _buildCapabilitiesView(BuildContext context, BiometricCapabilitiesLoaded state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildCapabilityCard(state.capabilities),
          const SizedBox(height: 16),
          _buildSetupCard(context, state.capabilities),
        ],
      ),
    );
  }

  Widget _buildSettingsView(BuildContext context, BiometricStatusLoaded state) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildMainSettingsCard(context, state), // Includes the Switch
          const SizedBox(height: 16),
          _buildStatusCard(state),
          const SizedBox(height: 16),
          if (state.capabilities.isFullySupported && state.isEnabled) ...[
            _buildPreferencesCard(context, state),
            const SizedBox(height: 16),
          ],
          _buildSecurityCard(context, state),
          const SizedBox(height: 16),
          // Actions card only for Reset/Back now
          if (state.isLocked) _buildActionsCard(context, state),
        ],
      ),
    );
  }

  Widget _buildMainSettingsCard(BuildContext context, BiometricStatusLoaded state) {
    final bool canEnable = state.capabilities.isFullySupported;
    
    return Card(
      child: Column(
        children: [
          SwitchListTile(
            title: const Text(
              'Aktifkan Biometrik',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text(
              canEnable 
                ? 'Gunakan ${state.capabilities.strongestBiometric.name == "strong" ? "biometrik" : state.capabilities.strongestBiometric.name} untuk login'
                : state.capabilities.isDeviceSupported 
                    ? 'Anda belum mendaftarkan biometrik di pengaturan HP'
                    : 'Perangkat tidak mendukung biometrik',
              style: TextStyle(
                color: canEnable ? Colors.grey[600] : Colors.orange,
                fontSize: 12,
              ),
            ),
            secondary: Icon(
              state.isEnabled ? Icons.fingerprint : Icons.fingerprint_outlined,
              color: state.isEnabled ? Colors.green : (canEnable ? Colors.grey : Colors.grey[300]),
            ),
            value: state.isEnabled,
            onChanged: canEnable
              ? (bool value) {
                  if (value) {
                    context.read<BiometricAuthBloc>().add(
                      const BiometricEnableRequested(
                        reason: 'Aktifkan autentikasi biometrik',
                      ),
                    );
                  } else {
                    _showDisableDialog(context);
                  }
                }
              : null,
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard(BiometricStatusLoaded state) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  state.isEnabled ? Icons.security : Icons.security_update_warning,
                  color: state.isEnabled ? Colors.green : Colors.orange,
                ),
                const SizedBox(width: 8),
                Text(
                  'Status Biometrik',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildStatusItem(
              'Aktif',
              state.isEnabled,
              state.isEnabled ? Colors.green : Colors.red,
            ),
            _buildStatusItem(
              'Didukung Perangkat',
              state.isSupported,
              state.isSupported ? Colors.green : Colors.red,
            ),
            _buildStatusItem(
              'Terdaftar',
              state.isEnrolled,
              state.isEnrolled ? Colors.green : Colors.orange,
            ),
            if (state.isLocked) ...[
              const Divider(),
              _buildLockStatus(state.lockoutTimeRemaining),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatusItem(String label, bool status, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Row(
            children: [
              Icon(
                status ? Icons.check_circle : Icons.cancel,
                size: 16,
                color: color,
              ),
              const SizedBox(width: 4),
              Text(
                status ? 'Ya' : 'Tidak',
                style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLockStatus(Duration? lockoutTime) {
    if (lockoutTime == null) return const SizedBox();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.lock, color: Colors.red, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Terkunci Sementara',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.red,
                  ),
                ),
                Text(
                  'Sisa waktu: ${lockoutTime.inMinutes} menit ${lockoutTime.inSeconds % 60} detik',
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCapabilityCard(BiometricCapabilities capabilities) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.blue),
                const SizedBox(width: 8),
                Text(
                  'Kemampuan Perangkat',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (capabilities.availableBiometrics.isEmpty) ...[
              const Text(
                'Tidak ada biometrik yang tersedia',
                style: TextStyle(color: Colors.grey),
              ),
            ] else ...[
              const Text(
                'Jenis biometrik yang tersedia:',
                style: TextStyle(fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 8),
              ...capabilities.availableBiometrics.map(
                (type) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Icon(
                        _getBiometricIcon(type),
                        size: 16,
                        color: Colors.green,
                      ),
                      const SizedBox(width: 8),
                      Text(BiometricAuthBloc.getBiometricTypeDisplayName(type)),
                    ],
                  ),
                ),
              ),
              if (capabilities.availableBiometrics.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.green.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.star, color: Colors.green, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        'Terkuat: ${BiometricAuthBloc.getBiometricTypeDisplayName(capabilities.strongestBiometric)}',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSetupCard(BuildContext context, BiometricCapabilities capabilities) {
    if (capabilities.isFullySupported) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              const BiometricSetupWidget(),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Nanti Saja'),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        context.read<BiometricAuthBloc>().add(
                          const BiometricEnableRequested(
                            reason: 'Aktifkan autentikasi biometrik untuk keamanan yang lebih baik',
                          ),
                        );
                      },
                      child: const Text('Aktifkan'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(
              Icons.warning_amber,
              size: 48,
              color: Colors.orange[700],
            ),
            const SizedBox(height: 16),
            Text(
              'Biometrik Tidak Tersedia',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              capabilities.isDeviceSupported 
                ? 'Silakan atur biometrik di pengaturan perangkat terlebih dahulu'
                : 'Perangkat Anda tidak mendukung autentikasi biometrik',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Tutup'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPreferencesCard(BuildContext context, BiometricStatusLoaded state) {
    // Only show if enabled and fully supported
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.tune, color: Colors.purple),
                const SizedBox(width: 8),
                Text(
                  'Preferensi',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Jenis biometrik yang diutamakan:',
              style: TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<BiometricType>(
              initialValue: state.preferredType,
              decoration: const InputDecoration(
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              items: state.capabilities.availableBiometrics.map((type) {
                return DropdownMenuItem(
                  value: type,
                  child: Row(
                    children: [
                      Icon(_getBiometricIcon(type), size: 16),
                      const SizedBox(width: 8),
                      Text(BiometricAuthBloc.getBiometricTypeDisplayName(type)),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (BiometricType? newType) {
                if (newType != null && newType != state.preferredType) {
                  context.read<BiometricAuthBloc>().add(
                    BiometricTypePreferenceChanged(newType),
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSecurityCard(BuildContext context, BiometricStatusLoaded state) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.shield, color: Colors.orange),
                const SizedBox(width: 8),
                Text(
                  'Keamanan',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.analytics, color: Colors.blue),
              title: const Text('Lihat Statistik Biometrik'),
              subtitle: const Text('Monitor penggunaan dan keamanan'),
              trailing: const Icon(Icons.arrow_forward_ios, size: 16),
              onTap: () {
                context.read<BiometricAuthBloc>().add(
                  const BiometricStatsRequested(),
                );
                _showStatsDialog(context);
              },
            ),
            if (state.isLocked) ...[
              const Divider(),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.lock_reset, color: Colors.red),
                title: const Text('Reset Kunci Biometrik'),
                subtitle: const Text('Hapus kunci akibat percobaan gagal'),
                trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                onTap: () {
                  _showResetLockDialog(context);
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  // Simplified Actions Card or removed if empty
  Widget _buildActionsCard(BuildContext context, BiometricStatusLoaded state) {
     // Only needed for Reset Lock or specific dev actions now
     // Since Enable/Disable is in the main switch
     return const SizedBox.shrink(); 
  }

  IconData _getBiometricIcon(BiometricType type) {
    switch (type) {
      case BiometricType.fingerprint:
        return Icons.fingerprint;
      case BiometricType.face:
        return Icons.face;
      case BiometricType.iris:
        return Icons.remove_red_eye;
      case BiometricType.strong:
        return Icons.security;
      case BiometricType.weak:
        return Icons.enhanced_encryption;
    }
  }

  void _showStatsDialog(BuildContext context) {
    final bloc = context.read<BiometricAuthBloc>();
    showDialog(
      context: context,
      builder: (dialogContext) => BlocProvider.value(
        value: bloc,
        child: BlocListener<BiometricAuthBloc, BiometricAuthState>(
          listener: (listenerContext, state) {
            if (state is BiometricStatsLoaded) {
              Navigator.of(dialogContext).pop();
              _showStatsDetailsDialog(context, state.stats);
            }
          },
          child: const AlertDialog(
            content: Row(
              children: [
                CircularProgressIndicator(),
                SizedBox(width: 16),
                Text('Memuat statistik...'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showStatsDetailsDialog(BuildContext context, Map<String, dynamic> stats) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Statistik Biometrik'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildStatItem('Status Aktif', stats['isEnabled']?.toString() ?? 'N/A'),
              _buildStatItem('Didukung', stats['isSupported']?.toString() ?? 'N/A'),
              _buildStatItem('Terdaftar', stats['isEnrolled']?.toString() ?? 'N/A'),
              _buildStatItem('Tipe Terkuat', stats['strongestType'] ?? 'N/A'),
              _buildStatItem('Tipe Dipilih', stats['preferredType'] ?? 'N/A'),
              _buildStatItem('Jumlah Gagal', stats['failureCount']?.toString() ?? '0'),
              _buildStatItem('Status Kunci', stats['isLocked'] == true ? 'Terkunci' : 'Normal'),
              if (stats['lastAuth'] != null)
                _buildStatItem('Terakhir Digunakan', stats['lastAuth']),
              if (stats['lockoutTimeRemaining'] != null)
                _buildStatItem('Sisa Waktu Kunci', '${stats['lockoutTimeRemaining']} detik'),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Tutup'),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value),
        ],
      ),
    );
  }

  void _showDisableDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Nonaktifkan Biometrik'),
        content: const Text(
          'Apakah Anda yakin ingin menonaktifkan autentikasi biometrik? '
          'Anda akan perlu menggunakan PIN atau password untuk masuk.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              context.read<BiometricAuthBloc>().add(
                const BiometricDisableRequested(),
              );
              Navigator.of(context).pop();
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Nonaktifkan'),
          ),
        ],
      ),
    );
  }

  void _showResetLockDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset Kunci Biometrik'),
        content: const Text(
          'Apakah Anda yakin ingin mereset kunci biometrik? '
          'Ini akan menghapus kunci akibat percobaan gagal berulang.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              context.read<BiometricAuthBloc>().add(
                const BiometricLockReset(),
              );
              Navigator.of(context).pop();
            },
            child: const Text('Reset'),
          ),
        ],
      ),
    );
  }
}

