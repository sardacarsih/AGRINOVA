import 'package:json_annotation/json_annotation.dart';

part 'employee_qr_models.g.dart';

/// Employee QR Data Model
/// Format QR untuk karyawan dengan issuer HRIS
/// 
/// Contoh output dari HRIS:
/// ```json
/// {
///   "type": "EMPLOYEE_ACCESS",
///   "version": "1.0",
///   "IDDATA": "FSLPKS",
///   "nik": "000007-FSLPKS",
///   "nama": "Tarmiji, A.Md",
///   "departement": "LAB",
///   "issuer": "HRIS",
///   "timestamp": "1765508255338.000"
/// }
/// ```
@JsonSerializable()
class EmployeeQRData {
  final String type; // 'EMPLOYEE_ACCESS'
  final String version; // '1.0'
  
  @JsonKey(name: 'IDDATA', defaultValue: '')
  final String iddata; // Company code (e.g., FSLPKS)
  
  final String nik; // Format: employee_number-company_code (e.g., 000007-FSLPKS)
  final String nama; // Nama lengkap
  final String departement; // Departemen/divisi
  final String issuer; // 'HRIS'
  
  @JsonKey(fromJson: _timestampFromJson, toJson: _timestampToJson)
  final int timestamp; // Unix timestamp (ms)

  const EmployeeQRData({
    required this.type,
    required this.version,
    required this.iddata,
    required this.nik,
    required this.nama,
    required this.departement,
    required this.issuer,
    required this.timestamp,
  });

  /// Parse timestamp yang bisa berupa int atau String dari HRIS
  static int _timestampFromJson(dynamic value) {
    if (value == null) return DateTime.now().millisecondsSinceEpoch;
    if (value is int) return value;
    if (value is String) {
      // Handle format "1765508255338.000"
      final cleanValue = value.replaceAll(RegExp(r'\.0+$'), '');
      return int.tryParse(cleanValue) ?? DateTime.now().millisecondsSinceEpoch;
    }
    if (value is double) return value.toInt();
    return DateTime.now().millisecondsSinceEpoch;
  }

  static String _timestampToJson(int value) => value.toString();

  /// Factory untuk parse JSON dengan case-insensitive keys
  factory EmployeeQRData.fromJson(Map<String, dynamic> json) {
    // Normalize keys untuk handle IDDATA vs iddata
    final normalizedJson = _normalizeJsonKeys(json);
    return _$EmployeeQRDataFromJson(normalizedJson);
  }

  /// Normalize JSON keys untuk kompatibilitas HRIS
  static Map<String, dynamic> _normalizeJsonKeys(Map<String, dynamic> json) {
    final normalized = <String, dynamic>{};
    
    for (final entry in json.entries) {
      final key = entry.key;
      final value = entry.value;
      
      // Handle IDDATA -> keep as IDDATA for JsonKey annotation
      if (key.toLowerCase() == 'iddata') {
        normalized['IDDATA'] = value;
      } else {
        normalized[key] = value;
      }
    }
    
    return normalized;
  }

  Map<String, dynamic> toJson() => _$EmployeeQRDataToJson(this);

  /// Generate QR data dari GateEmployee
  factory EmployeeQRData.fromGateEmployee(GateEmployee employee) {
    return EmployeeQRData(
      type: 'EMPLOYEE_ACCESS',
      version: '1.0',
      iddata: employee.iddata,
      nik: employee.nik,
      nama: employee.name,
      departement: employee.department ?? '',
      issuer: 'HRIS',
      timestamp: DateTime.now().millisecondsSinceEpoch,
    );
  }

  /// Validasi format - nik mengandung company code (IDDATA)
  bool isValid() {
    // Format nik dari HRIS: "000007-FSLPKS" 
    // IDDATA = "FSLPKS" (company code)
    return type == 'EMPLOYEE_ACCESS' && 
           issuer == 'HRIS' && 
           nik.isNotEmpty;
  }

  /// Extract employee number dari nik (bagian sebelum dash)
  String get employeeNumber {
    if (nik.contains('-')) {
      return nik.split('-').first;
    }
    return nik;
  }

  /// Extract company code dari nik (bagian setelah dash)
  String get companyCode {
    if (nik.contains('-')) {
      return nik.split('-').last;
    }
    return iddata;
  }

  @override
  String toString() {
    return 'EmployeeQRData(type: $type, nik: $nik, nama: $nama, dept: $departement)';
  }
}

/// Gate Employee Model
/// Model untuk karyawan yang terdaftar di gate system
/// TERPISAH dari table employees (harvest system)
@JsonSerializable()
class GateEmployee {
  final int? id;
  final String employeeId; // UUID internal
  final String iddata; // Format: company_nik
  final String nik; // NIK karyawan
  final String name;
  final String? department;
  final String? position;
  final bool isActive;
  final String? photoPath;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? syncedAt;
  final String syncStatus; // 'PENDING', 'SYNCED', 'FAILED'

