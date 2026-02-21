import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:logger/logger.dart';

import '../../../auth/presentation/blocs/auth_bloc.dart';
import '../../data/models/gate_check_models.dart';
import '../../../../core/services/role_service.dart';
import '../../../../shared/widgets/logout_menu_widget.dart';

// Import refactored components
import 'satpam_dashboard/satpam_dashboard_constants.dart';
import 'satpam_dashboard/satpam_dashboard_widgets.dart';
import 'satpam_dashboard/satpam_dashboard_services.dart';
import 'satpam_dashboard/satpam_dashboard_helpers.dart';

/// Gate Check History Page
/// 
/// Dedicated page for displaying gate check history including:
/// - History filters (date range, status, etc.)
/// - History list with entry/exit records
/// - Search and filter functionality
/// - Export and reporting features
class GateCheckHistoryPage extends StatefulWidget {
  const GateCheckHistoryPage({Key? key}) : super(key: key);

  @override
  State<GateCheckHistoryPage> createState() => _GateCheckHistoryPageState();
}

class _GateCheckHistoryPageState extends State<GateCheckHistoryPage> {
  static final Logger _logger = Logger();

  // Service state managed by SatpamDashboardServices
  SatpamDashboardServiceState? _serviceState;
  
  // State management
  bool _isLoading = false;
  String? _errorMessage;
  
  // Data state
  List<GuestLog> _recentLogs = [];
  List<AccessLog> _recentAccessLogs = [];
  List<Map<String, dynamic>> _historyData = [];
  
