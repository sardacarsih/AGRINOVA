import 'package:flutter/material.dart';
import 'package:logger/logger.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'bluetooth_printer_service.dart';

/// ESC/POS Commands for thermal printer
class ESCPOSCommands {
  // Initialize printer
  static const List<int> init = [0x1B, 0x40];

  // Text alignment
  static const List<int> alignLeft = [0x1B, 0x61, 0x00];
  static const List<int> alignCenter = [0x1B, 0x61, 0x01];
  static const List<int> alignRight = [0x1B, 0x61, 0x02];

  // Text formatting
  static const List<int> boldOn = [0x1B, 0x45, 0x01];
  static const List<int> boldOff = [0x1B, 0x45, 0x00];
  static const List<int> doubleHeightOn = [0x1B, 0x21, 0x10];
  static const List<int> doubleWidthOn = [0x1B, 0x21, 0x20];
  static const List<int> doubleWidthHeightOn = [0x1B, 0x21, 0x30];
  static const List<int> normalText = [0x1B, 0x21, 0x00];

  // Line spacing
  static const List<int> lineSpacing24 = [0x1B, 0x33, 0x18];
  static const List<int> lineSpacingDefault = [0x1B, 0x32];

  // Paper feed and cut
  static const List<int> feedLine = [0x0A];
  static const List<int> feedLines3 = [0x1B, 0x64, 0x03];
  static const List<int> feedLines5 = [0x1B, 0x64, 0x05];
  static const List<int> partialCut = [0x1D, 0x56, 0x01];
  static const List<int> fullCut = [0x1D, 0x56, 0x00];

  // Character set (UTF-8)
  static const List<int> charsetUTF8 = [0x1B, 0x74, 0x00];
}

/// Ticket data model for printing
class TicketData {
  final String guestName;
  final String vehiclePlate;
  final String destination;
  final DateTime expiryTime;
  final String qrData;
  final String gateId;
  final String? guestCompany;
  final String? notes;

  const TicketData({
    required this.guestName,
    required this.vehiclePlate,
    required this.destination,
    required this.expiryTime,
    required this.qrData,
    required this.gateId,
    this.guestCompany,
    this.notes,
  });
}

/// Ticket Printer Service for ESC/POS thermal printers
///
/// Generates visitor pass tickets with QR codes for gate check system.
/// Supports 58mm and 80mm paper widths.
class TicketPrinterService {
  static final Logger _logger = Logger();
  static TicketPrinterService? _instance;

  final BluetoothPrinterService _printerService = BluetoothPrinterService.instance;

  // Paper width settings (in characters)
  static const int charWidth58mm = 32;
  static const int charWidth80mm = 48;

  int _currentWidth = charWidth58mm;

  TicketPrinterService._internal();

  static TicketPrinterService get instance {
    _instance ??= TicketPrinterService._internal();
    return _instance!;
  }

  /// Set paper width (58mm or 80mm)
  void setPaperWidth(int widthMm) {
    _currentWidth = widthMm == 80 ? charWidth80mm : charWidth58mm;
    _logger.i('Paper width set to ${widthMm}mm ($_currentWidth chars)');
  }

  /// Check if printer is connected
  bool get isConnected => _printerService.isConnected;

  /// Print visitor pass ticket
  Future<PosPrintResult> printVisitorPass(TicketData ticket) async {
    if (!isConnected) {
      _logger.w('Printer not connected');
      return PosPrintResult.printerNotSelected;
    }

    try {
      _logger.i('Generating visitor pass ticket...');
      final bytes = await _generateTicketBytes(ticket);

      _logger.i('Sending ${bytes.length} bytes to printer...');
      final result = await _printerService.printTicket(bytes);

      if (result.value == PosPrintResult.success.value) {
        _logger.i('Ticket printed successfully');
      } else {
        _logger.e('Print failed: ${result.msg}');
      }

      return result;
    } catch (e) {
      _logger.e('Error printing ticket: $e');
      return PosPrintResult(value: 99, msg: 'Error: $e');
    }
  }

