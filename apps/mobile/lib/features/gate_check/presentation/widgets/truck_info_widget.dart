import 'package:flutter/material.dart';

class TruckInfoWidget extends StatelessWidget {
  final String licensePlate;
  final String driverName;
  final String doNumber;
  final double estimatedWeight;
  final DateTime? entryTime;
  final DateTime? exitTime;
  final String? status;

  const TruckInfoWidget({
    Key? key,
    required this.licensePlate,
    required this.driverName,
    required this.doNumber,
    required this.estimatedWeight,
    this.entryTime,
    this.exitTime,
    this.status,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(context),
            const SizedBox(height: 16),
            _buildTruckDetails(context),
            if (entryTime != null || exitTime != null) ...[
              const SizedBox(height: 16),
              _buildTimeInfo(context),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue[100],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            Icons.local_shipping,
            color: Colors.blue[700],
            size: 24,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                licensePlate,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Colors.blue[700],
                ),
              ),
              if (status != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: _getStatusColor(status!),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    _getStatusText(status!),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTruckDetails(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        children: [
          _buildDetailRow(
            icon: Icons.person,
            label: 'Supir',
            value: driverName,
            context: context,
          ),
          const SizedBox(height: 8),
          _buildDetailRow(
            icon: Icons.receipt_long,
            label: 'No. DO',
            value: doNumber.isEmpty ? 'Tidak ada' : doNumber,
            context: context,
          ),
          const SizedBox(height: 8),
          _buildDetailRow(
            icon: Icons.scale,
            label: 'Estimasi Berat',
            value: '${estimatedWeight.toStringAsFixed(1)} kg',
            context: context,
          ),
        ],
      ),
    );
  }


  Widget _buildTimeInfo(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.orange[50],
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.orange[200]!),
      ),
      child: Column(
        children: [
          if (entryTime != null)
            _buildTimeRow(
              icon: Icons.login,
              label: 'Waktu Masuk',
              time: entryTime!,
              color: Colors.green,
              context: context,
            ),
          if (entryTime != null && exitTime != null)
            const SizedBox(height: 8),
          if (exitTime != null)
            _buildTimeRow(
              icon: Icons.logout,
              label: 'Waktu Keluar',
              time: exitTime!,
              color: Colors.red,
              context: context,
            ),
          if (entryTime != null && exitTime != null) ...[
            const SizedBox(height: 8),
            const Divider(),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  Icons.timer,
                  color: Colors.orange[700],
                  size: 20,
                ),
                const SizedBox(width: 8),
                Text(
                  'Durasi: ${_calculateDuration(entryTime!, exitTime!)}',
                  style: TextStyle(
                    color: Colors.orange[700],
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailRow({
    required IconData icon,
    required String label,
    required String value,
    required BuildContext context,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          color: Colors.grey[600],
          size: 20,
        ),
        const SizedBox(width: 8),
        Text(
          '$label:',
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.grey[600],
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTimeRow({
    required IconData icon,
    required String label,
    required DateTime time,
    required Color color,
    required BuildContext context,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          color: color.withOpacity(0.8),
          size: 20,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  color: color.withOpacity(0.8),
                  fontWeight: FontWeight.w600,
                  fontSize: 12,
                ),
              ),
              Text(
                '${_formatDate(time)} • ${_formatTime(time)}',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'ENTRY':
        return Colors.blue;
      case 'EXIT':
        return Colors.green;
      case 'PENDING':
        return Colors.orange;
      case 'COMPLETED':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String status) {
    switch (status.toUpperCase()) {
      case 'ENTRY':
        return 'MASUK';
      case 'EXIT':
        return 'KELUAR';
      case 'PENDING':
        return 'PENDING';
      case 'COMPLETED':
        return 'SELESAI';
      default:
        return status;
    }
  }

  String _formatDate(DateTime dateTime) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
    ];
    return '${dateTime.day} ${months[dateTime.month - 1]} ${dateTime.year}';
  }

  String _formatTime(DateTime dateTime) {
    return '${dateTime.hour.toString().padLeft(2, '0')}:'
           '${dateTime.minute.toString().padLeft(2, '0')}';
  }

  String _calculateDuration(DateTime start, DateTime end) {
    final duration = end.difference(start);
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);
    
    if (hours > 0) {
      return '${hours}h ${minutes}m';
    } else {
      return '${minutes}m';
    }
  }
}