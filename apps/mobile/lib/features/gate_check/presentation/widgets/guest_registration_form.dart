import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:logger/logger.dart';

import '../../data/models/gate_check_models.dart';

/// Guest Registration Form for Gate Check Entry Point
/// 
/// Features:
/// - Comprehensive guest and vehicle data capture
/// - Real-time validation and error handling
/// - Master data integration for registered users/vehicles
/// - Photo capture integration for documentation
/// - QR code generation for guest access
class GuestRegistrationForm extends StatefulWidget {
  final Function(String)? onVehiclePlateChanged;
  final Function(GateCheckFormData)? onFormDataChanged;
  final Function(String type)? onCameraPressed;
  final Function()? onQRGeneratePressed;
  final bool isLoading;
  final bool isLoadingAction;
  final String? errorMessage;
  final GateCheckFormData? initialData;
  final bool showHeader;

  /// Apakah data form sudah pernah di-register (untuk mode cetak ulang QR)
  final bool isRegistered;

  /// Callback ketika user menekan tombol "Daftar Tamu Baru"
  final VoidCallback? onRegisterNewPressed;

  const GuestRegistrationForm({
    super.key,
    this.onVehiclePlateChanged,
    this.onFormDataChanged,
    this.onCameraPressed,
    this.onQRGeneratePressed,
    this.isLoading = false,
    this.isLoadingAction = false,
    this.errorMessage,
    this.initialData,
    this.showHeader = true,
    this.isRegistered = false,
    this.onRegisterNewPressed,
  });

  // Helper for opacity colors to avoid deprecation warnings
  static Color withAlpha(Color color, double opacity) {
    return color.withValues(alpha: opacity);
  }

  @override
  State<GuestRegistrationForm> createState() => _GuestRegistrationFormState();
}

class _GuestRegistrationFormState extends State<GuestRegistrationForm> with AutomaticKeepAliveClientMixin {
  static final Logger _logger = Logger();
  
  final _formKey = GlobalKey<FormState>();
  late GateCheckFormData _formData;

  // Form controllers
  late final TextEditingController _driverNameController;
  late final TextEditingController _vehiclePlateController;
  late final TextEditingController _vehicleCharacteristicsController;
  late final TextEditingController _destinationController;
  late final TextEditingController _loadOwnerController;
  late final TextEditingController _estimatedWeightController;
  late final TextEditingController _doNumberController;
  late final TextEditingController _notesController;

  // Form state
  String? _selectedVehicleType;
  String? _selectedLoadType;
  String? _selectedLoadVolume; // "Seperempat", "Setengah", "Penuh"
  bool _isFormValid = false;
  
  // Focus nodes for keyboard navigation
  late final FocusNode _driverNameFocus;
  late final FocusNode _vehiclePlateFocus;
  late final FocusNode _destinationFocus;
  late final FocusNode _loadOwnerFocus;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    
    _formData = widget.initialData ?? GateCheckFormData();
    
    // Initialize controllers
    _driverNameController = TextEditingController(text: _formData.driverName);
    _vehiclePlateController = TextEditingController(text: _formData.vehiclePlate);
    _vehicleCharacteristicsController = TextEditingController(text: _formData.vehicleCharacteristics);
    _destinationController = TextEditingController(text: _formData.destination);
    _loadOwnerController = TextEditingController(text: _formData.loadOwner);
    _estimatedWeightController = TextEditingController(text: _formData.estimatedWeight?.toString() ?? '');
    _doNumberController = TextEditingController(text: _formData.doNumber ?? '');
    _notesController = TextEditingController(text: _formData.notes ?? '');

    _selectedVehicleType = _formData.vehicleType.isNotEmpty ? _formData.vehicleType : null;
    _selectedLoadType = _formData.loadType.isNotEmpty ? _formData.loadType : null;
    _selectedLoadVolume = _formData.loadVolume.isNotEmpty ? _formData.loadVolume : null;

    // Initialize focus nodes
    _driverNameFocus = FocusNode();
    _vehiclePlateFocus = FocusNode();
    _destinationFocus = FocusNode();
    _loadOwnerFocus = FocusNode();
    
