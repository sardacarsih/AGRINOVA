import 'package:flutter/material.dart';
import 'genz_components.dart';

/// Gen Z Styled History Tab with Modern Dark Theme
/// Displays gate check history with filtering capabilities
/// Matches the premium design with glassmorphism effects
class GenZHistoryTab extends StatefulWidget {
  final List<Map<String, dynamic>> historyData;
  final VoidCallback? onRefresh;
  final bool isLoading;

  const GenZHistoryTab({
    super.key,
    required this.historyData,
    this.onRefresh,
    this.isLoading = false,
  });

  @override
  State<GenZHistoryTab> createState() => _GenZHistoryTabState();
}

class _GenZHistoryTabState extends State<GenZHistoryTab> {
  String _currentFilter = 'Semua';
  DateTime _selectedDate = DateTime.now();
  final List<String> _filterOptions = ['Semua', 'Masuk', 'Keluar'];

  List<Map<String, dynamic>> get _filteredData {
    // First filter by date
    final dateFilteredData = widget.historyData.where((item) {
      // Check if item has a timestamp or date field
      // Handle both int (milliseconds) and String formats
      final timestampRaw = item['timestamp'];
      final dateRaw = item['date'];
      final createdAtRaw = item['created_at'];

      DateTime? itemDate;

      // Try to parse timestamp (can be int milliseconds or String)
      if (timestampRaw != null) {
        if (timestampRaw is int) {
          itemDate = DateTime.fromMillisecondsSinceEpoch(timestampRaw);
        } else if (timestampRaw is String) {
          itemDate = DateTime.tryParse(timestampRaw);
        }
      }

      // Try date field if timestamp didn't work
      if (itemDate == null && dateRaw != null) {
        if (dateRaw is String) {
          itemDate = DateTime.tryParse(dateRaw);
        }
      }

      // Try created_at if date didn't work
      if (itemDate == null && createdAtRaw != null) {
        if (createdAtRaw is int) {
          itemDate = DateTime.fromMillisecondsSinceEpoch(createdAtRaw);
        } else if (createdAtRaw is String) {
          itemDate = DateTime.tryParse(createdAtRaw);
        }
      }

      if (itemDate != null) {
        return itemDate.year == _selectedDate.year &&
               itemDate.month == _selectedDate.month &&
               itemDate.day == _selectedDate.day;
      }

      // Include items without date info (for backward compatibility)
      return true;
    }).toList();
    
    // Then filter by action type
    if (_currentFilter == 'Semua') {
      return dateFilteredData;
    } else if (_currentFilter == 'Masuk') {
      return dateFilteredData.where((item) => 
        (item['action'] as String?)?.toUpperCase() == 'ENTRY'
      ).toList();
    } else {
      return dateFilteredData.where((item) => 
        (item['action'] as String?)?.toUpperCase() == 'EXIT'
      ).toList();
    }
  }

  bool get _isToday {
    final now = DateTime.now();
    return _selectedDate.year == now.year &&
           _selectedDate.month == now.month &&
           _selectedDate.day == now.day;
  }

  String get _dateButtonText {
    if (_isToday) {
      return 'Hari Ini';
    } else {
      return '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}';
    }
  }

