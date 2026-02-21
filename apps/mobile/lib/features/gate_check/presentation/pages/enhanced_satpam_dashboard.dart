import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../../core/services/jwt_storage_service.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../data/models/gate_check_models.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../../../core/services/cross_device_gate_service.dart';
import 'qr_scan_result_page.dart'; // Import result page

// Import Biometric Settings
import '../../../../core/di/dependency_injection.dart';
import '../../../../features/auth/presentation/pages/biometric_settings_page.dart';
import '../../../../features/auth/presentation/blocs/biometric_auth_bloc.dart';
import 'satpam_dashboard/satpam_dashboard_constants.dart';
import 'satpam_dashboard/satpam_dashboard_services.dart';
import 'satpam_dashboard/satpam_dashboard_dialogs.dart';
import 'satpam_dashboard/satpam_dashboard_widgets.dart';
import 'satpam_dashboard/satpam_dashboard_helpers.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/services/pos_settings_service.dart';

// Import Gen Z Components
import 'satpam_dashboard/genz_components.dart';
import 'satpam_dashboard/organisms/genz_validation_tab.dart'; // For RecentScanData
import 'satpam_dashboard/genz_sync_tab.dart'; // Import Sync Tab

/// Enhanced Satpam Dashboard with Gen Z Modern Design
///
/// 100% Database-Driven with Offline-First functionality.
/// Uses Atomic Design pattern for modular components.
class EnhancedSatpamDashboard extends StatefulWidget {
  const EnhancedSatpamDashboard({Key? key}) : super(key: key);

  @override
  State<EnhancedSatpamDashboard> createState() =>
      _EnhancedSatpamDashboardState();
}

