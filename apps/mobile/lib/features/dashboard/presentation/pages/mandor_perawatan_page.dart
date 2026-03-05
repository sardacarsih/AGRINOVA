import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../../../core/di/service_locator.dart';
import '../../../../core/routes/app_routes.dart';
import '../../../../core/services/mandor_master_sync_service.dart';
import '../../../../core/services/perawatan_service.dart';
import '../../../../core/services/role_service.dart';
import '../../../../shared/widgets/logout_menu_widget.dart';
import '../../../auth/presentation/blocs/auth_bloc.dart';
import 'mandor_perawatan_create_page.dart';

class MandorPerawatanPage extends StatefulWidget {
  const MandorPerawatanPage({super.key});

  @override
  State<MandorPerawatanPage> createState() => _MandorPerawatanPageState();
}

class _MandorPerawatanPageState extends State<MandorPerawatanPage> {
  late final PerawatanService _perawatanService;
  late final MandorMasterSyncService _masterSyncService;
  late Future<PerawatanDashboardSnapshot> _dashboardFuture;

  @override
  void initState() {
    super.initState();
    _perawatanService = ServiceLocator.get<PerawatanService>();
    _masterSyncService = ServiceLocator.get<MandorMasterSyncService>();
    _dashboardFuture = _perawatanService.getDashboardSnapshot();
  }

  Future<void> _reloadDashboard() async {
    setState(() {
      _dashboardFuture = _perawatanService.getDashboardSnapshot();
    });

    await _dashboardFuture;
  }

  Future<void> _openCreateTransaction(BuildContext context) async {
    final result = await Navigator.of(
      context,
    ).pushNamed(AppRoutes.mandorPerawatanCreate);
    if (!mounted) {
      return;
    }
    await Future<void>.delayed(const Duration(milliseconds: 16));
    if (!mounted) {
      return;
    }
    await _handleFormResult(result);
  }

  Future<void> _openEditTransaction(PerawatanRecordSummary record) async {
    final result = await Navigator.of(context).pushNamed(
      AppRoutes.mandorPerawatanCreate,
      arguments: MandorPerawatanCreateArgs(initialRecord: record),
    );
    if (!mounted) {
      return;
    }
    await Future<void>.delayed(const Duration(milliseconds: 16));
    if (!mounted) {
      return;
    }
    await _handleFormResult(result);
  }

  Future<void> _handleFormResult(dynamic result) async {
    if (!mounted) {
      return;
    }

    if (result is MandorPerawatanCreateResult && result.saved) {
      await _reloadDashboard();
      final recordId = result.openMaterialForRecordId?.trim();
      if (recordId != null && recordId.isNotEmpty && mounted) {
        final snapshot = await _dashboardFuture;
        PerawatanRecordSummary? target;
        for (final record in snapshot.records) {
          if (record.id == recordId) {
            target = record;
            break;
          }
        }
        if (target != null && mounted) {
          await Future<void>.delayed(const Duration(milliseconds: 16));
          if (!mounted) {
            return;
          }
          await _showMaterialUsageBottomSheet(context, target);
        }
      }
      return;
    }

    if (result == true) {
      await _reloadDashboard();
    }
  }

  Future<void> _deleteRecord(PerawatanRecordSummary record) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        icon: const Icon(
          Icons.warning_amber_rounded,
          color: Color(0xFFB45309),
        ),
        title: const Text('Hapus record?'),
        content: Text(
          'Record ${record.blockCode} pada ${_formatDate(record.tanggalPerawatan)} akan dihapus permanen.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (shouldDelete != true) {
      return;
    }

