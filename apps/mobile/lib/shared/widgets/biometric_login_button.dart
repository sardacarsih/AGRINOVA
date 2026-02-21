import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../features/auth/presentation/blocs/auth_bloc.dart';

class BiometricLoginButton extends StatefulWidget {
  final bool isEnabled;
  final VoidCallback? onPressed;
  final String? reason;

  const BiometricLoginButton({
    Key? key,
    this.isEnabled = true,
    this.onPressed,
    this.reason,
  }) : super(key: key);

  @override
  State<BiometricLoginButton> createState() => _BiometricLoginButtonState();
}

class _BiometricLoginButtonState extends State<BiometricLoginButton>
    with SingleTickerProviderStateMixin {
  static final Logger _logger = Logger();
  late AnimationController _animationController;
  late Animation<double> _scaleAnimation;
  late Animation<Color?> _colorAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 200),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 0.95,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));

    _colorAnimation = ColorTween(
      begin: Colors.green[600],
      end: Colors.green[800],
    ).animate(_animationController);
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthError) {
          _showErrorSnackbar(context, state.message);
        }
      },
      child: GestureDetector(
        onTapDown: (_) => _animationController.forward(),
        onTapUp: (_) => _animationController.reverse(),
        onTapCancel: () => _animationController.reverse(),
        onTap: widget.isEnabled ? _handleBiometricLogin : null,
        child: AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            return Transform.scale(
              scale: _scaleAnimation.value,
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: widget.isEnabled
                      ? _colorAnimation.value
                      : Colors.grey[400],
                  shape: BoxShape.circle,
                  boxShadow: widget.isEnabled
                      ? [
                          BoxShadow(
                            color: Colors.green.withOpacity(0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ]
                      : null,
                ),
                child: Center(
                  child: Icon(
                    Icons.fingerprint,
                    size: 32,
                    color: widget.isEnabled ? Colors.white : Colors.grey[600],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  void _handleBiometricLogin() {
    if (!widget.isEnabled) return;

    _logger.d('Biometric login button pressed');

    // Trigger custom callback if provided
    if (widget.onPressed != null) {
      widget.onPressed!();
      return;
    }

    // Default behavior: Trigger AuthBloc biometric authentication
    context.read<AuthBloc>().add(AuthBiometricRequested());
  }

  void _showErrorSnackbar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.red[600],
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 3),
      ),
    );
  }
}

class BiometricSetupPrompt extends StatelessWidget {
  final VoidCallback onEnableBiometric;
  final VoidCallback onSkip;

  const BiometricSetupPrompt({
    Key? key,
    required this.onEnableBiometric,
    required this.onSkip,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.green[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green[300]!),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.fingerprint,
            size: 48,
            color: Colors.green[600],
          ),
          const SizedBox(height: 16),
          Text(
            'Enable Biometric Login?',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
              color: Colors.green[800],
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Use your fingerprint or face ID for quick and secure login to Agrinova Mobile.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.green[700],
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onSkip,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.green[600],
                    side: BorderSide(color: Colors.green[300]!),
                  ),
                  child: const Text('Skip'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: onEnableBiometric,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green[600],
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('Enable'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class BiometricCapabilityChecker extends StatefulWidget {
  final Widget Function(BuildContext context, bool isAvailable, bool isEnabled) builder;

  const BiometricCapabilityChecker({
    Key? key,
    required this.builder,
  }) : super(key: key);

  @override
  State<BiometricCapabilityChecker> createState() => _BiometricCapabilityCheckerState();
}

class _BiometricCapabilityCheckerState extends State<BiometricCapabilityChecker> {
  bool _isAvailable = false;
  bool _isEnabled = false;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkBiometricCapability();
  }

  Future<void> _checkBiometricCapability() async {
    try {
      final authState = context.read<AuthBloc>().state;
      if (authState is AuthAuthenticated) {
        setState(() {
          _isAvailable = authState.biometricAvailable;
          _isEnabled = authState.biometricEnabled;
          _isLoading = false;
        });
      } else {
        // For non-authenticated state, we can't check enabled status
        // But we can still check availability through AuthRepository
        setState(() {
          _isAvailable = false;
          _isEnabled = false;
          _isLoading = false;
        });
      }
    } catch (e) {
      Logger().e('Error checking biometric capability: $e');
      setState(() {
        _isAvailable = false;
        _isEnabled = false;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const SizedBox(
        width: 64,
        height: 64,
        child: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return widget.builder(context, _isAvailable, _isEnabled);
  }
}