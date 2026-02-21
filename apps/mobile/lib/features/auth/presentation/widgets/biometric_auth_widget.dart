import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/services/biometric_auth_service.dart';
import '../blocs/biometric_auth_bloc.dart';

class BiometricAuthWidget extends StatefulWidget {
  final String? title;
  final String? subtitle;
  final String? reason;
  final BiometricType? preferredType;
  final bool allowFallback;
  final VoidCallback? onSuccess;
  final VoidCallback? onCancel;
  final Function(String)? onError;

  const BiometricAuthWidget({
    Key? key,
    this.title,
    this.subtitle,
    this.reason,
    this.preferredType,
    this.allowFallback = false,
    this.onSuccess,
    this.onCancel,
    this.onError,
  }) : super(key: key);

  @override
  State<BiometricAuthWidget> createState() => _BiometricAuthWidgetState();
}

class _BiometricAuthWidgetState extends State<BiometricAuthWidget>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _setupAnimations();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  void _setupAnimations() {
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _pulseAnimation = Tween<double>(
      begin: 0.8,
      end: 1.2,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));

    _pulseController.repeat(reverse: true);
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<BiometricAuthBloc, BiometricAuthState>(
      listener: (context, state) {
        if (state is BiometricAuthSuccess) {
          _pulseController.stop();
          widget.onSuccess?.call();
        } else if (state is BiometricAuthCancelled) {
          _pulseController.stop();
          widget.onCancel?.call();
        } else if (state is BiometricAuthFailed) {
          _pulseController.stop();
          widget.onError?.call(state.message);
        } else if (state is BiometricAuthError) {
          _pulseController.stop();
          widget.onError?.call(state.message);
        }
      },
      builder: (context, state) {
        return Card(
          elevation: 8,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildTitle(),
                const SizedBox(height: 16),
                _buildBiometricIcon(state),
                const SizedBox(height: 16),
                _buildSubtitle(),
                const SizedBox(height: 24),
                _buildStatusMessage(state),
                if (state is BiometricAuthFailed &&
                    state.lockoutTimeRemaining != null)
                  _buildLockoutTimer(state.lockoutTimeRemaining!),
                const SizedBox(height: 16),
                _buildActionButtons(state),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildTitle() {
    return Text(
      widget.title ?? 'Autentikasi Biometrik',
      style: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.bold,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildBiometricIcon(BiometricAuthState state) {
    return Container(
      width: 120,
      height: 120,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: _getGradientColors(state),
        ),
        boxShadow: [
          BoxShadow(
            color: _getPrimaryColor(state).withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: AnimatedBuilder(
        animation: _pulseAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: state is BiometricAuthLoading ? _pulseAnimation.value : 1.0,
            child: _getBiometricIcon(state),
          );
        },
      ),
    );
  }

  Widget _getBiometricIcon(BiometricAuthState state) {
    if (state is BiometricAuthLoading) {
      return const Icon(
        Icons.fingerprint,
        size: 60,
        color: Colors.white,
      );
    } else if (state is BiometricAuthSuccess) {
      return const Icon(
        Icons.check_circle,
        size: 60,
        color: Colors.white,
      );
    } else if (state is BiometricAuthFailed || state is BiometricAuthError) {
      return const Icon(
        Icons.error,
        size: 60,
        color: Colors.white,
      );
    } else if (state is BiometricAuthCancelled) {
      return const Icon(
        Icons.cancel,
        size: 60,
        color: Colors.white,
      );
    } else {
      return Icon(
        _getBiometricTypeIcon(
            widget.preferredType ?? BiometricType.fingerprint),
        size: 60,
        color: Colors.white,
      );
    }
  }

  IconData _getBiometricTypeIcon(BiometricType type) {
    switch (type) {
      case BiometricType.fingerprint:
        return Icons.fingerprint;
      case BiometricType.face:
        return Icons.face;
      case BiometricType.iris:
        return Icons.remove_red_eye;
      default:
        return Icons.security;
    }
  }

  List<Color> _getGradientColors(BiometricAuthState state) {
    if (state is BiometricAuthSuccess) {
      return [Colors.green.shade400, Colors.green.shade600];
    } else if (state is BiometricAuthFailed || state is BiometricAuthError) {
      return [Colors.red.shade400, Colors.red.shade600];
    } else if (state is BiometricAuthCancelled) {
      return [Colors.orange.shade400, Colors.orange.shade600];
    } else {
      return [Colors.blue.shade400, Colors.blue.shade600];
    }
  }

  Color _getPrimaryColor(BiometricAuthState state) {
    if (state is BiometricAuthSuccess) {
      return Colors.green;
    } else if (state is BiometricAuthFailed || state is BiometricAuthError) {
      return Colors.red;
    } else if (state is BiometricAuthCancelled) {
      return Colors.orange;
    } else {
      return Colors.blue;
    }
  }

  Widget _buildSubtitle() {
    return Text(
      widget.subtitle ?? 'Gunakan sensor biometrik untuk melanjutkan',
      style: const TextStyle(
        fontSize: 14,
        color: Colors.grey,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildStatusMessage(BiometricAuthState state) {
    String message = '';
    Color color = Colors.grey;

    if (state is BiometricAuthLoading) {
      message = state.message ?? 'Sedang memproses...';
      color = Colors.blue;
    } else if (state is BiometricAuthSuccess) {
      message = 'Autentikasi berhasil!';
      color = Colors.green;
    } else if (state is BiometricAuthFailed) {
      message = state.message;
      color = Colors.red;
    } else if (state is BiometricAuthError) {
      message = state.message;
      color = Colors.red;
    } else if (state is BiometricAuthCancelled) {
      message = 'Autentikasi dibatalkan';
      color = Colors.orange;
    } else {
      message = 'Sentuh sensor untuk memulai';
      color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        message,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.w500,
        ),
        textAlign: TextAlign.center,
      ),
    );
  }

  Widget _buildLockoutTimer(Duration duration) {
    return Container(
      margin: const EdgeInsets.only(top: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.red.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          const Icon(
            Icons.timer_off,
            color: Colors.red,
            size: 24,
          ),
          const SizedBox(height: 4),
          Text(
            'Terkunci selama ${duration.inMinutes} menit ${duration.inSeconds % 60} detik',
            style: const TextStyle(
              color: Colors.red,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BiometricAuthState state) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton(
            onPressed: state is BiometricAuthLoading
                ? null
                : () {
                    widget.onCancel?.call();
                  },
            child: const Text('Batal'),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: ElevatedButton(
            onPressed: state is BiometricAuthLoading
                ? null
                : () {
                    context.read<BiometricAuthBloc>().add(
                          BiometricAuthenticationRequested(
                            reason: widget.reason,
                            preferredType: widget.preferredType,
                            allowFallback: widget.allowFallback,
                          ),
                        );
                  },
            child: state is BiometricAuthLoading
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Text('Autentikasi'),
          ),
        ),
      ],
    );
  }
}

class BiometricSetupWidget extends StatelessWidget {
  final VoidCallback? onSetupComplete;
  final VoidCallback? onSkip;

  const BiometricSetupWidget({
    Key? key,
    this.onSetupComplete,
    this.onSkip,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<BiometricAuthBloc, BiometricAuthState>(
      builder: (context, state) {
        return Card(
          elevation: 4,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildIcon(state),
                const SizedBox(height: 16),
                _buildTitle(state),
                const SizedBox(height: 8),
                _buildDescription(state),
                const SizedBox(height: 24),
                _buildContent(context, state),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildIcon(BiometricAuthState state) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Colors.blue.shade400, Colors.blue.shade600],
        ),
      ),
      child: const Icon(
        Icons.security,
        size: 40,
        color: Colors.white,
      ),
    );
  }

  Widget _buildTitle(BiometricAuthState state) {
    if (state is BiometricCapabilitiesLoaded) {
      if (!state.capabilities.isDeviceSupported) {
        return const Text(
          'Biometrik Tidak Didukung',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
          textAlign: TextAlign.center,
        );
      } else if (!state.capabilities.isEnrolled) {
        return const Text(
          'Biometrik Belum Diatur',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
          textAlign: TextAlign.center,
        );
      }
    }

    return const Text(
      'Aktifkan Autentikasi Biometrik',
      style: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildDescription(BiometricAuthState state) {
    if (state is BiometricCapabilitiesLoaded) {
      if (!state.capabilities.isDeviceSupported) {
        return const Text(
          'Perangkat Anda tidak mendukung autentikasi biometrik.',
          style: TextStyle(
            color: Colors.grey,
          ),
          textAlign: TextAlign.center,
        );
      } else if (!state.capabilities.isEnrolled) {
        return const Text(
          'Silakan atur sidik jari atau pengenalan wajah di pengaturan perangkat terlebih dahulu.',
          style: TextStyle(
            color: Colors.grey,
          ),
          textAlign: TextAlign.center,
        );
      }
    }

    return const Text(
      'Gunakan sidik jari atau pengenalan wajah untuk akses yang lebih cepat dan aman.',
      style: TextStyle(
        color: Colors.grey,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildContent(BuildContext context, BiometricAuthState state) {
    if (state is BiometricCapabilitiesLoaded) {
      if (!state.capabilities.isDeviceSupported) {
        return Column(
          children: [
            const Text(
              'Anda masih dapat menggunakan aplikasi dengan autentikasi PIN atau password.',
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onSkip,
                child: const Text('Lanjutkan Tanpa Biometrik'),
              ),
            ),
          ],
        );
      } else if (!state.capabilities.isEnrolled) {
        return Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onSkip,
                    child: const Text('Lewati'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      // Open device settings
                      // This would typically use a package like app_settings
                    },
                    child: const Text('Ke Pengaturan'),
                  ),
                ),
              ],
            ),
          ],
        );
      } else {
        // Device supports biometrics and is enrolled
        return Column(
          children: [
            _buildBiometricTypesList(state.capabilities),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onSkip,
                    child: const Text('Lewati'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      context.read<BiometricAuthBloc>().add(
                            const BiometricEnableRequested(
                              reason:
                                  'Aktifkan autentikasi biometrik untuk keamanan yang lebih baik',
                            ),
                          );
                    },
                    child: const Text('Aktifkan'),
                  ),
                ),
              ],
            ),
          ],
        );
      }
    }

    return const CircularProgressIndicator();
  }

  Widget _buildBiometricTypesList(BiometricCapabilities capabilities) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Biometrik yang tersedia:',
            style: TextStyle(
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          ...capabilities.availableBiometrics
              .map((type) => Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Row(
                      children: [
                        Icon(
                          _getBiometricTypeIcon(type),
                          size: 16,
                          color: Colors.blue,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          BiometricAuthBloc.getBiometricTypeDisplayName(type),
                          style: const TextStyle(fontSize: 14),
                        ),
                      ],
                    ),
                  ))
              .toList(),
        ],
      ),
    );
  }

  IconData _getBiometricTypeIcon(BiometricType type) {
    switch (type) {
      case BiometricType.fingerprint:
        return Icons.fingerprint;
      case BiometricType.face:
        return Icons.face;
      case BiometricType.iris:
        return Icons.remove_red_eye;
      default:
        return Icons.security;
    }
  }
}