    try {
      await _perawatanService.deletePerawatanRecord(record.id);
      if (!mounted) {
        return;
      }
      await _reloadDashboard();
    } catch (error) {
      if (!mounted) {
        return;
      }
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(
            Icons.error_outline_rounded,
            color: Color(0xFFB91C1C),
          ),
          title: const Text('Gagal menghapus record'),
          content: SelectableText(error.toString()),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Tutup'),
            ),
          ],
        ),
      );
    }
  }

  Future<void> _showMaterialUsageBottomSheet(
    BuildContext context,
    PerawatanRecordSummary record,
  ) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) {
        return _MaterialUsageBottomSheet(
          perawatanService: _perawatanService,
          record: record,
        );
      },
    );
  }

  Future<void> _syncMasterData() async {
    if (!mounted) {
      return;
    }

    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (context) => const AlertDialog(
        content: Row(
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 12),
            Expanded(child: Text('Sinkronisasi master data...')),
          ],
        ),
      ),
    );

    try {
      final result = await _masterSyncService.syncMasterData(forceFull: true);
      if (!mounted) {
        return;
      }
      Navigator.of(context, rootNavigator: true).pop();
      await _reloadDashboard();
      if (!mounted) {
        return;
      }

      final message = result.success
          ? 'Sinkronisasi selesai: ${result.blocksSynced} blok tersinkron.'
          : result.message;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: Icon(
            result.success
                ? Icons.check_circle_outline_rounded
                : Icons.warning_amber_rounded,
            color: result.success
                ? const Color(0xFF047857)
                : const Color(0xFFB45309),
          ),
          title: Text(
            result.success ? 'Sinkronisasi berhasil' : 'Sinkronisasi belum lengkap',
          ),
          content: SelectableText(message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Tutup'),
            ),
          ],
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      Navigator.of(context, rootNavigator: true).pop();
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(
            Icons.error_outline_rounded,
            color: Color(0xFFB91C1C),
          ),
          title: const Text('Sinkronisasi gagal'),
          content: SelectableText(error.toString()),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Tutup'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is! AuthAuthenticated) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final user = state.user;

        return Scaffold(
          appBar: AppBar(
            title: const Text('Mandor Perawatan'),
            actions: [
              IconButton(
                onPressed: () => _openCreateTransaction(context),
                icon: const Icon(Icons.add_circle_outline_rounded),
                tooltip: 'Transaksi baru',
              ),
              IconButton(
                onPressed: () {
                  _reloadDashboard();
                },
                icon: const Icon(Icons.refresh_rounded),
                tooltip: 'Muat ulang',
              ),
              IconButton(
                onPressed: _syncMasterData,
                icon: const Icon(Icons.sync_rounded),
                tooltip: 'Sinkronisasi master data',
              ),
              LogoutMenuWidget(
                username: user.username,
                role: RoleService.getRoleDisplayName(user.role),
              ),
            ],
          ),
          body: FutureBuilder<PerawatanDashboardSnapshot>(
            future: _dashboardFuture,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                return _PerawatanErrorState(
                  message: snapshot.error.toString(),
                  onRetry: _reloadDashboard,
                );
              }

              final dashboard = snapshot.data ??
                  const PerawatanDashboardSnapshot(
                    records: <PerawatanRecordSummary>[],
                    materialUsages: <PerawatanMaterialUsageSummary>[],
                  );

              return RefreshIndicator(
                onRefresh: _reloadDashboard,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(20),
                  children: [
                    _HeaderCard(
                      userName: user.fullName,
                      totalRecords: dashboard.totalRecords,
                      activeRecords: dashboard.activeRecords,
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        _MetricCard(
                          title: 'Total Area',
                          value: '${dashboard.totalArea.toStringAsFixed(1)} ha',
                          description: 'Akumulasi luas seluruh record.',
                          accentColor: const Color(0xFF1D4ED8),
                        ),
                        _MetricCard(
                          title: 'Biaya Material',
                          value:
                              'Rp ${dashboard.totalMaterialCost.toStringAsFixed(0)}',
                          description: 'Total biaya seluruh material.',
                          accentColor: const Color(0xFF047857),
                        ),
                        _MetricCard(
                          title: 'Material',
                          value: '${dashboard.materialUsages.length} item',
                          description: 'Semua penggunaan material tercatat.',
                          accentColor: const Color(0xFFB45309),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    _SectionTitle(
                      title: 'Record Perawatan',
                      subtitle:
                          'Tap satu record untuk melihat material khusus record tersebut.',
                    ),
                    const SizedBox(height: 12),
                    if (dashboard.records.isEmpty)
                      const _EmptyCard(
                        message: 'Belum ada record perawatan yang tersinkron.',
                      )
                    else
                      ...dashboard.records.take(6).map(
                            (record) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _PerawatanRecordCard(
                                record: record,
                                onTap: () =>
                                    _showMaterialUsageBottomSheet(context, record),
                                onEdit: () => _openEditTransaction(record),
                                onDelete: () => _deleteRecord(record),
                              ),
                            ),
                          ),
                    const SizedBox(height: 12),
                    _SectionTitle(
                      title: 'Material Terbaru',
                      subtitle: 'Snapshot lintas semua record.',
                    ),
                    const SizedBox(height: 12),
                    if (dashboard.materialUsages.isEmpty)
                      const _EmptyCard(
                        message: 'Belum ada material usage yang tercatat.',
                      )
                    else
                      ...dashboard.materialUsages.take(5).map(
                            (item) => Padding(
                              padding: const EdgeInsets.only(bottom: 10),
                              child: _MaterialUsageTile(item: item),
                            ),
                          ),
                  ],
                ),
              );
            },
          ),
        );
      },
    );
  }
}

