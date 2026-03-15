import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../../core/di/service_locator.dart';
import '../../../../core/services/mandor_master_sync_service.dart';
import '../../../../core/services/perawatan_service.dart';
import '../../../../core/theme/runtime_theme_slot_resolver.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../../harvest/data/repositories/harvest_repository.dart';
import '../../../harvest/domain/entities/harvest_entity.dart';

class MandorPerawatanCreateArgs {
  final PerawatanRecordSummary? initialRecord;

  const MandorPerawatanCreateArgs({this.initialRecord});
}

class MandorPerawatanCreateResult {
  final bool saved;
  final String? openMaterialForRecordId;

  const MandorPerawatanCreateResult({
    required this.saved,
    this.openMaterialForRecordId,
  });
}

class MandorPerawatanCreatePage extends StatefulWidget {
  final MandorPerawatanCreateArgs? args;
  final PerawatanService? perawatanService;
  final HarvestRepository? harvestRepository;

  const MandorPerawatanCreatePage({
    super.key,
    this.args,
    this.perawatanService,
    this.harvestRepository,
  });

  @override
  State<MandorPerawatanCreatePage> createState() =>
      _MandorPerawatanCreatePageState();
}

class _MandorPerawatanCreatePageState extends State<MandorPerawatanCreatePage> {
  final _formKey = GlobalKey<FormState>();
  final _luasAreaController = TextEditingController();
  final _pupukController = TextEditingController();
  final _herbisidaController = TextEditingController();
  final _catatanController = TextEditingController();

  late final PerawatanService _perawatanService;
  late final HarvestRepository _harvestRepository;

  bool _isLoadingBlocks = true;
  bool _isSubmitting = false;
  bool _isSyncingMasterData = false;
  bool _hasAttemptedAutoMasterSync = false;
  String? _blocksError;
  String? _submitError;
  List<Block> _blocks = const <Block>[];

  String? _selectedBlockId;
  String _selectedJenisPerawatan = _jenisPerawatanOptions.first.value;
  DateTime _selectedDate = DateTime.now();

  PerawatanRecordSummary? get _initialRecord => widget.args?.initialRecord;
  bool get _isEditMode => _initialRecord != null;

  @override
  void initState() {
    super.initState();
    _perawatanService =
        widget.perawatanService ?? ServiceLocator.get<PerawatanService>();
    _harvestRepository =
        widget.harvestRepository ?? ServiceLocator.get<HarvestRepository>();
    _seedInitialValues();
    _loadBlocks(allowAutoSync: true);
  }

  @override
  void dispose() {
    _luasAreaController.dispose();
    _pupukController.dispose();
    _herbisidaController.dispose();
    _catatanController.dispose();
    super.dispose();
  }

  void _seedInitialValues() {
    final record = _initialRecord;
    if (record == null) {
      return;
    }

    _selectedBlockId = record.blockId;
    if (_jenisPerawatanOptions.any(
      (option) => option.value == record.jenisPerawatan,
    )) {
      _selectedJenisPerawatan = record.jenisPerawatan;
    }
    _selectedDate = record.tanggalPerawatan ?? DateTime.now();
    _luasAreaController.text = _formatArea(record.luasArea);
    _pupukController.text = record.pupukDigunakan ?? '';
    _herbisidaController.text = record.herbisidaDigunakan ?? '';
    _catatanController.text = record.catatan ?? '';
  }

  Future<void> _loadBlocks({bool allowAutoSync = false}) async {
    setState(() {
      _isLoadingBlocks = true;
      _blocksError = null;
    });

    try {
      var blocks = await _harvestRepository.getBlocks();
      if (blocks.isEmpty &&
          allowAutoSync &&
          !_hasAttemptedAutoMasterSync &&
          !_isEditMode) {
        _hasAttemptedAutoMasterSync = true;
        final syncSuccess = await _syncMasterData(forceFull: true);
        if (syncSuccess) {
          blocks = await _harvestRepository.getBlocks();
        }
      }

      if (!mounted) {
        return;
      }

      setState(() {
        _blocks = blocks;
        if (_selectedBlockId == null && blocks.isNotEmpty) {
          _selectedBlockId = blocks.first.id;
        } else if (_selectedBlockId != null &&
            !blocks.any((block) => block.id == _selectedBlockId)) {
          _selectedBlockId = blocks.isNotEmpty ? blocks.first.id : null;
        }
        _isLoadingBlocks = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _blocks = const <Block>[];
        _selectedBlockId = null;
        _isLoadingBlocks = false;
        _blocksError = error.toString();
      });
    }
  }

