import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:geolocator/geolocator.dart';

import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../domain/entities/harvest_entity.dart';
import '../blocs/harvest_bloc.dart';
import '../widgets/block_selector.dart';
import '../widgets/employee_selector.dart';
import '../widgets/harvest_date_picker.dart';
import '../widgets/harvest_photo_widget.dart';
import '../widgets/harvest_quantity_input.dart';

class HarvestInputScreen extends StatefulWidget {
  const HarvestInputScreen({super.key});

  @override
  State<HarvestInputScreen> createState() => _HarvestInputScreenState();
}

class _HarvestInputScreenState extends State<HarvestInputScreen> {
  final _formKey = GlobalKey<FormState>();
  final _notesController = TextEditingController();

  // Hidden fields for compatibility/validity
  final _tbsQualityController =
      TextEditingController(text: '90'); // Default good quality
  final String _qualityGrade = 'A';

  Employee? _selectedEmployee;
  Block? _selectedBlock;
  Position? _currentLocation;
  String? _capturedImagePath;
  bool _isLoading = false;
  bool _isCapturingLocation = false;

  // New state for quantity
  int _quantity = 0;
  int _jjgMatang = 0;
  int _jjgMentah = 0;
  int _jjgLewatMatang = 0;
  int _jjgBusukAbnormal = 0;
  int _jjgTangkaiPanjang = 0;
  DateTime _selectedDate = DateTime.now();
  bool _confirmBlockEmployee = false;
  bool _confirmQualityTotal = false;
  bool _confirmReadySubmit = false;

  // Local data lists
  List<Employee> _employees = [];
  List<Block> _blocks = [];

  @override
  void initState() {
    super.initState();
    _getCurrentLocation();
    context.read<HarvestBloc>().add(const HarvestEmployeesLoadRequested());
    context.read<HarvestBloc>().add(const HarvestBlocksLoadRequested());
  }

