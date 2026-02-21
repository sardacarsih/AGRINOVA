import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:permission_handler/permission_handler.dart';

import '../mandor_theme.dart';
import '../../../../../harvest/domain/entities/harvest_entity.dart';
import '../../../../../harvest/presentation/blocs/harvest_bloc.dart';

/// Gen Z Input Panen Tab
///
/// A modern, simplified harvest input form with:
/// - Employee selector
/// - Block selector
/// - Quantity input (janjang)
/// - Photo capture
/// - GPS location
/// - Submit with offline support
class GenZInputPanenTab extends StatefulWidget {
  final String mandorId;
  final String mandorName;
  final String divisionId;
  final VoidCallback? onSubmitSuccess;

  const GenZInputPanenTab({
    Key? key,
    required this.mandorId,
    required this.mandorName,
    required this.divisionId,
    this.onSubmitSuccess,
  }) : super(key: key);

  @override
  State<GenZInputPanenTab> createState() => _GenZInputPanenTabState();
}

class _GenZInputPanenTabState extends State<GenZInputPanenTab> {
  final _formKey = GlobalKey<FormState>();
  final ImagePicker _imagePicker = ImagePicker();
  final _quantityController = TextEditingController();
  final _jjgMatangController = TextEditingController();
  final _jjgMentahController = TextEditingController();
  final _jjgLewatMatangController = TextEditingController();
  final _jjgBusukAbnormalController = TextEditingController();
  final _jjgTangkaiPanjangController = TextEditingController();
  final _notesController = TextEditingController();
  final _employeeSearchController = TextEditingController();
  final _blockSearchController = TextEditingController();

  Employee? _selectedEmployee;
  Block? _selectedBlock;
  Position? _currentLocation;
  String? _capturedImagePath;
  bool _isGettingLocation = false;
  bool _isCapturingPhoto = false;
  bool _isSubmitting = false;

  List<Employee> _employees = [];
  List<Block> _blocks = [];

  @override
  void initState() {
    super.initState();
    _loadData();
    _getCurrentLocation();
    _quantityController.addListener(_recalculateMatangFromOthers);
    _jjgMentahController.addListener(_recalculateMatangFromOthers);
    _jjgLewatMatangController.addListener(_recalculateMatangFromOthers);
    _jjgBusukAbnormalController.addListener(_recalculateMatangFromOthers);
    _jjgTangkaiPanjangController.addListener(_recalculateMatangFromOthers);
  }

  @override
  void dispose() {
    _quantityController.removeListener(_recalculateMatangFromOthers);
    _jjgMentahController.removeListener(_recalculateMatangFromOthers);
    _jjgLewatMatangController.removeListener(_recalculateMatangFromOthers);
    _jjgBusukAbnormalController.removeListener(_recalculateMatangFromOthers);
    _jjgTangkaiPanjangController.removeListener(_recalculateMatangFromOthers);
    _quantityController.dispose();
    _jjgMatangController.dispose();
    _jjgMentahController.dispose();
    _jjgLewatMatangController.dispose();
    _jjgBusukAbnormalController.dispose();
    _jjgTangkaiPanjangController.dispose();
    _notesController.dispose();
    _employeeSearchController.dispose();
    _blockSearchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    // Data master already scoped by server assignments during sync.
    // Avoid strict local division filtering to prevent empty dropdowns
    // when assignment payload uses a different division identifier format.
    context.read<HarvestBloc>().add(const HarvestEmployeesLoadRequested());
    context.read<HarvestBloc>().add(const HarvestBlocksLoadRequested());
  }