  const GateEmployee({
    this.id,
    required this.employeeId,
    required this.iddata,
    required this.nik,
    required this.name,
    this.department,
    this.position,
    this.isActive = true,
    this.photoPath,
    required this.createdAt,
    required this.updatedAt,
    this.syncedAt,
    this.syncStatus = 'PENDING',
  });

  factory GateEmployee.fromJson(Map<String, dynamic> json) =>
      _$GateEmployeeFromJson(json);

  Map<String, dynamic> toJson() => _$GateEmployeeToJson(this);

  factory GateEmployee.fromDatabase(Map<String, dynamic> map) {
    return GateEmployee(
      id: map['id'] as int?,
      employeeId: map['employee_id'] as String,
      iddata: map['iddata'] as String,
      nik: map['nik'] as String,
      name: map['name'] as String,
      department: map['department'] as String?,
      position: map['position'] as String?,
      isActive: (map['is_active'] as int) == 1,
      photoPath: map['photo_path'] as String?,
      createdAt: DateTime.fromMillisecondsSinceEpoch(map['created_at'] as int),
      updatedAt: DateTime.fromMillisecondsSinceEpoch(map['updated_at'] as int),
      syncedAt: map['synced_at'] != null
          ? DateTime.fromMillisecondsSinceEpoch(map['synced_at'] as int)
          : null,
      syncStatus: map['sync_status'] as String? ?? 'PENDING',
    );
  }

  Map<String, dynamic> toDatabase() {
    return {
      if (id != null) 'id': id,
      'employee_id': employeeId,
      'iddata': iddata,
      'nik': nik,
      'name': name,
      'department': department,
      'position': position,
      'is_active': isActive ? 1 : 0,
      'photo_path': photoPath,
      'created_at': createdAt.millisecondsSinceEpoch,
      'updated_at': updatedAt.millisecondsSinceEpoch,
      'synced_at': syncedAt?.millisecondsSinceEpoch,
      'sync_status': syncStatus,
    };
  }

  GateEmployee copyWith({
    int? id,
    String? employeeId,
    String? iddata,
    String? nik,
    String? name,
    String? department,
    String? position,
    bool? isActive,
    String? photoPath,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? syncedAt,
    String? syncStatus,
  }) {
    return GateEmployee(
      id: id ?? this.id,
      employeeId: employeeId ?? this.employeeId,
      iddata: iddata ?? this.iddata,
      nik: nik ?? this.nik,
      name: name ?? this.name,
      department: department ?? this.department,
      position: position ?? this.position,
      isActive: isActive ?? this.isActive,
      photoPath: photoPath ?? this.photoPath,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      syncedAt: syncedAt ?? this.syncedAt,
      syncStatus: syncStatus ?? this.syncStatus,
    );
  }
}

/// Employee Validation Result
class EmployeeValidationResult {
  final bool isValid;
  final GateEmployee? employee;
  final Map<String, dynamic>? data;
  final String? error;

  const EmployeeValidationResult._({
    required this.isValid,
    this.employee,
    this.data,
    this.error,
  });

  factory EmployeeValidationResult.valid(
    GateEmployee employee,
    Map<String, dynamic> data,
  ) {
    return EmployeeValidationResult._(
      isValid: true,
      employee: employee,
      data: data,
    );
  }

  factory EmployeeValidationResult.invalid(String error) {
    return EmployeeValidationResult._(
      isValid: false,
      error: error,
    );
  }
}

/// Universal QR Validation Result
class QRValidationResult {
  final bool success;
  final String userType; // 'guest', 'employee', 'unknown'
  final Map<String, dynamic>? data;
  final GateEmployee? employee;
  final String? message;
  final String? error;

  const QRValidationResult({
    required this.success,
    required this.userType,
    this.data,
    this.employee,
    this.message,
    this.error,
  });

  factory QRValidationResult.guest({
    required bool success,
    Map<String, dynamic>? data,
    String? message,
    String? error,
  }) {
    return QRValidationResult(
      success: success,
      userType: 'guest',
      data: data,
      message: message,
      error: error,
    );
  }

  factory QRValidationResult.employee({
    required bool success,
    GateEmployee? employee,
    Map<String, dynamic>? data,
    String? message,
    String? error,
  }) {
    return QRValidationResult(
      success: success,
      userType: 'employee',
      employee: employee,
      data: data,
      message: message,
      error: error,
    );
  }

  factory QRValidationResult.unknown(String error) {
    return QRValidationResult(
      success: false,
      userType: 'unknown',
      error: error,
    );
  }
}
