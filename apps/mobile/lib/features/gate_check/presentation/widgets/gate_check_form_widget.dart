import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// Estate and Block models for proper data structure
class Estate {
  final String id;
  final String name;
  final String companyId;
  final String companyName;
  
  const Estate({
    required this.id,
    required this.name,
    required this.companyId,
    required this.companyName,
  });
}

class Block {
  final String id;
  final String name;
  final String estateId;
  final String estateName;
  final String divisionId;
  final String divisionName;
  
  const Block({
    required this.id,
    required this.name,
    required this.estateId,
    required this.estateName,
    required this.divisionId,
    required this.divisionName,
  });
}

enum GateCheckDirection {
  entry('ENTRY', 'MASUK'),
  exit('EXIT', 'KELUAR');
  
  const GateCheckDirection(this.value, this.label);
  final String value;
  final String label;
}

class GateCheckFormWidget extends StatefulWidget {
  final TextEditingController licensePlateController;
  final TextEditingController driverNameController;
  final TextEditingController doNumberController;
  final TextEditingController notesController;
  final String? selectedBlockId;
  final String? selectedEstateId;
  final double estimatedWeight;
  final GateCheckDirection direction;
  final List<Estate> estates;
  final List<Block> blocks;
  final Function(String?) onBlockChanged;
  final Function(String?) onEstateChanged;
  final Function(double) onWeightChanged;
  final Function(GateCheckDirection) onDirectionChanged;

  const GateCheckFormWidget({
    Key? key,
    required this.licensePlateController,
    required this.driverNameController,
    required this.doNumberController,
    required this.notesController,
    required this.selectedBlockId,
    required this.selectedEstateId,
    required this.estimatedWeight,
    required this.direction,
    required this.estates,
    required this.blocks,
    required this.onBlockChanged,
    required this.onEstateChanged,
    required this.onWeightChanged,
    required this.onDirectionChanged,
  }) : super(key: key);

  @override
  State<GateCheckFormWidget> createState() => _GateCheckFormWidgetState();
}