  Future<void> _getCurrentLocation() async {
    setState(() => _isGettingLocation = true);
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
      setState(() => _currentLocation = position);
    } catch (e) {
      debugPrint('Location error: $e');
    } finally {
      setState(() => _isGettingLocation = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<HarvestBloc, HarvestState>(
      listener: (context, state) {
        if (state is HarvestEmployeesLoaded) {
          setState(() => _employees = state.employees);
        }
        if (state is HarvestBlocksLoaded) {
          setState(() => _blocks = state.blocks);
        }
        if (state is HarvestOperationSuccess) {
          _showSuccessDialog(state.message);
          _resetForm();
          widget.onSubmitSuccess?.call();
        }
        if (state is HarvestError) {
          _showErrorSnackBar(state.message);
        }
      },
      child: Container(
        decoration: BoxDecoration(gradient: MandorTheme.darkGradient),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                _buildHeader(),
                const SizedBox(height: 24),

                // Employee Selector
                _buildEmployeeSelector(),
                const SizedBox(height: 16),

                // Block Selector
                _buildBlockSelector(),
                const SizedBox(height: 16),

                // Quantity Input
                _buildQuantityInput(),
                const SizedBox(height: 16),

                // Quality Breakdown Input
                _buildQualityBreakdownInput(),
                const SizedBox(height: 16),

                // Location Display
                _buildLocationDisplay(),
                const SizedBox(height: 16),

                // Photo Section
                _buildPhotoSection(),
                const SizedBox(height: 16),

                // Notes (Optional)
                _buildNotesInput(),
                const SizedBox(height: 24),

                // Submit Button
                _buildSubmitButton(),

                const SizedBox(height: 100), // Space for bottom nav
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: MandorTheme.glassCardBox,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              gradient: MandorTheme.primaryGradient,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.agriculture_rounded,
                color: Colors.white, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Input Panen Baru', style: MandorTheme.headingSmall),
                const SizedBox(height: 4),
                Text(
                  'Isi data panen untuk hari ini',
                  style: MandorTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmployeeSelector() {
    return _buildSelectorCard(
      icon: Icons.person_rounded,
      label: 'Karyawan',
      value: _selectedEmployee?.name ?? 'Pilih Karyawan',
      isEmpty: _selectedEmployee == null,
      onTap: () => _showEmployeeBottomSheet(),
    );
  }

  Widget _buildBlockSelector() {
    return _buildSelectorCard(
      icon: Icons.location_on_rounded,
      label: 'Blok Panen',
      value: _selectedBlock?.name ?? 'Pilih Blok',
      isEmpty: _selectedBlock == null,
      onTap: () => _showBlockBottomSheet(),
    );
  }

  Widget _buildSelectorCard({
    required IconData icon,
    required String label,
    required String value,
    required bool isEmpty,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: MandorTheme.glassCardBox,
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: isEmpty
                    ? MandorTheme.gray600.withOpacity(0.3)
                    : MandorTheme.forestGreen.withOpacity(0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                icon,
                color: isEmpty ? MandorTheme.gray400 : MandorTheme.forestGreen,
                size: 20,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: MandorTheme.labelSmall),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    style: isEmpty
                        ? MandorTheme.bodyMedium
                            .copyWith(color: MandorTheme.gray500)
                        : MandorTheme.bodyMedium
                            .copyWith(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              color: MandorTheme.gray500,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuantityInput() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: MandorTheme.glassCardBox,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: MandorTheme.amberOrange.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.inventory_2_rounded,
                    color: MandorTheme.amberOrange, size: 20),
              ),
              const SizedBox(width: 12),
              Text('Jumlah Janjang', style: MandorTheme.labelMedium),
            ],
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _quantityController,
            keyboardType: TextInputType.number,
            style: MandorTheme.headingLarge.copyWith(color: Colors.white),
            textAlign: TextAlign.center,
            decoration: InputDecoration(
              hintText: '0',
              hintStyle: MandorTheme.headingLarge.copyWith(
                color: MandorTheme.gray600,
              ),
              filled: true,
              fillColor: MandorTheme.gray800,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide:
                    BorderSide(color: MandorTheme.forestGreen, width: 2),
              ),
              suffixText: 'janjang',
              suffixStyle: MandorTheme.bodySmall,
            ),
            validator: (value) {
              if (value == null || value.isEmpty) {
                return 'Masukkan jumlah janjang';
              }
              final qty = int.tryParse(value);
              if (qty == null || qty <= 0) {
                return 'Jumlah tidak valid';
              }
              return null;
            },
            onChanged: (_) {
              _recalculateMatangFromOthers();
              setState(() {});
            },
          ),
        ],
      ),
    );
  }

  Widget _buildQualityBreakdownInput() {
    final totalQuality = _qualityTotal();
    final quantity = int.tryParse(_quantityController.text.trim()) ?? 0;
    final isMatch = quantity > 0 && totalQuality == quantity;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: MandorTheme.glassCardBox,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: MandorTheme.electricBlue.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.analytics_rounded,
                    color: MandorTheme.electricBlue, size: 20),
              ),
              const SizedBox(width: 12),
              Text('Kualitas Janjang', style: MandorTheme.labelMedium),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildQualityField(
                  label: 'Matang',
                  controller: _jjgMatangController,
                  readOnly: true,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildQualityField(
                  label: 'Mentah',
                  controller: _jjgMentahController,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildQualityField(
                  label: 'Lewat Matang',
                  controller: _jjgLewatMatangController,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildQualityField(
                  label: 'Busuk/Abnormal',
                  controller: _jjgBusukAbnormalController,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildQualityField(
                  label: 'Tangkai Panjang',
                  controller: _jjgTangkaiPanjangController,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                  decoration: BoxDecoration(
                    color: MandorTheme.gray800,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: quantity == 0
                          ? MandorTheme.gray600
                          : (isMatch
                              ? MandorTheme.forestGreen
                              : MandorTheme.coralRed),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Total Kualitas', style: MandorTheme.labelSmall),
                      const SizedBox(height: 6),
                      Text(
                        '$totalQuality / $quantity',
                        style: MandorTheme.bodyMedium.copyWith(
                          color: quantity == 0
                              ? MandorTheme.gray400
                              : (isMatch
                                  ? MandorTheme.forestGreen
                                  : MandorTheme.coralRed),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQualityField({
    required String label,
    required TextEditingController controller,
    bool readOnly = false,
  }) {
    return TextFormField(
      controller: controller,
      readOnly: readOnly,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      style: MandorTheme.bodyMedium.copyWith(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: MandorTheme.labelSmall,
        hintText: '0',
        hintStyle: MandorTheme.bodySmall.copyWith(color: MandorTheme.gray500),
        filled: true,
        fillColor: MandorTheme.gray800,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(
            color: readOnly ? MandorTheme.gray600 : MandorTheme.forestGreen,
          ),
        ),
      ),
      onChanged: readOnly ? null : (_) => setState(() {}),
    );
  }

  Widget _buildLocationDisplay() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: MandorTheme.glassCardBox,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: _currentLocation != null
                  ? MandorTheme.electricBlue.withOpacity(0.2)
                  : MandorTheme.gray600.withOpacity(0.3),
              borderRadius: BorderRadius.circular(10),
            ),
            child: _isGettingLocation
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor:
                          AlwaysStoppedAnimation(MandorTheme.electricBlue),
                    ),
                  )
                : Icon(
                    Icons.gps_fixed_rounded,
                    color: _currentLocation != null
                        ? MandorTheme.electricBlue
                        : MandorTheme.gray400,
                    size: 20,
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Lokasi GPS', style: MandorTheme.labelSmall),
                const SizedBox(height: 2),
                Text(
                  _currentLocation != null
                      ? '${_currentLocation!.latitude.toStringAsFixed(4)}, ${_currentLocation!.longitude.toStringAsFixed(4)}'
                      : _isGettingLocation
                          ? 'Mendapatkan lokasi...'
                          : 'Lokasi tidak tersedia',
                  style: MandorTheme.bodySmall.copyWith(
                    color: _currentLocation != null
                        ? MandorTheme.electricBlue
                        : MandorTheme.gray500,
                  ),
                ),
              ],
            ),
          ),
          if (!_isGettingLocation)
            IconButton(
              onPressed: _getCurrentLocation,
              icon: Icon(Icons.refresh_rounded, color: MandorTheme.gray400),
              tooltip: 'Perbarui Lokasi',
            ),
        ],
      ),
    );
  }

  Widget _buildPhotoSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: MandorTheme.glassCardBox,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: MandorTheme.purpleAccent.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.camera_alt_rounded,
                    color: MandorTheme.purpleAccent, size: 20),
              ),
              const SizedBox(width: 12),
              Text('Foto Panen', style: MandorTheme.labelMedium),
              const Spacer(),
              Text('Opsional', style: MandorTheme.labelSmall),
            ],
          ),
          const SizedBox(height: 12),
          if (_capturedImagePath != null)
            Stack(
              children: [
                Container(
                  height: 120,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: MandorTheme.gray700,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: MandorTheme.forestGreen),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(11),
                    child: Image.file(
                      File(_capturedImagePath!),
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Center(
                          child: Icon(
                            Icons.broken_image_rounded,
                            color: MandorTheme.coralRed,
                            size: 40,
                          ),
                        );
                      },
                    ),
                  ),
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: GestureDetector(
                    onTap: () => setState(() => _capturedImagePath = null),
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: MandorTheme.coralRed,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.close,
                          color: Colors.white, size: 16),
                    ),
                  ),
                ),
              ],
            )
          else
            InkWell(
              onTap: _isCapturingPhoto ? null : () => _capturePhoto(),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                height: 80,
                decoration: BoxDecoration(
                  color: MandorTheme.gray800,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: MandorTheme.gray600,
                    style: BorderStyle.solid,
                  ),
                ),
                child: Center(
                  child: _isCapturingPhoto
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation(
                                  MandorTheme.forestGreen,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Membuka Kamera...',
                              style: MandorTheme.bodyMedium,
                            ),
                          ],
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.add_a_photo_rounded,
                              color: MandorTheme.gray400,
                            ),
                            const SizedBox(width: 8),
                            Text('Ambil Foto', style: MandorTheme.bodyMedium),
                          ],
                        ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildNotesInput() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: MandorTheme.glassCardBox,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.notes_rounded, color: MandorTheme.gray400, size: 20),
              const SizedBox(width: 8),
              Text('Catatan', style: MandorTheme.labelMedium),
              const Spacer(),
              Text('Opsional', style: MandorTheme.labelSmall),
            ],
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _notesController,
            maxLines: 3,
            style: MandorTheme.bodyMedium.copyWith(color: Colors.white),
            decoration: InputDecoration(
              hintText: 'Tambahkan catatan jika perlu...',
              hintStyle:
                  MandorTheme.bodySmall.copyWith(color: MandorTheme.gray500),
              filled: true,
              fillColor: MandorTheme.gray800,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: MandorTheme.forestGreen),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton() {
    return BlocBuilder<HarvestBloc, HarvestState>(
      builder: (context, state) {
        final isLoading = state is HarvestOperationLoading || _isSubmitting;

        return SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton(
            onPressed: isLoading ? null : _submitHarvest,
            style: ElevatedButton.styleFrom(
              backgroundColor: MandorTheme.forestGreen,
              foregroundColor: Colors.white,
              disabledBackgroundColor: MandorTheme.gray600,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              elevation: 0,
            ),
            child: isLoading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation(Colors.white),
                    ),
                  )
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.save_rounded),
                      const SizedBox(width: 8),
                      Text(
                        'Simpan Panen',
                        style: MandorTheme.buttonText,
                      ),
                    ],
                  ),
          ),
        );
      },
    );
  }

  String _buildEmployeeSubtitle(Employee employee) {
    final divisionName = employee.divisionName.trim();
    return divisionName.isEmpty
        ? employee.code
        : '${employee.code} - $divisionName';
  }

  String _buildBlockSubtitle(Block block) {
    final divisionName =
        block.divisionName.trim().isEmpty ? '-' : block.divisionName.trim();
    final plantingYear = block.plantYear > 0 ? block.plantYear.toString() : '-';
    return '${block.code} - $divisionName - ${block.area.toStringAsFixed(1)} Ha - Tanam $plantingYear';
  }

  void _showEmployeeBottomSheet() {
    _employeeSearchController.clear();
    var filteredEmployees = List<Employee>.from(_employees);

    showModalBottomSheet(
      context: context,
      backgroundColor: MandorTheme.gray800,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => DraggableScrollableSheet(
          initialChildSize: 0.6,
          minChildSize: 0.4,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) => Column(
            children: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: MandorTheme.gray600,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text('Pilih Karyawan', style: MandorTheme.headingSmall),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: TextField(
                  controller: _employeeSearchController,
                  onChanged: (value) {
                    final query = value.trim().toLowerCase();
                    setModalState(() {
                      if (query.isEmpty) {
                        filteredEmployees = List<Employee>.from(_employees);
                      } else {
                        filteredEmployees = _employees.where((emp) {
                          final divisionName = emp.divisionName.toLowerCase();
                          return emp.name.toLowerCase().contains(query) ||
                              emp.code.toLowerCase().contains(query) ||
                              divisionName.contains(query);
                        }).toList();
                      }
                    });
                  },
                  style: MandorTheme.bodyMedium.copyWith(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Cari karyawan, NIK, atau divisi',
                    hintStyle: MandorTheme.bodySmall
                        .copyWith(color: MandorTheme.gray500),
                    prefixIcon:
                        Icon(Icons.search_rounded, color: MandorTheme.gray500),
                    suffixIcon: _employeeSearchController.text.isEmpty
                        ? null
                        : IconButton(
                            onPressed: () {
                              _employeeSearchController.clear();
                              setModalState(() {
                                filteredEmployees =
                                    List<Employee>.from(_employees);
                              });
                            },
                            icon: Icon(Icons.clear_rounded,
                                color: MandorTheme.gray400),
                          ),
                    filled: true,
                    fillColor: MandorTheme.gray700,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: MandorTheme.forestGreen),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: _employees.isEmpty
                    ? Center(
                        child: Text('Tidak ada karyawan',
                            style: MandorTheme.bodyMedium),
                      )
                    : filteredEmployees.isEmpty
                        ? Center(
                            child: Text(
                              'Karyawan tidak ditemukan',
                              style: MandorTheme.bodyMedium,
                            ),
                          )
                        : ListView.builder(
                            controller: scrollController,
                            itemCount: filteredEmployees.length,
                            itemBuilder: (context, index) {
                              final emp = filteredEmployees[index];
                              final isSelected =
                                  emp.id == _selectedEmployee?.id;
                              return ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: isSelected
                                      ? MandorTheme.forestGreen
                                      : MandorTheme.gray600,
                                  child: Text(
                                    emp.name.isNotEmpty
                                        ? emp.name[0].toUpperCase()
                                        : '?',
                                    style: const TextStyle(color: Colors.white),
                                  ),
                                ),
                                title: Text(emp.name,
                                    style: MandorTheme.bodyMedium.copyWith(
                                      color: Colors.white,
                                      fontWeight: isSelected
                                          ? FontWeight.w600
                                          : FontWeight.normal,
                                    )),
                                subtitle: Text(
                                  _buildEmployeeSubtitle(emp),
                                  style: MandorTheme.labelSmall,
                                ),
                                trailing: isSelected
                                    ? Icon(Icons.check_rounded,
                                        color: MandorTheme.forestGreen)
                                    : null,
                                onTap: () {
                                  setState(() => _selectedEmployee = emp);
                                  Navigator.pop(context);
                                },
                              );
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showBlockBottomSheet() {
    _blockSearchController.clear();
    var filteredBlocks = List<Block>.from(_blocks);

    showModalBottomSheet(
      context: context,
      backgroundColor: MandorTheme.gray800,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => DraggableScrollableSheet(
          initialChildSize: 0.6,
          minChildSize: 0.4,
          maxChildSize: 0.9,
          expand: false,
          builder: (context, scrollController) => Column(
            children: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 12),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: MandorTheme.gray600,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child:
                    Text('Pilih Blok Panen', style: MandorTheme.headingSmall),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: TextField(
                  controller: _blockSearchController,
                  onChanged: (value) {
                    final query = value.trim().toLowerCase();
                    setModalState(() {
                      if (query.isEmpty) {
                        filteredBlocks = List<Block>.from(_blocks);
                      } else {
                        filteredBlocks = _blocks.where((block) {
                          return block.name.toLowerCase().contains(query) ||
                              block.code.toLowerCase().contains(query) ||
                              block.divisionName
                                  .toLowerCase()
                                  .contains(query) ||
                              block.estateName.toLowerCase().contains(query);
                        }).toList();
                      }
                    });
                  },
                  style: MandorTheme.bodyMedium.copyWith(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Cari blok, kode, divisi, atau estate',
                    hintStyle: MandorTheme.bodySmall
                        .copyWith(color: MandorTheme.gray500),
                    prefixIcon:
                        Icon(Icons.search_rounded, color: MandorTheme.gray500),
                    suffixIcon: _blockSearchController.text.isEmpty
                        ? null
                        : IconButton(
                            onPressed: () {
                              _blockSearchController.clear();
                              setModalState(() {
                                filteredBlocks = List<Block>.from(_blocks);
                              });
                            },
                            icon: Icon(Icons.clear_rounded,
                                color: MandorTheme.gray400),
                          ),
                    filled: true,
                    fillColor: MandorTheme.gray700,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: MandorTheme.forestGreen),
                    ),
                  ),
                ),
              ),
              Expanded(
                child: _blocks.isEmpty
                    ? Center(
                        child: Text('Tidak ada blok',
                            style: MandorTheme.bodyMedium),
                      )
                    : filteredBlocks.isEmpty
                        ? Center(
                            child: Text(
                              'Blok tidak ditemukan',
                              style: MandorTheme.bodyMedium,
                            ),
                          )
                        : ListView.builder(
                            controller: scrollController,
                            itemCount: filteredBlocks.length,
                            itemBuilder: (context, index) {
                              final block = filteredBlocks[index];
                              final isSelected = block.id == _selectedBlock?.id;
                              return ListTile(
                                leading: Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? MandorTheme.forestGreen
                                            .withOpacity(0.2)
                                        : MandorTheme.gray600.withOpacity(0.3),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(
                                    Icons.location_on_rounded,
                                    color: isSelected
                                        ? MandorTheme.forestGreen
                                        : MandorTheme.gray400,
                                  ),
                                ),
                                title: Text(block.name,
                                    style: MandorTheme.bodyMedium.copyWith(
                                      color: Colors.white,
                                      fontWeight: isSelected
                                          ? FontWeight.w600
                                          : FontWeight.normal,
                                    )),
                                subtitle: Text(
                                  _buildBlockSubtitle(block),
                                  style: MandorTheme.labelSmall,
                                ),
                                trailing: isSelected
                                    ? Icon(Icons.check_rounded,
                                        color: MandorTheme.forestGreen)
                                    : null,
                                onTap: () {
                                  setState(() => _selectedBlock = block);
                                  Navigator.pop(context);
                                },
                              );
                            },
                          ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _capturePhoto() async {
    if (_isCapturingPhoto) return;

    setState(() => _isCapturingPhoto = true);

    try {
      final cameraPermission = await Permission.camera.request();
      if (!mounted) return;

      if (cameraPermission.isPermanentlyDenied) {
        await _showCameraPermissionSettingsDialog();
        return;
      }

      if (!cameraPermission.isGranted) {
        _showErrorSnackBar('Izin kamera diperlukan untuk mengambil foto');
        return;
      }

      final image = await _imagePicker.pickImage(
        source: ImageSource.camera,
        imageQuality: 80,
        maxWidth: 1920,
        maxHeight: 1080,
        preferredCameraDevice: CameraDevice.rear,
      );
      if (!mounted) return;

      if (image == null) {
        return;
      }

      setState(() => _capturedImagePath = image.path);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Foto berhasil diambil'),
          backgroundColor: MandorTheme.forestGreen,
          behavior: SnackBarBehavior.floating,
          shape:
              RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      _showErrorSnackBar('Gagal mengambil foto: $e');
    } finally {
      if (mounted) {
        setState(() => _isCapturingPhoto = false);
      }
    }
  }

  Future<void> _showCameraPermissionSettingsDialog() async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: MandorTheme.gray800,
        title: const Text(
          'Izin Kamera Diperlukan',
          style: TextStyle(color: Colors.white),
        ),
        content: Text(
          'Izin kamera ditolak permanen. Aktifkan izin kamera di pengaturan aplikasi.',
          style: MandorTheme.bodySmall,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text('Batal', style: TextStyle(color: MandorTheme.gray300)),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(dialogContext).pop();
              await openAppSettings();
            },
            child: Text(
              'Buka Pengaturan',
              style: TextStyle(color: MandorTheme.forestGreen),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submitHarvest() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedEmployee == null) {
      _showErrorSnackBar('Pilih karyawan terlebih dahulu');
      return;
    }
    if (_selectedEmployee!.id.trim().isEmpty) {
      _showErrorSnackBar('Data karyawan tidak valid (ID kosong)');
      return;
    }
    if (_selectedEmployee!.code.trim().isEmpty) {
      _showErrorSnackBar('NIK karyawan wajib terisi');
      return;
    }

    if (_selectedBlock == null) {
      _showErrorSnackBar('Pilih blok panen terlebih dahulu');
      return;
    }

    final jumlahJanjang = int.tryParse(_quantityController.text.trim()) ?? 0;
    final jjgMatang = int.tryParse(_jjgMatangController.text.trim()) ?? 0;
    final jjgMentah = int.tryParse(_jjgMentahController.text.trim()) ?? 0;
    final jjgLewatMatang =
        int.tryParse(_jjgLewatMatangController.text.trim()) ?? 0;
    final jjgBusukAbnormal =
        int.tryParse(_jjgBusukAbnormalController.text.trim()) ?? 0;
    final jjgTangkaiPanjang =
        int.tryParse(_jjgTangkaiPanjangController.text.trim()) ?? 0;
    final totalQuality = jjgMatang +
        jjgMentah +
        jjgLewatMatang +
        jjgBusukAbnormal +
        jjgTangkaiPanjang;

    if (jumlahJanjang <= 0) {
      _showErrorSnackBar('Jumlah janjang harus lebih dari 0');
      return;
    }

    if (totalQuality != jumlahJanjang) {
      _showErrorSnackBar(
        'Total kualitas janjang ($totalQuality) harus sama dengan jumlah janjang ($jumlahJanjang)',
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final harvest = Harvest(
      id: '',
      employeeId: _selectedEmployee!.id,
      employeeName: _selectedEmployee!.name,
      employeeNik: _selectedEmployee!.code,
      blockId: _selectedBlock!.id,
      blockName: _selectedBlock!.name,
      blockCode: _selectedBlock!.code,
      divisionId: _selectedBlock!.divisionId,
      divisionName: _selectedBlock!.divisionName,
      divisionCode: _selectedBlock!.divisionCode,
      estateId: _selectedBlock!.estateId,
      estateName: _selectedBlock!.estateName,
      tbsQuantity: jumlahJanjang.toDouble(),
      jumlahJanjang: jumlahJanjang,
      jjgMatang: jjgMatang,
      jjgMentah: jjgMentah,
      jjgLewatMatang: jjgLewatMatang,
      jjgBusukAbnormal: jjgBusukAbnormal,
      jjgTangkaiPanjang: jjgTangkaiPanjang,
      tbsQuality: 0, // Will be set by quality check
      qualityGrade: 'PENDING',
      harvestDate: DateTime.now(),
      createdAt: DateTime.now(),
      status: 'PENDING',
      notes: _notesController.text.isEmpty ? null : _notesController.text,
      latitude: _currentLocation?.latitude,
      longitude: _currentLocation?.longitude,
      imageUrl: _capturedImagePath,
      mandorId: widget.mandorId,
      mandorName: widget.mandorName,
    );

    context.read<HarvestBloc>().add(HarvestCreateRequested(harvest));

    setState(() => _isSubmitting = false);
  }

  void _showSuccessDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: MandorTheme.gray800,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: MandorTheme.forestGreen.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.check_rounded,
                  color: MandorTheme.forestGreen, size: 48),
            ),
            const SizedBox(height: 16),
            Text('Berhasil!', style: MandorTheme.headingSmall),
            const SizedBox(height: 8),
            Text(
              message,
              style: MandorTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('OK', style: TextStyle(color: MandorTheme.forestGreen)),
          ),
        ],
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: MandorTheme.coralRed,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _resetForm() {
    _formKey.currentState?.reset();
    _quantityController.clear();
    _jjgMatangController.clear();
    _jjgMentahController.clear();
    _jjgLewatMatangController.clear();
    _jjgBusukAbnormalController.clear();
    _jjgTangkaiPanjangController.clear();
    _notesController.clear();
    setState(() {
      _selectedEmployee = null;
      _selectedBlock = null;
      _capturedImagePath = null;
    });
  }

  int _qualityTotal() {
    final jjgMatang = int.tryParse(_jjgMatangController.text.trim()) ?? 0;
    final jjgMentah = int.tryParse(_jjgMentahController.text.trim()) ?? 0;
    final jjgLewatMatang =
        int.tryParse(_jjgLewatMatangController.text.trim()) ?? 0;
    final jjgBusukAbnormal =
        int.tryParse(_jjgBusukAbnormalController.text.trim()) ?? 0;
    final jjgTangkaiPanjang =
        int.tryParse(_jjgTangkaiPanjangController.text.trim()) ?? 0;
    return jjgMatang +
        jjgMentah +
        jjgLewatMatang +
        jjgBusukAbnormal +
        jjgTangkaiPanjang;
  }

  int _parseInt(TextEditingController controller) {
    return int.tryParse(controller.text.trim()) ?? 0;
  }

  void _recalculateMatangFromOthers() {
    final quantity = int.tryParse(_quantityController.text.trim()) ?? 0;
    final othersTotal = _parseInt(_jjgMentahController) +
        _parseInt(_jjgLewatMatangController) +
        _parseInt(_jjgBusukAbnormalController) +
        _parseInt(_jjgTangkaiPanjangController);
    final matang = (quantity - othersTotal).clamp(0, 2147483647).toInt();
    final target = matang > 0 ? matang.toString() : '0';
    if (_jjgMatangController.text.trim() != target) {
      _jjgMatangController.text = target;
    }
  }
}
