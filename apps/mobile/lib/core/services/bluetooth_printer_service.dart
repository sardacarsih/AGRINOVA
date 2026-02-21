import 'dart:async';
import 'dart:typed_data';
import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import 'package:logger/logger.dart';
import 'package:permission_handler/permission_handler.dart';

class BluetoothPrinterService {
  static final BluetoothPrinterService _instance = BluetoothPrinterService._internal();
  static BluetoothPrinterService get instance => _instance;

  final FlutterBluetoothSerial _bluetooth = FlutterBluetoothSerial.instance;
  final Logger _logger = Logger();
  
  BluetoothConnection? _connection;
  // Track connected address manually since BluetoothConnection might not expose it identically
  String? _connectedAddress;
  
  bool get isConnected => _connection != null && _connection!.isConnected;
  String? get connectedAddress => _connectedAddress;
  
  // Stream for scanning
  StreamSubscription<BluetoothDiscoveryResult>? _scanSubscription;
  final StreamController<List<BluetoothDevice>> _scanController = StreamController<List<BluetoothDevice>>.broadcast();
  Stream<List<BluetoothDevice>> get scanResults => _scanController.stream;
  List<BluetoothDevice> _devices = [];

  BluetoothPrinterService._internal();

  /// Start scanning for devices
  Future<void> startScan() async {
    _devices.clear();
    _scanController.add(_devices);

    try {
      // 1. Request Runtime Permissions (Android 12+)
      Map<Permission, PermissionStatus> statuses = await [
        Permission.bluetoothScan,
        Permission.bluetoothConnect,
        Permission.location, // Often required for scanning
      ].request();

      if (statuses[Permission.bluetoothScan]?.isDenied == true || 
          statuses[Permission.bluetoothConnect]?.isDenied == true) {
        _logger.w('Bluetooth permissions denied');
        return;
      }

      // 2. Ensure Bluetooth Adapter is On
      bool? isEnabled = await _bluetooth.isEnabled;
      if (isEnabled == false) {
        // Request enabling bluetooth (system dialog)
        bool? enabled = await _bluetooth.requestEnable();
        if (enabled != true) {
             _logger.w('Bluetooth not enabled by user');
             return;
        }
      }

      // 3. Start Discovery
      await _scanSubscription?.cancel();
      
      _scanSubscription = _bluetooth.startDiscovery().listen((result) {
        final device = result.device;
        // Filter for bonded or unbonded, avoiding duplicates
        final existingIndex = _devices.indexWhere((d) => d.address == device.address);
        if (existingIndex >= 0) {
          _devices[existingIndex] = device;
        } else {
          _devices.add(device);
        }
        _scanController.add(_devices);
      });
      
      _scanSubscription?.onDone(() {
        _logger.i('Bluetooth scan finished');
      });
    } catch (e) {
      _logger.e('Error starting scan: $e');
    }
  }

  /// Stop scanning
  Future<void> stopScan() async {
    await _scanSubscription?.cancel();
    _scanSubscription = null;
  }

  /// Connect to a device with retry logic
  Future<bool> connect(BluetoothDevice device) async {
    if (isConnected && _connectedAddress == device.address) {
      return true; // Already connected to this device
    }

    // Force disconnect to be safe
    await disconnect();
    await Future.delayed(const Duration(milliseconds: 200));

    int retries = 3;
    while (retries > 0) {
      try {
        // Ensure connect permission
        if (await Permission.bluetoothConnect.request().isDenied) {
           _logger.w('Bluetooth connect permission denied');
           return false;
        }

        _logger.i('Connecting to ${device.name} (${device.address}) (Attempt ${4 - retries})...');
        _connection = await BluetoothConnection.toAddress(device.address);
        
        if (isConnected) {
          _connectedAddress = device.address;
          _logger.i('Connected to ${device.address}');
          return true;
        }
      } catch (e) {
        _logger.w('Connection attempt failed: $e');
        if (retries == 1) {
          _logger.e('Final connection failure: $e');
        }
      }
      retries--;
      if (retries > 0) {
         await Future.delayed(const Duration(milliseconds: 1000));
      }
    }
    return false;
  }

  /// connect by address string with retry logic
  Future<bool> connectByAddress(String address) async {
     if (isConnected && _connectedAddress == address) {
      return true;
    }
    await disconnect();
    await Future.delayed(const Duration(milliseconds: 200));

    int retries = 3;
    while (retries > 0) {
      try {
        // Ensure connect permission
        if (await Permission.bluetoothConnect.request().isDenied) {
           _logger.w('Bluetooth connect permission denied');
           return false;
        }
        
        _logger.i('Connecting to $address (Attempt ${4 - retries})...');
        _connection = await BluetoothConnection.toAddress(address);
        
        if (isConnected) {
          _connectedAddress = address;
          _logger.i('Connected to $address');
          return true;
        }
      } catch (e) {
         _logger.w('Connection attempt failed: $e');
      }
      retries--;
      if (retries > 0) {
         await Future.delayed(const Duration(milliseconds: 1000));
      }
    }
    _logger.e('Failed to connect to $address after retries');
    return false;
  }

  /// Disconnect current device
  Future<void> disconnect() async {
    if (_connection != null) {
      await _connection!.finish(); // Waits for pending data
      _connection = null;
      _connectedAddress = null;
    }
  }

  /// Send raw bytes to printer
  Future<PosPrintResult> printTicket(List<int> bytes) async {
    if (!isConnected || _connection == null) {
      return PosPrintResult(value: PosPrintResult.printerNotSelected.value, msg: 'Printer not connected');
    }

    try {
      _connection!.output.add(Uint8List.fromList(bytes));
      await _connection!.output.allSent;
      return PosPrintResult(value: PosPrintResult.success.value, msg: 'Berhasil mencetak');
    } catch (e) {
      _logger.e('Error printing: $e');
      return PosPrintResult(value: PosPrintResult.timeout.value, msg: 'Error mencetak: $e');
    }
  }
}

// Simple wrapper for result
class PosPrintResult {
  static const success = PosPrintResult(value: 1, msg: 'Success');
  static const timeout = PosPrintResult(value: 2, msg: 'Timeout');
  static const printerNotSelected = PosPrintResult(value: 3, msg: 'Printer not selected');
  static const ticketEmpty = PosPrintResult(value: 4, msg: 'Ticket empty');
  static const printInProgress = PosPrintResult(value: 5, msg: 'Print in progress');
  static const scanInProgress = PosPrintResult(value: 6, msg: 'Scan in progress');

  final int value;
  final String msg;
  const PosPrintResult({required this.value, required this.msg});
}
