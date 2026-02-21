import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../mandor_theme.dart';
import '../../../../../harvest/domain/entities/harvest_entity.dart';
import '../../../../../harvest/presentation/blocs/harvest_bloc.dart';

/// Gen Z Riwayat (History) Tab
class GenZRiwayatTab extends StatefulWidget {
  final String mandorId;
  final String? focusHarvestId;
  final bool autoOpenFocusedHarvest;
  final VoidCallback? onRefresh;

  const GenZRiwayatTab({
    super.key,
    required this.mandorId,
    this.focusHarvestId,
    this.autoOpenFocusedHarvest = false,
    this.onRefresh,
  });

  @override
  State<GenZRiwayatTab> createState() => _GenZRiwayatTabState();
}

class _GenZRiwayatTabState extends State<GenZRiwayatTab> {
  String _currentFilter = 'Semua';
  DateTime _selectedDate = DateTime.now();
  final List<String> _filterOptions = [
    'Semua',
    'Pending',
    'Approved',
    'Rejected',
  ];

  List<Harvest> _harvests = [];
  bool _isLoading = true;
  String? _handledFocusHarvestId;
  String? _resolvingFocusHarvestId;
  String? _highlightHarvestId;
  Timer? _highlightClearTimer;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  @override
  void didUpdateWidget(covariant GenZRiwayatTab oldWidget) {
    super.didUpdateWidget(oldWidget);

    if (oldWidget.focusHarvestId != widget.focusHarvestId) {
      _handledFocusHarvestId = null;
      _tryHandleFocusedHarvest();
    }
  }

  @override
  void dispose() {
    _highlightClearTimer?.cancel();
    super.dispose();
  }

  DateTime _normalizeDate(DateTime date) {
    return DateTime(date.year, date.month, date.day);
  }

  bool _isSameDate(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  Future<void> _loadHistory({DateTime? date}) async {
    final targetDate = _normalizeDate(date ?? _selectedDate);
    setState(() {
      _selectedDate = targetDate;
      _isLoading = true;
    });
    context.read<HarvestBloc>().add(HarvestSummaryRequested(date: targetDate));
  }

  List<Harvest> get _filteredHarvests {
    if (_currentFilter == 'Semua') {
      return _harvests;
    }
    return _harvests.where((h) {
      final workflowStatus = _getWorkflowStatus(h);
      return workflowStatus == _currentFilter.toUpperCase();
    }).toList();
  }

  String _getWorkflowStatus(Harvest harvest) {
    return harvest.status.toUpperCase();
  }

  bool _isPendingDraftEditable(Harvest harvest) {
    return harvest.status.toUpperCase() == 'PENDING' && !harvest.isSynced;
  }

  bool _isRejectedCorrectable(Harvest harvest) {
    return harvest.status.toUpperCase() == 'REJECTED';
  }

  bool _canEditHarvest(Harvest harvest) {
    return _isPendingDraftEditable(harvest) || _isRejectedCorrectable(harvest);
  }

  bool _canDeleteHarvest(Harvest harvest) {
    return _isPendingDraftEditable(harvest);
  }

  String _statusToFilterLabel(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
      case 'PKS_RECEIVED':
      case 'PKS_WEIGHED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Semua';
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<HarvestBloc, HarvestState>(
      listener: (context, state) {
        if (state is HarvestSummaryLoaded) {
          setState(() {
            _harvests = state.harvests;
            _selectedDate = _normalizeDate(state.selectedDate);
            _isLoading = false;
          });
          _tryHandleFocusedHarvest();
        }
        if (state is HarvestOperationSuccess) {
          _showSnackBar(state.message);
          _loadHistory();
          widget.onRefresh?.call();
        }
        if (state is HarvestError) {
          setState(() => _isLoading = false);
        }
      },
      child: Container(
        decoration: BoxDecoration(gradient: MandorTheme.darkGradient),
        child: RefreshIndicator(
          onRefresh: () async {
            await _loadHistory();
            widget.onRefresh?.call();
          },
          color: MandorTheme.forestGreen,
          child: _isLoading ? _buildLoadingState() : _buildContent(),
        ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: CircularProgressIndicator(
        valueColor: AlwaysStoppedAnimation(MandorTheme.forestGreen),
      ),
    );
  }

  Widget _buildContent() {
    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildHeader(),
          const SizedBox(height: 16),
          _buildDateFilterRow(),
          const SizedBox(height: 20),
          _buildFilterChips(),
          const SizedBox(height: 16),
          _buildStatsRow(),
          const SizedBox(height: 20),
          _buildHistoryList(),
          const SizedBox(height: 100),
        ],
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
              gradient: LinearGradient(
                colors: [MandorTheme.purpleAccent, MandorTheme.electricBlue],
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.history_rounded,
                color: Colors.white, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Riwayat Panen', style: MandorTheme.headingSmall),
                const SizedBox(height: 4),
                Text(
                  'Data panen ${_getDateRangeText()}',
                  style: MandorTheme.bodySmall,
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: _loadHistory,
            icon: Icon(Icons.refresh_rounded, color: MandorTheme.gray400),
            tooltip: 'Muat Ulang',
          ),
        ],
      ),
    );
  }

