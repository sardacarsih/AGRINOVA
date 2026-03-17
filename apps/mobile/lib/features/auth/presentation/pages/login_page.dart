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
import '../../../../core/theme/login_theme_campaign_service.dart';
import '../../../../shared/widgets/runtime_network_image.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  static const Key _backgroundImageLayerKey = Key(
    'loginBackgroundImageLayer',
  );
  static const Key _backgroundImageFallbackKey = Key(
    'loginBackgroundImageFallback',
  );
  static const Key _backgroundOverlayLayerKey = Key(
    'loginBackgroundOverlayLayer',
  );

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
    unawaited(_initializeRuntimeTheme());
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

  Future<void> _initializeRuntimeTheme() async {
    final themeService = LoginThemeCampaignService.instance;
    try {
      await themeService.initialize();
      if (!themeService.isAutoMode) {
        await themeService.setAutoMode();
      }
      await themeService.refreshIfStale();
    } catch (_) {
      // Keep fallback theme when runtime theme initialization fails.
    }
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

  LoginThemeTokenSet _campaignTokens(BuildContext context) {
    return LoginThemeCampaignService.instance.resolveTokens(
      brightness: Theme.of(context).brightness,
    );
  }

  Color _accentPrimary(BuildContext context) {
    return _campaignTokens(context).buttonGradient.first;
  }

  Color _accentSecondary(BuildContext context) {
    return _campaignTokens(context).buttonGradient.last;
  }

  @override
  Widget build(BuildContext context) {
    final themeService = LoginThemeCampaignService.instance;
    return AnimatedBuilder(
      animation: themeService,
      builder: (context, _) {
        final campaignTokens = _campaignTokens(context);
        final runtimeAssets = themeService.effectiveAssets;
        final mediaQuery = MediaQuery.of(context);
        final brightness = Theme.of(context).brightness;
        final topSpacing = (mediaQuery.size.height * 0.07)
            .clamp(20.0, 60.0)
            .toDouble();

        return Scaffold(
          body: Stack(
            children: [
              _buildBackgroundBase(campaignTokens),
              if (runtimeAssets.backgroundImage.isNotEmpty)
                _buildBackgroundImage(
                  runtimeAssets.backgroundImage,
                  campaignTokens,
                  brightness,
                ),
              _buildBackgroundOverlay(campaignTokens, brightness),
              _buildBackgroundDecoration(campaignTokens),

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
                              mandorType: state.user.effectiveMandorType,
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
                              keyboardDismissBehavior:
                                  ScrollViewKeyboardDismissBehavior.onDrag,
                              padding: EdgeInsets.fromLTRB(
                                24,
                                12,
                                24,
                                24 + mediaQuery.viewInsets.bottom,
                              ),
                              child: Center(
                                child: ConstrainedBox(
                                  constraints: const BoxConstraints(
                                    maxWidth: 460,
                                  ),
                                  child: Column(
                                    children: [
                                      SizedBox(height: topSpacing),
                                      _buildHeader(
                                        campaignTokens,
                                        runtimeAssets,
                                      ),
                                      const SizedBox(height: 36),
                                      _buildGlassCard(state),
                                      const SizedBox(height: 20),
                                      _buildStatusAndVersionMeta(),
                                      const SizedBox(height: 12),
                                      _buildLegalLinks(),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),

            ],
          ),
        );
      },
    );
  }

  Widget _buildBackgroundDecoration(LoginThemeTokenSet campaignTokens) {
    return Stack(
      children: [
        Positioned(
          top: -72,
          right: -72,
          child: Container(
            width: 220,
            height: 220,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  campaignTokens.buttonGradient.first.withValues(alpha: 0.08),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
        Positioned(
          bottom: -120,
          left: -72,
          child: Container(
            width: 300,
            height: 300,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(
                colors: [
                  campaignTokens.buttonGradient.last.withValues(alpha: 0.07),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBackgroundBase(LoginThemeTokenSet campaignTokens) {
    return Positioned.fill(
      child: DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: campaignTokens.bgGradient,
          ),
        ),
      ),
    );
  }

  Widget _buildBackgroundImage(
    String imageUrl,
    LoginThemeTokenSet campaignTokens,
    Brightness brightness,
  ) {
    return Positioned.fill(
      child: IgnorePointer(
        child: Opacity(
          key: _backgroundImageLayerKey,
          opacity: _backgroundImageOpacity(brightness),
          child: RuntimeNetworkImage(
            imageUrl: imageUrl,
            fit: BoxFit.cover,
            loadingFallback: const SizedBox.shrink(),
            errorFallback: _buildBackgroundImageFallback(campaignTokens),
          ),
        ),
      ),
    );
  }

  Widget _buildBackgroundOverlay(
    LoginThemeTokenSet campaignTokens,
    Brightness brightness,
  ) {
    return Positioned.fill(
      child: IgnorePointer(
        child: DecoratedBox(
          key: _backgroundOverlayLayerKey,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                campaignTokens.bgGradient.first.withValues(
                  alpha: _backgroundOverlayStartAlpha(brightness),
                ),
                campaignTokens.bgGradient.last.withValues(
                  alpha: _backgroundOverlayEndAlpha(brightness),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  double _backgroundImageOpacity(Brightness brightness) {
    return brightness == Brightness.dark ? 0.48 : 0.58;
  }

  double _backgroundOverlayStartAlpha(Brightness brightness) {
    return brightness == Brightness.dark ? 0.48 : 0.30;
  }

  double _backgroundOverlayEndAlpha(Brightness brightness) {
    return brightness == Brightness.dark ? 0.66 : 0.46;
  }

  Widget _buildBackgroundImageFallback(LoginThemeTokenSet campaignTokens) {
    return DecoratedBox(
      key: _backgroundImageFallbackKey,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            campaignTokens.bgGradient.first.withValues(alpha: 0.24),
            campaignTokens.bgGradient.last.withValues(alpha: 0.18),
          ],
        ),
      ),
      child: Center(
        child: Icon(
          Icons.image_not_supported_outlined,
          size: 28,
          color: campaignTokens.textSecondary.withValues(alpha: 0.45),
        ),
      ),
    );
  }

  Widget _buildHeader(
    LoginThemeTokenSet campaignTokens,
    LoginThemeAssetManifest runtimeAssets,
  ) {
    final titleColor = campaignTokens.textPrimary;
    final subtitleColor =
        Color.lerp(campaignTokens.textSecondary, titleColor, 0.25) ??
        campaignTokens.textSecondary;

    return Column(
      children: [
        if (runtimeAssets.illustration.isNotEmpty) ...[
          _buildHeaderIllustration(runtimeAssets.illustration),
          const SizedBox(height: 16),
        ],

        const SizedBox(height: 2),

        // Welcome text
        Text(
          'Welcome back 👋',
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: titleColor,
            letterSpacing: -0.5,
          ),
        ),

        const SizedBox(height: 8),

        Text(
          'Masuk ke akun Agrinova kamu',
          style: TextStyle(
            fontSize: 15,
            color: subtitleColor,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildHeaderIllustration(String imageUrl) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 360),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: AspectRatio(
          aspectRatio: 2.5,
          child: RuntimeNetworkImage(
            imageUrl: imageUrl,
            fit: BoxFit.cover,
            loadingFallback: const DecoratedBox(
              decoration: BoxDecoration(color: Colors.transparent),
            ),
            errorFallback: const DecoratedBox(
              decoration: BoxDecoration(color: Color(0x14000000)),
              child: Center(
                child: Icon(
                  Icons.broken_image_outlined,
                  color: Color(0xFF94A3B8),
                  size: 28,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }


  Widget _buildConnectionPill() {
    final Color pillColor;
    final String label;
    String? subtext;

    switch (_appStatus) {
      case AppStatus.online:
        pillColor = _accentPrimary(context);
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
    final campaignTokens = _campaignTokens(context);
    final glassColor = campaignTokens.surface;
    final borderColor = campaignTokens.surfaceBorder;

    return ClipRRect(
      borderRadius: BorderRadius.circular(22),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: glassColor,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: borderColor, width: 1),
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
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.username],
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Username wajib diisi';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                _buildTextField(
                  controller: _passwordController,
                  label: 'Password',
                  hint: 'Masukkan password',
                  icon: Icons.lock_outline_rounded,
                  textInputAction: TextInputAction.done,
                  autofillHints: const [AutofillHints.password],
                  isPassword: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Password wajib diisi';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 14),
                _buildRememberDevice(),
                const SizedBox(height: 24),
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
    required TextInputAction textInputAction,
    required Iterable<String> autofillHints,
    bool isPassword = false,
    String? Function(String?)? validator,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final campaignTokens = _campaignTokens(context);
    final textColor = campaignTokens.textPrimary;
    final secondaryColor =
        Color.lerp(campaignTokens.textSecondary, textColor, 0.35) ??
        campaignTokens.textSecondary;
    final tertiaryColor = campaignTokens.textSecondary.withValues(
      alpha: isDark ? 0.68 : 0.72,
    );
    final inputFill = campaignTokens.inputFill;
    final inputBorder = campaignTokens.inputBorder;

    return TextFormField(
      controller: controller,
      obscureText: isPassword ? _obscurePassword : false,
      textInputAction: textInputAction,
      autofillHints: autofillHints,
      style: TextStyle(color: textColor, fontSize: 16),
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        labelStyle: TextStyle(color: secondaryColor),
        hintStyle: TextStyle(color: tertiaryColor),
        prefixIcon: Icon(icon, color: _accentSecondary(context)),
        suffixIcon: isPassword
            ? IconButton(
                icon: Icon(
                  _obscurePassword
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                  color: tertiaryColor,
                ),
                onPressed: () =>
                    setState(() => _obscurePassword = !_obscurePassword),
              )
            : null,
        filled: true,
        fillColor: inputFill,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: inputBorder),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: inputBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: _accentPrimary(context), width: 2),
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
    final campaignTokens = _campaignTokens(context);
    final borderColor = campaignTokens.inputBorder;
    final textColor = campaignTokens.textSecondary.withValues(alpha: 0.95);

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
                return _accentPrimary(context);
              }
              return Colors.transparent;
            }),
            side: BorderSide(color: borderColor),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(4),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Text(
          'Ingat perangkat ini',
          style: TextStyle(color: textColor, fontSize: 13.5),
        ),
      ],
    );
  }

  Widget _buildLoginButton(bool isLoading) {
    final campaignTokens = _campaignTokens(context);
    final buttonTextColor = campaignTokens.buttonText;

    return Container(
      height: 56,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(colors: campaignTokens.buttonGradient),
        boxShadow: [
          BoxShadow(
            color: campaignTokens.buttonGradient.first.withValues(alpha: 0.24),
            blurRadius: 14,
            offset: const Offset(0, 6),
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
            ? SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  strokeWidth: 2.5,
                  color: buttonTextColor,
                ),
              )
            : Text(
                _isOnline ? 'Masuk' : 'Masuk Offline',
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.bold,
                  color: buttonTextColor,
                  letterSpacing: 0.5,
                ),
              ),
      ),
    );
  }

  Widget _buildBiometricSection(bool isLoading) {
    final campaignTokens = _campaignTokens(context);
    final dividerColor = campaignTokens.surfaceBorder;
    final textColor = campaignTokens.textSecondary.withValues(alpha: 0.85);
    final accentColor = _accentSecondary(context);

    return Column(
      children: [
        Row(
          children: [
            Expanded(child: Divider(color: dividerColor)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'atau',
                style: TextStyle(color: textColor, fontSize: 13),
              ),
            ),
            Expanded(child: Divider(color: dividerColor)),
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
                  border: Border.all(color: accentColor, width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: accentColor.withValues(alpha: 0.3),
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
                            color: accentColor,
                          ),
                        ),
                      )
                    : Icon(Icons.fingerprint, size: 36, color: accentColor),
              ),
            );
          },
        ),
        const SizedBox(height: 12),
        Text(
          'Tap untuk masuk dengan biometrik',
          style: TextStyle(color: textColor, fontSize: 13),
        ),
      ],
    );
  }

  Widget _buildVersionBadge() {
    final campaignTokens = _campaignTokens(context);
    final bgColor = campaignTokens.surface.withValues(alpha: 0.8);
    final textColor = campaignTokens.textSecondary.withValues(alpha: 0.8);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        _appVersion.isEmpty ? '' : 'v$_appVersion',
        style: TextStyle(
          color: textColor,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Widget _buildStatusAndVersionMeta() {
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 10,
      runSpacing: 8,
      children: [
        _buildConnectionPill(),
        _buildVersionBadge(),
      ],
    );
  }

  Widget _buildLegalLinks() {
    final mutedColor = _campaignTokens(
      context,
    ).textSecondary.withValues(alpha: 0.8);
    final isMobileLayout = MediaQuery.sizeOf(context).width < 600;

    final legalIntroText = Text(
      'Dengan masuk, Anda menyetujui',
      style: TextStyle(
        color: mutedColor,
        fontSize: 11,
        fontWeight: FontWeight.w400,
      ),
    );

    final legalActionRow = Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      runSpacing: 2,
      children: [
        _buildLegalLinkButton(
          label: 'Syarat Layanan',
          onTap: () => _launchExternalUrl(
            'https://agrinova.kskgroup.web.id/terms-of-service',
          ),
        ),
        Text(
          'dan',
          style: TextStyle(
            color: mutedColor,
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

    if (isMobileLayout) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          legalIntroText,
          const SizedBox(height: 2),
          legalActionRow,
        ],
      );
    }

    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      runSpacing: 2,
      children: [
        legalIntroText,
        _buildLegalLinkButton(
          label: 'Syarat Layanan',
          onTap: () => _launchExternalUrl(
            'https://agrinova.kskgroup.web.id/terms-of-service',
          ),
        ),
        Text(
          'dan',
          style: TextStyle(
            color: mutedColor,
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
    final linkColor = _campaignTokens(context).link;

    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        minimumSize: const Size(0, 40),
        tapTargetSize: MaterialTapTargetSize.padded,
      ),
      child: Text(
        label,
        style: TextStyle(
          color: linkColor.withValues(alpha: 0.95),
          fontSize: 11,
          fontWeight: FontWeight.w600,
          decoration: TextDecoration.underline,
          decorationColor: linkColor.withValues(alpha: 0.85),
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
      final openedFallback = await launchUrl(
        uri,
        mode: LaunchMode.platformDefault,
      );
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