    // Add listeners for real-time validation
    _setupFormListeners();
    
    // Initial validation to set button state correctly
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _validateForm();
    });
  }

  @override
  void dispose() {
    _driverNameController.dispose();
    _vehiclePlateController.dispose();
    _vehicleCharacteristicsController.dispose();
    _destinationController.dispose();
    _loadOwnerController.dispose();
    _estimatedWeightController.dispose();
    _doNumberController.dispose();
    _notesController.dispose();

    // Dispose focus nodes
    _driverNameFocus.dispose();
    _vehiclePlateFocus.dispose();
    _destinationFocus.dispose();
    _loadOwnerFocus.dispose();

    super.dispose();
  }

  void _setupFormListeners() {
    final controllers = [
      _driverNameController,
      _vehiclePlateController,
      _destinationController,
      _loadOwnerController,
    ];

    for (final controller in controllers) {
      controller.addListener(_validateForm);
    }

    _vehiclePlateController.addListener(() {
      widget.onVehiclePlateChanged?.call(_vehiclePlateController.text);
    });
  }

  void _validateForm() {
    final posNumberValid = _formData.posNumber.isNotEmpty;
    final driverNameValid = _isValidDriverName(_driverNameController.text);
    final vehiclePlateValid = _isValidVehiclePlate(_vehiclePlateController.text);
    final vehicleTypeValid = _selectedVehicleType != null;
    final destinationValid = _isValidDestination(_destinationController.text);
    final loadTypeValid = _selectedLoadType != null;

    // Special validation for "Kosong" load type - volume is not required
    final isEmptyLoad = _selectedLoadType == 'Kosong';
    final loadVolumeValid = isEmptyLoad || _selectedLoadVolume != null;

    final loadOwnerValid = _isValidLoadOwner(_loadOwnerController.text);
    
    // NEW: Photo Validation (Mandatory 2 photos: Front and Back)
    // _formData.photos is expected to be [front, back]
    // We check if we have at least 2 photos and they are not empty
    final photosValid = _formData.photos.length >= 2 && 
                        _formData.photos[0].isNotEmpty && 
                        _formData.photos[1].isNotEmpty;
    
    final isValid = posNumberValid && driverNameValid && vehiclePlateValid && vehicleTypeValid && 
                    destinationValid && loadTypeValid && loadVolumeValid && loadOwnerValid && photosValid;

    // Debug logging for validation details
    _logger.d('=== Form Validation Debug ===');
    _logger.d('POS Number: "${_formData.posNumber}" -> $posNumberValid');
    _logger.d('Driver Name: "${_driverNameController.text}" -> $driverNameValid');
    _logger.d('Vehicle Plate: "${_vehiclePlateController.text}" -> $vehiclePlateValid');
    _logger.d('Vehicle Type: "$_selectedVehicleType" -> $vehicleTypeValid');
    _logger.d('Destination: "${_destinationController.text}" -> $destinationValid');
    _logger.d('Load Type: "$_selectedLoadType" -> $loadTypeValid');
    _logger.d('Is Empty Load: $isEmptyLoad');
    _logger.d('Load Volume: "$_selectedLoadVolume" -> $loadVolumeValid ${isEmptyLoad ? '(not required for Kosong)' : ''}');
    _logger.d('Load Owner: "${_loadOwnerController.text}" -> $loadOwnerValid');
    _logger.d('Photos Valid: $photosValid (${_formData.photos.length} photos)');
    _logger.d('Overall Form Valid: $isValid');
    _logger.d('============================');

    if (isValid != _isFormValid) {
      setState(() {
        _isFormValid = isValid;
      });
      _logger.i('Form validation state changed to: $isValid');
    }
    
    // NEW: Update parent form data whenever validation runs
    _updateFormData();
  }

  /// Enhanced validation methods for better security and data integrity
  
  bool _isValidDriverName(String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty || trimmed.length < 2) return false;
    if (trimmed.length > 50) return false;
    // Allow letters, spaces, apostrophes, and hyphens only
    return RegExp(r"^[a-zA-Z\s'\-\.]+$").hasMatch(trimmed);
  }

  bool _isValidVehiclePlate(String plate) {
    final trimmed = plate.trim().toUpperCase();
    if (trimmed.isEmpty || trimmed.length < 5) return false;
    if (trimmed.length > 8) return false;
    // Indonesian vehicle plate format (letters and numbers only, no spaces)
    return RegExp(r'^[A-Z0-9]+$').hasMatch(trimmed);
  }

  bool _isValidDestination(String destination) {
    final trimmed = destination.trim();
    if (trimmed.isEmpty || trimmed.length < 2) return false;
    if (trimmed.length > 100) return false;
    // Allow letters, numbers, spaces, common punctuation
    return RegExp(r"^[a-zA-Z0-9\s'\-\.,/()]+$").hasMatch(trimmed);
  }

  bool _isValidLoadOwner(String owner) {
    final trimmed = owner.trim();
    if (trimmed.isEmpty || trimmed.length < 2) return false;
    if (trimmed.length > 100) return false;
    // Allow letters, numbers, spaces, common business name characters
    return RegExp(r"^[a-zA-Z0-9\s'\-\.,&()]+$").hasMatch(trimmed);
  }

  String _sanitizeInput(String input) {
    return input
        .trim()
        .replaceAll(RegExp(r'''[<>'"&]'''), '') // Remove potential XSS characters
        .replaceAll(RegExp(r'\s+'), ' '); // Normalize whitespace
  }


  void _updateFormData() {
    _formData.driverName = _sanitizeInput(_driverNameController.text);
    _formData.vehiclePlate = _sanitizeInput(_vehiclePlateController.text).toUpperCase();
    _formData.vehicleType = _selectedVehicleType ?? '';
    _formData.vehicleCharacteristics = _sanitizeInput(_vehicleCharacteristicsController.text);
    _formData.destination = _sanitizeInput(_destinationController.text);
    _formData.loadType = _selectedLoadType ?? '';

    // Special handling for "Kosong" load type
    final isEmptyLoad = _selectedLoadType == 'Kosong';
    _formData.loadVolume = isEmptyLoad ? '' : (_selectedLoadVolume ?? '');

    _formData.loadOwner = _sanitizeInput(_loadOwnerController.text);
    _formData.estimatedWeight = double.tryParse(_estimatedWeightController.text);
    _formData.doNumber = _sanitizeInput(_doNumberController.text);
    _formData.notes = _sanitizeInput(_notesController.text);
    
    // NEW: Notify parent with complete form data
    if (widget.onFormDataChanged != null) {
      final updatedFormData = GateCheckFormData(
        posNumber: _formData.posNumber,
        driverName: _formData.driverName,
        vehiclePlate: _formData.vehiclePlate,
        vehicleType: _formData.vehicleType,
        vehicleCharacteristics: _formData.vehicleCharacteristics,
        destination: _formData.destination,
        loadType: _formData.loadType,
        loadVolume: _formData.loadVolume,
        loadOwner: _formData.loadOwner,
        estimatedWeight: _formData.estimatedWeight,
        actualWeight: _formData.actualWeight,
        doNumber: _formData.doNumber,
        notes: _formData.notes,
        photos: _formData.photos,
      );
      widget.onFormDataChanged!(updatedFormData);
      _logger.d('Form data synchronized with parent: vehiclePlate="${updatedFormData.vehiclePlate}"');
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context); // Required for AutomaticKeepAliveClientMixin
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header - conditionally shown
          if (widget.showHeader) ...[
            _buildFormHeader(),
            const SizedBox(height: 20),
          ],

          // Error message
          if (widget.errorMessage != null) ...[
            _buildErrorMessage(),
            const SizedBox(height: 16),
          ],

          // Form fields          
          _buildDriverVehicleSection(),
          const SizedBox(height: 20),
          
          _buildCargoSection(),
          const SizedBox(height: 20),
          
          _buildAdditionalInfoSection(),
          const SizedBox(height: 24),

          // Action buttons
          _buildActionButtons(),
        ],
      ),
    );
  }

  Widget _buildFormHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.indigo[600]!, Colors.indigo[400]!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(Icons.person_add, color: Colors.white, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Pendaftaran Tamu',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(
                  'Daftarkan tamu dan kendaraan baru',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: GuestRegistrationForm.withAlpha(Colors.white, 0.9),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorMessage() {
    // Adaptive styling for both light and dark themes
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark 
            ? GuestRegistrationForm.withAlpha(const Color(0xFFEF4444), 0.15)
            : Colors.red[50],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark 
              ? GuestRegistrationForm.withAlpha(const Color(0xFFEF4444), 0.4)
              : Colors.red[200]!,
        ),
        boxShadow: isDark ? [
          BoxShadow(
            color: GuestRegistrationForm.withAlpha(const Color(0xFFEF4444), 0.2),
            blurRadius: 10,
            spreadRadius: -5,
          ),
        ] : null,
      ),
      child: Row(
        children: [
          Icon(
            Icons.error_rounded,
            color: isDark ? const Color(0xFFEF4444) : Colors.red[700],
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              widget.errorMessage!,
              style: TextStyle(
                color: isDark ? GuestRegistrationForm.withAlpha(Colors.white, 0.9) : Colors.red[700],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }


  Widget _buildDriverVehicleSection() {
    return _buildSection(
      title: 'Informasi Supir & Kendaraan',
      icon: Icons.local_shipping,
      children: [
        // Driver Name
        Semantics(
          label: 'Nama supir, field wajib',
          hint: 'Masukkan nama lengkap supir, minimal 2 karakter, maksimal 50 karakter',
          child: TextFormField(
            controller: _driverNameController,
            decoration: InputDecoration(
              labelText: 'Nama Supir *',
              hintText: 'Masukkan nama lengkap supir',
              helperText: 'Minimal 2 karakter, maksimal 50 karakter',
              prefixIcon: Icon(Icons.person),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            validator: (value) {
              if (value?.isEmpty == true) return 'Nama supir diperlukan';
              if (!_isValidDriverName(value!)) {
                if (value.length < 2) return 'Nama supir terlalu pendek (minimal 2 karakter)';
                if (value.length > 50) return 'Nama supir terlalu panjang (maksimal 50 karakter)';
                return 'Nama supir hanya boleh berisi huruf, spasi, tanda petik, dan tanda hubung';
              }
              return null;
            },
            textCapitalization: TextCapitalization.words,
            textInputAction: TextInputAction.next,
            focusNode: _driverNameFocus,
            onFieldSubmitted: (_) => _vehiclePlateFocus.requestFocus(),
          ),
        ),
        const SizedBox(height: 16),

        // Vehicle Plate
        TextFormField(
          controller: _vehiclePlateController,
          decoration: InputDecoration(
            labelText: 'Plat Kendaraan *',
            hintText: 'KB1234XL',
            prefixIcon: Icon(Icons.directions_car),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          validator: (value) {
            if (value?.isEmpty == true) return 'Plat kendaraan diperlukan';
            if (!_isValidVehiclePlate(value!)) {
              if (value.trim().length < 5) return 'Plat kendaraan minimal 5 karakter';
              if (value.trim().length > 8) return 'Plat kendaraan maksimal 8 karakter';
              return 'Format plat tidak valid (hanya huruf dan angka)';
            }
            return null;
          },
          textCapitalization: TextCapitalization.characters,
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'[A-Z0-9]')),
            LengthLimitingTextInputFormatter(8),
          ],
          onChanged: widget.onVehiclePlateChanged,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildPhotoButton(
                label: 'Foto Depan *',
                type: 'FRONT',
                isTaken: _formData.photos.isNotEmpty && _formData.photos[0].isNotEmpty,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildPhotoButton(
                label: 'Foto Belakang *',
                type: 'BACK',
                isTaken: _formData.photos.length > 1 && _formData.photos[1].isNotEmpty,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Vehicle Type
        Semantics(
          label: 'Jenis kendaraan, field wajib',
          hint: 'Pilih salah satu jenis kendaraan dari daftar',
          child: DropdownButtonFormField<String>(
            initialValue: _selectedVehicleType,
            decoration: InputDecoration(
              labelText: 'Jenis Kendaraan *',
              helperText: 'Pilih salah satu dari daftar',
              prefixIcon: Icon(Icons.category),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            items: GateCheckConstants.vehicleTypes.map((type) {
              return DropdownMenuItem(
                value: type, 
                child: Semantics(
                  label: 'Pilihan: $type',
                  child: Text(type)
                )
              );
            }).toList(),
            onChanged: (value) => setState(() => _selectedVehicleType = value),
            validator: (value) => value == null ? 'Harap pilih jenis kendaraan' : null,
          ),
        ),
        const SizedBox(height: 16),

        // Vehicle Characteristics
        TextFormField(
          controller: _vehicleCharacteristicsController,
          decoration: InputDecoration(
            labelText: 'Karakteristik Kendaraan (Opsional)',
            hintText: 'Warna, model, ciri khas',
            prefixIcon: Icon(Icons.description),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          maxLines: 2,
        ),
      ],
    );
  }

  Widget _buildCargoSection() {
    return _buildSection(
      title: 'Informasi Muatan',
      icon: Icons.inventory,
      children: [
        // Destination
        TextFormField(
          controller: _destinationController,
          decoration: InputDecoration(
            labelText: 'Tujuan *',
            hintText: 'Kemana kendaraan akan pergi?',
            prefixIcon: Icon(Icons.place),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          validator: (value) {
            if (value?.isEmpty == true) return 'Tujuan diperlukan';
            if (!_isValidDestination(value!)) {
              if (value.trim().length < 2) return 'Tujuan terlalu pendek (minimal 2 karakter)';
              if (value.trim().length > 100) return 'Tujuan terlalu panjang (maksimal 100 karakter)';
              return 'Tujuan mengandung karakter tidak valid';
            }
            return null;
          },
          textCapitalization: TextCapitalization.words,
        ),
        const SizedBox(height: 16),

        // Load Type
        DropdownButtonFormField<String>(
          initialValue: _selectedLoadType,
          decoration: InputDecoration(
            labelText: 'Jenis Muatan *',
            prefixIcon: Icon(Icons.category),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          items: GateCheckConstants.loadTypes.map((type) {
            return DropdownMenuItem(value: type, child: Text(type));
          }).toList(),
          onChanged: (value) {
            setState(() {
              _selectedLoadType = value;
              // Clear volume when "Kosong" is selected
              if (value == 'Kosong') {
                _selectedLoadVolume = null;
              }
            });
            _validateForm();
          },
          validator: (value) => value == null ? 'Harap pilih jenis muatan' : null,
        ),
        const SizedBox(height: 16),

        // Load Volume (Dropdown: Seperempat, Setengah, Penuh)
        IgnorePointer(
          ignoring: _selectedLoadType == 'Kosong',
          child: Opacity(
            opacity: _selectedLoadType == 'Kosong' ? 0.5 : 1.0,
            child: DropdownButtonFormField<String>(
              value: _selectedLoadVolume,
              decoration: InputDecoration(
                labelText: _selectedLoadType == 'Kosong' ? 'Volume Muatan (Opsional)' : 'Volume Muatan *',
                helperText: _selectedLoadType == 'Kosong' ? 'Tidak diperlukan untuk muatan kosong' : null,
                prefixIcon: Icon(Icons.scale),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                filled: _selectedLoadType == 'Kosong',
                fillColor: _selectedLoadType == 'Kosong' ? Colors.grey[100] : null,
              ),
              items: GateCheckConstants.volumeOptions.map((volume) {
                return DropdownMenuItem(value: volume, child: Text(volume));
              }).toList(),
              onChanged: _selectedLoadType == 'Kosong' ? null : (value) {
                setState(() => _selectedLoadVolume = value);
                _validateForm();
              },
              validator: (value) {
                if (_selectedLoadType == 'Kosong') return null;
                if (value == null) return 'Harap pilih volume muatan';
                return null;
              },
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Load Owner
        TextFormField(
          controller: _loadOwnerController,
          decoration: InputDecoration(
            labelText: 'Pemilik Muatan *',
            hintText: 'Nama perusahaan atau orang',
            prefixIcon: Icon(Icons.business),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          validator: (value) {
            if (value?.isEmpty == true) return 'Pemilik muatan diperlukan';
            if (!_isValidLoadOwner(value!)) {
              if (value.trim().length < 2) return 'Nama pemilik terlalu pendek (minimal 2 karakter)';
              if (value.trim().length > 100) return 'Nama pemilik terlalu panjang (maksimal 100 karakter)';
              return 'Nama pemilik mengandung karakter tidak valid';
            }
            return null;
          },
          textCapitalization: TextCapitalization.words,
        ),
      ],
    );
  }

  Widget _buildAdditionalInfoSection() {
    return _buildSection(
      title: 'Informasi Tambahan',
      icon: Icons.info,
      children: [
        // Estimated Weight
        TextFormField(
          controller: _estimatedWeightController,
          decoration: InputDecoration(
            labelText: 'Perkiraan Berat (Opsional)',
            hintText: 'Perkiraan berat dalam ton',
            prefixIcon: Icon(Icons.monitor_weight),
            suffixText: 'ton',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          keyboardType: TextInputType.numberWithOptions(decimal: true),
        ),
        const SizedBox(height: 16),

        // DO Number
        TextFormField(
          controller: _doNumberController,
          decoration: InputDecoration(
            labelText: 'Nomor DO (Opsional)',
            hintText: 'Nomor Delivery Order',
            prefixIcon: Icon(Icons.receipt),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          textCapitalization: TextCapitalization.characters,
        ),
        const SizedBox(height: 16),

        // Notes
        TextFormField(
          controller: _notesController,
          decoration: InputDecoration(
            labelText: 'Catatan (Opsional)',
            hintText: 'Keterangan atau pengamatan tambahan',
            prefixIcon: Icon(Icons.note),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
          ),
          maxLines: 3,
          textCapitalization: TextCapitalization.sentences,
        ),
      ],
    );
  }

  Widget _buildSection({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    // Neon purple color for dark theme
    const neonPurple = Color(0xFF8B5CF6);
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isDark 
                    ? GuestRegistrationForm.withAlpha(neonPurple, 0.15)
                    : Colors.indigo[50],
                borderRadius: BorderRadius.circular(12),
                border: isDark 
                    ? Border.all(color: GuestRegistrationForm.withAlpha(neonPurple, 0.3))
                    : null,
              ),
              child: Icon(
                icon, 
                color: isDark ? neonPurple : Colors.indigo[600],
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: isDark ? Colors.white : Colors.indigo[700],
                  letterSpacing: 0.3,
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 2,
              ),
            ),
          ],
        ),
        const SizedBox(height: 18),
        ...children,
      ],
    );
  }

  Widget _buildActionButtons() {
    final isDisabled = !_isFormValid || widget.isLoadingAction;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    // Neon colors
    const neonGreen = Color(0xFF10B981);
    const neonPurple = Color(0xFF8B5CF6);
    const neonBlue = Color(0xFF3B82F6);  // Untuk mode cetak ulang

    // Check if form is already registered (for regenerate mode)
    final isRegistered = widget.isRegistered;
    
    // Debug logging for button state
    _logger.d('=== QR Button State Debug ===');
    _logger.d('_isFormValid: $_isFormValid');
    _logger.d('widget.isLoading: ${widget.isLoading}');
    _logger.d('widget.isLoadingAction: ${widget.isLoadingAction}');
    _logger.d('isDisabled: $isDisabled');
    _logger.d('onQRGeneratePressed != null: ${widget.onQRGeneratePressed != null}');
    _logger.d('Button will be enabled: ${widget.onQRGeneratePressed != null && _isFormValid && !widget.isLoadingAction}');
    _logger.d('============================');
    
    return Column(
      children: [
        // Generate QR Button with neon glow
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            boxShadow: !isDisabled && isDark ? [
              BoxShadow(
                color: GuestRegistrationForm.withAlpha(neonGreen, 0.4),
                blurRadius: 20,
                spreadRadius: -5,
                offset: const Offset(0, 8),
              ),
            ] : null,
          ),
          child: Semantics(
            label: isRegistered ? 'Tombol cetak ulang kode QR' : 'Tombol buat kode QR tamu',
            hint: isDisabled
                ? 'Tombol tidak aktif. Lengkapi semua field yang diperlukan terlebih dahulu'
                : (isRegistered
                    ? 'Tekan untuk mencetak ulang kode QR dengan data yang sama'
                    : 'Tekan untuk membuat kode QR berdasarkan data yang telah diisi'),
            button: true,
            enabled: !isDisabled,
            child: GestureDetector(
              onTap: () {
                _logger.w('=== GestureDetector TAPPED ===');
                _logger.w('isDisabled: $isDisabled');
                _logger.w('_isFormValid: $_isFormValid'); 
                _logger.w('widget.isLoadingAction: ${widget.isLoadingAction}');
                _logger.w('onQRGeneratePressed != null: ${widget.onQRGeneratePressed != null}');
                
                // Check each condition individually for precise debugging
                final callbackNotNull = widget.onQRGeneratePressed != null;
                final formValid = _isFormValid;
                final notLoadingAction = !widget.isLoadingAction;
                
                _logger.w('--- Individual Condition Check ---');
                _logger.w('callbackNotNull: $callbackNotNull');
                _logger.w('formValid: $formValid');
                _logger.w('notLoadingAction: $notLoadingAction');
                
                // Check combined condition
                final allConditionsMet = callbackNotNull && formValid && notLoadingAction;
                _logger.w('allConditionsMet: $allConditionsMet');
                _logger.w('Should proceed: ${callbackNotNull && formValid && notLoadingAction}');
                
                // Force debug validation
                _logger.w('--- Force Re-validation ---');
                _validateForm();
                _logger.w('After re-validation _isFormValid: $_isFormValid');
                
                if (widget.onQRGeneratePressed != null && _isFormValid && !widget.isLoadingAction) {
                  _logger.i('=== QR Generation Button Pressed ===');
                  _logger.i('Updating form data...');
                  _updateFormData();
                  _logger.i('Calling parent callback...');
                  try {
                    widget.onQRGeneratePressed!();
                    _logger.i('Callback executed successfully');
                  } catch (e) {
                    _logger.e('Error executing callback: $e');
                  }
                  _logger.i('===================================');
                } else {
                  _logger.w('Button tap ignored - conditions not met');
                  if (!_isFormValid) _logger.w('- Form not valid');
                  if (widget.isLoadingAction) _logger.w('- Widget is loading action');
                  if (widget.onQRGeneratePressed == null) _logger.w('- Callback is null');
                  
                  // Show detailed feedback about which fields are missing
                  final missingFields = <String>[];
                  if (!_isValidDriverName(_driverNameController.text)) missingFields.add('Nama Supir');
                  if (!_isValidVehiclePlate(_vehiclePlateController.text)) missingFields.add('Plat Kendaraan');
                  if (_selectedVehicleType == null) missingFields.add('Jenis Kendaraan');
                  if (!_isValidDestination(_destinationController.text)) missingFields.add('Tujuan');
                  if (_selectedLoadType == null) missingFields.add('Jenis Muatan');
                  if (_selectedLoadType != 'Kosong' && _selectedLoadVolume == null) {
                    missingFields.add('Volume Muatan');
                  }
                  if (!_isValidLoadOwner(_loadOwnerController.text)) missingFields.add('Pemilik Muatan');
                  
                  final message = missingFields.isEmpty 
                      ? 'Lengkapi semua field yang diperlukan'
                      : 'Field yang perlu dilengkapi:\n• ${missingFields.join('\n• ')}';
                  
                  // Show feedback with themed snackbar
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(message),
                      backgroundColor: isDark ? const Color(0xFFF59E0B) : Colors.orange,
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      duration: Duration(seconds: 4),
                    ),
                  );
                }
              },
              child: AbsorbPointer(
                child: ElevatedButton.icon(
                  onPressed: widget.onQRGeneratePressed != null && _isFormValid && !widget.isLoadingAction
                      ? () {
                          _logger.e('ElevatedButton onPressed - THIS SHOULD NOT HAPPEN WHEN GESTUREDETECTOR IS USED');
                        }
                      : null,
                  icon: widget.isLoadingAction
                      ? SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Icon(
                          isRegistered ? Icons.refresh_rounded : Icons.qr_code_rounded,
                          size: 22,
                        ),
                  label: Text(
                    widget.isLoadingAction
                        ? 'Membuat QR...'
                        : (isRegistered ? 'Cetak Ulang QR' : 'Buat Kode QR Tamu'),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                    style: const TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 16,
                      letterSpacing: 0.5,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isDisabled
                        ? (isDark ? Colors.grey[700] : Colors.grey)
                        : (isRegistered
                            ? (isDark ? neonBlue : Colors.blue[600])
                            : (isDark ? neonGreen : Colors.green[600])),
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: isDark 
                        ? Colors.grey[800] 
                        : Colors.grey[300],
                    disabledForegroundColor: isDark 
                        ? Colors.grey[500] 
                        : Colors.grey[600],
                    padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                    elevation: isDark ? 0 : 2,
                  ),
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Tombol "Daftar Tamu Baru" - hanya muncul saat form sudah ter-register
        if (isRegistered) ...[
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark
                    ? neonGreen.withValues(alpha: 0.5)
                    : Colors.green.shade300,
                width: 1.5,
              ),
            ),
            child: Semantics(
              label: 'Tombol daftar tamu baru',
              hint: 'Tekan untuk mengosongkan form dan mendaftarkan tamu baru',
              button: true,
              enabled: !widget.isLoading,
              child: TextButton.icon(
                onPressed: widget.isLoading ? null : _handleRegisterNew,
                icon: Icon(
                  Icons.person_add_rounded,
                  color: isDark ? neonGreen : Colors.green.shade600,
                  size: 20,
                ),
                label: Text(
                  'Daftar Tamu Baru',
                  style: TextStyle(
                    color: isDark ? neonGreen : Colors.green.shade600,
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
                style: TextButton.styleFrom(
                  foregroundColor: isDark ? neonGreen : Colors.green.shade600,
                  backgroundColor: isDark
                      ? neonGreen.withValues(alpha: 0.1)
                      : Colors.green.withValues(alpha: 0.05),
                  padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],

      ],
    );
  }


  void _handleRegisterNew() {
    // Clear semua field form lokal
    _formKey.currentState?.reset();
    _formData.clear();
    _driverNameController.clear();
    _vehiclePlateController.clear();
    _vehicleCharacteristicsController.clear();
    _destinationController.clear();
    _loadOwnerController.clear();
    _estimatedWeightController.clear();
    _doNumberController.clear();
    _notesController.clear();
    setState(() {
      _selectedVehicleType = null;
      _selectedLoadType = null;
      _selectedLoadVolume = null;
      _isFormValid = false;
    });
    // Notify parent untuk reset reprint state
    widget.onRegisterNewPressed?.call();
  }

  Widget _buildPhotoButton({
    required String label,
    required String type,
    required bool isTaken,
  }) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: () => widget.onCameraPressed?.call(type),
        icon: Icon(isTaken ? Icons.check_circle : Icons.camera_alt, size: 18),
        label: Text(
          isTaken ? '$label (Sudah)' : label,
          style: TextStyle(fontSize: 13),
        ),
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.symmetric(vertical: 12),
          backgroundColor: isTaken ? Colors.green[50] : null,
          foregroundColor: isTaken ? Colors.green[700] : null,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: isTaken ? BorderSide(color: Colors.green) : BorderSide.none,
          ),
          elevation: isTaken ? 0 : 2,
        ),
      ),
    );
  }
}