  String _getDateRangeText() {
    final dateText = _formatDateOnly(_selectedDate);
    if (_isSameDate(_selectedDate, DateTime.now())) {
      return 'hari ini ($dateText)';
    }
    return dateText;
  }

  String _formatDateOnly(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }

  String get _dateButtonText {
    if (_isSameDate(_selectedDate, DateTime.now())) {
      return 'Hari Ini';
    }
    return _formatDateOnly(_selectedDate);
  }

  Future<void> _selectDate() async {
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.dark(
              primary: MandorTheme.forestGreen,
              onPrimary: Colors.white,
              surface: MandorTheme.gray800,
              onSurface: Colors.white,
            ),
            dialogTheme: const DialogThemeData(
              backgroundColor: MandorTheme.gray800,
            ),
          ),
          child: child!,
        );
      },
    );

    if (!mounted || pickedDate == null) {
      return;
    }

    final normalized = _normalizeDate(pickedDate);
    if (_isSameDate(normalized, _selectedDate)) {
      return;
    }

    await _loadHistory(date: normalized);
  }

  void _resetToToday() {
    final today = _normalizeDate(DateTime.now());
    if (_isSameDate(today, _selectedDate)) {
      return;
    }
    _loadHistory(date: today);
  }

  Widget _buildDateFilterRow() {
    final isToday = _isSameDate(_selectedDate, DateTime.now());

    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: _selectDate,
            icon: Icon(
              Icons.calendar_today_rounded,
              size: 16,
              color: MandorTheme.gray300,
            ),
            label: Text(
              _dateButtonText,
              style: MandorTheme.bodyMedium.copyWith(
                color: MandorTheme.gray300,
                fontWeight: FontWeight.w600,
              ),
            ),
            style: OutlinedButton.styleFrom(
              backgroundColor: MandorTheme.gray800.withValues(alpha: 0.8),
              side: BorderSide(color: MandorTheme.gray700),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          ),
        ),
        if (!isToday) ...[
          const SizedBox(width: 8),
          TextButton(
            onPressed: _resetToToday,
            style: TextButton.styleFrom(
              foregroundColor: MandorTheme.forestGreen,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
            child: const Text('Reset'),
          ),
        ],
      ],
    );
  }

  Widget _buildFilterChips() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: MandorTheme.gray800,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: MandorTheme.gray700),
      ),
      child: Row(
        children: _filterOptions.map((filter) {
          final isSelected = _currentFilter == filter;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _currentFilter = filter),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color:
                      isSelected ? _getFilterColor(filter) : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  filter,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    color: isSelected ? Colors.white : MandorTheme.gray400,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Color _getFilterColor(String filter) {
    switch (filter) {
      case 'Pending':
        return MandorTheme.amberOrange;
      case 'Approved':
        return MandorTheme.forestGreen;
      case 'Rejected':
        return MandorTheme.coralRed;
      default:
        return MandorTheme.electricBlue;
    }
  }

  Widget _buildStatsRow() {
    final pendingCount =
        _harvests.where((h) => _getWorkflowStatus(h) == 'PENDING').length;
    final approvedCount =
        _harvests.where((h) => _getWorkflowStatus(h) == 'APPROVED').length;
    final rejectedCount =
        _harvests.where((h) => _getWorkflowStatus(h) == 'REJECTED').length;

    return Row(
      children: [
        Expanded(
          child: _buildStatChip(
            'Total',
            _harvests.length.toString(),
            MandorTheme.electricBlue,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildStatChip(
            'Pending',
            pendingCount.toString(),
            MandorTheme.amberOrange,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildStatChip(
            'Approved',
            approvedCount.toString(),
            MandorTheme.forestGreen,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildStatChip(
            'Rejected',
            rejectedCount.toString(),
            MandorTheme.coralRed,
          ),
        ),
      ],
    );
  }

  Widget _buildStatChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              color: color.withOpacity(0.8),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryList() {
    if (_filteredHarvests.isEmpty) {
      return _buildEmptyState();
    }

    return Column(
      children: _filteredHarvests
          .map(
            (harvest) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildHistoryItem(harvest),
            ),
          )
          .toList(),
    );
  }

  Widget _buildHistoryItem(Harvest harvest) {
    final workflowStatus = _getWorkflowStatus(harvest);
    final statusColor = _getStatusColor(workflowStatus);
    final statusIcon = _getStatusIcon(workflowStatus);
    final canEdit = _canEditHarvest(harvest);
    final canDelete = _canDeleteHarvest(harvest);
    final isHighlighted = harvest.id == _highlightHarvestId;

    return InkWell(
      onTap: () => _onHarvestTap(harvest),
      borderRadius: BorderRadius.circular(16),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 280),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isHighlighted
              ? MandorTheme.electricBlue.withValues(alpha: 0.18)
              : MandorTheme.gray800.withOpacity(0.6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color:
                isHighlighted ? MandorTheme.electricBlue : MandorTheme.gray700,
            width: isHighlighted ? 1.6 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(statusIcon, color: statusColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          harvest.employeeName,
                          style: MandorTheme.bodyMedium.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusColor.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              workflowStatus,
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: statusColor,
                              ),
                            ),
                          ),
                          if (harvest.isSynced) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: MandorTheme.electricBlue.withOpacity(
                                  0.15,
                                ),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'SYNCED',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: MandorTheme.electricBlue,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${harvest.blockName} - ${harvest.tbsQuantity.toStringAsFixed(0)} janjang',
                    style: MandorTheme.bodySmall,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatDate(harvest.createdAt),
                    style: MandorTheme.labelSmall,
                  ),
                ],
              ),
            ),
            if (canEdit)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: Icon(Icons.edit_rounded,
                        color: MandorTheme.forestGreen),
                    tooltip: 'Edit',
                    onPressed: () => _showEditDialog(harvest),
                  ),
                  if (canDelete)
                    IconButton(
                      icon: Icon(Icons.delete_rounded,
                          color: MandorTheme.coralRed),
                      tooltip: 'Hapus',
                      onPressed: () => _showDeleteConfirmDialog(harvest),
                    ),
                ],
              )
            else
              Icon(
                Icons.chevron_right_rounded,
                color: MandorTheme.gray500,
              ),
          ],
        ),
      ),
    );
  }

  void _onHarvestTap(Harvest harvest) {
    final canEdit = _canEditHarvest(harvest);
    if (canEdit) {
      _showEditDialog(harvest);
    } else {
      _showHarvestDetailDialog(harvest);
    }
  }

  void _tryHandleFocusedHarvest() {
    final focusId = widget.focusHarvestId;
    if (!widget.autoOpenFocusedHarvest ||
        focusId == null ||
        focusId.isEmpty ||
        _handledFocusHarvestId == focusId ||
        _isLoading) {
      return;
    }

    Harvest? focusedHarvest;
    for (final harvest in _harvests) {
      if (harvest.id == focusId) {
        focusedHarvest = harvest;
        break;
      }
    }

    if (focusedHarvest != null) {
      _handledFocusHarvestId = focusId;
      final targetHarvest = focusedHarvest;
      _applyFocusVisualState(targetHarvest);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) {
          return;
        }
        _openFocusedHarvest(targetHarvest);
      });
      return;
    }

    if (_resolvingFocusHarvestId == focusId) {
      return;
    }
    unawaited(_resolveFocusedHarvestById(focusId));
  }

  Future<void> _resolveFocusedHarvestById(String focusId) async {
    _resolvingFocusHarvestId = focusId;
    try {
      final harvestBloc = context.read<HarvestBloc>();
      final fallbackHarvest = await harvestBloc.harvestRepository.getHarvest(
        focusId,
      );

      if (!mounted) {
        return;
      }

      if (fallbackHarvest == null) {
        _handledFocusHarvestId = focusId;
        _showSnackBar('Data panen $focusId tidak ditemukan');
        return;
      }

      _showSnackBar('Menampilkan transaksi panen $focusId');
      _applyFocusVisualState(fallbackHarvest);

      final targetDate = _normalizeDate(fallbackHarvest.harvestDate);
      if (!_isSameDate(targetDate, _selectedDate)) {
        await _loadHistory(date: targetDate);
        return;
      }

      _handledFocusHarvestId = focusId;
      await _openFocusedHarvest(fallbackHarvest);
    } catch (e) {
      if (!mounted) {
        return;
      }
      _handledFocusHarvestId = focusId;
      _showSnackBar('Gagal memuat transaksi panen $focusId');
    } finally {
      if (_resolvingFocusHarvestId == focusId) {
        _resolvingFocusHarvestId = null;
      }
    }
  }

  void _applyFocusVisualState(Harvest harvest) {
    final targetFilter = _statusToFilterLabel(_getWorkflowStatus(harvest));
    final targetDate = _normalizeDate(harvest.harvestDate);

    setState(() {
      _highlightHarvestId = harvest.id;
      _currentFilter = targetFilter;
      _selectedDate = targetDate;
    });

    _highlightClearTimer?.cancel();
    _highlightClearTimer = Timer(const Duration(seconds: 10), () {
      if (!mounted || _highlightHarvestId != harvest.id) {
        return;
      }
      setState(() => _highlightHarvestId = null);
    });
  }

  Future<void> _openFocusedHarvest(Harvest harvest) async {
    final canEdit = _canEditHarvest(harvest);
    if (canEdit) {
      await _showEditDialog(harvest);
    } else {
      await _showHarvestDetailDialog(harvest);
    }
  }

  Future<void> _showHarvestDetailDialog(Harvest harvest) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: MandorTheme.gray800,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Detail Panen',
          style: TextStyle(color: Colors.white),
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailRow('ID Panen', harvest.id),
              _buildDetailRow('Karyawan', harvest.employeeName),
              _buildDetailRow('Blok', harvest.blockName),
              _buildDetailRow('Divisi', harvest.divisionName),
              _buildDetailRow('Status', harvest.status.toUpperCase()),
              _buildDetailRow(
                  'Jumlah Janjang', harvest.tbsQuantity.toStringAsFixed(0)),
              _buildDetailRow(
                  'Tanggal Panen', _formatDate(harvest.harvestDate)),
              if (harvest.notes != null && harvest.notes!.trim().isNotEmpty)
                _buildDetailRow('Catatan', harvest.notes!.trim()),
              if (harvest.rejectionReason != null &&
                  harvest.rejectionReason!.trim().isNotEmpty)
                _buildDetailRow(
                  'Alasan Penolakan',
                  harvest.rejectionReason!.trim(),
                ),
              if (_isRejectedCorrectable(harvest))
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    'Gunakan tombol Perbaiki untuk kirim ulang sebagai data Pending.',
                    style: MandorTheme.labelSmall.copyWith(
                      color: MandorTheme.amberOrange,
                    ),
                  ),
                ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(
              'Tutup',
              style: TextStyle(color: MandorTheme.gray300),
            ),
          ),
          if (_canEditHarvest(harvest))
            ElevatedButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                _showEditDialog(harvest);
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: MandorTheme.forestGreen,
              ),
              child: Text(
                _isRejectedCorrectable(harvest) ? 'Perbaiki' : 'Edit',
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: MandorTheme.labelSmall.copyWith(
              color: MandorTheme.gray400,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: MandorTheme.bodySmall.copyWith(color: Colors.white),
          ),
        ],
      ),
    );
  }

  Future<void> _showDeleteConfirmDialog(Harvest harvest) async {
    if (harvest.status.toUpperCase() != 'PENDING' || harvest.isSynced) {
      _showSnackBar('Data panen ini tidak dapat dihapus');
      return;
    }
    final harvestBloc = context.read<HarvestBloc>();

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: MandorTheme.gray800,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text(
          'Hapus Panen',
          style: TextStyle(color: Colors.white),
        ),
        content: Text(
          'Yakin hapus data panen ${harvest.employeeName} di blok ${harvest.blockName}?',
          style: MandorTheme.bodySmall,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(),
            child: Text(
              'Batal',
              style: TextStyle(color: MandorTheme.gray400),
            ),
          ),
          ElevatedButton(
            onPressed: () {
              harvestBloc.add(HarvestDeleteRequested(harvest.id));
              Navigator.of(dialogContext).pop();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: MandorTheme.coralRed,
            ),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
  }

  Future<void> _showEditDialog(Harvest harvest) async {
    if (!_canEditHarvest(harvest)) {
      _showSnackBar('Data panen ini tidak dapat diedit');
      return;
    }
    final harvestBloc = context.read<HarvestBloc>();

    final initialQuantity = harvest.jumlahJanjang > 0
        ? harvest.jumlahJanjang
        : harvest.tbsQuantity.toInt();
    final quantityController =
        TextEditingController(text: initialQuantity.toString());
    final matangController =
        TextEditingController(text: harvest.jjgMatang.toString());
    final mentahController =
        TextEditingController(text: harvest.jjgMentah.toString());
    final lewatMatangController =
        TextEditingController(text: harvest.jjgLewatMatang.toString());
    final busukController =
        TextEditingController(text: harvest.jjgBusukAbnormal.toString());
    final tangkaiController =
        TextEditingController(text: harvest.jjgTangkaiPanjang.toString());
    final notesController = TextEditingController(text: harvest.notes ?? '');

    void recalculateMatang() {
      final quantity = int.tryParse(quantityController.text.trim()) ?? 0;
      final mentah = int.tryParse(mentahController.text.trim()) ?? 0;
      final lewatMatang = int.tryParse(lewatMatangController.text.trim()) ?? 0;
      final busuk = int.tryParse(busukController.text.trim()) ?? 0;
      final tangkai = int.tryParse(tangkaiController.text.trim()) ?? 0;
      final matang = (quantity - (mentah + lewatMatang + busuk + tangkai))
          .clamp(0, 2147483647)
          .toInt();
      matangController.text = matang.toString();
    }

    recalculateMatang();

    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (dialogBuilderContext, setDialogState) {
            final quantity = int.tryParse(quantityController.text.trim()) ?? 0;
            final matang = int.tryParse(matangController.text.trim()) ?? 0;
            final mentah = int.tryParse(mentahController.text.trim()) ?? 0;
            final lewatMatang =
                int.tryParse(lewatMatangController.text.trim()) ?? 0;
            final busuk = int.tryParse(busukController.text.trim()) ?? 0;
            final tangkai = int.tryParse(tangkaiController.text.trim()) ?? 0;
            final totalQuality =
                matang + mentah + lewatMatang + busuk + tangkai;
            final isMatch = quantity > 0 && totalQuality == quantity;

            return AlertDialog(
              backgroundColor: MandorTheme.gray800,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              title: const Text(
                'Edit Panen',
                style: TextStyle(color: Colors.white),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${harvest.employeeName} - ${harvest.blockName}',
                      style: MandorTheme.bodySmall,
                    ),
                    const SizedBox(height: 12),
                    _buildEditNumberField(
                      controller: quantityController,
                      label: 'Jumlah Janjang',
                      onChanged: (_) => setDialogState(recalculateMatang),
                    ),
                    const SizedBox(height: 10),
                    _buildEditNumberField(
                      controller: matangController,
                      label: 'Jjg Matang (otomatis)',
                      readOnly: true,
                    ),
                    const SizedBox(height: 10),
                    _buildEditNumberField(
                      controller: mentahController,
                      label: 'Jjg Mentah',
                      onChanged: (_) => setDialogState(recalculateMatang),
                    ),
                    const SizedBox(height: 10),
                    _buildEditNumberField(
                      controller: lewatMatangController,
                      label: 'Jjg Lewat Matang',
                      onChanged: (_) => setDialogState(recalculateMatang),
                    ),
                    const SizedBox(height: 10),
                    _buildEditNumberField(
                      controller: busukController,
                      label: 'Jjg Busuk/Abnormal',
                      onChanged: (_) => setDialogState(recalculateMatang),
                    ),
                    const SizedBox(height: 10),
                    _buildEditNumberField(
                      controller: tangkaiController,
                      label: 'Jjg Tangkai Panjang',
                      onChanged: (_) => setDialogState(recalculateMatang),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Total kualitas: $totalQuality / $quantity',
                      style: MandorTheme.bodySmall.copyWith(
                        color: isMatch
                            ? MandorTheme.forestGreen
                            : MandorTheme.coralRed,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: notesController,
                      maxLines: 3,
                      style:
                          MandorTheme.bodySmall.copyWith(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'Catatan',
                        labelStyle: MandorTheme.labelSmall,
                        filled: true,
                        fillColor: MandorTheme.gray900,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dialogContext).pop(),
                  child: Text(
                    'Batal',
                    style: TextStyle(color: MandorTheme.gray400),
                  ),
                ),
                ElevatedButton(
                  onPressed: () {
                    final quantity =
                        int.tryParse(quantityController.text.trim()) ?? 0;
                    final matang =
                        int.tryParse(matangController.text.trim()) ?? 0;
                    final mentah =
                        int.tryParse(mentahController.text.trim()) ?? 0;
                    final lewatMatang =
                        int.tryParse(lewatMatangController.text.trim()) ?? 0;
                    final busuk =
                        int.tryParse(busukController.text.trim()) ?? 0;
                    final tangkai =
                        int.tryParse(tangkaiController.text.trim()) ?? 0;
                    final totalQuality =
                        matang + mentah + lewatMatang + busuk + tangkai;

                    if (quantity <= 0) {
                      _showSnackBar('Jumlah janjang harus lebih dari 0');
                      return;
                    }

                    if (totalQuality != quantity) {
                      _showSnackBar(
                        'Total kualitas ($totalQuality) harus sama dengan jumlah janjang ($quantity)',
                      );
                      return;
                    }

                    final wasRejected = _isRejectedCorrectable(harvest);
                    final updatedHarvest = harvest.copyWith(
                      tbsQuantity: quantity.toDouble(),
                      jumlahJanjang: quantity,
                      jjgMatang: matang,
                      jjgMentah: mentah,
                      jjgLewatMatang: lewatMatang,
                      jjgBusukAbnormal: busuk,
                      jjgTangkaiPanjang: tangkai,
                      notes: notesController.text.trim().isEmpty
                          ? null
                          : notesController.text.trim(),
                      status: wasRejected ? 'PENDING' : harvest.status,
                      rejectionReason:
                          wasRejected ? '' : harvest.rejectionReason,
                      updatedAt: DateTime.now(),
                      isSynced: false,
                    );

                    harvestBloc.add(HarvestUpdateRequested(updatedHarvest));
                    Navigator.of(dialogContext).pop();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: MandorTheme.forestGreen,
                  ),
                  child: const Text('Simpan'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildEditNumberField({
    required TextEditingController controller,
    required String label,
    bool readOnly = false,
    ValueChanged<String>? onChanged,
  }) {
    return TextFormField(
      controller: controller,
      keyboardType: TextInputType.number,
      readOnly: readOnly,
      style: MandorTheme.bodySmall.copyWith(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: MandorTheme.labelSmall,
        filled: true,
        fillColor: readOnly ? MandorTheme.gray700 : MandorTheme.gray900,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
      ),
      onChanged: onChanged,
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return MandorTheme.amberOrange;
      case 'SYNCED':
        return MandorTheme.electricBlue;
      case 'APPROVED':
        return MandorTheme.forestGreen;
      case 'REJECTED':
        return MandorTheme.coralRed;
      default:
        return MandorTheme.gray400;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return Icons.pending_rounded;
      case 'SYNCED':
        return Icons.cloud_done_rounded;
      case 'APPROVED':
        return Icons.check_circle_rounded;
      case 'REJECTED':
        return Icons.cancel_rounded;
      default:
        return Icons.help_rounded;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inMinutes < 1) {
      return 'Baru saja';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes} menit lalu';
    } else if (diff.inHours < 24) {
      return '${diff.inHours} jam lalu';
    } else {
      return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
    }
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: MandorTheme.gray800.withOpacity(0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: MandorTheme.gray700.withOpacity(0.5)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: MandorTheme.gray700.withOpacity(0.3),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.inbox_rounded,
              size: 48,
              color: MandorTheme.gray500,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _currentFilter == 'Semua'
                ? 'Belum ada riwayat panen'
                : 'Tidak ada data $_currentFilter',
            style: MandorTheme.bodyMedium.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Data akan muncul setelah ada input panen',
            style: MandorTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
