import 'package:flutter/material.dart';

class EstateSelectors extends StatelessWidget {
  final String? selectedEstateId;
  final DateTime selectedDate;
  final Function(String?) onEstateChanged;
  final Function(DateTime) onDateChanged;
  final VoidCallback onApply;

  const EstateSelectors({
    super.key,
    this.selectedEstateId,
    required this.selectedDate,
    required this.onEstateChanged,
    required this.onDateChanged,
    required this.onApply,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Filter'),
          ElevatedButton(onPressed: onApply, child: const Text('Apply')),
        ],
      ),
    );
  }
}