  // Filter state
  DateTime? _startDate;
  DateTime? _endDate;
  String _selectedStatus = 'all'; // all, entry, exit
  String _selectedSyncStatus = 'all'; // all, synced, pending, failed
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    
    // Initialize services and load data asynchronously
    _initializeAndLoadData();
  }

  @override
  void dispose() {
    super.dispose();
  }

  /// Initialize services and load initial data
  Future<void> _initializeAndLoadData() async {
    try {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });

      // Initialize services
      await _initializeServices();
      
      // Load history data
      await _loadHistoryData();

    } catch (e) {
      _logger.e('Error during initialization', error: e);
      if (mounted) {
        setState(() {
          _errorMessage = 'Initialization error: ${e.toString()}';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  /// Initialize dashboard services
  Future<void> _initializeServices() async {
    try {
      _logger.d('Initializing services...');
      
      final serviceState = await SatpamDashboardServices.initializeServices();
      
      if (mounted) {
        setState(() {
          _serviceState = serviceState;
        });
      }
      
      _logger.i('Services initialized successfully');
    } catch (e) {
      _logger.e('Error initializing services', error: e);
      throw Exception('Failed to initialize services: ${e.toString()}');
    }
  }

  /// Load history data from database
  Future<void> _loadHistoryData() async {
    try {
      _logger.d('Loading history data...');
      
      if (_serviceState?.databaseService == null) {
        throw Exception('Database service not available');
      }

      // Load comprehensive history data using the service
      final historyItems = await SatpamDashboardServices.loadHistoryData(
        serviceState: _serviceState!,
        dateFilter: _formatDateFilter(),
        actionFilter: _selectedStatus,
      );

      if (mounted) {
        setState(() {
          _historyData = historyItems;
          _recentLogs = []; // Will be populated from the service if needed
          _recentAccessLogs = []; // Will be populated from the service if needed
        });
      }
      
      _logger.i('History data loaded: ${historyItems.length} items');
    } catch (e) {
      _logger.e('Error loading history data', error: e);
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load history: ${e.toString()}';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<AuthBloc, AuthState>(
      builder: (context, state) {
        if (state is! AuthAuthenticated) {
          return const Scaffold(
            body: Center(child: Text('Authentication required')),
          );
        }

        return Scaffold(
          appBar: _buildAppBar(state),
          body: _buildBody(),
          backgroundColor: Colors.grey[100],
        );
      },
    );
  }

  /// Build app bar
  AppBar _buildAppBar(AuthAuthenticated state) {
    return AppBar(
      title: const Text(
        'Riwayat Pemeriksaan Gerbang',
        style: TextStyle(fontWeight: FontWeight.bold),
      ),
      backgroundColor: SatpamDashboardConstants.primaryColor,
      foregroundColor: Colors.white,
      elevation: 0,
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: _refreshHistoryData,
          tooltip: 'Refresh Data',
        ),
        LogoutMenuWidget(
          username: state.user.username,
          role: RoleService.getRoleDisplayName(state.user.role),
        ),
      ],
    );
  }

  /// Build main body
  Widget _buildBody() {
    if (_isLoading) {
      return SatpamDashboardHelpers.buildLoadingIndicator('Memuat data riwayat...');
    }

    if (_errorMessage != null) {
      return SatpamDashboardHelpers.buildError(_errorMessage!, _initializeAndLoadData);
    }

    return _buildHistoryContent();
  }

  /// Build history content
  Widget _buildHistoryContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Page title with sync statistics
          _buildHeaderWithStats(),
          const SizedBox(height: 16),
          
          // Advanced filters
          _buildAdvancedHistoryFilters(),
          const SizedBox(height: 16),
          
          // History list
          _buildHistoryList(),
        ],
      ),
    );
  }

  /// Build header with sync statistics
  Widget _buildHeaderWithStats() {
    // Calculate sync statistics
    final totalItems = _historyData.length;
    final syncedItems = _historyData.where((item) => 
      (item['sync_status'] ?? '').toString().toUpperCase() == 'SYNCED'
    ).length;
    final pendingItems = _historyData.where((item) => 
      (item['sync_status'] ?? '').toString().toUpperCase() == 'PENDING'
    ).length;
    final failedItems = _historyData.where((item) => 
      (item['sync_status'] ?? '').toString().toUpperCase() == 'FAILED'
    ).length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Riwayat Pemeriksaan Gerbang',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        const SizedBox(height: 12),
        
        // Sync statistics cards
        Row(
          children: [
            Expanded(
              child: _buildStatCard(
                'Total',
                totalItems.toString(),
                Colors.blue,
                Icons.list_alt,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildStatCard(
                'Tersinkron',
                syncedItems.toString(),
                Colors.green,
                Icons.cloud_done,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildStatCard(
                'Pending',
                pendingItems.toString(),
                Colors.orange,
                Icons.cloud_upload,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildStatCard(
                'Gagal',
                failedItems.toString(),
                Colors.red,
                Icons.cloud_off,
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// Build individual stat card
  Widget _buildStatCard(String label, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              color: color,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  /// Build advanced history filters
  Widget _buildAdvancedHistoryFilters() {
    return Column(
      children: [
        // Standard filters from widgets
        SatpamDashboardWidgets.buildHistoryFilters(),
        const SizedBox(height: 12),
        
        // Additional advanced filters
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Filter Lanjutan',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 12),
                
                // Date range selector
                Row(
                  children: [
                    Expanded(
                      child: _buildDateSelector(
                        label: 'Dari Tanggal',
                        selectedDate: _startDate,
                        onDateSelected: (date) {
                          setState(() {
                            _startDate = date;
                          });
                          _applyFilters();
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildDateSelector(
                        label: 'Sampai Tanggal',
                        selectedDate: _endDate,
                        onDateSelected: (date) {
                          setState(() {
                            _endDate = date;
                          });
                          _applyFilters();
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                
                // Action Status filter (Entry/Exit)
                DropdownButtonFormField<String>(
                  value: _selectedStatus,
                  decoration: const InputDecoration(
                    labelText: 'Status Aksi',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('Semua')),
                    DropdownMenuItem(value: 'entry', child: Text('Masuk')),
                    DropdownMenuItem(value: 'exit', child: Text('Keluar')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _selectedStatus = value;
                      });
                      _applyFilters();
                    }
                  },
                ),
                const SizedBox(height: 12),
                
                // Sync Status filter
                DropdownButtonFormField<String>(
                  value: _selectedSyncStatus,
                  decoration: const InputDecoration(
                    labelText: 'Status Sync',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'all', child: Text('Semua Status')),
                    DropdownMenuItem(value: 'synced', child: Text('Tersinkron')),
                    DropdownMenuItem(value: 'pending', child: Text('Menunggu Sync')),
                    DropdownMenuItem(value: 'failed', child: Text('Gagal Sync')),
                  ],
                  onChanged: (value) {
                    if (value != null) {
                      setState(() {
                        _selectedSyncStatus = value;
                      });
                      _applyFilters();
                    }
                  },
                ),
                const SizedBox(height: 12),
                
                // Clear filters button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _clearFilters,
                    icon: const Icon(Icons.clear),
                    label: const Text('Hapus Filter'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey[300],
                      foregroundColor: Colors.black87,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Build date selector widget
  Widget _buildDateSelector({
    required String label,
    required DateTime? selectedDate,
    required Function(DateTime) onDateSelected,
  }) {
    return InkWell(
      onTap: () async {
        final date = await showDatePicker(
          context: context,
          initialDate: selectedDate ?? DateTime.now(),
          firstDate: DateTime.now().subtract(const Duration(days: 365)),
          lastDate: DateTime.now(),
        );
        
        if (date != null) {
          onDateSelected(date);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey[400]!),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  selectedDate != null 
                    ? '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year}'
                    : 'Pilih tanggal',
                  style: const TextStyle(fontSize: 16),
                ),
              ],
            ),
            const Icon(Icons.calendar_today, size: 20),
          ],
        ),
      ),
    );
  }

  /// Build history list
  Widget _buildHistoryList() {
    if (_historyData.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            children: [
              Icon(
                Icons.history,
                size: 64,
                color: Colors.grey,
              ),
              SizedBox(height: 16),
              Text(
                'Belum ada data riwayat',
                style: TextStyle(
                  fontSize: 18,
                  color: Colors.grey,
                ),
              ),
              SizedBox(height: 8),
              Text(
                'Data riwayat pemeriksaan gerbang akan tampil di sini',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    final filteredData = _applySearchFilter(_historyData);

    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: TextField(
            decoration: const InputDecoration(
              hintText: 'Cari nomor plat, nama supir...',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
              fillColor: Colors.white,
              filled: true,
            ),
            onChanged: (value) {
              setState(() {
                _searchQuery = value;
              });
            },
          ),
        ),
        
        // Results count
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Text(
            'Menampilkan ${filteredData.length} dari ${_historyData.length} data',
            style: TextStyle(
              color: Colors.grey[600],
              fontSize: 14,
            ),
          ),
        ),
        
        // History list
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: filteredData.length,
          itemBuilder: (context, index) {
            final item = filteredData[index];
            return _buildHistoryItem(item);
          },
        ),
      ],
    );
  }

  /// Build individual history item
  Widget _buildHistoryItem(Map<String, dynamic> item) {
    // Determine sync status color and icon
    final syncStatus = item['sync_status'] ?? 'PENDING';
    Color syncStatusColor;
    IconData syncStatusIcon;
    String syncStatusText;
    
    switch (syncStatus.toUpperCase()) {
      case 'SYNCED':
        syncStatusColor = Colors.green;
        syncStatusIcon = Icons.cloud_done;
        syncStatusText = 'Tersinkron';
        break;
      case 'PENDING':
        syncStatusColor = Colors.orange;
        syncStatusIcon = Icons.cloud_upload;
        syncStatusText = 'Menunggu Sync';
        break;
      case 'FAILED':
        syncStatusColor = Colors.red;
        syncStatusIcon = Icons.cloud_off;
        syncStatusText = 'Gagal Sync';
        break;
      default:
        syncStatusColor = Colors.grey;
        syncStatusIcon = Icons.cloud_queue;
        syncStatusText = 'Unknown';
    }

    // Determine entry/exit based on QR generation intent
    final generationIntent = item['generation_intent'] ?? item['action'];
    final isEntry = generationIntent?.toString().toUpperCase() == 'ENTRY';
    
    // Format datetime for better display
    final timestamp = item['timestamp'] ?? item['created_at'];
    String formattedDateTime = '';
    if (timestamp != null) {
      try {
        DateTime dateTime;
        if (timestamp is int) {
          dateTime = DateTime.fromMillisecondsSinceEpoch(timestamp);
        } else if (timestamp is String) {
          dateTime = DateTime.parse(timestamp);
        } else {
          dateTime = timestamp as DateTime;
        }
        formattedDateTime = '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
      } catch (e) {
        formattedDateTime = item['time'] ?? 'Unknown';
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            spreadRadius: 1,
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row with plate and entry/exit status
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  item['vehicle_plate'] ?? item['plate'] ?? 'No Plate',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: isEntry 
                    ? Colors.green.withOpacity(0.1) 
                    : Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      isEntry ? Icons.login : Icons.logout,
                      size: 12,
                      color: isEntry ? Colors.green : Colors.blue,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      isEntry ? 'MASUK' : 'KELUAR',
                      style: TextStyle(
                        color: isEntry ? Colors.green : Colors.blue,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          
          // Driver information
          Row(
            children: [
              const Icon(Icons.person, size: 16, color: Colors.grey),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Supir: ${item['driver_name'] ?? item['driver'] ?? item['name'] ?? 'Unknown'}',
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          
          // Datetime information
          Row(
            children: [
              const Icon(Icons.access_time, size: 16, color: Colors.grey),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Waktu: $formattedDateTime',
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          
          // Destination information
          Row(
            children: [
              const Icon(Icons.location_on, size: 16, color: Colors.grey),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Tujuan: ${item['destination'] ?? 'Unknown'}',
                  style: const TextStyle(fontSize: 14),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          
          // Company/Owner information
          if (item['guest_company'] != null || item['cargo_owner'] != null)
            Row(
              children: [
                const Icon(Icons.business, size: 16, color: Colors.grey),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Perusahaan: ${item['guest_company'] ?? item['cargo_owner'] ?? 'Unknown'}',
                    style: const TextStyle(fontSize: 14),
                  ),
                ),
              ],
            ),
          
          // Cargo information if available
          if (item['cargo_type'] != null || item['load_type'] != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Row(
                children: [
                  const Icon(Icons.inventory, size: 16, color: Colors.grey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Muatan: ${item['cargo_type'] ?? item['load_type'] ?? 'Unknown'}',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
          
          const SizedBox(height: 12),
          
          // Bottom row with sync status and additional info
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Sync status
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: syncStatusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: syncStatusColor.withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      syncStatusIcon,
                      size: 12,
                      color: syncStatusColor,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      syncStatusText,
                      style: TextStyle(
                        color: syncStatusColor,
                        fontSize: 10,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              
              // Gate position if available
              if (item['gate_position'] != null || item['gate_id'] != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.grey.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.security, size: 12, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        'POS ${item['gate_position'] ?? item['gate_id'] ?? ''}',
                        style: const TextStyle(
                          color: Colors.grey,
                          fontSize: 10,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          
          // Show notes if available
          if (item['notes'] != null && item['notes'].toString().isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.blue.withOpacity(0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.note, size: 14, color: Colors.blue),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'Catatan: ${item['notes']}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.blue,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// Apply comprehensive filters to history data
  List<Map<String, dynamic>> _applySearchFilter(List<Map<String, dynamic>> data) {
    var filteredData = data;

    // Apply sync status filter
    if (_selectedSyncStatus != 'all') {
      filteredData = filteredData.where((item) {
        final syncStatus = (item['sync_status'] ?? 'PENDING').toString().toUpperCase();
        switch (_selectedSyncStatus) {
          case 'synced':
            return syncStatus == 'SYNCED';
          case 'pending':
            return syncStatus == 'PENDING';
          case 'failed':
            return syncStatus == 'FAILED';
          default:
            return true;
        }
      }).toList();
    }

    // Apply action status filter (entry/exit)
    if (_selectedStatus != 'all') {
      filteredData = filteredData.where((item) {
        final generationIntent = (item['generation_intent'] ?? item['action'] ?? '').toString().toLowerCase();
        return generationIntent == _selectedStatus;
      }).toList();
    }

    // Apply search query filter
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filteredData = filteredData.where((item) {
        final plate = (item['vehicle_plate'] ?? item['plate'] ?? '').toString().toLowerCase();
        final driver = (item['driver_name'] ?? item['driver'] ?? item['name'] ?? '').toString().toLowerCase();
        final destination = (item['destination'] ?? '').toString().toLowerCase();
        final company = (item['guest_company'] ?? item['cargo_owner'] ?? '').toString().toLowerCase();
        final gatePosition = (item['gate_position'] ?? item['gate_id'] ?? '').toString().toLowerCase();
        
        return plate.contains(query) || 
               driver.contains(query) || 
               destination.contains(query) ||
               company.contains(query) ||
               gatePosition.contains(query);
      }).toList();
    }

    return filteredData;
  }

  /// Apply filters and reload data
  void _applyFilters() {
    _loadHistoryData();
  }

  /// Clear all filters
  void _clearFilters() {
    setState(() {
      _startDate = null;
      _endDate = null;
      _selectedStatus = 'all';
      _selectedSyncStatus = 'all';
      _searchQuery = '';
    });
    _loadHistoryData();
  }

  /// Refresh history data
  void _refreshHistoryData() {
    _loadHistoryData();
  }

  /// Convert logs to history data format (legacy method for compatibility)
  List<Map<String, dynamic>> _convertLogsToHistoryData(
    List<GuestLog> guestLogs,
    List<AccessLog> accessLogs,
  ) {
    final historyItems = <Map<String, dynamic>>[];
    
    // Convert guest logs to history items with proper intent handling
    for (final log in guestLogs) {
      final logTime = log.timestamp;
      
      // Determine intent based on QR generation context or action
      // Priority: generation_intent > action > default to 'ENTRY'
      String intent = 'ENTRY'; // Default
      
      // Check if this is based on QR scanning or direct registration
      if (log.qrToken?.isNotEmpty == true) {
        // This came from QR scanning - intent should match the QR generation intent
        // For QR-based entries, the action should reflect the scanning result
        intent = log.action.toUpperCase();
      } else {
        // This is direct registration - typically for ENTRY intent
        intent = log.action.toUpperCase();
      }
      
      // Add comprehensive record with all available information
      historyItems.add({
        'id': '${log.logId}_${log.action}_${logTime.millisecondsSinceEpoch}',
        'vehicle_plate': log.vehiclePlate,
        'plate': log.vehiclePlate, // Legacy compatibility
        'driver_name': log.name,
        'driver': log.name, // Legacy compatibility
        'name': log.name, // Alternative field
        'guest_company': log.cargoOwner,
        'cargo_owner': log.cargoOwner,
        'destination': log.destination ?? '',
        'cargo_type': log.cargoType,
        'load_type': log.cargoType, // Legacy compatibility
        'cargo_qty': log.cargoQty,
        'unit': log.unit,
        'vehicle_type': log.vehicleType,
        'vehicle_characteristics': log.vehicleCharacteristics,
        'estimated_weight': log.estimatedWeight,
        'actual_weight': log.actualWeight,
        'do_number': log.doNumber,
        'gate_position': log.gateId,
        'gate_id': log.gateId, // Legacy compatibility
        'action': log.action.toLowerCase(),
        'generation_intent': intent, // Intent at QR generation time
        'qr_token': log.qrToken,
        'status': log.status,
        'photo_in': log.photoIn,
        'photo_out': log.photoOut,
        'coordinates': log.coordinates,
        'device_id': log.deviceId,
        'created_by': log.createdBy,
        'notes': log.notes,
        'sync_status': log.syncStatus, // PENDING, SYNCED, FAILED
        'version': log.version,
        'timestamp': logTime.millisecondsSinceEpoch,
        'created_at': logTime.millisecondsSinceEpoch,
        'time': '${logTime.hour.toString().padLeft(2, '0')}:${logTime.minute.toString().padLeft(2, '0')}',
        'date': '${logTime.year}-${logTime.month.toString().padLeft(2, '0')}-${logTime.day.toString().padLeft(2, '0')}',
        'formatted_datetime': '${logTime.day}/${logTime.month}/${logTime.year} ${logTime.hour.toString().padLeft(2, '0')}:${logTime.minute.toString().padLeft(2, '0')}',
        'is_real': true,
        'data_source': 'guest_log',
        'client_timestamp': log.clientTimestamp,
      });
    }
    
    // Convert access logs to history items
    for (final log in accessLogs) {
      final logTime = log.timestamp;
      
      historyItems.add({
        'id': '${log.logId}_access_${logTime.millisecondsSinceEpoch}',
        'vehicle_plate': log.vehiclePlate ?? 'N/A',
        'plate': log.vehiclePlate ?? 'N/A', // Legacy compatibility
        'driver_name': log.name,
        'driver': log.name, // Legacy compatibility  
        'name': log.name,
        'destination': 'Access Log Entry',
        'gate_position': log.gateId,
        'gate_id': log.gateId, // Legacy compatibility
        'action': log.action.toLowerCase(),
        'generation_intent': log.action.toUpperCase(), // Access logs have direct intent
        'user_type': log.userType, // registered, guest
        'status': log.status,
        'validation_notes': log.validationNotes,
        'coordinates': log.coordinates,
        'device_id': log.deviceId,
        'created_by': log.createdBy,
        'username': log.username, // Audit trail
        'notes': log.validationNotes,
        'sync_status': log.syncStatus, // PENDING, SYNCED, FAILED
        'version': log.version,
        'timestamp': logTime.millisecondsSinceEpoch,
        'created_at': log.createdAt.millisecondsSinceEpoch,
        'time': '${logTime.hour.toString().padLeft(2, '0')}:${logTime.minute.toString().padLeft(2, '0')}',
        'date': '${logTime.year}-${logTime.month.toString().padLeft(2, '0')}-${logTime.day.toString().padLeft(2, '0')}',
        'formatted_datetime': '${logTime.day}/${logTime.month}/${logTime.year} ${logTime.hour.toString().padLeft(2, '0')}:${logTime.minute.toString().padLeft(2, '0')}',
        'is_real': true,
        'data_source': 'access_log',
      });
    }
    
    // Sort by timestamp (most recent first)
    historyItems.sort((a, b) {
      final timestampA = a['timestamp'] as int? ?? 0;
      final timestampB = b['timestamp'] as int? ?? 0;
      return timestampB.compareTo(timestampA);
    });
    
    return historyItems;
  }

  /// Format date filter for service call
  String _formatDateFilter() {
    // Convert date range to simple filter format
    if (_startDate != null && _endDate != null) {
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      
      if (_startDate!.isAtSameMomentAs(today) && _endDate!.isAtSameMomentAs(today)) {
        return 'today';
      } else if (_startDate!.isAtSameMomentAs(today.subtract(const Duration(days: 6)))) {
        return 'week';
      } else if (_startDate!.isAtSameMomentAs(DateTime(now.year, now.month, 1))) {
        return 'month';
      }
    }
    
    return 'all'; // Default filter
  }
}