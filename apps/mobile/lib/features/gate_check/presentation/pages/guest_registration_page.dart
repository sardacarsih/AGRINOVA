import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../data/models/gate_check_models.dart';
import '../../../../core/services/role_service.dart';
import '../../../../core/services/jwt_storage_service.dart';
import '../../../../shared/widgets/logout_menu_widget.dart';
import '../utils/form_security_monitor.dart';

// Import refactored components
import 'satpam_dashboard/satpam_dashboard_constants.dart';
import 'satpam_dashboard/satpam_dashboard_widgets.dart';
import 'satpam_dashboard/satpam_dashboard_dialogs.dart';
import 'satpam_dashboard/satpam_dashboard_services.dart';
import 'satpam_dashboard/satpam_dashboard_helpers.dart';
import '../../../../core/services/pos_settings_service.dart';

/// Guest Registration Page
/// 
/// Dedicated page for guest registration functionality including:
/// - Guest registration form
/// - QR code generation with intent selection
/// - Photo capture for vehicles
/// - Form validation and submission
class GuestRegistrationPage extends StatefulWidget {
  const GuestRegistrationPage({Key? key}) : super(key: key);

  @override
  State<GuestRegistrationPage> createState() => _GuestRegistrationPageState();
}

class _GuestRegistrationPageState extends State<GuestRegistrationPage> {
  static final Logger _logger = Logger();

  // Service state managed by SatpamDashboardServices
  SatpamDashboardServiceState? _serviceState;
  
  // Form state
  final GateCheckFormData _registrationFormData = GateCheckFormData();
  bool _isRegistrationLoading = false;
  String? _registrationError;
  
  // QR Generation Intent
  String _generationIntent = 'ENTRY'; // Default to ENTRY

  // Gate settings (simplified after multi-POS removal)
  String _shiftInfoText = SatpamDashboardConstants.defaultShiftInfo;
  
  // User data
  String? _userName;
  String? _userRole;
  String? _companyName;
  final JWTStorageService _jwtStorage = JWTStorageService();
  
  // Rate limiting for QR generation
  DateTime? _lastQRGenerationTime;
  int _qrGenerationCount = 0;
  static const int _maxQRGenerationsPerMinute = 5;
  static const Duration _qrGenerationCooldown = Duration(seconds: 12); // 12 seconds between requests

  // State untuk regenerate QR (cetak ulang tanpa duplikasi data)
  String? _currentGuestLogId;
  DateTime? _registeredAt;
  String? _lastGeneratedQRData; // Simpan QR data terakhir untuk cetak ulang tanpa buat token baru

  @override
  void initState() {
    super.initState();
    
    // Initialize services and load data asynchronously
    _initializeAndLoadData();
  }

  @override
  void dispose() {
    super.dispose();
  }

  /// Initialize services and load initial data
  Future<void> _initializeAndLoadData() async {
    try {
      setState(() {
        _isRegistrationLoading = true;
        _registrationError = null;
      });

      // Initialize services
      await _initializeServices();
      
      // Load user data and gate settings in parallel
      await Future.wait([
        _loadUserData(),
        _loadGateSettings(),
      ]);

    } catch (e) {
      _logger.e('Error during initialization', error: e);
      if (mounted) {
        setState(() {
          _registrationError = 'Initialization error: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isRegistrationLoading = false;
        });
      }
    }
  }

  /// Initialize dashboard services
  Future<void> _initializeServices() async {
    try {
      _logger.d('Initializing services...');
      
      final serviceState = await SatpamDashboardServices.initializeServices();
      
      if (mounted) {
        setState(() {
          _serviceState = serviceState;
        });
      }
      
      _logger.i('Services initialized successfully');
    } catch (e) {
      _logger.e('Error initializing services', error: e);
      throw Exception('Failed to initialize services: ${e.toString()}');
    }
  }

  /// Load gate settings from POSSettingsService
  Future<void> _loadGateSettings() async {
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
      
      if (mounted && userData != null) {
        setState(() {
          _userName = userData.fullName ?? userData.username;
          _userRole = userData.role;
          _companyName = userData.companyName;
        });
        
        _logger.i('User data loaded: $_userName ($_userRole) - Company: $_companyName');
      }
    } catch (e) {
      _logger.e('Error loading user data', error: e);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is! AuthAuthenticated) {
          return const Scaffold(
            body: Center(child: Text('Authentication required')),
          );
        }

