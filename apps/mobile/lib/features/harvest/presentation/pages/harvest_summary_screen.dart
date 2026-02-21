import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../blocs/harvest_bloc.dart';
import '../widgets/harvest_list_item.dart';
import '../widgets/summary_stat_card.dart';

class HarvestSummaryScreen extends StatefulWidget {
  const HarvestSummaryScreen({Key? key}) : super(key: key);

  @override
  State<HarvestSummaryScreen> createState() => _HarvestSummaryScreenState();
}

class _HarvestSummaryScreenState extends State<HarvestSummaryScreen> {
  DateTime _selectedDate = DateTime.now();
  String _selectedBlockId = 'all';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  void _loadData() {
    context.read<HarvestBloc>().add(
      HarvestSummaryRequested(
        date: _selectedDate,
        blockId: _selectedBlockId == 'all' ? null : _selectedBlockId,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212), // Dark background
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Ringkasan Panen',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_circle_outline, color: Colors.white),
            onPressed: () {
              // Navigate to input screen or add new
            },
          ),
        ],
      ),
      body: BlocBuilder<HarvestBloc, HarvestState>(
        builder: (context, state) {
          if (state is HarvestLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is HarvestSummaryLoaded) {
            return Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildDatePicker(context),
                        const SizedBox(height: 16),
                        _buildBlockFilter(context),
                        const SizedBox(height: 24),
                        _buildStatsRow(state.stats),
                        const SizedBox(height: 24),
                        _buildHarvestList(state.harvests),
                      ],
                    ),
                  ),
                ),
                _buildBottomButton(context),
              ],
            );
          }

          if (state is HarvestError) {
            return Center(
              child: Text(
                'Error: ${state.message}',
                style: const TextStyle(color: Colors.red),
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildDatePicker(BuildContext context) {
    return InkWell(
      onTap: () async {
        final picked = await showDatePicker(
          context: context,
          initialDate: _selectedDate,
          firstDate: DateTime(2020),
          lastDate: DateTime.now(),
        );
        if (picked != null) {
          setState(() {
            _selectedDate = picked;
          });
          _loadData();
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFF00E676)), // Green border
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              DateFormat('EEEE, d MMMM yyyy', 'id_ID').format(_selectedDate),
              style: const TextStyle(color: Colors.white, fontSize: 16),
            ),
            const Icon(Icons.calendar_today, color: Color(0xFF00E676)),
          ],
        ),
      ),
    );
  }

  Widget _buildBlockFilter(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Filter Blok:',
          style: TextStyle(color: Colors.grey, fontSize: 14),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E1E1E),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.withOpacity(0.3)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: _selectedBlockId,
              isExpanded: true,
              dropdownColor: const Color(0xFF1E1E1E),
              icon: const Icon(Icons.keyboard_arrow_down, color: Colors.grey),
              style: const TextStyle(color: Colors.white),
              items: const [
                DropdownMenuItem(
                  value: 'all',
                  child: Row(
                    children: [
                      Icon(Icons.search, color: Colors.grey, size: 20),
                      SizedBox(width: 8),
                      Text('Semua Blok'),
                    ],
                  ),
                ),
                // TODO: Add actual blocks here if available in state or pass them in
              ],
              onChanged: (value) {
                if (value != null) {
                  setState(() {
                    _selectedBlockId = value;
                  });
                  _loadData();
                }
              },
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildStatsRow(Map<String, dynamic> stats) {
    return Row(
      children: [
        SummaryStatCard(
          title: 'Total Janjang',
          value: NumberFormat('#,###').format(stats['totalJanjang'] ?? 0),
          icon: Icons.agriculture,
          gradientColors: const [Color(0xFFFF8A65), Color(0xFF9575CD)], // Orange to Purple
        ),
        const SizedBox(width: 16),
        SummaryStatCard(
          title: 'Rata-rata BJR',
          value: '${(stats['avgBjr'] ?? 0).toStringAsFixed(1)} kg',
          icon: Icons.scale,
          gradientColors: const [Color(0xFFF06292), Color(0xFF4FC3F7)], // Pink to Blue
        ),
      ],
    );
  }

  Widget _buildHarvestList(List<dynamic> harvests) {
    if (harvests.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32.0),
          child: Text(
            'Tidak ada data panen',
            style: TextStyle(color: Colors.grey),
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: harvests.length,
      itemBuilder: (context, index) {
        return HarvestListItem(harvest: harvests[index]);
      },
    );
  }

  Widget _buildBottomButton(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: Color(0xFF121212),
        border: Border(top: BorderSide(color: Colors.black12)),
      ),
      child: ElevatedButton(
        onPressed: () {
          // Post data action
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFC6FF00), // Lime Green
          foregroundColor: Colors.black,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(30),
          ),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Post Data Panen',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(width: 8),
            Icon(Icons.north_east, size: 18),
          ],
        ),
      ),
    );
  }
}
