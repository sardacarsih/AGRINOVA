import 'dart:typed_data';

final RegExp _uuidPattern = RegExp(
  r'^[0-9a-fA-F]{8}-'
  r'[0-9a-fA-F]{4}-'
  r'[0-9a-fA-F]{4}-'
  r'[0-9a-fA-F]{4}-'
  r'[0-9a-fA-F]{12}$',
);

bool isUuidString(String value) => _uuidPattern.hasMatch(value.trim());

Uint8List uuidToBytes(String uuid) {
  final normalized = uuid.trim().toLowerCase();
  if (!isUuidString(normalized)) {
    throw FormatException('Invalid UUID: $uuid');
  }

  final hex = normalized.replaceAll('-', '');
  final out = Uint8List(16);
  for (var i = 0; i < 16; i++) {
    out[i] = int.parse(hex.substring(i * 2, i * 2 + 2), radix: 16);
  }
  return out;
}

String bytesToUuid(Uint8List bytes) {
  if (bytes.length != 16) {
    throw FormatException('Invalid UUID byte length: ${bytes.length}');
  }
  final hex = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${hex.substring(0, 8)}-'
      '${hex.substring(8, 12)}-'
      '${hex.substring(12, 16)}-'
      '${hex.substring(16, 20)}-'
      '${hex.substring(20)}';
}

String? dbUuidToString(dynamic value) {
  if (value == null) return null;
  if (value is Uint8List) return bytesToUuid(value);

  final text = value.toString().trim();
  if (text.isEmpty) return null;
  return isUuidString(text) ? text.toLowerCase() : null;
}

Uint8List? dbUuidArg(dynamic value) {
  final uuid = dbUuidToString(value);
  if (uuid == null) return null;
  return uuidToBytes(uuid);
}
