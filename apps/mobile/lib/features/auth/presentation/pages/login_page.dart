import 'dart:async' show unawaited;
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_svg/flutter_svg.dart';
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
import '../../../../core/theme/theme_mode_service.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  static const String _autoThemeSelectionValue = '__auto__';

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
    unawaited(LoginThemeCampaignService.instance.initialize());
    unawaited(LoginThemeCampaignService.instance.refreshIfStale());
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
        final isDark = Theme.of(context).brightness == Brightness.dark;
        final campaignTokens = _campaignTokens(context);
        final runtimeAssets = themeService.effectiveAssets;
        final mediaQuery = MediaQuery.of(context);
        final topSpacing = (mediaQuery.size.height * 0.08)
            .clamp(24.0, 72.0)
            .toDouble();

        return Scaffold(
          body: Stack(
            children: [
              _buildBackgroundBase(campaignTokens),
              if (runtimeAssets.backgroundImage.isNotEmpty)
                _buildBackgroundImage(runtimeAssets.backgroundImage),
              _buildBackgroundOverlay(campaignTokens),
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
                                16,
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
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),

              Positioned(
                top: 8,
                right: 8,
                child: SafeArea(
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (kDebugMode) ...[
                        _buildCampaignThemeButton(isDark: isDark),
                        const SizedBox(width: 8),
                      ],
                      _buildThemeModeButton(isDark: isDark),
                    ],
                  ),
                ),
              ),
              if (kDebugMode)
                Positioned(
                  left: 8,
                  bottom: 8,
                  child: SafeArea(
                    child: _buildRuntimeThemeDiagnosticsBadge(isDark: isDark),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildThemeModeButton({required bool isDark}) {
    final fgColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final bgColor = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.white.withValues(alpha: 0.8);
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.15)
        : const Color(0xFFCBD5E1);

    return AnimatedBuilder(
      animation: ThemeModeService.instance,
      builder: (context, _) {
        final isDarkMode = ThemeModeService.instance.isDarkMode;
        return Container(
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor),
          ),
          child: IconButton(
            onPressed: () {
              unawaited(ThemeModeService.instance.setDarkMode(!isDarkMode));
              unawaited(LoginThemeCampaignService.instance.refresh(force: true));
            },
            icon: Icon(
              isDarkMode ? Icons.dark_mode_rounded : Icons.light_mode_rounded,
              color: fgColor,
            ),
            tooltip: isDarkMode ? 'Mode gelap aktif' : 'Mode terang aktif',
          ),
        );
      },
    );
  }

  Widget _buildCampaignThemeButton({required bool isDark}) {
    final service = LoginThemeCampaignService.instance;
    final fgColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final bgColor = isDark
        ? Colors.white.withValues(alpha: 0.08)
        : Colors.white.withValues(alpha: 0.8);
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.15)
        : const Color(0xFFCBD5E1);
    final selectedValue = service.isAutoMode
        ? _autoThemeSelectionValue
        : service.selectedThemeId;

    return Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: PopupMenuButton<String>(
        tooltip: 'Tema login: ${service.effectiveThemeLabel}',
        initialValue: selectedValue,
        onSelected: (value) {
          if (value == _autoThemeSelectionValue) {
            unawaited(service.setAutoMode());
            return;
          }
          unawaited(service.setManualTheme(value));
        },
        icon: Icon(Icons.palette_outlined, color: fgColor),
        itemBuilder: (context) {
          final menuItems = <PopupMenuEntry<String>>[
            PopupMenuItem<String>(
              value: _autoThemeSelectionValue,
              child: Row(
                children: [
                  Icon(
                    service.isAutoMode ? Icons.check : Icons.auto_awesome,
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Text('Auto (${service.effectiveThemeLabel})'),
                ],
              ),
            ),
            const PopupMenuDivider(),
          ];

          for (final theme in service.availableThemes) {
            final isActive =
                !service.isAutoMode && service.selectedThemeId == theme.id;
            menuItems.add(
              PopupMenuItem<String>(
                value: theme.id,
                child: Row(
                  children: [
                    Icon(
                      isActive
                          ? Icons.check_circle_outline
                          : Icons.circle_outlined,
                      size: 18,
                    ),
                    const SizedBox(width: 8),
                    Expanded(child: Text(theme.label)),
                  ],
                ),
              ),
            );
          }

          return menuItems;
        },
      ),
    );
  }

  Widget _buildRuntimeThemeDiagnosticsBadge({required bool isDark}) {
    final service = LoginThemeCampaignService.instance;
    final diagnostics = service.runtimeDiagnostics;
    final metadata = service.runtimeMetadata;
    final source = metadata.source;
    final themeLabel = service.effectiveThemeLabel;
    final campaignName =
        (metadata.campaignName ?? '').trim().isEmpty
        ? '-'
        : metadata.campaignName!.trim();

    final cacheAge = diagnostics.cacheAge;
    final cacheAgeLabel = cacheAge == null
        ? '-'
        : cacheAge.inMinutes >= 1
        ? '${cacheAge.inMinutes}m'
        : '${cacheAge.inSeconds}s';
    final statusLabel = service.isFetching
        ? 'fetching'
        : diagnostics.lastError == null
        ? 'ok'
        : 'fallback';
    final errorLabel = diagnostics.lastError == null
        ? ''
        : diagnostics.lastError!.split('\n').first;

    final backgroundColor = isDark
        ? Colors.black.withValues(alpha: 0.58)
        : Colors.white.withValues(alpha: 0.92);
    final borderColor = isDark
        ? Colors.white.withValues(alpha: 0.2)
        : Colors.black.withValues(alpha: 0.08);
    final textColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final mutedColor = textColor.withValues(alpha: 0.76);

    return Container(
      constraints: const BoxConstraints(maxWidth: 320),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor),
      ),
      child: DefaultTextStyle(
        style: TextStyle(
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.w500,
          height: 1.25,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Theme: $themeLabel | $source'),
            Text(
              'Campaign: $campaignName',
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              'Status: $statusLabel | Cache: $cacheAgeLabel',
              style: TextStyle(color: mutedColor),
            ),
            if (errorLabel.isNotEmpty)
              Text(
                'Error: $errorLabel',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: const Color(0xFFDC2626)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildBackgroundDecoration(LoginThemeTokenSet campaignTokens) {
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
                  campaignTokens.buttonGradient.first.withValues(alpha: 0.15),
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
                  campaignTokens.buttonGradient.last.withValues(alpha: 0.1),
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

  Widget _buildBackgroundImage(String imageUrl) {
    return Positioned.fill(
      child: IgnorePointer(
        child: _buildRuntimeNetworkImage(
          imageUrl,
          fit: BoxFit.cover,
          loadingFallback: const SizedBox.shrink(),
          errorFallback: const SizedBox.shrink(),
        ),
      ),
    );
  }

  Widget _buildBackgroundOverlay(LoginThemeTokenSet campaignTokens) {
    return Positioned.fill(
      child: IgnorePointer(
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                campaignTokens.bgGradient.first.withValues(alpha: 0.45),
                campaignTokens.bgGradient.last.withValues(alpha: 0.65),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(
    LoginThemeTokenSet campaignTokens,
    LoginThemeAssetManifest runtimeAssets,
  ) {
    final titleColor = campaignTokens.textPrimary;
    final subtitleColor = campaignTokens.textSecondary;

    return Column(
      children: [
        if (runtimeAssets.illustration.isNotEmpty) ...[
          _buildHeaderIllustration(runtimeAssets.illustration),
          const SizedBox(height: 20),
        ],

        const SizedBox(height: 4),

        // Welcome text
        Text(
          'Welcome back 👋',
          style: TextStyle(
            fontSize: 32,
            fontWeight: FontWeight.bold,
            color: titleColor,
            letterSpacing: -1,
          ),
        ),

        const SizedBox(height: 8),

        Text(
          'Masuk ke akun Agrinova kamu',
          style: TextStyle(
            fontSize: 16,
            color: subtitleColor,
            fontWeight: FontWeight.w400,
          ),
        ),

        const SizedBox(height: 16),

        // Connection status pill
        _buildConnectionPill(),
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
          child: _buildRuntimeNetworkImage(
            imageUrl,
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

  Widget _buildRuntimeNetworkImage(
    String imageUrl, {
    required BoxFit fit,
    required Widget loadingFallback,
    required Widget errorFallback,
  }) {
    final trimmedUrl = imageUrl.trim();
    if (trimmedUrl.isEmpty) {
      return errorFallback;
    }

    if (_isLikelyRasterAssetUrl(trimmedUrl)) {
      return _buildRasterNetworkImage(
        trimmedUrl,
        fit: fit,
        loadingFallback: loadingFallback,
        errorFallback: errorFallback,
        allowSvgFallback: true,
      );
    }

    if (_isSvgAssetUrl(trimmedUrl)) {
      return _buildSvgNetworkImage(
        trimmedUrl,
        fit: fit,
        loadingFallback: loadingFallback,
        errorFallback: errorFallback,
        allowRasterFallback: true,
      );
    }

    // Unknown extension/format: try SVG first, then fallback to raster.
    return _buildSvgNetworkImage(
      trimmedUrl,
      fit: fit,
      loadingFallback: loadingFallback,
      errorFallback: errorFallback,
      allowRasterFallback: true,
    );
  }

  Widget _buildSvgNetworkImage(
    String imageUrl, {
    required BoxFit fit,
    required Widget loadingFallback,
    required Widget errorFallback,
    required bool allowRasterFallback,
  }) {
    return SvgPicture.network(
      imageUrl,
      fit: fit,
      placeholderBuilder: (context) => loadingFallback,
      errorBuilder: (context, error, stackTrace) {
        if (kDebugMode) {
          debugPrint(
            'Login campaign SVG asset failed: $imageUrl | error: $error',
          );
        }
        if (!allowRasterFallback) {
          return errorFallback;
        }
        return _buildRasterNetworkImage(
          imageUrl,
          fit: fit,
          loadingFallback: loadingFallback,
          errorFallback: errorFallback,
          allowSvgFallback: false,
        );
      },
    );
  }

  Widget _buildRasterNetworkImage(
    String imageUrl, {
    required BoxFit fit,
    required Widget loadingFallback,
    required Widget errorFallback,
    required bool allowSvgFallback,
  }) {
    return Image.network(
      imageUrl,
      fit: fit,
      filterQuality: FilterQuality.medium,
      loadingBuilder: (context, child, loadingProgress) {
        if (loadingProgress == null) return child;
        return loadingFallback;
      },
      errorBuilder: (context, error, stackTrace) {
        if (kDebugMode) {
          debugPrint(
            'Login campaign raster asset failed: $imageUrl | error: $error',
          );
        }
        if (!allowSvgFallback) {
          return errorFallback;
        }
        return _buildSvgNetworkImage(
          imageUrl,
          fit: fit,
          loadingFallback: loadingFallback,
          errorFallback: errorFallback,
          allowRasterFallback: false,
        );
      },
    );
  }

  bool _isSvgAssetUrl(String imageUrl) {
    final normalized = imageUrl.trim().toLowerCase();
    if (normalized.isEmpty) return false;
    if (normalized.contains('image/svg+xml')) return true;

    final uri = Uri.tryParse(normalized);
    if (uri != null) {
      const svgHintKeys = [
        'format',
        'mime',
        'contentType',
        'content_type',
        'fileType',
        'file_type',
      ];
      for (final key in svgHintKeys) {
        final queryValue = uri.queryParameters[key];
        if (queryValue != null && queryValue.toLowerCase().contains('svg')) {
          return true;
        }
      }
    }
    final path = uri?.path ?? normalized;
    return path.endsWith('.svg');
  }

  bool _isLikelyRasterAssetUrl(String imageUrl) {
    final normalized = imageUrl.trim().toLowerCase();
    if (normalized.isEmpty || normalized.contains('image/svg+xml')) {
      return false;
    }
    final uri = Uri.tryParse(normalized);
    final path = uri?.path ?? normalized;
    return path.endsWith('.png') ||
        path.endsWith('.jpg') ||
        path.endsWith('.jpeg') ||
        path.endsWith('.webp') ||
        path.endsWith('.gif') ||
        path.endsWith('.bmp');
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
      borderRadius: BorderRadius.circular(24),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: const EdgeInsets.all(28),
          decoration: BoxDecoration(
            color: glassColor,
            borderRadius: BorderRadius.circular(24),
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
                const SizedBox(height: 20),
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
    required TextInputAction textInputAction,
    required Iterable<String> autofillHints,
    bool isPassword = false,
    String? Function(String?)? validator,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final campaignTokens = _campaignTokens(context);
    final textColor = campaignTokens.textPrimary;
    final secondaryColor = campaignTokens.textSecondary;
    final tertiaryColor = campaignTokens.textSecondary.withValues(
      alpha: isDark ? 0.75 : 0.85,
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
    final textColor = campaignTokens.textSecondary;

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
          style: TextStyle(color: textColor, fontSize: 14),
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
            color: campaignTokens.buttonGradient.first.withValues(alpha: 0.3),
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

  Widget _buildLegalLinks() {
    final mutedColor = _campaignTokens(
      context,
    ).textSecondary.withValues(alpha: 0.8);

    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 8,
      runSpacing: 2,
      children: [
        Text(
          'Dengan masuk, Anda menyetujui',
          style: TextStyle(
            color: mutedColor,
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