  Future<bool> _syncMasterData({bool forceFull = false}) async {
    if (mounted) {
      setState(() {
        _isSyncingMasterData = true;
      });
    }

    try {
      final syncService = ServiceLocator.get<MandorMasterSyncService>();
      final result = await syncService.syncMasterData(forceFull: forceFull);
      return result.success || result.blocksSuccess || result.blocksSynced > 0;
    } catch (error) {
      if (mounted) {
        setState(() {
          _blocksError = 'Sinkronisasi master data gagal: $error';
        });
      }
      return false;
    } finally {
      if (mounted) {
        setState(() {
          _isSyncingMasterData = false;
        });
      }
    }
  }

  Future<void> _syncMasterDataAndReloadBlocks() async {
    _hasAttemptedAutoMasterSync = true;
    await _syncMasterData(forceFull: true);
    if (!mounted) {
      return;
    }
    await _loadBlocks();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(now.year - 3),
      lastDate: DateTime(now.year + 3),
      locale: const Locale('id', 'ID'),
    );

    if (picked == null) {
      return;
    }

    setState(() {
      _selectedDate = picked;
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    final blockId = _selectedBlockId?.trim() ?? '';
    if (blockId.isEmpty) {
      setState(() {
        _submitError = 'Silakan pilih blok terlebih dahulu.';
      });
      return;
    }

    final authState = context.read<AuthBloc>().state;
    if (authState is! AuthAuthenticated) {
      setState(() {
        _submitError = 'Sesi login tidak valid. Silakan login ulang.';
      });
      return;
    }

    final luasArea = _parseArea(_luasAreaController.text);
    if (luasArea == null || luasArea <= 0) {
      setState(() {
        _submitError = 'Luas area harus angka lebih dari 0.';
      });
      return;
    }

    setState(() {
      _submitError = null;
      _isSubmitting = true;
    });

    try {
      if (_isEditMode) {
        final recordId = _initialRecord!.id;
        await _perawatanService.updatePerawatanRecord(
          recordId,
          PerawatanRecordUpdateDraft(
            jenisPerawatan: _selectedJenisPerawatan,
            tanggalPerawatan: _selectedDate,
            luasArea: luasArea,
            pupukDigunakan: _pupukController.text,
            herbisidaDigunakan: _herbisidaController.text,
            catatan: _catatanController.text,
          ),
        );

        if (!mounted) {
          return;
        }
        await _showSuccessDialog(
          title: 'Transaksi berhasil diperbarui',
          message: 'Perubahan record perawatan sudah tersimpan.',
        );
        if (!mounted) {
          return;
        }
        await Future<void>.delayed(const Duration(milliseconds: 16));
        if (!mounted) {
          return;
        }
        Navigator.of(
          context,
        ).pop(const MandorPerawatanCreateResult(saved: true));
        return;
      }

      final created = await _perawatanService.createPerawatanRecord(
        PerawatanRecordDraft(
          blockId: blockId,
          jenisPerawatan: _selectedJenisPerawatan,
          tanggalPerawatan: _selectedDate,
          pekerjaId: authState.user.id,
          luasArea: luasArea,
          pupukDigunakan: _pupukController.text,
          herbisidaDigunakan: _herbisidaController.text,
          catatan: _catatanController.text,
        ),
      );

      if (!mounted) {
        return;
      }
      final openMaterial = await _showCreateSuccessChoiceDialog();
      if (!mounted) {
        return;
      }
      await Future<void>.delayed(const Duration(milliseconds: 16));
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(
        MandorPerawatanCreateResult(
          saved: true,
          openMaterialForRecordId: openMaterial ? created.id : null,
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _submitError = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _showSuccessDialog({
    required String title,
    required String message,
  }) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        final modalBg = RuntimeThemeSlotResolver.modalBackground(
          dialogContext,
          fallback:
              Theme.of(dialogContext).dialogTheme.backgroundColor ??
              Theme.of(dialogContext).colorScheme.surface,
        );
        final modalAccent = RuntimeThemeSlotResolver.modalAccent(
          dialogContext,
          fallback: const Color(0xFF047857),
        );
        return AlertDialog(
          backgroundColor: modalBg,
          icon: const Icon(
            Icons.check_circle_outline_rounded,
            color: Color(0xFF047857),
            size: 44,
          ),
          title: Text(title),
          content: Text(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: Text('OK', style: TextStyle(color: modalAccent)),
            ),
          ],
        );
      },
    );
  }

  Future<bool> _showCreateSuccessChoiceDialog() async {
    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) {
        final modalBg = RuntimeThemeSlotResolver.modalBackground(
          dialogContext,
          fallback:
              Theme.of(dialogContext).dialogTheme.backgroundColor ??
              Theme.of(dialogContext).colorScheme.surface,
        );
        final modalAccent = RuntimeThemeSlotResolver.modalAccent(
          dialogContext,
          fallback: const Color(0xFF047857),
        );
        return AlertDialog(
          backgroundColor: modalBg,
          icon: const Icon(
            Icons.check_circle_outline_rounded,
            color: Color(0xFF047857),
            size: 44,
          ),
          title: const Text('Transaksi berhasil dibuat'),
          content: const Text(
            'Record perawatan baru sudah tersimpan. Lanjut tambah material sekarang?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text('Selesai', style: TextStyle(color: modalAccent)),
            ),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: modalAccent),
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: const Text('Tambah Material'),
            ),
          ],
        );
      },
    );

    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    final hasCompanyAssignment =
        authState is AuthAuthenticated &&
        authState.user.getEffectiveCompanies().isNotEmpty;
    final hasDivisionAssignment =
        authState is AuthAuthenticated &&
        authState.user.getEffectiveDivisions().isNotEmpty;
    final title = _isEditMode
        ? 'Edit Transaksi Perawatan'
        : 'Transaksi Perawatan Baru';
    final navbarBg = RuntimeThemeSlotResolver.navbarBackground(
      context,
      fallback:
          Theme.of(context).appBarTheme.backgroundColor ??
          Theme.of(context).colorScheme.primary,
    );
    final navbarFg = RuntimeThemeSlotResolver.navbarForeground(
      context,
      fallback:
          Theme.of(context).appBarTheme.foregroundColor ??
          Theme.of(context).colorScheme.onPrimary,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(title, style: TextStyle(color: navbarFg)),
        flexibleSpace: RuntimeThemeSlotResolver.hasNavbarBackground
            ? Container(color: navbarBg)
            : null,
        backgroundColor: RuntimeThemeSlotResolver.hasNavbarBackground
            ? Colors.transparent
            : navbarBg,
        foregroundColor: navbarFg,
      ),
      body: SafeArea(
        child: _isLoadingBlocks
            ? const Center(child: CircularProgressIndicator())
            : Form(
                key: _formKey,
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    _SectionCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _SectionTitle(
                            title: 'Informasi Utama',
                            subtitle: 'Lengkapi data transaksi perawatan.',
                          ),
                          const SizedBox(height: 14),
                          DropdownButtonFormField<String>(
                            initialValue: _selectedBlockId,
                            isExpanded: true,
                            decoration: const InputDecoration(
                              labelText: 'Blok',
                              border: OutlineInputBorder(),
                            ),
                            items: _blocks
                                .map(
                                  (block) => DropdownMenuItem<String>(
                                    value: block.id,
                                    child: Text(
                                      '${block.code} - ${block.name}',
                                    ),
                                  ),
                                )
                                .toList(growable: false),
                            onChanged: (_blocks.isEmpty || _isEditMode)
                                ? null
                                : (value) {
                                    setState(() {
                                      _selectedBlockId = value;
                                    });
                                  },
                            validator: (value) {
                              if (_blocks.isNotEmpty &&
                                  (value == null || value.trim().isEmpty)) {
                                return 'Blok wajib dipilih.';
                              }
                              return null;
                            },
                          ),
                          if (_isEditMode) ...[
                            const SizedBox(height: 8),
                            const Text(
                              'Blok tidak dapat diubah saat edit transaksi.',
                            ),
                          ],
                          if (_blocksError != null) ...[
                            const SizedBox(height: 10),
                            SelectableText.rich(
                              TextSpan(
                                text: 'Gagal memuat blok:\n',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: const Color(0xFFB91C1C)),
                                children: [TextSpan(text: _blocksError!)],
                              ),
                            ),
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: OutlinedButton.icon(
                                onPressed: _loadBlocks,
                                icon: const Icon(Icons.refresh_rounded),
                                label: const Text('Muat ulang blok'),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: OutlinedButton.icon(
                                onPressed: _isSyncingMasterData
                                    ? null
                                    : _syncMasterDataAndReloadBlocks,
                                icon: const Icon(Icons.sync_rounded),
                                label: Text(
                                  _isSyncingMasterData
                                      ? 'Sinkronisasi...'
                                      : 'Sinkronkan master data',
                                ),
                              ),
                            ),
                          ],
                          if (_blocksError == null && _blocks.isEmpty) ...[
                            const SizedBox(height: 10),
                            Text(
                              _buildEmptyBlocksHint(
                                hasCompanyAssignment: hasCompanyAssignment,
                                hasDivisionAssignment: hasDivisionAssignment,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: OutlinedButton.icon(
                                onPressed: _isSyncingMasterData
                                    ? null
                                    : _syncMasterDataAndReloadBlocks,
                                icon: const Icon(Icons.sync_rounded),
                                label: Text(
                                  _isSyncingMasterData
                                      ? 'Sinkronisasi...'
                                      : 'Sinkronkan master data',
                                ),
                              ),
                            ),
                          ],
                          if (_isSyncingMasterData) ...[
                            const SizedBox(height: 8),
                            const Row(
                              children: [
                                SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                ),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    'Sinkronisasi master data sedang berjalan...',
                                  ),
                                ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 14),
                          DropdownButtonFormField<String>(
                            initialValue: _selectedJenisPerawatan,
                            decoration: const InputDecoration(
                              labelText: 'Jenis Perawatan',
                              border: OutlineInputBorder(),
                            ),
                            items: _jenisPerawatanOptions
                                .map(
                                  (option) => DropdownMenuItem<String>(
                                    value: option.value,
                                    child: Text(option.label),
                                  ),
                                )
                                .toList(growable: false),
                            onChanged: (value) {
                              if (value == null) {
                                return;
                              }
                              setState(() {
                                _selectedJenisPerawatan = value;
                              });
                            },
                          ),
                          const SizedBox(height: 14),
                          InkWell(
                            onTap: _pickDate,
                            borderRadius: BorderRadius.circular(12),
                            child: InputDecorator(
                              decoration: const InputDecoration(
                                labelText: 'Tanggal Perawatan',
                                border: OutlineInputBorder(),
                              ),
                              child: Row(
                                children: [
                                  const Icon(Icons.date_range_rounded),
                                  const SizedBox(width: 10),
                                  Text(
                                    DateFormat(
                                      'dd MMM yyyy',
                                      'id_ID',
                                    ).format(_selectedDate),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _luasAreaController,
                            keyboardType: const TextInputType.numberWithOptions(
                              decimal: true,
                            ),
                            decoration: const InputDecoration(
                              labelText: 'Luas Area (ha)',
                              border: OutlineInputBorder(),
                              hintText: 'Contoh: 1.5',
                            ),
                            validator: (value) {
                              final parsed = _parseArea(value ?? '');
                              if (parsed == null || parsed <= 0) {
                                return 'Luas area harus lebih dari 0.';
                              }
                              return null;
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),
                    _SectionCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _SectionTitle(
                            title: 'Informasi Tambahan',
                            subtitle: 'Field ini opsional.',
                          ),
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _pupukController,
                            decoration: const InputDecoration(
                              labelText: 'Pupuk Digunakan',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _herbisidaController,
                            decoration: const InputDecoration(
                              labelText: 'Herbisida Digunakan',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _catatanController,
                            maxLines: 3,
                            decoration: const InputDecoration(
                              labelText: 'Catatan',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (_submitError != null) ...[
                      const SizedBox(height: 14),
                      _SectionCard(
                        child: SelectableText.rich(
                          TextSpan(
                            text: 'Gagal menyimpan transaksi:\n',
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(
                                  color: const Color(0xFFB91C1C),
                                  fontWeight: FontWeight.w700,
                                ),
                            children: [
                              TextSpan(
                                text: _submitError!,
                                style: Theme.of(context).textTheme.bodyMedium
                                    ?.copyWith(fontWeight: FontWeight.w400),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    FilledButton.icon(
                      onPressed:
                          _isSubmitting || _isLoadingBlocks || _blocks.isEmpty
                          ? null
                          : _submit,
                      icon: _isSubmitting
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.save_outlined),
                      label: Text(
                        _isSubmitting
                            ? 'Menyimpan...'
                            : (_isEditMode
                                  ? 'Simpan Perubahan'
                                  : 'Simpan Transaksi'),
                      ),
                    ),
                  ],
                ),
              ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final Widget child;

  const _SectionCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: child,
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final String subtitle;

  const _SectionTitle({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: const Color(0xFF6B7280)),
        ),
      ],
    );
  }
}

class _JenisPerawatanOption {
  final String value;
  final String label;

  const _JenisPerawatanOption({required this.value, required this.label});
}

const List<_JenisPerawatanOption>
_jenisPerawatanOptions = <_JenisPerawatanOption>[
  _JenisPerawatanOption(value: 'PEMUPUKAN', label: 'Pemupukan'),
  _JenisPerawatanOption(
    value: 'PENYEMPROTAN_HERBISIDA',
    label: 'Penyemprotan Herbisida',
  ),
  _JenisPerawatanOption(value: 'PEMANGKASAN', label: 'Pemangkasan'),
  _JenisPerawatanOption(value: 'PEMBERSIHAN_PARIT', label: 'Pembersihan Parit'),
  _JenisPerawatanOption(value: 'PEMBERSIHAN_GULMA', label: 'Pembersihan Gulma'),
  _JenisPerawatanOption(value: 'PERAWATAN_JALAN', label: 'Perawatan Jalan'),
  _JenisPerawatanOption(value: 'LAINNYA', label: 'Lainnya'),
];

double? _parseArea(String value) {
  final sanitized = value.trim().replaceAll(',', '.');
  return double.tryParse(sanitized);
}

String _formatArea(double value) {
  if (value % 1 == 0) {
    return value.toStringAsFixed(0);
  }
  return value.toStringAsFixed(2);
}

String _buildEmptyBlocksHint({
  required bool hasCompanyAssignment,
  required bool hasDivisionAssignment,
}) {
  if (!hasCompanyAssignment) {
    return 'Data blok kosong karena akun belum memiliki assignment company. '
        'Minta admin menambahkan user ke company yang benar.';
  }

  if (!hasDivisionAssignment) {
    return 'Data blok kosong karena akun belum memiliki assignment divisi. '
        'Minta admin menambahkan assignment divisi mandor perawatan.';
  }

  return 'Data blok kosong. Jalankan sinkronisasi master data, lalu muat ulang. '
      'Jika masih kosong, periksa assignment divisi akun Anda.';
}