  @override
  void dispose() {
    _tbsQualityController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFFE0F7FA), // Light Cyan
              Color(0xFFF3E5F5), // Light Purple
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(context),
              Expanded(
                child: BlocConsumer<HarvestBloc, HarvestState>(
                  listener: (context, state) {
                    if (state is HarvestOperationSuccess) {
                      _showSuccessDialog(state.message);
                    } else if (state is HarvestError) {
                      _showErrorDialog(state.message);
                    } else if (state is HarvestEmployeesLoaded) {
                      setState(() {
                        _employees = state.employees;
                      });
                    } else if (state is HarvestBlocksLoaded) {
                      setState(() {
                        _blocks = state.blocks;
                      });
                    }
                  },
                  builder: (context, state) {
                    return SingleChildScrollView(
                      padding: const EdgeInsets.all(24.0),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            HarvestDatePicker(
                              selectedDate: _selectedDate,
                              onDateSelected: (date) {
                                setState(() {
                                  _selectedDate = date;
                                });
                              },
                            ),
                            const SizedBox(height: 20),
                            _buildBlockSection(),
                            const SizedBox(height: 20),
                            _buildEmployeeSection(),
                            const SizedBox(height: 20),
                            HarvestQuantityInput(
                              quantity: _quantity,
                              onChanged: (value) {
                                setState(() {
                                  _quantity = value;
                                  _recalculateMatangFromOthers();
                                  _invalidateChecklistConfirmations();
                                });
                              },
                            ),
                            const SizedBox(height: 20),
                            _buildQualitySection(),
                            const SizedBox(height: 20),
                            _buildPreSubmitChecklist(),
                            const SizedBox(height: 32),
                            _buildSubmitButton(state),

                            // Hidden/Optional Section could go here
                            const SizedBox(height: 20),
                            _buildOptionalSection(),
                          ],
                        ),
                      ),
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

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
      child: Row(
        children: [
          IconButton(
            icon: const Icon(Icons.arrow_back, color: Colors.black87),
            onPressed: () => Navigator.of(context).pop(),
          ),
          const SizedBox(width: 8),
          Text(
            'Input Data Panen',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.black87,
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildBlockSection() {
    return BlockSelector(
      blocks: _blocks,
      selectedBlock: _selectedBlock,
      onBlockSelected: (block) {
        setState(() {
          _selectedBlock = block;
          _invalidateChecklistConfirmations();
        });
      },
    );
  }

  Widget _buildEmployeeSection() {
    return Column(
      children: [
        EmployeeSelector(
          employees: _employees,
          selectedEmployee: _selectedEmployee,
          onEmployeeSelected: (employee) {
            setState(() {
              _selectedEmployee = employee;
              _invalidateChecklistConfirmations();
            });
          },
        ),
        if (_selectedBlock != null && _selectedEmployee != null) ...[
          const SizedBox(height: 12),
          _buildDivisionComparisonCard(),
        ],
      ],
    );
  }

  Widget _buildDivisionComparisonCard() {
    final blockDivisionName = _resolveBlockDivisionName();
    final employeeDivisionName = _resolveEmployeeDivisionName();
    final hasCompleteDivisionData = _hasCompleteDivisionData();
    final isCrossDivision = _isCrossDivisionSelection();

    final Color backgroundColor;
    final Color borderColor;
    final Color iconColor;
    final IconData icon;
    final String title;

    if (!hasCompleteDivisionData) {
      backgroundColor = Colors.blue.shade50;
      borderColor = Colors.blue.shade200;
      iconColor = Colors.blue.shade700;
      icon = Icons.info_outline;
      title = 'Data divisi karyawan belum lengkap';
    } else if (isCrossDivision) {
      backgroundColor = Colors.orange.shade50;
      borderColor = Colors.orange.shade300;
      iconColor = Colors.orange.shade800;
      icon = Icons.warning_amber_rounded;
      title = 'Karyawan berasal dari divisi lain';
    } else {
      backgroundColor = Colors.green.shade50;
      borderColor = Colors.green.shade300;
      iconColor = Colors.green.shade700;
      icon = Icons.check_circle_outline;
      title = 'Karyawan sesuai divisi blok';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: iconColor),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    color: iconColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Divisi Blok: $blockDivisionName',
            style: const TextStyle(fontSize: 12, color: Colors.black87),
          ),
          const SizedBox(height: 4),
          Text(
            'Divisi Karyawan: $employeeDivisionName',
            style: const TextStyle(fontSize: 12, color: Colors.black87),
          ),
        ],
      ),
    );
  }

  String _resolveBlockDivisionName() {
    final block = _selectedBlock;
    if (block == null) return '-';
    final name = block.divisionName.trim();
    if (name.isNotEmpty) return name;
    final code = (block.divisionCode ?? '').trim();
    if (code.isNotEmpty) return code;
    final id = block.divisionId.trim();
    if (id.isNotEmpty) return id;
    return '-';
  }

  String _resolveEmployeeDivisionName() {
    final employee = _selectedEmployee;
    if (employee == null) return '-';
    final name = employee.divisionName.trim();
    if (name.isNotEmpty) return name;
    final id = employee.divisionId.trim();
    if (id.isNotEmpty) return id;
    return '-';
  }

  bool _hasCompleteDivisionData() {
    final blockDivisionId = _selectedBlock?.divisionId.trim() ?? '';
    final employeeDivisionId = _selectedEmployee?.divisionId.trim() ?? '';
    return blockDivisionId.isNotEmpty && employeeDivisionId.isNotEmpty;
  }

  bool _isCrossDivisionSelection() {
    if (!_hasCompleteDivisionData()) return false;
    return _selectedBlock!.divisionId.trim() !=
        _selectedEmployee!.divisionId.trim();
  }