  int get _totalCount => _filteredData.length;
  int get _entryCount => _filteredData.where((item) => 
    (item['action'] as String?)?.toUpperCase() == 'ENTRY').length;
  int get _exitCount => _filteredData.where((item) => 
    (item['action'] as String?)?.toUpperCase() == 'EXIT').length;

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.dark(
              primary: Color(0xFF8B5CF6),
              onPrimary: Colors.white,
              surface: Color(0xFF1F2937),
              onSurface: Colors.white,
            ),
            dialogBackgroundColor: const Color(0xFF1F2937),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  void _resetToToday() {
    setState(() {
      _selectedDate = DateTime.now();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.isLoading) {
      return GenZTabContainer(
        child: const Center(
          child: CircularProgressIndicator(color: Color(0xFF8B5CF6)),
        ),
      );
    }

    return GenZScrollableTab(
      children: [
        // Header Card with glassmorphism effect
        _buildHeaderCard(),
        const SizedBox(height: 20),
        
        // Date filter and Toggle buttons row
        _buildDateFilterRow(),
        const SizedBox(height: 16),
        
        // Quick Stats Bar
        _buildQuickStats(),
        const SizedBox(height: 20),
        
        // History list
        _buildHistoryList(),
      ],
    );
  }

  /// Premium header card matching the design
  Widget _buildHeaderCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF8B5CF6), Color(0xFF6366F1)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF8B5CF6).withValues(alpha: 0.3),
            blurRadius: 20,
            spreadRadius: -5,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Row(
        children: [
          // History Icon with circular background
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(
              Icons.history_rounded,
              color: Colors.white,
              size: 32,
            ),
          ),
          const SizedBox(width: 16),
          
          // Title and Subtitle
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Riwayat Gerbang',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Log aktivitas masuk/keluar',
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withValues(alpha: 0.8),
                  ),
                ),
              ],
            ),
          ),
          
          // Refresh button
          if (widget.onRefresh != null)
            GestureDetector(
              onTap: widget.onRefresh,
              child: Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.refresh_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Date filter row with "Hari Ini" button and filter chips
  Widget _buildDateFilterRow() {
    return Row(
      children: [
        // Date picker button
        GestureDetector(
          onTap: () => _selectDate(context),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: _isToday 
                  ? const Color(0xFF8B5CF6).withValues(alpha: 0.15)
                  : const Color(0xFF1F2937),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _isToday 
                    ? const Color(0xFF8B5CF6).withValues(alpha: 0.5)
                    : const Color(0xFF374151),
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _dateButtonText,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: _isToday 
                        ? const Color(0xFF8B5CF6)
                        : const Color(0xFF9CA3AF),
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.calendar_today_rounded,
                  size: 16,
                  color: const Color(0xFF8B5CF6).withValues(alpha: 0.8),
                ),
              ],
            ),
          ),
        ),
        // Reset to today button (only shown when viewing different date)
        if (!_isToday) ...[
          const SizedBox(width: 8),
          GestureDetector(
            onTap: _resetToToday,
            child: Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFF1F2937),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF374151)),
              ),
              child: const Icon(
                Icons.today_rounded,
                size: 16,
                color: Color(0xFF9CA3AF),
              ),
            ),
          ),
        ],
        const SizedBox(width: 12),
        
        // Filter chips (Semua, Masuk, Keluar)
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              color: const Color(0xFF1F2937),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF374151)),
            ),
            child: Row(
              children: _filterOptions.map((filter) {
                final isSelected = _currentFilter == filter;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _currentFilter = filter),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: isSelected 
                            ? const Color(0xFF8B5CF6) 
                            : Colors.transparent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        filter,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                          color: isSelected ? Colors.white : const Color(0xFF9CA3AF),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ),
      ],
    );
  }

  /// Quick stats bar with Total, Masuk, Keluar counts
  Widget _buildQuickStats() {
    return Row(
      children: [
        // Total stat
        _buildStatChip(
          label: 'Total:',
          value: _totalCount.toString(),
          color: const Color(0xFF6B7280),
          isOutlined: true,
        ),
        const SizedBox(width: 10),
        
        // Masuk stat with green accent
        Expanded(
          child: _buildStatChip(
            label: 'Masuk:',
            value: _entryCount.toString(),
            color: const Color(0xFF34D399),
          ),
        ),
        const SizedBox(width: 10),
        
        // Keluar stat with red accent
        Expanded(
          child: _buildStatChip(
            label: 'Keluar:',
            value: _exitCount.toString(),
            color: const Color(0xFFEF4444),
          ),
        ),
      ],
    );
  }

  Widget _buildStatChip({
    required String label,
    required String value,
    required Color color,
    bool isOutlined = false,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: isOutlined 
            ? const Color(0xFF1F2937) 
            : color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isOutlined 
              ? const Color(0xFF374151) 
              : color.withValues(alpha: 0.4),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: isOutlined ? const Color(0xFF9CA3AF) : color,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: isOutlined ? Colors.white : color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistoryList() {
    if (_filteredData.isEmpty) {
      return _buildEmptyState();
    }

    return Column(
      children: _filteredData.map((item) {
        final isEntry = (item['action'] as String?)?.toUpperCase() == 'ENTRY';
        final plate = item['plate'] as String? ?? item['vehicle_plate'] as String? ?? 'N/A';
        // Check all possible name fields: driver_name, driver, name
        final driver = item['driver_name'] as String? ??
                       item['driver'] as String? ??
                       item['name'] as String? ??
                       'Unknown';
        final time = item['time'] as String? ?? '--:--';
        final registrationSource = item['registration_source'] as String?;
        final destination = item['destination'] as String?;
        
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: _buildHistoryItem(
            isEntry: isEntry,
            plate: plate,
            driver: driver,
            time: time,
            destination: destination,
            registrationSource: registrationSource,
          ),
        );
      }).toList(),
    );
  }

  /// Premium history item matching the design exactly
  Widget _buildHistoryItem({
    required bool isEntry,
    required String plate,
    required String driver,
    required String time,
    String? destination,
    String? registrationSource,
  }) {
    final color = isEntry ? const Color(0xFF34D399) : const Color(0xFFEF4444);
    final neonBlue = const Color(0xFF3B82F6);
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1F2937).withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF374151).withValues(alpha: 0.5)),
      ),
      child: Row(
        children: [
          // Direction indicator (circular icon)
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.15),
              shape: BoxShape.circle,
              border: Border.all(
                color: color.withValues(alpha: 0.3),
                width: 2,
              ),
            ),
            child: Center(
              child: Icon(
                isEntry ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded,
                color: color,
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 14),
          
          // Content
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Plate number and Source Badge
                Row(
                  children: [
                    Text(
                      plate,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        letterSpacing: 0.5,
                      ),
                    ),
                    if (registrationSource != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: (registrationSource == 'QR_SCAN' ? neonBlue : Colors.orange).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: (registrationSource == 'QR_SCAN' ? neonBlue : Colors.orange).withValues(alpha: 0.4),
                            width: 0.5,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              registrationSource == 'QR_SCAN' ? Icons.qr_code_2_rounded : Icons.edit_note_rounded,
                              size: 10,
                              color: registrationSource == 'QR_SCAN' ? neonBlue : Colors.orange[300],
                            ),
                            const SizedBox(width: 3),
                            Text(
                              registrationSource == 'QR_SCAN' ? 'QR' : 'MANUAL',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: registrationSource == 'QR_SCAN' ? neonBlue : Colors.orange[300],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                
                // Driver name
                Text(
                  driver,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF9CA3AF),
                  ),
                ),
                
                // Destination if available
                if (destination != null && destination.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    destination,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF6B7280),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ],
            ),
          ),
          
          // Time
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: Text(
              time,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Color(0xFF9CA3AF),
              ),
            ),
          ),
          
          // Status badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              isEntry ? 'MASUK' : 'KELUAR',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: color,
                letterSpacing: 0.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: const Color(0xFF1F2937).withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF374151).withValues(alpha: 0.5)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF374151).withValues(alpha: 0.3),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.inbox_rounded,
              size: 48,
              color: Color(0xFF6B7280),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            _currentFilter == 'Semua' 
                ? 'Belum ada riwayat' 
                : 'Tidak ada data $_currentFilter',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Color(0xFF9CA3AF),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Data akan muncul setelah ada aktivitas',
            style: TextStyle(
              fontSize: 13,
              color: Color(0xFF6B7280),
            ),
          ),
        ],
      ),
    );
  }
}