class _HeaderCard extends StatelessWidget {
  final String userName;
  final int totalRecords;
  final int activeRecords;

  const _HeaderCard({
    required this.userName,
    required this.totalRecords,
    required this.activeRecords,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F7EE),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFB9CDA4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Dashboard Perawatan',
            style: theme.textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            userName,
            style: theme.textTheme.titleMedium,
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _HeaderBadge(
                label: 'Record',
                value: '$totalRecords',
              ),
              const SizedBox(width: 10),
              _HeaderBadge(
                label: 'Aktif',
                value: '$activeRecords',
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _HeaderBadge extends StatelessWidget {
  final String label;
  final String value;

  const _HeaderBadge({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: const Color(0xFF6B7280),
                ),
          ),
          Text(
            value,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String description;
  final Color accentColor;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.description,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: accentColor.withOpacity(0.18)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 12,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: theme.textTheme.labelLarge?.copyWith(
              color: const Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
              color: accentColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(description),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  final String subtitle;

  const _SectionTitle({required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: const Color(0xFF6B7280),
          ),
        ),
      ],
    );
  }
}

class _PerawatanRecordCard extends StatelessWidget {
  final PerawatanRecordSummary record;
  final VoidCallback onTap;
  final VoidCallback onEdit;
  final VoidCallback onDelete;

  const _PerawatanRecordCard({
    required this.record,
    required this.onTap,
    required this.onEdit,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFE5E7EB)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${record.blockCode} - ${record.blockName}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert_rounded),
                    onSelected: (value) {
                      if (value == 'edit') {
                        onEdit();
                        return;
                      }
                      if (value == 'delete') {
                        onDelete();
                      }
                    },
                    itemBuilder: (context) => const [
                      PopupMenuItem<String>(
                        value: 'edit',
                        child: Text('Edit'),
                      ),
                      PopupMenuItem<String>(
                        value: 'delete',
                        child: Text('Hapus'),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                '${record.jenisPerawatan} - ${_formatDate(record.tanggalPerawatan)}',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _InlineTag(label: record.status),
                  _InlineTag(label: '${record.luasArea.toStringAsFixed(1)} ha'),
                  _InlineTag(label: record.pekerjaName),
                ],
              ),
              if ((record.catatan ?? '').trim().isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(
                  record.catatan!,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF4B5563),
                      ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _MaterialUsageBottomSheet extends StatefulWidget {
  final PerawatanService perawatanService;
  final PerawatanRecordSummary record;

  const _MaterialUsageBottomSheet({
    required this.perawatanService,
    required this.record,
  });

  @override
  State<_MaterialUsageBottomSheet> createState() =>
      _MaterialUsageBottomSheetState();
}

class _MaterialUsageBottomSheetState extends State<_MaterialUsageBottomSheet> {
  bool _isLoading = true;
  bool _isMutating = false;
  String? _error;
  List<PerawatanMaterialUsageSummary> _materials =
      const <PerawatanMaterialUsageSummary>[];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final materials = await widget.perawatanService.getMaterialUsageByRecord(
        widget.record.id,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _materials = materials;
        _isLoading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _addMaterial() async {
    final formKey = GlobalKey<FormState>();
    var category = 'PUPUK';
    var unit = 'KG';
    final nameController = TextEditingController();
    final quantityController = TextEditingController();
    final unitPriceController = TextEditingController();
    String? submitError;
    var isSubmitting = false;

    final shouldRefresh = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: const Text('Tambah Material'),
              content: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DropdownButtonFormField<String>(
                        value: category,
                        decoration: const InputDecoration(
                          labelText: 'Kategori',
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'PUPUK', child: Text('Pupuk')),
                          DropdownMenuItem(
                            value: 'HERBISIDA',
                            child: Text('Herbisida'),
                          ),
                        ],
                        onChanged: (value) {
                          if (value == null) {
                            return;
                          }
                          setDialogState(() {
                            category = value;
                            unit = value == 'PUPUK' ? 'KG' : 'LITER';
                          });
                        },
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: nameController,
                        decoration: const InputDecoration(
                          labelText: 'Nama Material',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if ((value ?? '').trim().isEmpty) {
                            return 'Nama material wajib diisi.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: quantityController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: const InputDecoration(
                          labelText: 'Jumlah',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          final parsed = double.tryParse(
                            (value ?? '').trim().replaceAll(',', '.'),
                          );
                          if (parsed == null || parsed <= 0) {
                            return 'Jumlah harus lebih dari 0.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 10),
                      TextFormField(
                        controller: unitPriceController,
                        keyboardType: const TextInputType.numberWithOptions(
                          decimal: true,
                        ),
                        decoration: InputDecoration(
                          labelText: 'Harga Satuan (${unit == 'KG' ? 'Kg' : 'Liter'})',
                          border: const OutlineInputBorder(),
                        ),
                        validator: (value) {
                          final parsed = double.tryParse(
                            (value ?? '').trim().replaceAll(',', '.'),
                          );
                          if (parsed == null || parsed < 0) {
                            return 'Harga satuan minimal 0.';
                          }
                          return null;
                        },
                      ),
                      if (submitError != null) ...[
                        const SizedBox(height: 10),
                        SelectableText.rich(
                          TextSpan(
                            text: 'Gagal menyimpan:\n',
                            style: Theme.of(context)
                                .textTheme
                                .bodySmall
                                ?.copyWith(
                                  color: const Color(0xFFB91C1C),
                                  fontWeight: FontWeight.w700,
                                ),
                            children: [
                              TextSpan(
                                text: submitError!,
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isSubmitting
                      ? null
                      : () => Navigator.of(dialogContext).pop(false),
                  child: const Text('Batal'),
                ),
                FilledButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          if (!formKey.currentState!.validate()) {
                            return;
                          }

                          final quantity = double.parse(
                            quantityController.text.trim().replaceAll(',', '.'),
                          );
                          final unitPrice = double.parse(
                            unitPriceController.text.trim().replaceAll(',', '.'),
                          );

                          setDialogState(() {
                            submitError = null;
                            isSubmitting = true;
                          });

                          try {
                            await widget.perawatanService.createMaterialUsage(
                              PerawatanMaterialUsageDraft(
                                perawatanRecordId: widget.record.id,
                                materialCategory: category,
                                materialName: nameController.text.trim(),
                                quantity: quantity,
                                unit: unit,
                                unitPrice: unitPrice,
                              ),
                            );
                            if (!mounted) {
                              return;
                            }
                            Navigator.of(dialogContext).pop(true);
                          } catch (error) {
                            setDialogState(() {
                              submitError = error.toString();
                              isSubmitting = false;
                            });
                          }
                        },
                  child: isSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Simpan'),
                ),
              ],
            );
          },
        );
      },
    );

    nameController.dispose();
    quantityController.dispose();
    unitPriceController.dispose();

    if (shouldRefresh == true && mounted) {
      setState(() {
        _isMutating = true;
      });
      await _load();
      if (!mounted) {
        return;
      }
      setState(() {
        _isMutating = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxHeight: 520),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Material ${widget.record.blockCode}',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                widget.record.blockName,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: const Color(0xFF6B7280)),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  FilledButton.icon(
                    onPressed: _isMutating ? null : _addMaterial,
                    icon: const Icon(Icons.add_rounded),
                    label: const Text('Tambah Material'),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: _isMutating ? null : _load,
                    icon: const Icon(Icons.refresh_rounded),
                    tooltip: 'Muat ulang material',
                  ),
                ],
              ),
              const SizedBox(height: 8),
              if (_isLoading)
                const Expanded(
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                Expanded(
                  child: SelectableText.rich(
                    TextSpan(
                      text: 'Gagal memuat detail material:\n',
                      style: Theme.of(context).textTheme.bodyMedium,
                      children: [
                        TextSpan(
                          text: _error!,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Color(0xFFB91C1C),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              else if (_materials.isEmpty)
                const Expanded(
                  child: Center(
                    child: Text('Belum ada material untuk record ini.'),
                  ),
                )
              else
                Expanded(
                  child: ListView.separated(
                    itemCount: _materials.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final item = _materials[index];
                      return _MaterialUsageTile(item: item);
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MaterialUsageTile extends StatelessWidget {
  final PerawatanMaterialUsageSummary item;

  const _MaterialUsageTile({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: item.materialCategory == 'PUPUK'
                  ? const Color(0xFFE7F6E8)
                  : const Color(0xFFFFF3E8),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(
              item.materialCategory == 'PUPUK'
                  ? Icons.eco_outlined
                  : Icons.water_drop_outlined,
              color: item.materialCategory == 'PUPUK'
                  ? const Color(0xFF047857)
                  : const Color(0xFFB45309),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.materialName,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${item.materialCategory} - ${item.quantity.toStringAsFixed(1)} ${item.unit}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF6B7280),
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            'Rp ${item.totalCost.toStringAsFixed(0)}',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
          ),
        ],
      ),
    );
  }
}

class _InlineTag extends StatelessWidget {
  final String label;

  const _InlineTag({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF3F4F6),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium,
      ),
    );
  }
}

class _EmptyCard extends StatelessWidget {
  final String message;

  const _EmptyCard({required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE5E7EB)),
      ),
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodyMedium,
      ),
    );
  }
}

class _PerawatanErrorState extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;

  const _PerawatanErrorState({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(
              Icons.error_outline_rounded,
              size: 44,
              color: Color(0xFFB91C1C),
            ),
            const SizedBox(height: 12),
            Text(
              'Gagal memuat dashboard perawatan',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            SelectableText.rich(
              TextSpan(
                text: message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: const Color(0xFF4B5563),
                    ),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () {
                onRetry();
              },
              child: const Text('Coba Lagi'),
            ),
          ],
        ),
      ),
    );
  }
}

String _formatDate(DateTime? value) {
  if (value == null) {
    return '-';
  }

  return DateFormat('dd MMM yyyy', 'id_ID').format(value.toLocal());
}