class _GateCheckFormWidgetState extends State<GateCheckFormWidget> {
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionTitle('Informasi Gate Check'),
          const SizedBox(height: 12),
          _buildDirectionSelector(),
          const SizedBox(height: 24),
          _buildSectionTitle('Informasi Truck'),
          const SizedBox(height: 12),
          _buildLicensePlateField(),
          const SizedBox(height: 16),
          _buildDriverNameField(),
          const SizedBox(height: 16),
          _buildDoNumberField(),
          const SizedBox(height: 24),
          _buildSectionTitle('Lokasi & Muatan'),
          const SizedBox(height: 12),
          _buildEstateSelector(),
          const SizedBox(height: 16),
          _buildBlockSelector(),
          const SizedBox(height: 16),
          if (widget.direction == GateCheckDirection.entry) ...[
            _buildWeightField(),
            const SizedBox(height: 24),
          ],
          _buildSectionTitle('Catatan Tambahan'),
          const SizedBox(height: 12),
          _buildNotesField(),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: Theme.of(context).textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.bold,
        color: Colors.grey[700],
      ),
    );
  }

  Widget _buildDirectionSelector() {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: GateCheckDirection.values.map((direction) {
          final isSelected = widget.direction == direction;
          
          return InkWell(
            onTap: () => widget.onDirectionChanged(direction),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected 
                    ? Theme.of(context).colorScheme.primary.withOpacity(0.1)
                    : null,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Radio<GateCheckDirection>(
                    value: direction,
                    groupValue: widget.direction,
                    onChanged: (value) {
                      if (value != null) {
                        widget.onDirectionChanged(value);
                      }
                    },
                    activeColor: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Icon(
                    direction == GateCheckDirection.entry 
                        ? Icons.login 
                        : Icons.logout,
                    color: isSelected 
                        ? Theme.of(context).colorScheme.primary 
                        : Colors.grey[600],
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          direction.label,
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: isSelected ? Theme.of(context).colorScheme.primary : null,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          direction == GateCheckDirection.entry
                              ? 'Truck memasuki area kebun'
                              : 'Truck meninggalkan area kebun',
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (isSelected)
                    Icon(
                      Icons.check_circle,
                      color: Theme.of(context).colorScheme.primary,
                      size: 20,
                    ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildLicensePlateField() {
    return TextFormField(
      controller: widget.licensePlateController,
      textCapitalization: TextCapitalization.characters,
      inputFormatters: [
        UpperCaseTextFormatter(),
        FilteringTextInputFormatter.allow(RegExp(r'[A-Z0-9\s]')),
      ],
      decoration: InputDecoration(
        labelText: 'Nomor Polisi',
        hintText: 'Contoh: B 1234 ABC',
        prefixIcon: Icon(Icons.local_shipping, color: Colors.blue[600]),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
        ),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Nomor polisi harus diisi';
        }
        if (value.length < 3) {
          return 'Nomor polisi tidak valid';
        }
        return null;
      },
    );
  }

  Widget _buildDriverNameField() {
    return TextFormField(
      controller: widget.driverNameController,
      textCapitalization: TextCapitalization.words,
      decoration: InputDecoration(
        labelText: 'Nama Supir',
        hintText: 'Masukkan nama lengkap supir',
        prefixIcon: Icon(Icons.person, color: Colors.green[600]),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
        ),
      ),
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Nama supir harus diisi';
        }
        if (value.length < 2) {
          return 'Nama supir terlalu pendek';
        }
        return null;
      },
    );
  }

  Widget _buildDoNumberField() {
    return TextFormField(
      controller: widget.doNumberController,
      textCapitalization: TextCapitalization.characters,
      inputFormatters: [
        UpperCaseTextFormatter(),
        FilteringTextInputFormatter.allow(RegExp(r'[A-Z0-9]')),
      ],
      decoration: InputDecoration(
        labelText: 'Nomor DO (Opsional)',
        hintText: 'Contoh: DO123456',
        prefixIcon: Icon(Icons.receipt_long, color: Colors.orange[600]),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
        ),
      ),
    );
  }

  Widget _buildEstateSelector() {
    return DropdownButtonFormField<String>(
      value: widget.selectedEstateId,
      decoration: InputDecoration(
        labelText: 'Pilih Estate',
        prefixIcon: Icon(Icons.business, color: Colors.purple[600]),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
        ),
      ),
      items: widget.estates.map((estate) {
        return DropdownMenuItem<String>(
          value: estate.id,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(estate.name),
              Text(
                estate.companyName,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        );
      }).toList(),
      onChanged: (value) {
        widget.onEstateChanged(value);
        // Reset block selection when estate changes
        if (widget.selectedBlockId != null) {
          final hasValidBlock = widget.blocks.any(
            (block) => block.id == widget.selectedBlockId && block.estateId == value,
          );
          if (!hasValidBlock) {
            widget.onBlockChanged(null);
          }
        }
      },
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Estate harus dipilih';
        }
        return null;
      },
    );
  }

  Widget _buildBlockSelector() {
    final availableBlocks = widget.blocks.where((block) => 
        block.estateId == widget.selectedEstateId
    ).toList();

    return DropdownButtonFormField<String>(
      value: widget.selectedBlockId,
      decoration: InputDecoration(
        labelText: 'Pilih Blok',
        prefixIcon: Icon(Icons.map, color: Colors.teal[600]),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
        ),
      ),
      items: widget.selectedEstateId == null
          ? []
          : availableBlocks.map((block) {
              return DropdownMenuItem<String>(
                value: block.id,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(block.name),
                    Text(
                      'Divisi: ${block.divisionName}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
      onChanged: widget.selectedEstateId == null ? null : (value) {
        widget.onBlockChanged(value);
      },
      validator: (value) {
        if (value == null || value.isEmpty) {
          return 'Blok harus dipilih';
        }
        return null;
      },
    );
  }

  Widget _buildWeightField() {
    return TextFormField(
      initialValue: widget.estimatedWeight > 0 
          ? widget.estimatedWeight.toString()
          : '',
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*')),
      ],
      decoration: InputDecoration(
        labelText: widget.direction == GateCheckDirection.entry 
            ? 'Estimasi Berat Masuk (kg)'
            : 'Berat Keluar (kg)',
        hintText: widget.direction == GateCheckDirection.entry
            ? 'Contoh: 5000 (estimasi)'
            : 'Contoh: 4800 (hasil timbang)',
        prefixIcon: Icon(Icons.scale, color: Colors.indigo[600]),
        suffixText: 'kg',
        helperText: widget.direction == GateCheckDirection.entry
            ? 'Perkiraan berat truck saat masuk'
            : 'Berat sebenarnya setelah ditimbang',
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
        ),
      ),
      onChanged: (value) {
        final weight = double.tryParse(value) ?? 0.0;
        widget.onWeightChanged(weight);
      },
      validator: (value) {
        // Weight is only required for entry direction
        if (widget.direction == GateCheckDirection.entry) {
          if (value == null || value.isEmpty) {
            return 'Estimasi berat harus diisi';
          }
          final weight = double.tryParse(value);
          if (weight == null || weight <= 0) {
            return 'Berat harus lebih dari 0';
          }
          if (weight > 50000) {
            return 'Berat tidak realistis (maksimal 50 ton)';
          }
        } else if (value != null && value.isNotEmpty) {
          final weight = double.tryParse(value);
          if (weight == null || weight < 0) {
            return 'Format berat tidak valid';
          }
          if (weight > 50000) {
            return 'Berat tidak realistis (maksimal 50 ton)';
          }
        }
        return null;
      },
    );
  }

  Widget _buildNotesField() {
    return TextFormField(
      controller: widget.notesController,
      maxLines: 3,
      maxLength: 500,
      textCapitalization: TextCapitalization.sentences,
      decoration: InputDecoration(
        labelText: 'Catatan (Opsional)',
        hintText: widget.direction == GateCheckDirection.entry
            ? 'Contoh: Muatan terlihat segar, tidak ada kerusakan...'
            : 'Contoh: Truck sudah kosong, siap keluar...',
        prefixIcon: Icon(Icons.note_add, color: Colors.brown[600]),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: BorderSide(color: Theme.of(context).colorScheme.primary),
        ),
        alignLabelWithHint: true,
      ),
      validator: (value) {
        if (value != null && value.length > 500) {
          return 'Catatan maksimal 500 karakter';
        }
        return null;
      },
    );
  }

  bool get isFormValid => _formKey.currentState?.validate() ?? false;

  void resetForm() {
    _formKey.currentState?.reset();
    widget.licensePlateController.clear();
    widget.driverNameController.clear();
    widget.doNumberController.clear();
    widget.notesController.clear();
    widget.onEstateChanged(null);
    widget.onBlockChanged(null);
    widget.onWeightChanged(0.0);
    widget.onDirectionChanged(GateCheckDirection.entry);
  }
}

class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    return TextEditingValue(
      text: newValue.text.toUpperCase(),
      selection: newValue.selection,
    );
  }
}