class _EnhancedSatpamDashboardState extends State<EnhancedSatpamDashboard>
    with TickerProviderStateMixin {
  static final Logger _logger = Logger();

  // Services
  final JWTStorageService _jwtStorage = JWTStorageService();

  // Auto-refresh subscription (must be cancelled in dispose)
  StreamSubscription? _autoRefreshSubscription;
  SatpamDashboardServiceState? _serviceState;
  final Completer<void> _serviceInitCompleter = Completer<void>();

  // Controllers
  late TabController _mainTabController;
  late PageController _dashboardPageController;

  // State variables
  bool _isLoading = true;
  bool _isLoadingAction = false;
  String? _errorMessage;
  int _currentTabIndex = 0;

  // User data
  String _userName = 'Loading...';
  String _userRole = 'Satpam';
  String? _companyName;

  // POS Settings
  String _shiftInfoText = SatpamDashboardConstants.defaultShiftInfo;

  // Dashboard data
  GateCheckStats? _todayStats;
  List<GuestLog> _recentLogs = [];
  List<AccessLog> _recentAccessLogs = [];
  Map<String, dynamic> _repositoryStats = {};
  List<Map<String, dynamic>> _historyData = []; // Full history data

  // Scanner state
  MobileScannerController? _scannerController;
  bool _isScanning = false;
  bool _isFlashOn = false;
  bool _isProcessingQR = false;
  final CrossDeviceGateService _crossDeviceService =
      CrossDeviceGateService(); // Add CrossDeviceGateService

  // Recent scans for validation tab
  List<RecentScanData> _recentScans = [];

  // Form data
  final GateCheckFormData _registrationFormData = GateCheckFormData();
  Map<String, dynamic>? _currentFormData;
  String _generationIntent = 'ENTRY';

  // Reprint tracking (cetak ulang tanpa duplikasi data)
  String? _currentGuestLogId;
  String? _lastGeneratedQRData;
  String? _registeredIntent; // Intent saat QR pertama kali dibuat
  bool _isFormRegistered = false;

  @override
  void initState() {
    super.initState();

    _mainTabController = TabController(
      length: 5, // Dashboard, Daftar, Validasi, Riwayat, Profil
      vsync: this,
    );
    _dashboardPageController = PageController();
    _scannerController =
        MobileScannerController(); // Initialize scanner controller

    // Initialize services and load data asynchronously
    _initializeAndLoadData();
    _setupAutoRefresh();
  }

  /// Initialize services and load data in proper order
  Future<void> _initializeAndLoadData() async {
    try {
      // Initialize services first
      await _initializeServices();

      // Then load data and settings in parallel
      await Future.wait([
        _loadDashboardData(),
        _loadPOSSettings(),
        _loadUserData(),
      ]);
    } catch (e) {
      _logger.e('Error during initialization and data loading', error: e);
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Initialization failed: ${e.toString()}';
        });
      }
    }
  }

  @override
  void dispose() {
    _autoRefreshSubscription?.cancel();
    _mainTabController.dispose();
    _dashboardPageController.dispose();
    _scannerController?.dispose();
    super.dispose();
  }

  /// Initialize services with error recovery
  Future<void> _initializeServices() async {
    try {
      _logger.i('Initializing dashboard services...');
      _serviceState = await SatpamDashboardServices.initializeServices();
      _logger.i('Dashboard services initialized successfully');
    } catch (e) {
      _logger.e('Service initialization failed', error: e);
      _serviceState = SatpamDashboardServiceState(
        isInitialized: false,
        isOfflineMode: true,
      );
    } finally {
      if (!_serviceInitCompleter.isCompleted) {
        _serviceInitCompleter.complete();
      }
    }
  }

  /// Set up periodic refresh for real-time updates
  void _setupAutoRefresh() {
    _autoRefreshSubscription =
        Stream.periodic(SatpamDashboardConstants.autoRefreshInterval)
            .listen((_) {
      if (mounted) {
        _loadDashboardData(showLoading: false);
      }
    });
  }

  /// Load dashboard data with loading state management
  Future<void> _loadDashboardData({bool showLoading = true}) async {
    try {
      if (showLoading) {
        setState(() => _isLoading = true);
      }

      // Wait for service initialization if not ready
      if (_serviceState == null) {
        _logger.w(
            'Service state not initialized, waiting for init to complete...');
        await _serviceInitCompleter.future;
      }

      // Load data through service layer
      final dashboardData = await SatpamDashboardServices.loadDashboardData(
        serviceState: _serviceState!,
        showLoading: showLoading,
      );

      // Load full history data separately
      final historyData = await SatpamDashboardServices.loadHistoryData(
        serviceState: _serviceState!,
        limit: 50,
      );

      if (mounted) {
        setState(() {
          _todayStats = dashboardData.todayStats;
          _recentLogs = dashboardData.recentLogs;
          _recentAccessLogs = dashboardData.recentAccessLogs;
          _repositoryStats = dashboardData.repositoryStats;
          _historyData = historyData;
          _isLoading = false;
          _errorMessage = null;
        });
      }
    } catch (e) {
      _logger.e('Error loading dashboard data', error: e);
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Failed to load dashboard data: ${e.toString()}';
        });
      }
    }
  }

  /// Load gate settings from POSSettingsService
  Future<void> _loadPOSSettings() async {
    try {
      _logger.d('Loading gate settings...');

      final settings = await POSSettingsService.getSettings();

      if (mounted) {
        setState(() {
          _shiftInfoText = settings.posName;
          _registrationFormData.setPosNumber(settings.posNumber);
        });
      }

      _logger.i('Gate settings loaded: ${settings.posNumber}');
    } catch (e) {
      _logger.e('Error loading gate settings', error: e);
      if (mounted) {
        setState(() {
          _shiftInfoText = 'Gate Settings Error';
        });
      }
    }
  }

  /// Load user data from JWT storage
  Future<void> _loadUserData() async {
    try {
      _logger.d('Loading user data from JWT storage...');

      final userData = await _jwtStorage.getUserInfo();

      if (!mounted) return;

      final authState = context.read<AuthBloc>().state;
      final authUser = authState is AuthAuthenticated ? authState.user : null;

      final resolvedName = _firstNonBlank(
        [
          userData?.fullName,
          userData?.username,
          authUser?.fullName,
          authUser?.username,
        ],
        fallback: 'Pengguna',
      );

      final resolvedRole = _firstNonBlank(
        [
          userData?.role,
          authUser?.role,
        ],
        fallback: _userRole,
      );

      final resolvedCompany = _firstNonBlankOrNull(
        [
          userData?.companyName,
          authUser?.companyName,
        ],
      );

      setState(() {
        _userName = resolvedName;
        _userRole = resolvedRole;
        _companyName = resolvedCompany;
      });

      _logger.i(
          'User data loaded: $_userName ($_userRole) - Company: $_companyName');
    } catch (e) {
      _logger.e('Error loading user data', error: e);

      if (mounted && _isBlank(_userName)) {
        setState(() {
          _userName = 'Pengguna';
        });
      }
    }
  }

  bool _isBlank(String? value) => value == null || value.trim().isEmpty;

  String _firstNonBlank(Iterable<String?> values, {required String fallback}) {
    for (final value in values) {
      if (!_isBlank(value)) {
        return value!.trim();
      }
    }
    return fallback;
  }

  String? _firstNonBlankOrNull(Iterable<String?> values) {
    for (final value in values) {
      if (!_isBlank(value)) {
        return value!.trim();
      }
    }
    return null;
  }

  String? _normalizeOptionalText(String? value) {
    if (value == null) return null;
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is AuthAuthenticated) {
          return Scaffold(
            backgroundColor: const Color(0xFF111827),
            appBar: _buildAppBar(state),
            body: _buildMainBody(),
            bottomNavigationBar: _buildBottomNavigation(),
          );
        }
        return const Scaffold(body: Center(child: CircularProgressIndicator()));
      },
    );
  }

  /// Build app bar with actions - matches mockup design
  PreferredSizeWidget _buildAppBar(AuthAuthenticated state) {
    return AppBar(
      backgroundColor: const Color(0xFF1F2937),
      elevation: 0,
      centerTitle: true,
      automaticallyImplyLeading: false,
      title: const Text(
        'Sistem Pemeriksaan POS',
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
      actions: [
        // More options menu
        PopupMenuButton<String>(
          icon: const Icon(Icons.more_horiz_rounded, color: Colors.white),
          color: const Color(0xFF1F2937),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          onSelected: (value) {
            switch (value) {
              case 'pos_settings':
                _showPOSSettingsDialog();
                break;
              case 'sync':
                _switchToTab(4); // Switch to Sync tab
                break;
              case 'validate':
                // Push Profile Page
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => Scaffold(
                      backgroundColor: const Color(0xFF111827),
                      appBar: AppBar(
                        title: const Text('Profil User'),
                        backgroundColor: const Color(0xFF1F2937),
                        elevation: 0,
                      ),
                      body: _buildProfileTab(),
                    ),
                  ),
                );
                break;
              case 'biometric':
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (context) => BlocProvider(
                      create: (context) => sl<BiometricAuthBloc>(),
                      child: const BiometricSettingsPage(),
                    ),
                  ),
                );
                break;
              case 'web_qr_login':
                Navigator.pushNamed(context, AppRoutes.webQRLogin);
                break;
              case 'logout':
                context.read<AuthBloc>().add(AuthLogoutRequested());
                break;
            }
          },
          itemBuilder: (context) => [
            PopupMenuItem(
              value: 'pos_settings',
              child: Row(
                children: [
                  Icon(Icons.door_front_door,
                      color: Colors.white.withOpacity(0.7), size: 20),
                  const SizedBox(width: 12),
                  const Text('Pengaturan POS',
                      style: TextStyle(color: Colors.white)),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'biometric',
              child: Row(
                children: [
                  Icon(Icons.fingerprint_rounded,
                      color: Colors.white.withOpacity(0.7), size: 20),
                  const SizedBox(width: 12),
                  const Text('Keamanan Biometrik',
                      style: TextStyle(color: Colors.white)),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'web_qr_login',
              child: Row(
                children: [
                  Icon(Icons.qr_code_scanner_rounded,
                      color: Colors.white.withOpacity(0.7), size: 20),
                  const SizedBox(width: 12),
                  const Text('QR Login Web',
                      style: TextStyle(color: Colors.white)),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'sync',
              child: Row(
                children: [
                  Icon(Icons.sync_rounded,
                      color: Colors.white.withOpacity(0.7), size: 20),
                  const SizedBox(width: 12),
                  const Text('Sync', style: TextStyle(color: Colors.white)),
                ],
              ),
            ),
            PopupMenuItem(
              value: 'validate',
              child: Row(
                children: [
                  Icon(Icons.person_rounded,
                      color: Colors.white.withOpacity(0.7), size: 20),
                  const SizedBox(width: 12),
                  const Text('Profil', style: TextStyle(color: Colors.white)),
                ],
              ),
            ),
            const PopupMenuDivider(),
            PopupMenuItem(
              value: 'logout',
              child: Row(
                children: [
                  Icon(Icons.logout_rounded,
                      color: Colors.red.withOpacity(0.8), size: 20),
                  const SizedBox(width: 12),
                  Text('Keluar',
                      style: TextStyle(color: Colors.red.withOpacity(0.8))),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(width: 4),
      ],
    );
  }

  /// Build main body with tab view
  Widget _buildMainBody() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF111827), Color(0xFF1F2937)],
        ),
      ),
      child: TabBarView(
        controller: _mainTabController,
        children: [
          _buildDashboardTab(),
          _buildRegistrationTab(),
          _buildValidationTab(),
          _buildHistoryTab(),
          _buildSyncTab(),
        ],
      ),
    );
  }

  /// Build Dashboard Tab with Gen Z styling
  Widget _buildDashboardTab() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF8B5CF6)),
      );
    }

    // Convert logs to activity data
    final activities =
        _convertLogsToActivityData(_recentLogs, _recentAccessLogs);

    // Calculate sync stats from repository stats
    final totalRecords =
        ((_repositoryStats['total_gate_guest_logs'] as int?) ?? 0) +
            ((_repositoryStats['total_employee_logs'] as int?) ?? 0);
    final pendingRecords = (_repositoryStats['pending_sync'] as int?) ?? 0;
    final syncedRecords = totalRecords - pendingRecords;

    return GenZDashboardTab(
      userName: _userName,
      userRole: _userRole,
      companyName: _companyName,
      shiftInfo: _shiftInfoText,
      totalEntry: _todayStats?.todayEntries ?? 0,
      totalExit: _todayStats?.todayExits ?? 0,
      totalRecords: totalRecords,
      syncedRecords: syncedRecords > 0 ? syncedRecords : 0,
      pendingRecords: pendingRecords,
      recentActivities: activities,
      onRefresh: () => _loadDashboardData(),
      onViewAllHistory: () => _switchToTab(3),
      isLoading: _isLoading,
    );
  }

  /// Build Registration Tab with Gen Z styling
  Widget _buildRegistrationTab() {
    return GenZRegistrationTab(
      onVehiclePlateChanged: _handleVehiclePlateChanged,
      onFormDataChanged: _handleFormDataChanged,
      onCameraPressed: (type) => _handleRegistrationPhoto(type),
      onQRGeneratePressed: _handleQRGeneration,
      isLoading: _isLoading,
      isLoadingAction: _isLoadingAction,
      errorMessage: _errorMessage,
      initialData: _registrationFormData,
      generationIntent: _generationIntent,
      onIntentChanged: _handleIntentChange,
      isRegistered: _isFormRegistered,
      onRegisterNewPressed: _handleRegisterNew,
    );
  }

  /// Build Validation Tab with Gen Z styling
  Widget _buildValidationTab() {
    return GenZValidationTab(
      onScanQR: _handleQRScan,
      onManualEntry: _handleManualEntry,
      onFlashToggle: _handleFlashToggle,
      isScanning: _isScanning,
      isFlashOn: _isFlashOn,
      isProcessing: _isProcessingQR,
      recentScans: _recentScans,
      scannerWidget: MobileScanner(
        controller: _scannerController,
        onDetect: _onQRDetected,
      ),
    );
  }

  /// Build History Tab with Gen Z styling
  Widget _buildHistoryTab() {
    return GenZHistoryTab(
      historyData: _historyData,
      onRefresh: () => _loadDashboardData(),
      isLoading: _isLoading,
    );
  }

  /// Build Profile Tab with Gen Z styling
  Widget _buildProfileTab() {
    return GenZProfileTab(
      onLogout: () {
        // Logout handled internally by the widget
      },
      onBiometricSettings: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (context) => BlocProvider(
              create: (context) => sl<BiometricAuthBloc>(),
              child: const BiometricSettingsPage(),
            ),
          ),
        );
      },
    );
  }

  /// Build Sync Tab with Gen Z styling
  Widget _buildSyncTab() {
    return GenZSyncTab(
      repositoryStats: _repositoryStats,
      isLoading: _isLoading,
      onManualSync: _performManualSync,
    );
  }

  // Event Handlers

  void _handleVehiclePlateChanged(String plate) {
    final cleanedPlate = plate.trim().toUpperCase();
    setState(() {
      _registrationFormData.vehiclePlate = cleanedPlate;
    });
  }

  void _handleFormDataChanged(GateCheckFormData formData) {
    setState(() {
      _registrationFormData.posNumber = formData.posNumber;
      _registrationFormData.driverName = formData.driverName;
      _registrationFormData.vehiclePlate = formData.vehiclePlate;
      _registrationFormData.vehicleType = formData.vehicleType;
      _registrationFormData.vehicleCharacteristics =
          formData.vehicleCharacteristics;
      _registrationFormData.destination = formData.destination;
      _registrationFormData.loadType = formData.loadType;
      _registrationFormData.loadVolume = formData.loadVolume;
      _registrationFormData.loadOwner = formData.loadOwner;
      _registrationFormData.estimatedWeight = formData.estimatedWeight;
      _registrationFormData.actualWeight = formData.actualWeight;
      _registrationFormData.doNumber = formData.doNumber;
      _registrationFormData.notes = formData.notes;
      _registrationFormData.photos = formData.photos;

      _currentFormData = {
        'posNumber': formData.posNumber,
        'driverName': formData.driverName,
        'vehiclePlate': formData.vehiclePlate,
        'vehicleType': formData.vehicleType,
        'vehicleCharacteristics': formData.vehicleCharacteristics,
        'destination': formData.destination,
        'purpose': formData.destination,
        'cargoType': formData.loadType,
        'cargoVolume': formData.loadVolume, // "Seperempat", "Setengah", "Penuh"
        'cargoOwner': formData.loadOwner,
        'estimatedWeight': formData.estimatedWeight,
        'doNumber': formData.doNumber,
        'notes': formData.notes,
      };
    });
  }

  void _handleIntentChange(String newIntent) {
    setState(() {
      _generationIntent = newIntent;
    });
  }

  void _handleRegistrationPhoto(String type) async {
    try {
      final vehiclePlate = _registrationFormData.vehiclePlate.trim();

      if (vehiclePlate.isEmpty) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Mohon isi nomor plat kendaraan terlebih dahulu',
          isError: true,
        );
        return;
      }

      if (_serviceState != null) {
        final photoPath = await SatpamDashboardServices.handlePhotoCapture(
          context: context,
          vehiclePlate: vehiclePlate,
          serviceState: _serviceState!,
          note: type == 'FRONT' ? 'Foto Tampak Depan' : 'Foto Tampak Belakang',
        );

        if (photoPath != null && mounted) {
          setState(() {
            // Ensure photos list has at least 2 slots
            var currentPhotos = List<String>.from(_registrationFormData.photos);
            if (currentPhotos.length < 2) {
              // Fill with empty strings if not enough
              while (currentPhotos.length < 2) {
                currentPhotos.add('');
              }
            }

            // Update specific slot
            if (type == 'FRONT') {
              currentPhotos[0] = photoPath;
            } else {
              currentPhotos[1] = photoPath;
            }

            _registrationFormData.photos = currentPhotos;

            // Also update map for sync checks
            if (_currentFormData != null) {
              _currentFormData!['photos'] = currentPhotos;
            }
          });
        }
      }
    } catch (e) {
      _logger.e('Error during photo capture', error: e);
      if (mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Error: ${e.toString()}',
          isError: true,
        );
      }
    }
  }

  void _handleQRGeneration() async {
    try {
      // === REPRINT PATH: Jika form sudah ter-register, tampilkan QR yang tersimpan ===
      if (_isFormRegistered &&
          _lastGeneratedQRData != null &&
          _lastGeneratedQRData!.isNotEmpty) {
        _logger.i(
            'Reprint mode: reusing existing QR data (no new token/DB record created)');

        final driverName = _currentFormData?['driverName'] as String? ?? '';
        final vehiclePlate = _currentFormData?['vehiclePlate'] as String? ?? '';
        final destination =
            _currentFormData?['purpose'] as String? ?? 'Tujuan umum';
        final cargoType =
            _currentFormData?['cargoType'] as String? ?? 'Muatan umum';

        await SatpamDashboardDialogs.showQRGenerationDialog(
          context,
          qrData: _lastGeneratedQRData!,
          guestName: driverName,
          vehiclePlate: vehiclePlate,
          purpose: destination,
          cargoType: cargoType,
          generationIntent: _registeredIntent ?? _generationIntent,
          metadata: {
            'guest_id': _currentGuestLogId,
            'is_reprint': true,
            'expires_at':
                DateTime.now().add(const Duration(hours: 24)).toIso8601String(),
          },
        );

        SatpamDashboardHelpers.showSnackBar(
          context,
          'Cetak ulang QR berhasil untuk $driverName ($vehiclePlate)',
        );
        return;
      }

      // === NEW REGISTRATION PATH ===
      if (_currentFormData == null || _currentFormData!.isEmpty) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Data form tidak lengkap untuk membuat QR Code',
          isError: true,
        );
        return;
      }

      // Wait for service initialization if needed
      if (_serviceState == null) {
        _logger.w('Service state not initialized, waiting...');
        await Future.delayed(const Duration(milliseconds: 500));
        if (_serviceState == null) {
          throw Exception(
              'Service tidak tersedia, mohon tunggu inisialisasi selesai');
        }
      }

      setState(() => _isLoadingAction = true);

      // Build form data from current form
      final formData = GateCheckFormData();
      formData.posNumber = _registrationFormData.posNumber;
      formData.driverName = _currentFormData!['driverName'] as String? ?? '';
      formData.vehiclePlate =
          _currentFormData!['vehiclePlate'] as String? ?? '';
      formData.destination =
          _currentFormData!['purpose'] as String? ?? 'Tujuan umum';
      formData.loadOwner = _currentFormData!['cargoOwner'] as String? ?? '';
      formData.loadType = _currentFormData!['cargoType'] as String? ?? '';
      formData.loadVolume = _currentFormData!['cargoVolume'] as String? ?? '';
      formData.vehicleType = _currentFormData!['vehicleType'] as String? ?? '';
      formData.estimatedWeight =
          _currentFormData!['estimatedWeight'] as double?;
      formData.doNumber = _currentFormData!['doNumber'] as String?;
      formData.notes = _currentFormData!['notes'] as String?;
      formData.photos = _registrationFormData.photos;

      // Use the service layer which saves to database AND generates QR
      final result = await SatpamDashboardServices.handleQRGeneration(
        context: context,
        formData: formData,
        serviceState: _serviceState!,
        generationIntent: _generationIntent,
      );

      if (result != null && mounted) {
        final driverName = result['guestName'] as String? ?? '';
        final vehiclePlate = result['vehiclePlate'] as String? ?? '';
        final qrData = result['qrData'] as String? ?? '';
        final photosSaved = result['photosSaved'] as int? ?? 0;

        await SatpamDashboardDialogs.showQRGenerationDialog(
          context,
          qrData: qrData,
          guestName: driverName,
          vehiclePlate: vehiclePlate,
          purpose: formData.destination.isNotEmpty
              ? formData.destination
              : 'Tujuan umum',
          cargoType:
              formData.loadType.isNotEmpty ? formData.loadType : 'Muatan umum',
          generationIntent: _generationIntent,
          metadata: {
            'guest_id': result['guestId'],
            'vehicle_type': formData.vehicleType,
            'estimated_weight': formData.estimatedWeight,
            'expires_at':
                DateTime.now().add(const Duration(hours: 24)).toIso8601String(),
          },
        );

        // Store data for reprint (cetak ulang tanpa duplikasi)
        setState(() {
          _currentGuestLogId = result['guestId'] as String?;
          _lastGeneratedQRData = qrData;
          _registeredIntent =
              _generationIntent; // Simpan intent pilihan user saat registrasi
          _isFormRegistered = true;
        });

        SatpamDashboardHelpers.showSnackBar(
          context,
          'QR Code berhasil dibuat untuk $driverName ($vehiclePlate). $photosSaved Foto tersimpan.',
        );

        // Refresh dashboard data to show the new entry
        await _loadDashboardData(showLoading: false);
      }
    } catch (e) {
      _logger.e('Error during QR generation', error: e);
      if (mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Gagal membuat QR Code: ${e.toString()}',
          isError: true,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingAction = false);
      }
    }
  }

  void _handleQRScan() {
    setState(() {
      _isScanning = !_isScanning;
      // Turn off flash when stopping scan
      if (!_isScanning && _isFlashOn) {
        _isFlashOn = false;
        _scannerController?.toggleTorch();
      }
    });

    if (_isScanning) {
      _logger.i('Scanner started inline');
      _scannerController?.start();
    } else {
      _logger.i('Scanner stopped inline');
      _scannerController?.stop();
    }
  }

  /// Toggle flash/torch for scanner
  void _handleFlashToggle() {
    if (_isScanning && _scannerController != null) {
      setState(() {
        _isFlashOn = !_isFlashOn;
      });
      _scannerController?.toggleTorch();
      _logger.i('Flash toggled: $_isFlashOn');
    }
  }

  void _onQRDetected(BarcodeCapture capture) {
    final List<Barcode> barcodes = capture.barcodes;
    if (barcodes.isNotEmpty) {
      final String? qrData = barcodes.first.rawValue;
      if (qrData != null) {
        _processQRData(qrData);
        _handleQRScan(); // Stop scanning (toggle off) after successful detection
      }
    }
  }

  Future<void> _processQRData(String qrData) async {
    // Set processing state
    if (mounted) {
      setState(() => _isProcessingQR = true);
    }

    try {
      // Check if QR service is available
      if (_serviceState == null || _serviceState!.qrService == null) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Service QR tidak tersedia, mohon tunggu...',
          isError: true,
        );
        return;
      }

      final qrService = _serviceState!.qrService!;

      // Parse QR data
      final parseResult = await qrService.parseQRData(qrData);
      if (!parseResult.isValid) {
        _showValidationError('QR Code tidak valid: ${parseResult.error}');
        _addRecentScan(
          vehiclePlate: 'Unknown',
          driverName: 'Invalid QR',
          action: 'ERROR',
          isSuccess: false,
        );
        return;
      }

      // Handle EMPLOYEE_ACCESS
      if (parseResult.data!['type'] == 'EMPLOYEE_ACCESS') {
        _logger.i('Processing employee QR: ${parseResult.data!['name']}');

        // Use Gate ID from POS settings
        final gateId = _registrationFormData.posNumber.isNotEmpty
            ? _registrationFormData.posNumber
            : 'MAIN_GATE';

        // Process employee access
        final success = await SatpamDashboardServices.handleEmployeeQR(
          serviceState: _serviceState!,
          employeeData: parseResult.data!,
          gateId: gateId,
          context: context,
        );

        if (success) {
          // Add to recent scans
          _addRecentScan(
            vehiclePlate: parseResult.data!['employee_id'] ?? 'N/A',
            driverName: parseResult.data!['name'] ?? 'Karyawan',
            action: 'ENTRY',
            isSuccess: true,
          );
          // Refresh dashboard data
          _loadDashboardData(showLoading: false);
        }
        return;
      }

      // Handle GUEST_ACCESS (Existing Logic)

      // Extract data
      final guestData = parseResult.data!;
      final allowedScan = guestData['allowed_scan'] as String?;

      if (allowedScan == null) {
        _showValidationError(
            'QR Code tidak memiliki informasi scan yang valid');
        return;
      }

      // Auto-determine direction
      final scanDirection = allowedScan.toUpperCase();
      final detectedDirection = scanDirection == 'ENTRY'
          ? GateCheckDirection.entry
          : GateCheckDirection.exit;

      // Validate
      final validation = await qrService.validateScanDirection(
          parseResult.token!, scanDirection);

      if (!validation.isValid) {
        _showValidationError(validation.error ?? 'Validasi QR Code gagal');
        _addRecentScan(
          vehiclePlate: guestData['vehicle_plate'] ?? 'Unknown',
          driverName: guestData['name'] ?? 'Unknown',
          action: scanDirection,
          isSuccess: false,
        );
        return;
      }

      // Success - navigate to result page
      // Requires QRScanResultPage to handle confirmation
      final result = await Navigator.of(context).push<Map<String, dynamic>>(
        MaterialPageRoute(
          builder: (context) => QRScanResultPage(
            guestData: guestData,
            scannedToken: parseResult.token!,
            detectedDirection: detectedDirection,
          ),
        ),
      );

      // Handle the result from the result page
      if (result != null && result['confirmed'] == true) {
        await _handleConfirmedGateCheck(result);

        // Add to recent scans
        _addRecentScan(
          vehiclePlate: guestData['vehicle_plate'] ?? 'Unknown',
          driverName: guestData['name'] ?? 'Guest',
          action: scanDirection,
          isSuccess: true,
        );
      }
    } catch (e) {
      _showValidationError('Error memproses QR: ${e.toString()}');
    } finally {
      // Reset processing state
      if (mounted) {
        setState(() => _isProcessingQR = false);
      }
    }
  }

  /// Add scan result to recent scans list
  void _addRecentScan({
    required String vehiclePlate,
    required String driverName,
    required String action,
    required bool isSuccess,
  }) {
    if (mounted) {
      setState(() {
        _recentScans.insert(
          0,
          RecentScanData(
            vehiclePlate: vehiclePlate,
            driverName: driverName,
            action: action,
            timestamp: DateTime.now(),
            isSuccess: isSuccess,
          ),
        );
        // Keep only last 10 scans
        if (_recentScans.length > 10) {
          _recentScans = _recentScans.sublist(0, 10);
        }
      });
    }
  }

  void _showValidationError(String message) {
    SatpamDashboardHelpers.showSnackBar(context, message, isError: true);
  }

  Future<void> _handleConfirmedGateCheck(Map<String, dynamic> result) async {
    try {
      if (_serviceState == null) throw Exception('Service unavailable');

      final guestData = result['guestData'] as Map<String, dynamic>?;
      if (guestData == null) throw Exception('Guest data is missing');

      final scannedToken = result['scannedToken'] as String?;
      if (scannedToken == null || scannedToken.isEmpty) {
        throw Exception('Scanned token is missing');
      }

      // Safe cast/extraction for detectedDirection
      final directionRaw = result['detectedDirection'];
      if (directionRaw == null || directionRaw is! GateCheckDirection) {
        throw Exception('Invalid GateCheckDirection: $directionRaw');
      }
      final detectedDirection = directionRaw;

      final notes = result['notes'] as String? ?? '';

      // Use POS number from POS settings
      final validPosNumber = _registrationFormData.posNumber.isNotEmpty
          ? _registrationFormData.posNumber
          : 'MAIN_GATE';

      if (detectedDirection == GateCheckDirection.exit) {
        await _processExitGateCheckInline(
            validPosNumber, scannedToken, guestData, result);
      } else {
        await _processEntryGateCheckInline(
            validPosNumber, scannedToken, guestData, result);
      }

      // Refresh dashboard
      await _loadDashboardData(showLoading: false);
    } catch (e) {
      _logger.e('Error processing check confirmation', error: e);
      SatpamDashboardHelpers.showSnackBar(
          context, 'Error processing check: ${e.toString()}',
          isError: true);
    }
  }

  Future<void> _processEntryGateCheckInline(
    String posNumber,
    String scannedToken,
    Map<String, dynamic> guestData,
    Map<String, dynamic> resultData,
  ) async {
    final qrService = _serviceState!.qrService!;
    final dbService = _serviceState!.databaseService!;

    // Mark QR phase as used
    await qrService.markPhaseAsUsed(
        scannedToken, GateCheckDirection.entry.value);

    final currentUserId = await _jwtStorage.getCurrentUserId();
    final now = DateTime.now();

    final guestLogData = {
      'driver_name': guestData['name'] ?? '',
      'vehicle_plate': guestData['vehicle_plate'] ?? '',
      'vehicle_type': guestData['vehicle_type'] ?? 'Lainnya',
      'destination': guestData['destination'] ?? 'Business Visit',
      'gate_position': posNumber,
      'created_by': currentUserId ?? 'unknown_user',
      'notes': resultData['notes'] as String?,
      'second_cargo':
          _normalizeOptionalText(resultData['secondCargo'] as String?),
      'entry_time': now.millisecondsSinceEpoch,
      'generation_intent': 'ENTRY',
      'registration_source': 'QR_SCAN',
    };

    // Save to database
    await dbService.createGuestLog(guestLogData);

    SatpamDashboardHelpers.showSnackBar(
      context,
      'Gate Check MASUK Berhasil! (${guestData['vehicle_plate']})',
    );
  }

  Future<void> _processExitGateCheckInline(
    String posNumber,
    String scannedToken,
    Map<String, dynamic> guestData,
    Map<String, dynamic> resultData,
  ) async {
    final qrService = _serviceState!.qrService!;
    final dbService = _serviceState!.databaseService!;
    final vehiclePlate = guestData['vehicle_plate'] ?? '';

    // Validate token again
    final qrValidation = await qrService.validateToken(scannedToken);
    if (!qrValidation.isValid)
      throw Exception('QR Token invalid: ${qrValidation.error}');

    // Cross device validation
    final validationResult = await _crossDeviceService.validateExitProcessing(
      vehiclePlate: vehiclePlate,
      qrGuestData: qrValidation.data!,
    );

    if (!(validationResult['isValid'] as bool)) {
      throw Exception(validationResult['error']);
    }

    if (validationResult['warning'] != null) {
      SatpamDashboardHelpers.showSnackBar(context, validationResult['warning']);
    }

    // Mark used
    await qrService.markPhaseAsUsed(
        scannedToken, GateCheckDirection.exit.value);

    final currentUserId = await _jwtStorage.getCurrentUserId();

    // Create exit record
    await _crossDeviceService.createExitRecord(
      vehiclePlate: vehiclePlate,
      driverName: guestData['name'] ?? '',
      posNumber: posNumber,
      entryReference: validationResult['entryReference'],
      qrGuestData: QRScanData.fromJson(qrValidation.data!),
      actualWeight: resultData['actualWeight'] as double?,
      secondCargo: _normalizeOptionalText(resultData['secondCargo'] as String?),
      notes: resultData['notes'] as String?,
      createdBy: currentUserId ?? 'unknown_user',
    );

    SatpamDashboardHelpers.showSnackBar(
      context,
      'Gate Check KELUAR Berhasil! ($vehiclePlate)',
    );
  }

  void _handleManualEntry() {
    _logger.i('Manual entry initiated');
    _switchToTab(1); // Switch to registration tab
  }

  void _clearRegistrationForm() {
    setState(() {
      _currentFormData = null;
      // _generationIntent tetap berdasarkan pilihan user (ENTRY/EXIT toggle)
      _currentGuestLogId = null;
      _lastGeneratedQRData = null;
      _registeredIntent = null;
      _isFormRegistered = false;
    });
    _registrationFormData.clear();
  }

  /// Handle "Daftar Tamu Baru" button - clears form and resets reprint state
  void _handleRegisterNew() {
    _clearRegistrationForm();
  }

  // Navigation

  void _switchToTab(int index) {
    setState(() => _currentTabIndex = index);
    _mainTabController.animateTo(index);
  }

  Widget _buildBottomNavigation() {
    return SatpamDashboardWidgets.buildBottomNavigation(
      currentIndex: _currentTabIndex,
      onTap: _switchToTab,
    );
  }

  // Dialog handlers

  void _showPOSSettingsDialog() async {
    final settings = await POSSettingsService.getSettings();
    final posNumberController = TextEditingController(text: settings.posNumber);
    final posNameController = TextEditingController(text: settings.posName);

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.door_front_door, color: Color(0xFF8B5CF6)),
            SizedBox(width: 8),
            Text('Pengaturan POS',
                style: TextStyle(color: Colors.black, fontSize: 18)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: posNumberController,
              style: const TextStyle(color: Colors.black),
              decoration: InputDecoration(
                labelText: 'Nomor/ID POS',
                labelStyle: const TextStyle(color: Colors.black54),
                hintText: 'cth: MAIN_GATE, POS_1',
                hintStyle: const TextStyle(color: Colors.black38),
                prefixIcon: const Icon(Icons.tag, color: Color(0xFF8B5CF6)),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: Colors.grey[400]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF8B5CF6)),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: posNameController,
              style: const TextStyle(color: Colors.black),
              decoration: InputDecoration(
                labelText: 'Nama POS',
                labelStyle: const TextStyle(color: Colors.black54),
                hintText: 'cth: Gerbang Utama',
                hintStyle: const TextStyle(color: Colors.black38),
                prefixIcon:
                    const Icon(Icons.label_outline, color: Color(0xFF8B5CF6)),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide(color: Colors.grey[400]!),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF8B5CF6)),
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await POSSettingsService.resetToDefaults();
              posNumberController.text = 'MAIN_GATE';
              posNameController.text = 'Gerbang Utama';
            },
            child: const Text('Reset', style: TextStyle(color: Colors.black54)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Batal', style: TextStyle(color: Colors.black54)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B5CF6),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () async {
              final posNumber = posNumberController.text.trim();
              final posName = posNameController.text.trim();
              if (posNumber.isEmpty) {
                ScaffoldMessenger.of(ctx).showSnackBar(
                  const SnackBar(content: Text('Nomor POS tidak boleh kosong')),
                );
                return;
              }
              await POSSettingsService.saveSettings(
                posNumber: posNumber,
                posName: posName.isNotEmpty ? posName : posNumber,
              );
              await _loadPOSSettings();
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Simpan', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _performManualSync() async {
    try {
      if (_serviceState == null) {
        throw Exception('Service tidak tersedia');
      }

      await SatpamDashboardServices.performManualSync(
        context: context,
        serviceState: _serviceState!,
        onSyncStart: () {
          if (mounted) setState(() => _isLoading = true);
        },
        onSyncComplete: () {
          if (mounted) setState(() => _isLoading = false);
        },
      );
      await _loadDashboardData(showLoading: false);
    } catch (e) {
      _logger.e('Manual sync failed', error: e);
      if (mounted) {
        setState(() => _isLoading = false);
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Sync gagal: ${e.toString()}',
          isError: true,
        );
      }
    }
  }

  // Data conversion helpers

  List<ActivityData> _convertLogsToActivityData(
    List<GuestLog> guestLogs,
    List<AccessLog> accessLogs,
  ) {
    final activities = <ActivityData>[];

    for (final log in guestLogs.take(5)) {
      final logTime = log.timestamp;
      activities.add(ActivityData(
        plate: log.vehiclePlate,
        driver: log.name.isNotEmpty ? log.name : 'Guest',
        time:
            '${logTime.hour.toString().padLeft(2, '0')}:${logTime.minute.toString().padLeft(2, '0')}',
        destination: log.destination ?? '',
        isEntry: log.action.toUpperCase() == 'ENTRY',
        registrationSource: log.registrationSource,
      ));
    }

    return activities;
  }
}
