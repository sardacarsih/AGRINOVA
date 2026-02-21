import 'package:flutter/material.dart';
import 'package:graphql_flutter/graphql_flutter.dart';
import 'package:logger/logger.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../../../core/di/dependency_injection.dart';
import '../../../../core/network/graphql_client_service.dart';

class WebQRLoginPage extends StatefulWidget {
  const WebQRLoginPage({super.key});

  @override
  State<WebQRLoginPage> createState() => _WebQRLoginPageState();
}

class _WebQRLoginPageState extends State<WebQRLoginPage> {
  static final Logger _logger = Logger();
  static const String _approveWebQRLoginMutation = r'''
    mutation ApproveWebQRLogin($input: WebQRApproveInput!) {
      approveWebQRLogin(input: $input) {
        success
        sessionId
        status
        message
      }
    }
  ''';

  final MobileScannerController _scannerController = MobileScannerController();

  bool _isFlashOn = false;
  bool _isProcessing = false;
  String _statusTitle = 'Siap Scan';
  String _statusMessage =
      'Arahkan kamera ke QR dari halaman login web untuk menyetujui login.';
  Color _statusColor = const Color(0xFF2563EB);
  DateTime? _lastScanAt;
  String? _lastScanData;

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_isProcessing || capture.barcodes.isEmpty) {
      return;
    }

    final raw = capture.barcodes.first.rawValue?.trim();
    if (raw == null || raw.isEmpty) {
      return;
    }

    final now = DateTime.now();
    if (_lastScanData == raw &&
        _lastScanAt != null &&
        now.difference(_lastScanAt!) < const Duration(seconds: 2)) {
      return;
    }
    _lastScanData = raw;
    _lastScanAt = now;

    await _approveFromQR(raw);
  }

  Future<void> _approveFromQR(String qrData) async {
    final payload = _parseWebQRPayload(qrData);
    if (payload == null) {
      _setStatus(
        title: 'QR Tidak Didukung',
        message: 'QR ini bukan QR login web Agrinova.',
        color: const Color(0xFFDC2626),
      );
      return;
    }

    if (payload.isExpired) {
      _setStatus(
        title: 'QR Kedaluwarsa',
        message: 'Silakan refresh QR di browser lalu scan ulang.',
        color: const Color(0xFFDC2626),
      );
      return;
    }

    _setStatus(
      title: 'Memproses',
      message: 'Mengirim persetujuan login ke server...',
      color: const Color(0xFFF59E0B),
      processing: true,
    );

    try {
      final graphQLClient = sl<GraphQLClientService>();
      final result = await graphQLClient.mutate(
        MutationOptions(
          document: gql(_approveWebQRLoginMutation),
          variables: {
            'input': {
              'sessionId': payload.sessionId,
              'challenge': payload.challenge,
            },
          },
          fetchPolicy: FetchPolicy.networkOnly,
          errorPolicy: ErrorPolicy.all,
        ),
      );

      if (!mounted) {
        return;
      }

      if (result.hasException) {
        final errorMessage = _extractGraphQLError(result.exception);
        _setStatus(
          title: 'Approve Gagal',
          message: errorMessage,
          color: const Color(0xFFDC2626),
        );
        return;
      }

      final data = result.data?['approveWebQRLogin'] as Map<String, dynamic>?;
      if (data == null) {
        _setStatus(
          title: 'Response Tidak Valid',
          message: 'Server tidak mengembalikan data yang diharapkan.',
          color: const Color(0xFFDC2626),
        );
        return;
      }

      final success = data['success'] == true;
      final status = (data['status']?.toString() ?? '').toUpperCase();
      final message = (data['message']?.toString() ?? 'QR login gagal').trim();

      if (success && (status == 'APPROVED' || status == 'CONSUMED')) {
        _setStatus(
          title: 'Berhasil',
          message: '$message. Lanjutkan proses login di browser.',
          color: const Color(0xFF059669),
        );
        return;
      }

      _setStatus(
        title: 'Tidak Berhasil',
        message: message,
        color: const Color(0xFFDC2626),
      );
    } catch (e) {
      _logger.e('Error approving web QR login', error: e);
      if (!mounted) {
        return;
      }
      _setStatus(
        title: 'Terjadi Error',
        message: e.toString(),
        color: const Color(0xFFDC2626),
      );
    } finally {
      if (mounted) {
        setState(() => _isProcessing = false);
      }
    }
  }

  _WebQRPayload? _parseWebQRPayload(String raw) {
    final uri = Uri.tryParse(raw);
    if (uri == null) {
      return null;
    }

    if (uri.scheme.toLowerCase() != 'agrinova' ||
        uri.host.toLowerCase() != 'login') {
      return null;
    }

    final sessionId = uri.queryParameters['sessionId']?.trim() ?? '';
    final challenge = uri.queryParameters['challenge']?.trim() ?? '';
    if (sessionId.isEmpty || challenge.isEmpty) {
      return null;
    }

    DateTime? expiresAt;
    final expRaw = uri.queryParameters['exp'];
    if (expRaw != null && expRaw.isNotEmpty) {
      final exp = int.tryParse(expRaw);
      if (exp != null) {
        expiresAt = DateTime.fromMillisecondsSinceEpoch(exp * 1000);
      }
    }

    return _WebQRPayload(
      sessionId: sessionId,
      challenge: challenge,
      expiresAt: expiresAt,
    );
  }

  String _extractGraphQLError(OperationException? exception) {
    if (exception == null) {
      return 'Unknown error';
    }
    if (exception.graphqlErrors.isNotEmpty) {
      return exception.graphqlErrors.first.message;
    }
    if (exception.linkException != null) {
      return exception.linkException.toString();
    }
    return exception.toString();
  }

  void _setStatus({
    required String title,
    required String message,
    required Color color,
    bool processing = false,
  }) {
    if (!mounted) {
      return;
    }
    setState(() {
      _statusTitle = title;
      _statusMessage = message;
      _statusColor = color;
      _isProcessing = processing;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('QR Login Web'),
        actions: [
          IconButton(
            tooltip: 'Flash',
            onPressed: () {
              setState(() => _isFlashOn = !_isFlashOn);
              _scannerController.toggleTorch();
            },
            icon: Icon(_isFlashOn ? Icons.flash_on : Icons.flash_off),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF3F4F6),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE5E7EB)),
              ),
              child: const Text(
                'Buka halaman login web, pilih Login dengan QR, lalu scan kodenya di sini.',
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    MobileScanner(
                      controller: _scannerController,
                      onDetect: _onDetect,
                    ),
                    if (_isProcessing)
                      Container(
                        color: Colors.black.withValues(alpha: 0.45),
                        child: const Center(
                          child: CircularProgressIndicator(color: Colors.white),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: _statusColor.withValues(alpha: 0.4)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _statusTitle,
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: _statusColor,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(_statusMessage),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WebQRPayload {
  final String sessionId;
  final String challenge;
  final DateTime? expiresAt;

  const _WebQRPayload({
    required this.sessionId,
    required this.challenge,
    required this.expiresAt,
  });

  bool get isExpired {
    if (expiresAt == null) {
      return false;
    }
    return DateTime.now().isAfter(expiresAt!);
  }
}