  Widget _buildOptionalSection() {
    return ExpansionTile(
      title: const Text('Opsi Tambahan (Foto & Catatan)'),
      children: [
        Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              HarvestPhotoWidget(
                imagePath: _capturedImagePath,
                onPhotoTaken: (imagePath) {
                  setState(() {
                    _capturedImagePath = imagePath;
                  });
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _notesController,
                decoration: const InputDecoration(
                  labelText: 'Catatan',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildQualitySection() {
    final totalQuality = _jjgMatang +
        _jjgMentah +
        _jjgLewatMatang +
        _jjgBusukAbnormal +
        _jjgTangkaiPanjang;
    final isMatch = _quantity > 0 && totalQuality == _quantity;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withValues(alpha: 0.1),
            spreadRadius: 1,
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Kualitas Janjang',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 12),
          _buildAutoMatangRow(
            value: _jjgMatang,
          ),
          _buildQualityStepper(
            label: 'Mentah',
            value: _jjgMentah,
            onChanged: (v) => setState(() {
              _jjgMentah = v;
              _recalculateMatangFromOthers();
              _invalidateChecklistConfirmations();
            }),
            color: Colors.orange,
          ),
          _buildQualityStepper(
            label: 'Lewat Matang',
            value: _jjgLewatMatang,
            onChanged: (v) => setState(() {
              _jjgLewatMatang = v;
              _recalculateMatangFromOthers();
              _invalidateChecklistConfirmations();
            }),
            color: Colors.blue,
          ),
          _buildQualityStepper(
            label: 'Busuk/Abnormal',
            value: _jjgBusukAbnormal,
            onChanged: (v) => setState(() {
              _jjgBusukAbnormal = v;
              _recalculateMatangFromOthers();
              _invalidateChecklistConfirmations();
            }),
            color: Colors.red,
          ),
          _buildQualityStepper(
            label: 'Tangkai Panjang',
            value: _jjgTangkaiPanjang,
            onChanged: (v) => setState(() {
              _jjgTangkaiPanjang = v;
              _recalculateMatangFromOthers();
              _invalidateChecklistConfirmations();
            }),
            color: Colors.purple,
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: isMatch ? Colors.green.shade50 : Colors.red.shade50,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: isMatch ? Colors.green.shade300 : Colors.red.shade300,
              ),
            ),
            child: Text(
              'Total kualitas: $totalQuality / $_quantity',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontWeight: FontWeight.w700,
                color: isMatch ? Colors.green.shade700 : Colors.red.shade700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPreSubmitChecklist() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.92),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.teal.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Checklist Sebelum Kirim',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: Colors.teal.shade900,
                ),
          ),
          const SizedBox(height: 8),
          _buildChecklistItem(
            value: _confirmBlockEmployee,
            label: 'Blok dan karyawan sudah sesuai',
            onChanged: (value) =>
                setState(() => _confirmBlockEmployee = value ?? false),
          ),
          _buildChecklistItem(
            value: _confirmQualityTotal,
            label: 'Total kualitas janjang sudah saya verifikasi',
            onChanged: (value) =>
                setState(() => _confirmQualityTotal = value ?? false),
          ),
          _buildChecklistItem(
            value: _confirmReadySubmit,
            label: 'Data siap dikirim untuk approval asisten',
            onChanged: (value) =>
                setState(() => _confirmReadySubmit = value ?? false),
          ),
        ],
      ),
    );
  }

  Widget _buildChecklistItem({
    required bool value,
    required String label,
    required ValueChanged<bool?> onChanged,
  }) {
    return CheckboxListTile(
      contentPadding: EdgeInsets.zero,
      dense: true,
      value: value,
      onChanged: onChanged,
      activeColor: Colors.teal.shade600,
      controlAffinity: ListTileControlAffinity.leading,
      title: Text(
        label,
        style: const TextStyle(fontSize: 13),
      ),
    );
  }

