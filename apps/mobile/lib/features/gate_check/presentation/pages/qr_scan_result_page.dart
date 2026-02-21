import 'package:flutter/material.dart';
import '../../data/models/gate_check_models.dart';
import '../widgets/truck_info_widget.dart';

class QRScanResultPage extends StatefulWidget {
  final Map<String, dynamic> guestData;
  final String scannedToken;
  final GateCheckDirection detectedDirection;

  const QRScanResultPage({
    Key? key,
    required this.guestData,
    required this.scannedToken,
    required this.detectedDirection,
  }) : super(key: key);

  @override
  State<QRScanResultPage> createState() => _QRScanResultPageState();
}

class _QRScanResultPageState extends State<QRScanResultPage> {
  final TextEditingController _notesController = TextEditingController();
  final TextEditingController _secondCargoController = TextEditingController();
  double _actualWeight = 0.0;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    final existingSecondCargo =
        (widget.guestData['second_cargo'] ?? widget.guestData['secondCargo'])
            ?.toString();
    if (existingSecondCargo != null && existingSecondCargo.trim().isNotEmpty) {
      _secondCargoController.text = existingSecondCargo.trim();
    }
  }

  @override
  void dispose() {
    _notesController.dispose();
    _secondCargoController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final directionText = widget.detectedDirection == GateCheckDirection.entry
        ? 'MASUK'
        : 'KELUAR';
    final directionColor = widget.detectedDirection == GateCheckDirection.entry
        ? Colors.green
        : Colors.red;
    final directionIcon = widget.detectedDirection == GateCheckDirection.entry
        ? Icons.login
        : Icons.logout;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text('Detail QR Tamu'),
        backgroundColor: directionColor,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _buildScanResultHeader(
                directionText, directionColor, directionIcon),
            const SizedBox(height: 16),
            _buildGuestInfoCard(),
            const SizedBox(height: 16),
            _buildAdditionalInfoCard(),
            const SizedBox(height: 24),
            _buildActionButtons(),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildScanResultHeader(
      String directionText, Color directionColor, IconData directionIcon) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            directionColor,
            directionColor.withOpacity(0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: directionColor.withOpacity(0.3),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Icon(
            directionIcon,
            size: 48,
            color: Colors.white,
          ),
          const SizedBox(height: 12),
          Text(
            'QR Code Valid untuk $directionText',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              'Status: Berhasil di-scan',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGuestInfoCard() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.blue[100],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.person_outline,
                    color: Colors.blue[700],
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Informasi Tamu',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue[700],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildInfoRow(
                'Nama Tamu', widget.guestData['name'] ?? 'Tidak tersedia'),
            _buildInfoRow('Nomor Polisi',
                widget.guestData['vehicle_plate'] ?? 'Tidak tersedia'),
            _buildInfoRow(
                'Tujuan', widget.guestData['destination'] ?? 'Business Visit'),
            _buildInfoRow('Jenis Kargo',
                widget.guestData['cargo_type'] ?? 'General Cargo'),
            if (widget.guestData['do_number'] != null &&
                widget.guestData['do_number'].toString().isNotEmpty)
              _buildInfoRow('No. DO', widget.guestData['do_number']),
            _buildInfoRow(
              'Estimasi Berat',
              '${(widget.guestData['estimated_weight'] as num?)?.toDouble() ?? 0.0} kg',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAdditionalInfoCard() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.orange[100],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.edit_note,
                    color: Colors.orange[700],
                    size: 24,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Informasi Tambahan',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange[700],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (widget.detectedDirection == GateCheckDirection.exit) ...[
              TextFormField(
                decoration: InputDecoration(
                  labelText: 'Berat Aktual (kg)',
                  hintText: 'Masukkan berat aktual setelah timbang',
                  prefixIcon: const Icon(Icons.scale),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                keyboardType: TextInputType.number,
                onChanged: (value) {
                  _actualWeight = double.tryParse(value) ?? 0.0;
                },
              ),
              const SizedBox(height: 16),
            ],
            // Muatan 2nd Field - for additional cargo input
            TextFormField(
              controller: _secondCargoController,
              decoration: InputDecoration(
                labelText: 'Angkutan Sekondari (Opsional)',
                hintText: 'Contoh: pupuk, alat, atau muatan tambahan',
                prefixIcon: const Icon(Icons.inventory_2_outlined),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _notesController,
              decoration: InputDecoration(
                labelText: 'Catatan',
                hintText: 'Tambahkan catatan jika diperlukan',
                prefixIcon: const Icon(Icons.notes),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              maxLines: 3,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              '$label:',
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: Colors.grey[600],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton.icon(
            onPressed: _isSubmitting ? null : _handleSubmit,
            icon: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                    ),
                  )
                : const Icon(Icons.check_circle),
            label: Text(
              _isSubmitting ? 'Menyimpan...' : 'Konfirmasi Gate Check',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor:
                  widget.detectedDirection == GateCheckDirection.entry
                      ? Colors.green
                      : Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: OutlinedButton.icon(
            onPressed: _isSubmitting ? null : () => Navigator.of(context).pop(),
            icon: const Icon(Icons.arrow_back),
            label: const Text(
              'Kembali ke Scanner',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
              ),
            ),
            style: OutlinedButton.styleFrom(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _handleSubmit() {
    setState(() {
      _isSubmitting = true;
    });

    final normalizedSecondCargo = _secondCargoController.text.trim();

    // Pass the data back to the previous screen
    Navigator.of(context).pop({
      'confirmed': true,
      'guestData': widget.guestData,
      'scannedToken': widget.scannedToken,
      'detectedDirection': widget.detectedDirection,
      'actualWeight': _actualWeight,
      'secondCargo':
          normalizedSecondCargo.isNotEmpty ? normalizedSecondCargo : null,
      'notes': _notesController.text.trim(),
    });
  }
}
