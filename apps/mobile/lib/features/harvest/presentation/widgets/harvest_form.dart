import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class HarvestForm extends StatelessWidget {
  final TextEditingController tbsQuantityController;
  final TextEditingController tbsQualityController;
  final TextEditingController notesController;
  final String selectedQualityGrade;
  final ValueChanged<String> onQualityGradeChanged;

  const HarvestForm({
    Key? key,
    required this.tbsQuantityController,
    required this.tbsQualityController,
    required this.notesController,
    required this.selectedQualityGrade,
    required this.onQualityGradeChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // TBS Quantity Input
        TextFormField(
          controller: tbsQuantityController,
          decoration: const InputDecoration(
            labelText: 'Jumlah TBS (Kg)',
            hintText: 'Masukkan berat TBS dalam kilogram',
            prefixIcon: Icon(Icons.scale),
            suffixText: 'Kg',
            border: OutlineInputBorder(),
          ),
          keyboardType: const TextInputType.numberWithOptions(
            decimal: true,
            signed: false,
          ),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*')),
          ],
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Jumlah TBS wajib diisi';
            }
            
            final quantity = double.tryParse(value);
            if (quantity == null) {
              return 'Format angka tidak valid';
            }
            
            if (quantity <= 0) {
              return 'Jumlah TBS harus lebih dari 0';
            }
            
            if (quantity > 10000) {
              return 'Jumlah TBS terlalu besar (maksimal 10,000 kg)';
            }
            
            return null;
          },
        ),
        
        const SizedBox(height: 16),
        
        // TBS Quality Input
        TextFormField(
          controller: tbsQualityController,
          decoration: const InputDecoration(
            labelText: 'Kualitas TBS (%)',
            hintText: 'Persentase kualitas TBS (0-100)',
            prefixIcon: Icon(Icons.star),
            suffixText: '%',
            border: OutlineInputBorder(),
          ),
          keyboardType: const TextInputType.numberWithOptions(
            decimal: true,
            signed: false,
          ),
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*')),
          ],
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Kualitas TBS wajib diisi';
            }
            
            final quality = double.tryParse(value);
            if (quality == null) {
              return 'Format angka tidak valid';
            }
            
            if (quality < 0 || quality > 100) {
              return 'Kualitas harus antara 0-100%';
            }
            
            return null;
          },
        ),
        
        const SizedBox(height: 16),
        
        // Quality Grade Selection
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Grade Kualitas',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 8),
            _buildQualityGradeSelector(context),
          ],
        ),
        
        const SizedBox(height: 16),
        
        // Notes Input
        TextFormField(
          controller: notesController,
          decoration: const InputDecoration(
            labelText: 'Catatan (Opsional)',
            hintText: 'Tambahkan catatan khusus untuk panen ini...',
            prefixIcon: Icon(Icons.note),
            border: OutlineInputBorder(),
          ),
          maxLines: 3,
          maxLength: 500,
          textCapitalization: TextCapitalization.sentences,
          validator: (value) {
            if (value != null && value.length > 500) {
              return 'Catatan maksimal 500 karakter';
            }
            return null;
          },
        ),
      ],
    );
  }

  Widget _buildQualityGradeSelector(BuildContext context) {
    final grades = [
      {'value': 'A', 'label': 'Grade A', 'description': 'Kualitas Sangat Baik', 'color': Colors.green},
      {'value': 'B', 'label': 'Grade B', 'description': 'Kualitas Baik', 'color': Colors.orange},
      {'value': 'C', 'label': 'Grade C', 'description': 'Kualitas Cukup', 'color': Colors.red},
    ];

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: grades.map((grade) {
          final isSelected = selectedQualityGrade == grade['value'];
          
          return InkWell(
            onTap: () => onQualityGradeChanged(grade['value'] as String),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: isSelected 
                    ? (grade['color'] as Color).withOpacity(0.1)
                    : null,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Radio<String>(
                    value: grade['value'] as String,
                    groupValue: selectedQualityGrade,
                    onChanged: (value) {
                      if (value != null) {
                        onQualityGradeChanged(value);
                      }
                    },
                    activeColor: grade['color'] as Color,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          grade['label'] as String,
                          style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: isSelected ? grade['color'] as Color : null,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          grade['description'] as String,
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
                      color: grade['color'] as Color,
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
}