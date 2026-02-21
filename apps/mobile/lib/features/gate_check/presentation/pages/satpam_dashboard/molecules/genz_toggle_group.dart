// Gen Z Toggle Group - Molecule Component
// Horizontal animated toggle buttons

import 'package:flutter/material.dart';
import '../atoms/genz_chip.dart';

/// A horizontal toggle group with animated selection
class GenZToggleGroup extends StatelessWidget {
  final List<GenZToggleItem> items;
  final String selectedValue;
  final Function(String) onChanged;

  const GenZToggleGroup({
    Key? key,
    required this.items,
    required this.selectedValue,
    required this.onChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFF1F2937),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF374151)),
      ),
      child: Row(
        children: items.map((item) {
          return Expanded(
            child: GenZChip(
              label: item.label,
              icon: item.icon,
              isSelected: selectedValue == item.value,
              selectedColor: item.color,
              onTap: () => onChanged(item.value),
            ),
          );
        }).toList(),
      ),
    );
  }
}

/// Data class for toggle items
class GenZToggleItem {
  final String value;
  final String label;
  final IconData? icon;
  final Color color;

  const GenZToggleItem({
    required this.value,
    required this.label,
    this.icon,
    required this.color,
  });
}

/// Preset toggle for Entry/Exit (MASUK/KELUAR)
class GenZEntryExitToggle extends StatelessWidget {
  final String value;
  final Function(String) onChanged;

  const GenZEntryExitToggle({
    Key? key,
    required this.value,
    required this.onChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GenZToggleGroup(
      selectedValue: value,
      onChanged: onChanged,
      items: const [
        GenZToggleItem(
          value: 'ENTRY',
          label: 'MASUK',
          icon: Icons.login_rounded,
          color: Color(0xFF34D399),
        ),
        GenZToggleItem(
          value: 'EXIT',
          label: 'KELUAR',
          icon: Icons.logout_rounded,
          color: Color(0xFF3B82F6),
        ),
      ],
    );
  }
}

/// Preset toggle for History Filter (Semua/Masuk/Keluar)
class GenZHistoryFilterToggle extends StatelessWidget {
  final String value;
  final Function(String) onChanged;

  const GenZHistoryFilterToggle({
    Key? key,
    required this.value,
    required this.onChanged,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GenZToggleGroup(
      selectedValue: value,
      onChanged: onChanged,
      items: const [
        GenZToggleItem(
          value: 'Semua',
          label: 'Semua',
          icon: Icons.all_inclusive_rounded,
          color: Color(0xFF8B5CF6),
        ),
        GenZToggleItem(
          value: 'Masuk',
          label: 'Masuk',
          icon: Icons.arrow_downward_rounded,
          color: Color(0xFF34D399),
        ),
        GenZToggleItem(
          value: 'Keluar',
          label: 'Keluar',
          icon: Icons.arrow_upward_rounded,
          color: Color(0xFF3B82F6),
        ),
      ],
    );
  }
}
