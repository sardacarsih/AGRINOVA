import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:logger/logger.dart';
import 'package:screen_brightness/screen_brightness.dart';

import '../../../../core/services/ticket_printer_service.dart';

/// QR Display Screen
///
/// Full screen QR code display as fallback when printer is offline.
/// Features:
/// - Full screen QR code display
/// - Guest info overlay
/// - Auto brightness boost for better scanning
/// - Retry print button
class QRDisplayScreen extends StatefulWidget {
  final TicketData ticketData;
  final Future<bool> Function()? onRetryPrint;
  final VoidCallback? onDone;

  const QRDisplayScreen({
    Key? key,
    required this.ticketData,
    this.onRetryPrint,
    this.onDone,
  }) : super(key: key);

  @override
  State<QRDisplayScreen> createState() => _QRDisplayScreenState();
}

class _QRDisplayScreenState extends State<QRDisplayScreen> {
  static final Logger _logger = Logger();

  bool _isRetrying = false;
  double? _originalBrightness;
  bool _showDetails = true;

  @override
  void initState() {
    super.initState();
    _boostBrightness();
    // Keep screen on
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    _restoreBrightness();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  Future<void> _boostBrightness() async {
    try {
      _originalBrightness = await ScreenBrightness().current;
      await ScreenBrightness().setScreenBrightness(1.0);
      _logger.i('Screen brightness boosted to max');
    } catch (e) {
      _logger.w('Could not boost brightness: $e');
    }
  }

  Future<void> _restoreBrightness() async {
    try {
      if (_originalBrightness != null) {
        await ScreenBrightness().setScreenBrightness(_originalBrightness!);
        _logger.i('Screen brightness restored');
      }
    } catch (e) {
      _logger.w('Could not restore brightness: $e');
    }
  }

  Future<void> _retryPrint() async {
    if (widget.onRetryPrint == null) return;

    setState(() => _isRetrying = true);

    try {
      final success = await widget.onRetryPrint!();

      if (success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Tiket berhasil dicetak'),
              backgroundColor: Colors.green,
            ),
          );
          widget.onDone?.call();
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Gagal mencetak tiket'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      _logger.e('Error retrying print: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isRetrying = false);
      }
    }
  }

  String _formatDateTime(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}/'
        '${dt.month.toString().padLeft(2, '0')}/'
        '${dt.year} '
        '${dt.hour.toString().padLeft(2, '0')}:'
        '${dt.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.black87),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'QR Code Tamu',
          style: TextStyle(color: Colors.black87),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            icon: Icon(
              _showDetails ? Icons.visibility_off : Icons.visibility,
              color: Colors.black87,
            ),
            onPressed: () => setState(() => _showDetails = !_showDetails),
            tooltip: _showDetails ? 'Sembunyikan detail' : 'Tampilkan detail',
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Guest info header
            if (_showDetails) _buildInfoHeader(),

            // QR Code (main)
            Expanded(
              child: Center(
                child: Container(
                  padding: const EdgeInsets.all(24),
                  margin: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // QR Code
                      TicketPrinterService.buildQRWidget(
                        data: widget.ticketData.qrData,
                        size: MediaQuery.of(context).size.width * 0.6,
                      ),
                      const SizedBox(height: 20),

                      // Vehicle plate (prominent)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.grey[100],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          widget.ticketData.vehiclePlate,
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Expiry info
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.timer_outlined, size: 16, color: Colors.grey[600]),
                          const SizedBox(width: 6),
                          Text(
                            'Berlaku sampai: ${_formatDateTime(widget.ticketData.expiryTime)}',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Bottom actions
            _buildBottomActions(),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoHeader() {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.green.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.green.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Icon(Icons.person_outline, color: Colors.green, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Tamu',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey,
                      ),
                    ),
                    Text(
                      widget.ticketData.guestName,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (widget.ticketData.guestCompany != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.business_outlined, color: Colors.green, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Perusahaan',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                        ),
                      ),
                      Text(
                        widget.ticketData.guestCompany!,
                        style: const TextStyle(
                          fontWeight: FontWeight.w500,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    const Icon(Icons.location_on_outlined, color: Colors.green, size: 20),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Tujuan',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey,
                            ),
                          ),
                          Text(
                            widget.ticketData.destination,
                            style: const TextStyle(
                              fontWeight: FontWeight.w500,
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBottomActions() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          // Retry print button
          if (widget.onRetryPrint != null)
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _isRetrying ? null : _retryPrint,
                icon: _isRetrying
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.print),
                label: Text(_isRetrying ? 'Mencetak...' : 'Coba Cetak'),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          if (widget.onRetryPrint != null) const SizedBox(width: 12),

          // Done button
          Expanded(
            child: ElevatedButton.icon(
              onPressed: widget.onDone ?? () => Navigator.pop(context),
              icon: const Icon(Icons.check),
              label: const Text('Selesai'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