  /// Generate ticket bytes for ESC/POS printer
  Future<List<int>> _generateTicketBytes(TicketData ticket) async {
    final bytes = <int>[];

    // Initialize printer
    bytes.addAll(ESCPOSCommands.init);
    bytes.addAll(ESCPOSCommands.charsetUTF8);

    // Header
    bytes.addAll(ESCPOSCommands.alignCenter);
    bytes.addAll(ESCPOSCommands.boldOn);
    bytes.addAll(ESCPOSCommands.doubleWidthOn);
    bytes.addAll(_textToBytes('AGRINOVA'));
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(ESCPOSCommands.normalText);
    bytes.addAll(ESCPOSCommands.boldOff);

    bytes.addAll(_textToBytes('VISITOR PASS'));
    bytes.addAll(ESCPOSCommands.feedLine);

    // Divider
    bytes.addAll(_dividerBytes());
    bytes.addAll(ESCPOSCommands.feedLine);

    // Guest info
    bytes.addAll(ESCPOSCommands.alignLeft);

    // Tamu (Guest Name)
    bytes.addAll(ESCPOSCommands.boldOn);
    bytes.addAll(_textToBytes('Tamu:'));
    bytes.addAll(ESCPOSCommands.boldOff);
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(_textToBytes('  ${ticket.guestName}'));
    bytes.addAll(ESCPOSCommands.feedLine);

    // Company (if available)
    if (ticket.guestCompany != null && ticket.guestCompany!.isNotEmpty) {
      bytes.addAll(ESCPOSCommands.boldOn);
      bytes.addAll(_textToBytes('Perusahaan:'));
      bytes.addAll(ESCPOSCommands.boldOff);
      bytes.addAll(ESCPOSCommands.feedLine);
      bytes.addAll(_textToBytes('  ${ticket.guestCompany}'));
      bytes.addAll(ESCPOSCommands.feedLine);
    }

    // Plat (Vehicle Plate)
    bytes.addAll(ESCPOSCommands.boldOn);
    bytes.addAll(_textToBytes('Plat:'));
    bytes.addAll(ESCPOSCommands.boldOff);
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(ESCPOSCommands.doubleWidthOn);
    bytes.addAll(_textToBytes('  ${ticket.vehiclePlate}'));
    bytes.addAll(ESCPOSCommands.normalText);
    bytes.addAll(ESCPOSCommands.feedLine);

    // Tujuan (Destination)
    bytes.addAll(ESCPOSCommands.boldOn);
    bytes.addAll(_textToBytes('Tujuan:'));
    bytes.addAll(ESCPOSCommands.boldOff);
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(_textToBytes('  ${ticket.destination}'));
    bytes.addAll(ESCPOSCommands.feedLine);

    // Expiry
    bytes.addAll(ESCPOSCommands.boldOn);
    bytes.addAll(_textToBytes('Berlaku sampai:'));
    bytes.addAll(ESCPOSCommands.boldOff);
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(_textToBytes('  ${_formatDateTime(ticket.expiryTime)}'));
    bytes.addAll(ESCPOSCommands.feedLine);

    // Notes (if available)
    if (ticket.notes != null && ticket.notes!.isNotEmpty) {
      bytes.addAll(ESCPOSCommands.boldOn);
      bytes.addAll(_textToBytes('Catatan:'));
      bytes.addAll(ESCPOSCommands.boldOff);
      bytes.addAll(ESCPOSCommands.feedLine);
      bytes.addAll(_textToBytes('  ${ticket.notes}'));
      bytes.addAll(ESCPOSCommands.feedLine);
    }

    // Divider before QR
    bytes.addAll(_dividerBytes());
    bytes.addAll(ESCPOSCommands.feedLine);

    // QR Code
    bytes.addAll(ESCPOSCommands.alignCenter);
    final qrBytes = await _generateQRBytes(ticket.qrData);
    bytes.addAll(qrBytes);
    bytes.addAll(ESCPOSCommands.feedLine);

    // Divider after QR
    bytes.addAll(_dividerBytes());
    bytes.addAll(ESCPOSCommands.feedLine);

    // Footer info
    bytes.addAll(ESCPOSCommands.alignLeft);
    final now = DateTime.now();
    bytes.addAll(_textToBytes('Entry: ${_formatDateTime(now)}'));
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(_textToBytes('Gate: ${ticket.gateId}'));
    bytes.addAll(ESCPOSCommands.feedLine);

    // Footer message
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(ESCPOSCommands.alignCenter);
    bytes.addAll(_textToBytes('Tunjukkan QR code ini'));
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(_textToBytes('saat checkpoint'));
    bytes.addAll(ESCPOSCommands.feedLine);

    // Feed and cut
    bytes.addAll(ESCPOSCommands.feedLines5);
    bytes.addAll(ESCPOSCommands.partialCut);

    return bytes;
  }