        return Scaffold(
          appBar: _buildAppBar(state),
          body: _buildBody(),
          backgroundColor: Colors.grey[100],
        );
      },
    );
  }

  /// Build app bar
  AppBar _buildAppBar(AuthAuthenticated state) {
    return AppBar(
      title: const Text(
        'Daftar Tamu Gerbang',
        style: TextStyle(fontWeight: FontWeight.bold),
      ),
      backgroundColor: SatpamDashboardConstants.primaryColor,
      foregroundColor: Colors.white,
      elevation: 0,
      actions: [
        if (_registrationFormData.posNumber.isNotEmpty)
          Container(
            margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 4),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.door_front_door, size: 16, color: Colors.white),
                const SizedBox(width: 4),
                Text(
                  _registrationFormData.posNumber,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        LogoutMenuWidget(
          username: state.user.username,
          role: RoleService.getRoleDisplayName(state.user.role),
        ),
      ],
    );
  }

  /// Build main body
  Widget _buildBody() {
    if (_isRegistrationLoading) {
      return SatpamDashboardHelpers.buildLoadingIndicator('Memuat halaman pendaftaran...');
    }

    if (_registrationError != null) {
      return SatpamDashboardHelpers.buildError(_registrationError!, _initializeAndLoadData);
    }

    return _buildRegistrationForm();
  }

  /// Build registration form
  Widget _buildRegistrationForm() {
    _logger.d('Building registration form with isLoading: $_isRegistrationLoading');
    
    return SatpamDashboardWidgets.buildRegistrationTab(
      onVehiclePlateChanged: _handleVehiclePlateChanged,
      onFormDataChanged: _handleFormDataChanged, // NEW: Complete form data callback
      onCameraPressed: _handleRegistrationPhoto,
      onQRGeneratePressed: _handleQRGeneration,
      isLoading: _isRegistrationLoading,
      errorMessage: _registrationError,
      initialData: _registrationFormData,
      generationIntent: _generationIntent,
      onIntentChanged: _handleIntentChange,
      isRegistered: _registrationFormData.isRegistered,
      onRegisterNewPressed: () {
        _clearRegistrationForm();
      },
    );
  }

  // Event handlers

  /// Ensure form data synchronization from UI state
  /// This method should be called before any action that depends on form data
  void _ensureFormDataSync() {
    _logger.d('=== Form Data Synchronization Check ===');
    _logger.d('Current registration form data state:');
    _logger.d('- POS Number: "${_registrationFormData.posNumber}"');
    _logger.d('- Driver Name: "${_registrationFormData.driverName}"');
    _logger.d('- Vehicle Plate: "${_registrationFormData.vehiclePlate}"');
    _logger.d('- Vehicle Type: "${_registrationFormData.vehicleType}"');
    _logger.d('- Destination: "${_registrationFormData.destination}"');
    _logger.d('- Load Type: "${_registrationFormData.loadType}"');
    _logger.d('- Load Volume: ${_registrationFormData.loadVolume}');
    _logger.d('- Load Owner: "${_registrationFormData.loadOwner}"');
    _logger.d('- Form Valid: ${_registrationFormData.isValid}');
    _logger.d('=======================================');
    
    // Additional validation - if vehicle plate is still empty, this indicates a sync issue
    if (_registrationFormData.vehiclePlate.isEmpty) {
      _logger.w('SYNC ISSUE DETECTED: Vehicle plate is empty in parent form data');
      _logger.w('This suggests the form widget callback is not working properly');
    }
  }

  /// Handle vehicle plate input change
  void _handleVehiclePlateChanged(String plate) {
    final cleanedPlate = plate.trim().toUpperCase();
    _logger.d('Vehicle plate changed from: "${_registrationFormData.vehiclePlate}" to: "$cleanedPlate"');
    
    // Update form data in real-time with validation
    setState(() {
      _registrationFormData.vehiclePlate = cleanedPlate;
    });
    
    // Log the updated state for debugging
    _logger.d('Form data updated - Vehicle plate now: "${_registrationFormData.vehiclePlate}"');
    
    // Check for existing registrations or validation if needed
  }

  /// NEW: Handle complete form data changes from form widget
  void _handleFormDataChanged(GateCheckFormData formData) {
    _logger.d('=== Complete Form Data Received from Widget ===');
    _logger.d('- POS Number: "${formData.posNumber}"');
    _logger.d('- Driver Name: "${formData.driverName}"');
    _logger.d('- Vehicle Plate: "${formData.vehiclePlate}"');
    _logger.d('- Vehicle Type: "${formData.vehicleType}"');
    _logger.d('- Destination: "${formData.destination}"');
    _logger.d('- Load Type: "${formData.loadType}"');
    _logger.d('- Load Volume: ${formData.loadVolume}');
    _logger.d('- Load Owner: "${formData.loadOwner}"');
    _logger.d('- Form Valid: ${formData.isValid}');
    _logger.d('==============================================');
    
    setState(() {
      // Update complete form data from widget
      _registrationFormData.posNumber = formData.posNumber;
      _registrationFormData.driverName = formData.driverName;
      _registrationFormData.vehiclePlate = formData.vehiclePlate;
      _registrationFormData.vehicleType = formData.vehicleType;
      _registrationFormData.vehicleCharacteristics = formData.vehicleCharacteristics;
      _registrationFormData.destination = formData.destination;
      _registrationFormData.loadType = formData.loadType;
      _registrationFormData.loadVolume = formData.loadVolume;
      _registrationFormData.loadOwner = formData.loadOwner;
      _registrationFormData.estimatedWeight = formData.estimatedWeight;
      _registrationFormData.actualWeight = formData.actualWeight;
      _registrationFormData.doNumber = formData.doNumber;
      _registrationFormData.notes = formData.notes;
      _registrationFormData.photos = formData.photos;
    });
    
    _logger.i('Parent form data synchronized successfully');
  }

  /// Handle registration photo capture
  void _handleRegistrationPhoto(String type) async {
    try {
      // Ensure form data is synchronized before validation
      _ensureFormDataSync();
      
      // Debug logging for troubleshooting
      _logger.d('Photo capture initiated. Current vehicle plate: "${_registrationFormData.vehiclePlate}"');
      _logger.d('Type: $type');
      
      // Check if vehicle plate is available with multiple validation approaches
      String vehiclePlate = _registrationFormData.vehiclePlate.trim();
      
      if (vehiclePlate.isEmpty) {
        // Log detailed information for troubleshooting
        _logger.w('Photo capture blocked: Vehicle plate is empty in parent form data');
        
        // Give user a more specific message
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Mohon isi nomor plat kendaraan terlebih dahulu sebelum mengambil foto',
          isError: true,
        );
        return;
      }

      // Additional validation for vehicle plate format
      if (vehiclePlate.length < 3) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Format plat kendaraan tidak valid. Minimal 3 karakter.',
          isError: true,
        );
        return;
      }

      // Ensure service state is available
      if (_serviceState == null) {
        _logger.e('Photo capture blocked: Service state not available');
        throw Exception('Service tidak tersedia, mohon tunggu inisialisasi selesai');
      }

      _logger.i('Proceeding with photo capture for vehicle: "$vehiclePlate"');

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
            SatpamDashboardHelpers.showSnackBar(context, 'Foto Depan tersimpan');
          } else {
            currentPhotos[1] = photoPath;
            SatpamDashboardHelpers.showSnackBar(context, 'Foto Belakang tersimpan');
          }
          
          _registrationFormData.photos = currentPhotos;
        });
      }
    } catch (e) {
      _logger.e('Photo capture failed', error: e);
      if (mounted) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Error saat mengambil foto: ${e.toString()}',
          isError: true,
        );
      }
    }
  }

  /// Handle QR code generation with rate limiting and security monitoring
  void _handleQRGeneration() async {
    _logger.i('=== QR Generation Handler Called ===');
    try {
      // Ensure form data is synchronized before validation
      _ensureFormDataSync();
      
      // Get current user ID for security monitoring
      final currentUserId = await _jwtStorage.getCurrentUserId() ?? 'anonymous';
      
      // Security monitoring - check submission attempts
      if (!FormSecurityMonitor.monitorSubmissionAttempt(currentUserId, 'guest_registration')) {
        SatpamDashboardHelpers.showSnackBar(
          context,
          SecureErrorMessageUtil.getSafeErrorMessage('RATE_LIMITED'),
          isError: true,
        );
        return;
      }
      
      // Rate limiting check
      if (!_canGenerateQR()) {
        final remainingTime = _getRemainingCooldownTime();
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Tunggu ${remainingTime.inSeconds} detik sebelum membuat QR code lagi',
          isError: true,
        );
        return;
      }
      
      // Debug logging for form data validation
      _logger.d('=== QR Generation Form Validation ===');
      _logger.d('POS Number: "${_registrationFormData.posNumber}" (length: ${_registrationFormData.posNumber.length})');
      _logger.d('Driver Name: "${_registrationFormData.driverName}" (length: ${_registrationFormData.driverName.length})');
      _logger.d('Vehicle Plate: "${_registrationFormData.vehiclePlate}" (length: ${_registrationFormData.vehiclePlate.length}, isEmpty: ${_registrationFormData.vehiclePlate.isEmpty})');
      _logger.d('Vehicle Type: "${_registrationFormData.vehicleType}" (length: ${_registrationFormData.vehicleType.length})');
      _logger.d('Destination: "${_registrationFormData.destination}" (length: ${_registrationFormData.destination.length})');
      _logger.d('Load Type: "${_registrationFormData.loadType}" (length: ${_registrationFormData.loadType.length})');
      _logger.d('Load Volume: ${_registrationFormData.loadVolume}');
      _logger.d('Load Owner: "${_registrationFormData.loadOwner}" (length: ${_registrationFormData.loadOwner.length})');
      _logger.d('Form isValid: ${_registrationFormData.isValid}');
      _logger.d('======================================');
      
      // Security validation - check for injection attempts
      final formFields = {
        'driverName': _registrationFormData.driverName,
        'vehiclePlate': _registrationFormData.vehiclePlate,
        'destination': _registrationFormData.destination,
        'loadOwner': _registrationFormData.loadOwner,
        'vehicleCharacteristics': _registrationFormData.vehicleCharacteristics ?? '',
        'notes': _registrationFormData.notes ?? '',
      };
      
      for (final entry in formFields.entries) {
        if (FormSecurityMonitor.detectInjectionAttempt(entry.value, entry.key)) {
          FormSecurityMonitor.monitorValidationFailure(currentUserId, entry.key, 'INJECTION_ATTEMPT');
          SatpamDashboardHelpers.showSnackBar(
            context,
            SecureErrorMessageUtil.getSafeErrorMessage('INVALID_INPUT', context: entry.key),
            isError: true,
          );
          return;
        }
      }
      
      // Validate form data
      if (!_registrationFormData.isValid) {
        List<String> missingFields = [];
        if (_registrationFormData.posNumber.isEmpty) missingFields.add('Nomor POS');
        if (_registrationFormData.driverName.isEmpty) missingFields.add('Nama Supir');
        if (_registrationFormData.vehiclePlate.isEmpty) missingFields.add('Plat Kendaraan');
        if (_registrationFormData.vehicleType.isEmpty) missingFields.add('Jenis Kendaraan');
        if (_registrationFormData.destination.isEmpty) missingFields.add('Tujuan');
        if (_registrationFormData.loadType.isEmpty) missingFields.add('Jenis Muatan');
        
        // Special validation for "Kosong" load type - volume is not required
        final isEmptyLoad = _registrationFormData.loadType == 'Kosong';
        if (!isEmptyLoad && _registrationFormData.loadVolume.isEmpty) {
          missingFields.add('Volume Muatan');
        }
        
        if (_registrationFormData.loadOwner.isEmpty) missingFields.add('Pemilik Muatan');
        
        // Monitor validation failure
        FormSecurityMonitor.monitorValidationFailure(currentUserId, 'form_validation', 'INCOMPLETE_FORM');
        
        SatpamDashboardHelpers.showSnackBar(
          context,
          'Data belum lengkap: ${missingFields.join(', ')}',
          isError: true,
        );
        return;
      }

      // Cetak ulang: jika sudah ada QR data tersimpan, langsung tampilkan tanpa buat token baru
      if (_currentGuestLogId != null && _lastGeneratedQRData != null) {
        _logger.i('Reprint mode: reusing existing QR data (no new token created)');

        if (mounted) {
          // Record for rate limiting
          _recordQRGeneration();

          // Show QR code dialog with existing data
          SatpamDashboardDialogs.showQRCodeDialog(
            context: context,
            qrData: _lastGeneratedQRData!,
            formData: _registrationFormData,
            generationIntent: _generationIntent,
            companyName: _companyName,
          );

          // Show reprint success message
          _showRegistrationSuccessDialog({
            'guestName': _registrationFormData.guestName,
            'vehiclePlate': _registrationFormData.vehiclePlate,
            'generationIntent': _generationIntent,
            'guestId': _currentGuestLogId,
          }, isRegeneration: true);
        }
        return;
      }

      // Ensure service state is available
      if (_serviceState == null) {
        throw Exception('Service tidak tersedia, mohon tunggu inisialisasi selesai');
      }

      // Registrasi baru: buat guest log dan token QR
      final result = await SatpamDashboardServices.handleQRGeneration(
        context: context,
        formData: _registrationFormData,
        serviceState: _serviceState!,
        generationIntent: _generationIntent,
      );

      if (result != null && mounted) {
        // Record successful QR generation for rate limiting
        _recordQRGeneration();

        // Capture guest ID dan QR data untuk cetak ulang
        final guestId = result['guestId']?.toString();
        final qrData = result['qrData']?.toString();

        if (guestId != null && guestId.isNotEmpty) {
          setState(() {
            _currentGuestLogId = guestId;
            _registeredAt = DateTime.now();
            _lastGeneratedQRData = qrData;
            // Update form data model juga
            _registrationFormData.registeredGuestLogId = guestId;
            _registrationFormData.registeredAt = _registeredAt;
          });
        }

        // Show QR code dialog with print/share options
        SatpamDashboardDialogs.showQRCodeDialog(
          context: context,
          qrData: result['qrData'],
          formData: _registrationFormData,
          generationIntent: _generationIntent,
          companyName: _companyName,
        );

        // Show success message with option to create another or view history
        _showRegistrationSuccessDialog(result);

        // Form tetap ditampilkan untuk cetak ulang
        // User klik "Daftar Tamu Baru" untuk reset form
        _logger.i('New registration completed. Form kept for potential reprinting.');

        // Trigger history data refresh by reloading dashboard data if needed
        _scheduleHistoryRefresh();
      }
    } catch (e, stackTrace) {
      _logger.e('QR generation failed', error: e, stackTrace: stackTrace);
      
      if (mounted) {
        // Sanitize error message for security
        final sanitizedError = SecureErrorMessageUtil.sanitizeErrorMessage(e.toString());
        final userFriendlyMessage = _getUserFriendlyErrorMessage(e);
        
        SatpamDashboardHelpers.showSnackBar(
          context,
          userFriendlyMessage,
          isError: true,
        );
      }
    } finally {
      _logger.i('QR generation handler completed');
    }
  }
  
  /// Convert technical errors to user-friendly messages
  String _getUserFriendlyErrorMessage(dynamic error) {
    final errorStr = error.toString().toLowerCase();
    
    if (errorStr.contains('network') || errorStr.contains('connection')) {
      return SecureErrorMessageUtil.getSafeErrorMessage('NETWORK_ERROR');
    } else if (errorStr.contains('timeout')) {
      return SecureErrorMessageUtil.getSafeErrorMessage('TIMEOUT');
    } else if (errorStr.contains('unauthorized') || errorStr.contains('permission')) {
      return SecureErrorMessageUtil.getSafeErrorMessage('UNAUTHORIZED');
    } else if (errorStr.contains('server') || errorStr.contains('500')) {
      return SecureErrorMessageUtil.getSafeErrorMessage('SERVER_ERROR');
    } else {
      return SecureErrorMessageUtil.getSafeErrorMessage('INVALID_INPUT');
    }
  }

  /// Rate limiting helper methods for QR generation
  
  bool _canGenerateQR() {
    final now = DateTime.now();
    
    // Reset counter if more than a minute has passed
    if (_lastQRGenerationTime == null || 
        now.difference(_lastQRGenerationTime!).inMinutes >= 1) {
      _qrGenerationCount = 0;
    }
    
    // Check if under rate limit
    if (_qrGenerationCount >= _maxQRGenerationsPerMinute) {
      return false;
    }
    
    // Check cooldown period
    if (_lastQRGenerationTime != null && 
        now.difference(_lastQRGenerationTime!) < _qrGenerationCooldown) {
      return false;
    }
    
    return true;
  }
  
  void _recordQRGeneration() {
    final now = DateTime.now();
    _lastQRGenerationTime = now;
    _qrGenerationCount++;
    
    _logger.i('QR generation recorded. Count: $_qrGenerationCount/$_maxQRGenerationsPerMinute');
  }
  
  Duration _getRemainingCooldownTime() {
    if (_lastQRGenerationTime == null) return Duration.zero;
    
    final elapsed = DateTime.now().difference(_lastQRGenerationTime!);
    final remaining = _qrGenerationCooldown - elapsed;
    
    return remaining.isNegative ? Duration.zero : remaining;
  }

  /// Handle generation intent change
  void _handleIntentChange(String newIntent) {
    setState(() {
      _generationIntent = newIntent;
    });
    _logger.d('Generation intent changed to: $newIntent');
  }

  /// Clear registration form after successful registration
  Future<void> _clearRegistrationForm() async {
    final settings = await POSSettingsService.getSettings();
    setState(() {
      // Reset form data to initial state
      _registrationFormData.clear();

      // Reload gate ID from settings
      _registrationFormData.setPosNumber(settings.posNumber);

      // Reset generation intent to default
      _generationIntent = 'ENTRY';

      // Clear any error states
      _registrationError = null;

      // Reset reprint state
      _currentGuestLogId = null;
      _registeredAt = null;
      _lastGeneratedQRData = null;
    });

    _logger.i('Registration form cleared successfully');
  }

  /// Navigate back to dashboard and refresh history data
  void _navigateBackAndRefresh() {
    // Pop back to dashboard and pass refresh signal
    Navigator.pop(context, true); // true indicates data was updated
  }

  /// Show success dialog after registration with options
  void _showRegistrationSuccessDialog(Map<String, dynamic> result, {bool isRegeneration = false}) {
    final title = isRegeneration ? 'Cetak Ulang Berhasil!' : 'Registrasi Berhasil!';
    final subtitle = isRegeneration
        ? 'QR Code siap dicetak ulang:'
        : 'Tamu berhasil didaftarkan:';
    final description = isRegeneration
        ? 'QR Code yang sama ditampilkan kembali. Tidak ada data duplikat yang dibuat.'
        : 'QR Code telah dibuat dan siap untuk dibagikan atau dicetak. '
          'Data tamu akan muncul di riwayat gate check.';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              isRegeneration ? Icons.print : Icons.check_circle,
              color: isRegeneration ? Colors.blue : Colors.green,
              size: 32,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  color: isRegeneration ? Colors.blue : Colors.green,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isRegeneration ? Colors.blue[50] : Colors.green[50],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: isRegeneration ? Colors.blue[200]! : Colors.green[200]!),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: isRegeneration ? Colors.blue[800] : Colors.green[800],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text('• Nama: ${result['guestName'] ?? 'N/A'}'),
                  Text('• Plat: ${result['vehiclePlate'] ?? 'N/A'}'),
                  Text('• Intent: ${result['generationIntent'] ?? 'N/A'}'),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Text(
              description,
              style: const TextStyle(fontSize: 14),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            onPressed: () {
              Navigator.pop(context); // Close success dialog
              // Keep staying on registration page for next entry
            },
            icon: const Icon(Icons.add, size: 18),
            label: const Text('Daftar Lagi'),
            style: TextButton.styleFrom(
              foregroundColor: Colors.blue,
            ),
          ),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.pop(context); // Close success dialog
              _navigateBackAndRefresh(); // Go back to dashboard
            },
            icon: const Icon(Icons.history, size: 18),
            label: const Text('Lihat Riwayat'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  /// Schedule a history refresh for the dashboard (if applicable)
  /// This ensures that when users return to dashboard, they see the updated data
  void _scheduleHistoryRefresh() {
    // This sets a flag that can be checked by parent dashboard for data refresh
    // The actual refresh will happen when user navigates back to the dashboard
    _logger.i('History refresh scheduled after successful guest registration');
    
    // In a real implementation, this could:
    // 1. Use a state management solution to notify the dashboard
    // 2. Use a callback passed from the parent dashboard
    // 3. Use event bus to broadcast the update
    // 4. Store a flag in shared preferences that the dashboard can check
    
    // For now, we rely on the navigation result (true) to signal data update
  }
}