  Widget _buildQualityStepper({
    required String label,
    required int value,
    required ValueChanged<int> onChanged,
    required Color color,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          IconButton(
            onPressed: () => onChanged(value > 0 ? value - 1 : 0),
            icon: const Icon(Icons.remove_circle_outline),
            color: Colors.red,
          ),
          Container(
            width: 60,
            alignment: Alignment.center,
            child: Text(
              value.toString(),
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
          IconButton(
            onPressed: () => onChanged(value + 1),
            icon: const Icon(Icons.add_circle_outline),
            color: Colors.green,
          ),
        ],
      ),
    );
  }

  Widget _buildAutoMatangRow({required int value}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Expanded(
            child: Text(
              'Matang (Otomatis)',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.green.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.green.shade300),
            ),
            child: Text(
              value.toString(),
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.green.shade700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSubmitButton(HarvestState state) {
    final isLoading = state is HarvestOperationLoading || _isLoading;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(30),
        gradient: const LinearGradient(
          colors: [Color(0xFF00E676), Color(0xFF1DE9B6)], // Green to Teal
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1DE9B6).withValues(alpha: 0.4),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ElevatedButton(
        onPressed: isLoading ? null : _submitHarvest,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (isLoading)
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            else ...[
              const Text(
                'Simpan Data Panen',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.arrow_forward_ios,
                  size: 16, color: Colors.white),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _getCurrentLocation() async {
    if (_isCapturingLocation) return;

    setState(() {
      _isCapturingLocation = true;
    });

    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          throw Exception('Izin lokasi ditolak');
        }
      }

      if (permission == LocationPermission.deniedForever) {
        throw Exception('Izin lokasi ditolak secara permanen');
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.high),
      );

      setState(() {
        _currentLocation = position;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal mendapatkan lokasi: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isCapturingLocation = false;
        });
      }
    }
  }

  void _submitHarvest() async {
    if (!_validateForm()) return;

    if (_isCrossDivisionSelection()) {
      final proceed = await _showCrossDivisionConfirmDialog();
      if (!proceed) {
        return;
      }
    }

    if (!mounted) {
      return;
    }

    final authBloc = context.read<AuthBloc>();
    final harvestBloc = context.read<HarvestBloc>();

    setState(() {
      _isLoading = true;
    });

    final authState = authBloc.state;
    final user = authState is AuthAuthenticated ? authState.user : null;
    final mandorScope = user != null && user.getEffectiveDivisions().isNotEmpty
        ? user.getEffectiveDivisions().join(',')
        : null;

    final harvest = Harvest(
      id: '',
      employeeId: _selectedEmployee!.id,
      employeeName: _selectedEmployee!.name,
      employeeNik: _selectedEmployee!.code,
      employeeDivisionId: _selectedEmployee!.divisionId,
      employeeDivisionName: _selectedEmployee!.divisionName,
      blockId: _selectedBlock!.id,
      blockName: _selectedBlock!.name,
      blockCode: _selectedBlock!.code,
      divisionId: _selectedBlock!.divisionId,
      divisionName: _selectedBlock!.divisionName,
      divisionCode: _selectedBlock!.divisionCode,
      estateId: _selectedBlock!.estateId,
      estateName: _selectedBlock!.estateName,
      tbsQuantity: _quantity.toDouble(), // Mapping Janjang to tbsQuantity
      jumlahJanjang: _quantity,
      jjgMatang: _jjgMatang,
      jjgMentah: _jjgMentah,
      jjgLewatMatang: _jjgLewatMatang,
      jjgBusukAbnormal: _jjgBusukAbnormal,
      jjgTangkaiPanjang: _jjgTangkaiPanjang,
      tbsQuality: double.tryParse(_tbsQualityController.text) ?? 90.0,
      qualityGrade: _qualityGrade,
      harvestDate: _selectedDate,
      createdAt: DateTime.now(),
      status: 'PENDING',
      notes: _notesController.text.trim().isEmpty
          ? null
          : _notesController.text.trim(),
      latitude: _currentLocation?.latitude,
      longitude: _currentLocation?.longitude,
      imageUrl: _capturedImagePath,
      mandorId: user?.id ?? 'unknown',
      mandorName: user?.fullName ?? user?.username ?? 'Unknown',
      companyId: user?.companyId,
      mandorScope: mandorScope,
    );

    harvestBloc.add(HarvestCreateRequested(harvest));
  }

