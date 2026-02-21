import 'package:flutter/material.dart';

import '../../domain/entities/harvest_entity.dart';

class BlockSelector extends StatelessWidget {
  final List<Block> blocks;
  final Block? selectedBlock;
  final ValueChanged<Block?> onBlockSelected;

  const BlockSelector({
    Key? key,
    required this.blocks,
    required this.selectedBlock,
    required this.onBlockSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (blocks.isEmpty) {
      return _buildEmptyState(context);
    }

    return Column(
      children: [
        _buildSearchableDropdown(context),
        if (selectedBlock != null) ...[
          const SizedBox(height: 12),
          _buildSelectedBlockCard(context),
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
            Icons.location_off,
            size: 48,
            color: Colors.grey[400],
          ),
          const SizedBox(height: 8),
          Text(
            'Tidak ada data blok',
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
      onTap: () => _showBlockPicker(context),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[300]!),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(
              Icons.location_on,
              color: Colors.grey[600],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                selectedBlock?.name ?? 'Pilih Blok',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: selectedBlock != null 
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

  Widget _buildSelectedBlockCard(BuildContext context) {
    final block = selectedBlock!;
    
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.green[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.green[200]!),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Colors.green[100],
            child: Icon(
              Icons.grass,
              color: Colors.green[700],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  block.name,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  'Kode: ${block.code}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
                Text(
                  '${block.divisionName} - ${block.estateName}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
                Row(
                  children: [
                    Text(
                      'Luas: ${block.area.toStringAsFixed(1)} ha',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Text(
                      'Tanam: ${block.plantYear}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Colors.grey[600],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () => onBlockSelected(null),
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

  void _showBlockPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(20),
        ),
      ),
      builder: (context) => _BlockPickerSheet(
        blocks: blocks,
        selectedBlock: selectedBlock,
        onBlockSelected: onBlockSelected,
      ),
    );
  }
}

class _BlockPickerSheet extends StatefulWidget {
  final List<Block> blocks;
  final Block? selectedBlock;
  final ValueChanged<Block?> onBlockSelected;

  const _BlockPickerSheet({
    required this.blocks,
    required this.selectedBlock,
    required this.onBlockSelected,
  });

  @override
  State<_BlockPickerSheet> createState() => _BlockPickerSheetState();
}

class _BlockPickerSheetState extends State<_BlockPickerSheet> {
  final TextEditingController _searchController = TextEditingController();
  List<Block> _filteredBlocks = [];

  @override
  void initState() {
    super.initState();
    _filteredBlocks = widget.blocks;
    _searchController.addListener(_filterBlocks);
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _filterBlocks() {
    final query = _searchController.text.toLowerCase();
    setState(() {
      if (query.isEmpty) {
        _filteredBlocks = widget.blocks;
      } else {
        _filteredBlocks = widget.blocks.where((block) {
          return block.name.toLowerCase().contains(query) ||
                 block.code.toLowerCase().contains(query) ||
                 block.divisionName.toLowerCase().contains(query) ||
                 block.estateName.toLowerCase().contains(query) ||
                 block.varietyType.toLowerCase().contains(query);
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
                      'Pilih Blok',
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
                  hintText: 'Cari nama, kode, divisi, atau estate...',
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
                  '${_filteredBlocks.length} blok ditemukan',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey[600],
                  ),
                ),
              ),
            ),
            
            const SizedBox(height: 8),
            
            // Block List
            Expanded(
              child: ListView.builder(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _filteredBlocks.length,
                itemBuilder: (context, index) {
                  final block = _filteredBlocks[index];
                  final isSelected = widget.selectedBlock?.id == block.id;
                  
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    elevation: isSelected ? 2 : 0.5,
                    color: isSelected ? Colors.green[50] : null,
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: isSelected 
                            ? Colors.green[100] 
                            : Colors.grey[200],
                        child: Icon(
                          Icons.grass,
                          color: isSelected 
                              ? Colors.green[700] 
                              : Colors.grey[600],
                        ),
                      ),
                      title: Text(
                        block.name,
                        style: TextStyle(
                          fontWeight: isSelected 
                              ? FontWeight.w600 
                              : FontWeight.normal,
                        ),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Kode: ${block.code}'),
                          Text('${block.divisionName} - ${block.estateName}'),
                          Row(
                            children: [
                              Text('${block.area.toStringAsFixed(1)} ha'),
                              const SizedBox(width: 16),
                              Text('Tanam ${block.plantYear}'),
                              const SizedBox(width: 16),
                              Text(block.varietyType),
                            ],
                          ),
                        ],
                      ),
                      isThreeLine: true,
                      trailing: isSelected
                          ? Icon(
                              Icons.check_circle,
                              color: Colors.green[700],
                            )
                          : null,
                      onTap: () {
                        widget.onBlockSelected(block);
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