  /// Generate QR code bytes for ESC/POS
  Future<List<int>> _generateQRBytes(String data) async {
    final bytes = <int>[];

    // QR Code model (Model 2)
    bytes.addAll([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]);

    // QR Code size (module size 6)
    bytes.addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06]);

    // QR Code error correction (Level M - 15%)
    bytes.addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31]);

    // Store QR Code data
    final dataBytes = _textToBytes(data);
    final dataLen = dataBytes.length + 3;
    final pL = dataLen % 256;
    final pH = dataLen ~/ 256;
    bytes.addAll([0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30]);
    bytes.addAll(dataBytes);

    // Print QR Code
    bytes.addAll([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]);

    return bytes;
  }

  /// Convert text to bytes
  List<int> _textToBytes(String text) {
    // Use Latin-1 encoding for better thermal printer compatibility
    try {
      return text.codeUnits.map((c) => c > 255 ? 63 : c).toList(); // Replace non-Latin1 with '?'
    } catch (e) {
      return text.codeUnits;
    }
  }

  /// Generate divider line
  List<int> _dividerBytes() {
    return _textToBytes('-' * _currentWidth);
  }

  /// Format datetime
  String _formatDateTime(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}/'
        '${dt.month.toString().padLeft(2, '0')}/'
        '${dt.year} '
        '${dt.hour.toString().padLeft(2, '0')}:'
        '${dt.minute.toString().padLeft(2, '0')}';
  }

  /// Generate QR code image widget for display fallback
  static Widget buildQRWidget({
    required String data,
    double size = 200,
    Color foregroundColor = Colors.black,
    Color backgroundColor = Colors.white,
  }) {
    return QrImageView(
      data: data,
      version: QrVersions.auto,
      size: size,
      backgroundColor: backgroundColor,
      eyeStyle: QrEyeStyle(
        eyeShape: QrEyeShape.square,
        color: foregroundColor,
      ),
      dataModuleStyle: QrDataModuleStyle(
        dataModuleShape: QrDataModuleShape.square,
        color: foregroundColor,
      ),
      errorCorrectionLevel: QrErrorCorrectLevel.M,
    );
  }

  /// Test print - prints a test pattern
  Future<PosPrintResult> printTestPage() async {
    if (!isConnected) {
      return PosPrintResult.printerNotSelected;
    }

    final bytes = <int>[];

    bytes.addAll(ESCPOSCommands.init);
    bytes.addAll(ESCPOSCommands.alignCenter);
    bytes.addAll(ESCPOSCommands.boldOn);
    bytes.addAll(_textToBytes('=== TEST PRINT ==='));
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(ESCPOSCommands.boldOff);
    bytes.addAll(_textToBytes('Agrinova Gate Check'));
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(_dividerBytes());
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(_textToBytes('Printer OK'));
    bytes.addAll(ESCPOSCommands.feedLine);
    bytes.addAll(_textToBytes(_formatDateTime(DateTime.now())));
    bytes.addAll(ESCPOSCommands.feedLines5);
    bytes.addAll(ESCPOSCommands.partialCut);

    return await _printerService.printTicket(bytes);
  }
}
