import 'dart:async' show unawaited;
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../blocs/auth_bloc.dart';
import '../blocs/biometric_auth_bloc.dart';
import '../../../../core/services/connectivity_service.dart';
import '../../../../core/services/unified_secure_storage_service.dart';
import '../../../../core/di/dependency_injection.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/services/server_status_service.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  final _formKey = GlobalKey<FormState>();
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _rememberDevice = false;
  AppStatus _appStatus = AppStatus.online;
  bool _isOnline = true; // derived: _appStatus == AppStatus.online
  bool _isRefreshingStatus = true;
  String? _statusErrorDetail;
  bool _hasOfflineAuth = false;
  String _appVersion = '';
  bool _biometricAvailable = false;
  bool _biometricEnabled = false;
  bool _hasBiometricSession = false;
  bool _biometricRawEnabled = false;
  String? _biometricOwnerUsername;

  late final ConnectivityService _connectivityService;
  late final BiometricAuthBloc _biometricAuthBloc;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  // Gen Z Color Palette
  static const _primaryGradient = [
    Color(0xFF1a1a2e),
    Color(0xFF16213e),
    Color(0xFF0f3460),
  ];
  static const _accentNeon = Color(0xFF00ff87);
  static const _accentCyan = Color(0xFF00d9ff);
  static const _glassColor = Color(0x1AFFFFFF);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _connectivityService = locate<ConnectivityService>();
    _biometricAuthBloc = locate<BiometricAuthBloc>();

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );

    _slideAnimation =
        Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero).animate(
          CurvedAnimation(
            parent: _animationController,
            curve: Curves.easeOutCubic,
          ),
        );

    _usernameController.addListener(_handleUsernameChanged);
    _initializeLoginState();
    _animationController.forward();
    PackageInfo.fromPlatform().then((info) {
      if (mounted) setState(() => _appVersion = info.version);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _usernameController.removeListener(_handleUsernameChanged);
    _usernameController.dispose();
    _passwordController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  String _normalizeUsername(String value) => value.trim().toLowerCase();

  bool _shouldEnableBiometricForCurrentInput() {
    if (!_biometricRawEnabled || !_hasBiometricSession) return false;

    final owner = _normalizeUsername(_biometricOwnerUsername ?? '');
    if (owner.isEmpty) return true;

    final input = _normalizeUsername(_usernameController.text);
    return input.isNotEmpty && input == owner;
  }

  void _handleUsernameChanged() {
    if (!mounted) return;
    final nextEnabled = _shouldEnableBiometricForCurrentInput();
    if (nextEnabled != _biometricEnabled) {
      setState(() {
        _biometricEnabled = nextEnabled;
      });
    }
  }

  /// Runs a fresh server reachability check and updates [_appStatus] + [_isOnline].
  /// NEVER throws – ServerStatusService swallows all exceptions internally.
  Future<void> _refreshServerStatus() async {
    if (mounted) setState(() => _isRefreshingStatus = true);
    final result = await ServerStatusService().checkStatus();
    if (!mounted) return;
    setState(() {
      _appStatus = result.status;
      _isOnline = result.status == AppStatus.online;
      _statusErrorDetail = result.errorDetail;
      _isRefreshingStatus = false;
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_refreshServerStatus());
    }
  }

  Future<void> _initializeLoginState() async {
    // Fire server status check immediately, independently of biometric operations.
    // unawaited ensures it never propagates into the outer catch.
    unawaited(_refreshServerStatus());

    try {
      await _connectivityService.initialize();

      // Biometric storage calls isolated in their own try/catch.
      // Keystore/BiometricPrompt exceptions must NOT affect _isOnline or _appStatus.
      try {
        _hasOfflineAuth =
            await UnifiedSecureStorageService.hasValidOfflineAuth();
        _hasBiometricSession =
            (await UnifiedSecureStorageService.isAuthenticated()) ||
            _hasOfflineAuth;
        _biometricOwnerUsername =
            await UnifiedSecureStorageService.getBiometricOwnerUsername();

        final userInfo = await UnifiedSecureStorageService.getUserInfo();
        if (userInfo != null && mounted) {
          _usernameController.text = userInfo.username;
        }
      } catch (_) {
        // Biometric storage error – degrade gracefully, do NOT touch _isOnline.
        _hasOfflineAuth = false;
        _hasBiometricSession = false;
        _biometricEnabled = false;
        _biometricRawEnabled = false;
      }

      _biometricAuthBloc.add(const BiometricStatusRequested());

      _connectivityService.networkStatusStream.listen((status) {
        if (mounted) {
          // Re-probe the server on every network-layer change.
          unawaited(_refreshServerStatus());
        }
      });

      if (mounted) setState(() {});
    } catch (e) {
      // Do NOT set _isOnline = false here. Status is managed exclusively
      // by _refreshServerStatus() which is already running.
      if (mounted) {
        setState(() {
          _hasOfflineAuth = false;
          _hasBiometricSession = false;
          _biometricEnabled = false;
          _biometricRawEnabled = false;
        });
      }
    }
  }

  void _login() {
    if (_formKey.currentState!.validate()) {
      if (_isOnline) {
        context.read<AuthBloc>().add(
          AuthLoginRequested(
            username: _usernameController.text.trim(),
            password: _passwordController.text,
            rememberDevice: _rememberDevice,
          ),
        );
      } else if (_hasOfflineAuth) {
        context.read<AuthBloc>().add(
          AuthOfflineLoginRequested(
            username: _usernameController.text.trim(),
            password: _passwordController.text,
          ),
        );
      } else {
        _showErrorSnackBar('Tidak ada koneksi. Silakan hubungkan ke internet.');
      }
    }
  }

  void _loginWithBiometric() {
    if (!_hasBiometricSession) {
      _showErrorSnackBar(
        'Sesi biometrik tidak tersedia. Silakan login dengan password.',
      );
      return;
    }

    if (_biometricAvailable && _biometricEnabled) {
      _biometricAuthBloc.add(
        const BiometricAuthenticationRequested(
          reason: 'Gunakan biometrik untuk masuk ke Agrinova',
          allowFallback: false,
        ),
      );
    }
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFFff6b6b),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: _primaryGradient,
          ),
        ),
        child: Stack(
          children: [
            // Animated background circles
            _buildBackgroundDecoration(),

            // Main content
            SafeArea(
              child: MultiBlocProvider(
                providers: [
                  BlocProvider.value(value: context.read<AuthBloc>()),
                  BlocProvider.value(value: _biometricAuthBloc),
                ],
                child: MultiBlocListener(
                  listeners: [
                    BlocListener<AuthBloc, AuthState>(
                      listener: (context, state) {
                        if (state is AuthAuthenticated) {
                          // Navigate to role-based dashboard
                          final route = AppRoutes.getDashboardRoute(
                            state.user.role,
                          );
                          Navigator.of(
                            context,
                          ).pushNamedAndRemoveUntil(route, (route) => false);
                        } else if (state is AuthError) {
                          _showErrorSnackBar(state.message);
                        }
                      },
                    ),
                    BlocListener<BiometricAuthBloc, BiometricAuthState>(
                      listener: (context, state) {
                        if (state is BiometricStatusLoaded) {
                          setState(() {
                            _biometricAvailable =
                                state.capabilities.isFullySupported;
                            _biometricRawEnabled = state.isEnabled;
                            _biometricEnabled =
                                _shouldEnableBiometricForCurrentInput();
                          });
                        } else if (state is BiometricAuthSuccess) {
                          context.read<AuthBloc>().add(
                            const AuthBiometricRequested(),
                          );
                        }
                      },
                    ),
                  ],
                  child: BlocBuilder<AuthBloc, AuthState>(
                    builder: (context, state) {
                      return FadeTransition(
                        opacity: _fadeAnimation,
                        child: SlideTransition(
                          position: _slideAnimation,
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 24,
                              vertical: 16,
                            ),
                            child: Column(
                              children: [
                                SizedBox(
                                  height:
                                      MediaQuery.of(context).size.height * 0.08,
                                ),
                                _buildHeader(),
                                const SizedBox(height: 48),
                                _buildGlassCard(state),
                                const SizedBox(height: 24),
                                _buildVersionBadge(),
                                const SizedBox(height: 12),
                                _buildLegalLinks(),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ),

            // Settings FAB removed
          ],
        ),
      ),
    );
  }

  Widget _buildBackgroundDecoration() {
    return Stack(
      children: [
        Positioned(
          top: -100,
          right: -100,
          child: Container(
            width: 300,
            height: 300,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  _accentNeon.withValues(alpha: 0.15),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
        Positioned(
          bottom: -150,
          left: -100,
          child: Container(
            width: 400,
            height: 400,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  _accentCyan.withValues(alpha: 0.1),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        // Logo with neon glow
        Container(
          width: 100,
          height: 100,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: _accentNeon.withValues(alpha: 0.4),
                blurRadius: 30,
                spreadRadius: 2,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: Image.asset('assets/images/logo.png', fit: BoxFit.cover),
          ),
        ),

        const SizedBox(height: 24),

        // Welcome text
        const Text(
          'Welcome back 👋',
          style: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            color: Colors.white,
            letterSpacing: -1,
          ),
        ),

        const SizedBox(height: 8),

        Text(
          'Masuk ke akun Agrinova kamu',
          style: TextStyle(
            fontSize: 16,
            color: Colors.white.withValues(alpha: 0.7),
            fontWeight: FontWeight.w400,
          ),
        ),

        const SizedBox(height: 16),

        // Connection status pill
        _buildConnectionPill(),
      ],
    );
  }

  Widget _buildConnectionPill() {
    final Color pillColor;
    final String label;
    String? subtext;

    switch (_appStatus) {
      case AppStatus.online:
        pillColor = _accentNeon;
        label = 'Online';
        subtext = null;
        break;
      case AppStatus.noInternet:
        pillColor = Colors.orange;
        label = 'Offline Mode';
        subtext = 'No Internet';
        break;
      case AppStatus.serverDown:
        pillColor = Colors.orange;
        label = 'Offline Mode';
        subtext = _statusErrorDetail ?? 'Server Down';
        break;
    }

    final pill = Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: pillColor.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: pillColor.withValues(alpha: 0.3), width: 1),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (_isRefreshingStatus)
                SizedBox(
                  width: 8,
                  height: 8,
                  child: CircularProgressIndicator(
                    strokeWidth: 1.5,
                    color: pillColor,
                  ),
                )
              else
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: pillColor,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: pillColor.withValues(alpha: 0.5),
                        blurRadius: 6,
                      ),
                    ],
                  ),
                ),
              const SizedBox(width: 8),
              Text(
                _isRefreshingStatus ? 'Memeriksa...' : label,
                style: TextStyle(
                  color: pillColor,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              if (!_isRefreshingStatus && _appStatus != AppStatus.online) ...[
                const SizedBox(width: 6),
                Icon(Icons.refresh_rounded, color: pillColor, size: 14),
              ],
            ],
          ),
          if (!_isRefreshingStatus && subtext != null) ...[
            const SizedBox(height: 2),
            Text(
              subtext,
              style: TextStyle(
                color: pillColor.withValues(alpha: 0.7),
                fontSize: 11,
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ],
      ),
    );

    if (_appStatus != AppStatus.online) {
      return GestureDetector(
        onTap: _isRefreshingStatus
            ? null
            : () => unawaited(_refreshServerStatus()),
        child: pill,
      );
    }
    return pill;
  }

  Widget _buildGlassCard(AuthState state) {
    final isLoading = state is AuthLoading;

    return ClipRRect(
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: _glassColor,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.1),
              width: 1,
            ),
          ),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildTextField(
                  controller: _usernameController,
                  label: 'Username',
                  hint: 'Masukkan username',
                  icon: Icons.person_outline_rounded,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Username wajib diisi';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                _buildTextField(
                  controller: _passwordController,
                  label: 'Password',
                  hint: 'Masukkan password',
                  icon: Icons.lock_outline_rounded,
                  isPassword: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Password wajib diisi';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                _buildRememberDevice(),
                const SizedBox(height: 28),
                _buildLoginButton(isLoading),
                if (_biometricAvailable && _biometricEnabled) ...[
                  const SizedBox(height: 24),
                  _buildBiometricSection(isLoading),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    bool isPassword = false,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      obscureText: isPassword ? _obscurePassword : false,
      style: const TextStyle(color: Colors.white, fontSize: 16),
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        labelStyle: TextStyle(color: Colors.white.withValues(alpha: 0.7)),
        hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.4)),
        prefixIcon: Icon(icon, color: _accentCyan),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(
                  _obscurePassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: Colors.white.withValues(alpha: 0.5),
                ),
                onPressed: () =>
                    setState(() => _obscurePassword = !_obscurePassword),
              )
            : null,
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.05),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: _accentNeon, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFff6b6b)),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFff6b6b), width: 2),
        ),
      ),
    );
  }

  Widget _buildRememberDevice() {
    return Row(
      children: [
        SizedBox(
          width: 22,
          height: 22,
          child: Checkbox(
            value: _rememberDevice,
            onChanged: (value) =>
                setState(() => _rememberDevice = value ?? false),
            fillColor: WidgetStateProperty.resolveWith((states) {
              if (states.contains(WidgetState.selected)) {
                return _accentNeon;
              }
              return Colors.transparent;
            }),
            side: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          'Ingat perangkat ini',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.7),
            fontSize: 14,
          ),
        ),
      ],
    );
  }

  Widget _buildLoginButton(bool isLoading) {
    return Container(
      height: 56,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(colors: [_accentNeon, _accentCyan]),
        boxShadow: [
          BoxShadow(
            color: _accentNeon.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: isLoading ? null : _login,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        child: isLoading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: Color(0xFF1a1a2e),
                ),
              )
            : Text(
                _isOnline ? 'Masuk' : 'Masuk Offline',
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1a1a2e),
                  letterSpacing: 0.5,
                ),
              ),
      ),
    );
  }

  Widget _buildBiometricSection(bool isLoading) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: Divider(color: Colors.white.withValues(alpha: 0.2)),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'atau',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.5),
                  fontSize: 13,
                ),
              ),
            ),
            Expanded(
              child: Divider(color: Colors.white.withValues(alpha: 0.2)),
            ),
          ],
        ),
        const SizedBox(height: 20),
        BlocBuilder<BiometricAuthBloc, BiometricAuthState>(
          builder: (context, biometricState) {
            return GestureDetector(
              onTap: isLoading ? null : _loginWithBiometric,
              child: Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: _accentCyan, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: _accentCyan.withValues(alpha: 0.3),
                      blurRadius: 20,
                    ),
                  ],
                ),
                child: biometricState is BiometricAuthLoading
                    ? Center(
                        child: SizedBox(
                          width: 28,
                          height: 28,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: _accentCyan,
                          ),
                        ),
                      )
                    : Icon(Icons.fingerprint, size: 36, color: _accentCyan),
              ),
            );
          },
        ),
        const SizedBox(height: 12),
        Text(
          'Tap untuk masuk dengan biometrik',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.5),
            fontSize: 13,
          ),
        ),
      ],
    );
  }

  Widget _buildVersionBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        _appVersion.isEmpty ? '' : 'v$_appVersion',
        style: TextStyle(
          color: Colors.white.withValues(alpha: 0.4),
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildLegalLinks() {
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      runSpacing: 2,
      children: [
        Text(
          'Dengan masuk, Anda menyetujui',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.45),
            fontSize: 11,
            fontWeight: FontWeight.w400,
          ),
        ),
        _buildLegalLinkButton(
          label: 'Syarat Layanan',
          onTap: () => _launchExternalUrl(
            'https://agrinova.kskgroup.web.id/terms-of-service',
          ),
        ),
        Text(
          'dan',
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.45),
            fontSize: 11,
            fontWeight: FontWeight.w400,
          ),
        ),
        _buildLegalLinkButton(
          label: 'Kebijakan Privasi',
          onTap: () => _launchExternalUrl(
            'https://agrinova.kskgroup.web.id/privacy-policy',
          ),
        ),
      ],
    );
  }

  Widget _buildLegalLinkButton({
    required String label,
    required VoidCallback onTap,
  }) {
    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: _accentCyan.withValues(alpha: 0.95),
          fontSize: 11,
          fontWeight: FontWeight.w600,
          decoration: TextDecoration.underline,
          decorationColor: _accentCyan.withValues(alpha: 0.85),
        ),
      ),
    );
  }

  Future<void> _launchExternalUrl(String url) async {
    final uri = Uri.parse(url);
    try {
      final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (opened) {
        return;
      }
      final openedFallback = await launchUrl(uri, mode: LaunchMode.platformDefault);
      if (openedFallback) {
        return;
      }
      if (!mounted) return;
      _showErrorSnackBar('Tidak dapat membuka tautan');
    } catch (_) {
      if (!mounted) return;
      _showErrorSnackBar('Terjadi kesalahan saat membuka tautan');
    }
  }
}