  Future<bool> _showCrossDivisionConfirmDialog() async {
    final blockDivisionName = _resolveBlockDivisionName();
    final employeeDivisionName = _resolveEmployeeDivisionName();

    final result = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        icon: Icon(Icons.warning_amber_rounded, color: Colors.orange.shade700),
        title: const Text('Karyawan Lintas Divisi'),
        content: Text(
          'Divisi blok: $blockDivisionName\n'
          'Divisi karyawan: $employeeDivisionName\n\n'
          'Lanjutkan simpan data panen?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange.shade700,
              foregroundColor: Colors.white,
            ),
            child: const Text('Lanjutkan'),
          ),
        ],
      ),
    );

    return result ?? false;
  }

  bool _validateForm() {
    if (_selectedEmployee == null) {
      _showErrorDialog('Silakan pilih karyawan');
      return false;
    }
    if (_selectedEmployee!.id.trim().isEmpty) {
      _showErrorDialog('Data karyawan tidak valid (ID kosong)');
      return false;
    }
    if (_selectedEmployee!.code.trim().isEmpty) {
      _showErrorDialog('NIK karyawan wajib terisi');
      return false;
    }

    if (_selectedBlock == null) {
      _showErrorDialog('Silakan pilih blok');
      return false;
    }

    if (_quantity <= 0) {
      _showErrorDialog('Jumlah janjang harus lebih dari 0');
      return false;
    }

    final totalQuality = _jjgMatang +
        _jjgMentah +
        _jjgLewatMatang +
        _jjgBusukAbnormal +
        _jjgTangkaiPanjang;
    if (totalQuality != _quantity) {
      _showErrorDialog(
        'Total kualitas janjang ($totalQuality) harus sama dengan jumlah janjang ($_quantity)',
      );
      return false;
    }

    if (_currentLocation == null) {
      _showErrorDialog('Lokasi belum dideteksi. Pastikan GPS aktif.');
      return false;
    }

    if (!_confirmBlockEmployee ||
        !_confirmQualityTotal ||
        !_confirmReadySubmit) {
      _showErrorDialog('Checklist sebelum kirim wajib dilengkapi.');
      return false;
    }

    return true;
  }

  void _showSuccessDialog(String message) {
    setState(() {
      _isLoading = false;
    });

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.check_circle, color: Colors.green, size: 64),
        title: const Text('Berhasil!'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              Navigator.of(context).pop();
            },
            child: const Text('OK'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _resetForm();
            },
            child: const Text('Input Lagi'),
          ),
        ],
      ),
    );
  }

  void _showErrorDialog(String message) {
    setState(() {
      _isLoading = false;
    });

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(Icons.error, color: Colors.red, size: 64),
        title: const Text('Error'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  void _resetForm() {
    setState(() {
      _selectedEmployee = null;
      _selectedBlock = null;
      _quantity = 0;
      _jjgMatang = 0;
      _jjgMentah = 0;
      _jjgLewatMatang = 0;
      _jjgBusukAbnormal = 0;
      _jjgTangkaiPanjang = 0;
      _capturedImagePath = null;
      _notesController.clear();
      _selectedDate = DateTime.now();
      _confirmBlockEmployee = false;
      _confirmQualityTotal = false;
      _confirmReadySubmit = false;
      _isLoading = false;
    });
    _getCurrentLocation();
  }

  void _invalidateChecklistConfirmations() {
    _confirmBlockEmployee = false;
    _confirmQualityTotal = false;
    _confirmReadySubmit = false;
  }

  void _recalculateMatangFromOthers() {
    final others =
        _jjgMentah + _jjgLewatMatang + _jjgBusukAbnormal + _jjgTangkaiPanjang;
    _jjgMatang = (_quantity - others).clamp(0, 2147483647).toInt();
  }
}

