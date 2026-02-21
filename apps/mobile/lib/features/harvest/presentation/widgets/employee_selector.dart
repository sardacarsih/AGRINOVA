import 'package:flutter/material.dart';

import '../../domain/entities/harvest_entity.dart';

class EmployeeSelector extends StatelessWidget {
  final List<Employee> employees;
  final Employee? selectedEmployee;
  final ValueChanged<Employee?> onEmployeeSelected;

  const EmployeeSelector({
    Key? key,
    required this.employees,
    required this.selectedEmployee,
    required this.onEmployeeSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (employees.isEmpty) {
      return _buildEmptyState(context);
    }

    return Column(
      children: [
        _buildSearchableDropdown(context),
        if (selectedEmployee != null) ...[
          const SizedBox(height: 12),
          _buildSelectedEmployeeCard(context),
        ],
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Column(
        children: [
          Icon(
            Icons.person_off,
            size: 48,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 8),
          Text(
            'Tidak ada data karyawan',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Pastikan Anda terhubung ke internet',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Colors.grey[500],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchableDropdown(BuildContext context) {
    return InkWell(
      onTap: () => _showEmployeePicker(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(
              Icons.person,
              color: Colors.grey[600],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                selectedEmployee?.name ?? 'Pilih Karyawan',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: selectedEmployee != null 
                      ? Colors.black87 
                      : Colors.grey[600],
                ),
              ),
            ),
            Icon(
              Icons.arrow_drop_down,
              color: Colors.grey[600],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectedEmployeeCard(BuildContext context) {
    final employee = selectedEmployee!;
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Colors.blue[100],
            child: Text(
              employee.name.isNotEmpty 
                  ? employee.name[0].toUpperCase()
                  : '?',
              style: TextStyle(
                color: Colors.blue[700],
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  employee.name,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'Kode: ${employee.code}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
                Text(
                  'Divisi: ${employee.divisionName}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => onEmployeeSelected(null),
            icon: Icon(
              Icons.clear,
              color: Colors.grey[600],
            ),
            tooltip: 'Hapus Pilihan',
          ),
        ],
      ),
    );
  }

  void _showEmployeePicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(20),
        ),
      ),
      builder: (context) => _EmployeePickerSheet(
        employees: employees,
        selectedEmployee: selectedEmployee,
        onEmployeeSelected: onEmployeeSelected,
      ),
    );
  }
}

class _EmployeePickerSheet extends StatefulWidget {
  final List<Employee> employees;
  final Employee? selectedEmployee;
  final ValueChanged<Employee?> onEmployeeSelected;

  const _EmployeePickerSheet({
    required this.employees,
    required this.selectedEmployee,
    required this.onEmployeeSelected,
  });

  @override
  State<_EmployeePickerSheet> createState() => _EmployeePickerSheetState();
}

class _EmployeePickerSheetState extends State<_EmployeePickerSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<Employee> _filteredEmployees = [];

  @override
  void initState() {
    super.initState();
    _filteredEmployees = widget.employees;
    _searchController.addListener(_filterEmployees);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterEmployees() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredEmployees = widget.employees;
      } else {
        _filteredEmployees = widget.employees.where((employee) {
          return employee.name.toLowerCase().contains(query) ||
                 employee.code.toLowerCase().contains(query) ||
                 employee.divisionName.toLowerCase().contains(query);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      maxChildSize: 0.9,
      minChildSize: 0.5,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            // Handle
            Container(
              margin: const EdgeInsets.only(top: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            
            // Header
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Pilih Karyawan',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            
            // Search Field
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Cari nama, kode, atau divisi...',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _searchController.clear();
                          },
                        )
                      : null,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  filled: true,
                  fillColor: Colors.grey[50],
                ),
              ),
            ),
            
            const SizedBox(height: 8),
            
            // Results Count
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '${_filteredEmployees.length} karyawan ditemukan',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 8),
            
            // Employee List
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _filteredEmployees.length,
                itemBuilder: (context, index) {
                  final employee = _filteredEmployees[index];
                  final isSelected = widget.selectedEmployee?.id == employee.id;
                  
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    elevation: isSelected ? 2 : 0.5,
                    color: isSelected ? Colors.blue[50] : null,
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: isSelected 
                            ? Colors.blue[100] 
                            : Colors.grey[200],
                        child: Text(
                          employee.name.isNotEmpty 
                              ? employee.name[0].toUpperCase()
                              : '?',
                          style: TextStyle(
                            color: isSelected 
                                ? Colors.blue[700] 
                                : Colors.grey[600],
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      title: Text(
                        employee.name,
                        style: TextStyle(
                          fontWeight: isSelected 
                              ? FontWeight.w600 
                              : FontWeight.normal,
                        ),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Kode: ${employee.code}'),
                          Text('Divisi: ${employee.divisionName}'),
                        ],
                      ),
                      trailing: isSelected
                          ? Icon(
                              Icons.check_circle,
                              color: Colors.blue[700],
                            )
                          : null,
                      onTap: () {
                        widget.onEmployeeSelected(employee);
                        Navigator.of(context).pop();
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }
}