# 📋 QR CODE FORMAT DOCUMENTATION - AGRINOVA GATE SYSTEM

## 🎯 Overview

Sistem QR Code gate check Agrinova mendukung 2 tipe QR:
1. **QR Tamu (Guest)** - Temporary, JWT-based, single-use
2. **QR Karyawan (Employee)** - Permanent, HRIS-based, reusable

---

## 📝 Format JSON QR Code

### 1️⃣ QR untuk TAMU (Guest Access)

```json
{
  "type": "GUEST_ACCESS",
  "version": "1.0",
  "token": "<JWT_TOKEN>",
  "issuer": "agrinova-gate-check",
  "timestamp": 1728901234567
}
```

**JWT Token Payload (decoded):**
```json
{
  "iss": "agrinova-gate-check",
  "sub": "GUEST-001",
  "iat": 1728901234,
  "exp": 1728987634,
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  "guest_id": "GUEST-001",
  "name": "John Doe",
  "vehicle_plate": "B1234XYZ",
  "purpose": "Pengiriman Muatan",
  "cargo_type": "Kelapa Sawit",
  "cargo_qty": 1000,
  "unit": "Kg",
  "vehicle_type": "Truk",
  "destination": "PKS Estate A",
  "cargo_owner": "PT. Example",
  "estimated_weight": 5000.0,
  "do_number": "DO-2025-001",
  "notes": "Muatan khusus",
  "token_type": "GUEST_ACCESS",
  "single_use": true,
  "max_usage": 1,
  "generation_intent": "ENTRY",
  "allowed_scan": "EXIT",
  "current_status": "UNUSED",
  "created_by": "user-123",
  "device_bound": null
}
```

---

### 2️⃣ QR untuk KARYAWAN (Employee Access)

```json
{
  "type": "EMPLOYEE_ACCESS",
  "version": "1.0",
  "iddata": "PT001_3201234567890123",
  "nik": "3201234567890123",
  "nama": "Ahmad Satpam",
  "departement": "Security",
  "issuer": "HRIS",
  "timestamp": 1728901234567
}
```

**Penjelasan Field:**
- `type`: **"EMPLOYEE_ACCESS"** - identifier untuk karyawan
- `version`: **"1.0"** - versi format QR
- `iddata`: **"{company_code}_{nik}"** - format: PT001_3201234567890123
- `nik`: **String** - NIK karyawan (must match dalam iddata)
- `nama`: **String** - nama lengkap karyawan
- `departement`: **String** - departemen karyawan
- `issuer`: **"HRIS"** - penerbit (bukan "agrinova-gate-check")
- `timestamp`: **Unix timestamp** - waktu pembuatan QR

---

## 🔍 Validasi Logic

### Validasi QR TAMU:

```dart
// 1. Parse JSON
final qrData = jsonDecode(qrString);

// 2. Check type
if (qrData['type'] != 'GUEST_ACCESS') return invalid;

// 3. Check issuer
if (qrData['issuer'] != 'agrinova-gate-check') return invalid;

// 4. Extract & verify JWT
final jwtToken = qrData['token'];
final payload = verifyJWT(jwtToken);

// 5. Check expiration
if (DateTime.now().isAfter(payload['exp'])) return 'expired';

// 6. Check single-use (database lookup)
final isUsed = await db.query('used_tokens', where: 'jti = ?', [payload['jti']]);
if (isUsed.isNotEmpty) return 'already used';

// 7. Validate intent (ENTRY/EXIT)
if (scanDirection != payload['allowed_scan']) return 'wrong direction';

// 8. Mark as used
await db.insert('used_tokens', {'jti': payload['jti'], 'used_at': now});

// 9. Log to guest_logs
await db.insert('guest_logs', guestData);

// ✅ Valid
```

---

### Validasi QR KARYAWAN:

```dart
// 1. Parse JSON
final qrData = jsonDecode(qrString);

// 2. Check type
if (qrData['type'] != 'EMPLOYEE_ACCESS') return invalid;

// 3. Check issuer
if (qrData['issuer'] != 'HRIS') return invalid;

// 4. Extract data
final iddata = qrData['iddata'];
final nik = qrData['nik'];

// 5. Validate iddata format (must contain nik)
if (!iddata.contains(nik)) return 'invalid iddata format';

// 6. Database lookup GANDA (nik AND iddata must match)
final employee = await db.query(
  'gate_employees',
  where: 'nik = ? AND iddata = ?',
  whereArgs: [nik, iddata],
);

if (employee.isEmpty) return 'employee not found';

// 7. Check active status
if (employee['is_active'] != 1) return 'employee inactive';

// 8. Log to access_logs (NO token marking needed - permanent QR)
await db.insert('access_logs', {
  'user_type': 'EMPLOYEE',
  'name': employee['name'],
  'action': scanDirection,
  ...
});

// ✅ Valid
```

---

## 🗄️ Database Schema

### Table: gate_employees

```sql
CREATE TABLE gate_employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id TEXT UNIQUE NOT NULL,      -- UUID internal
  iddata TEXT UNIQUE NOT NULL,           -- Format: company_nik
  nik TEXT NOT NULL,                     -- NIK karyawan
  name TEXT NOT NULL,
  department TEXT,
  position TEXT,
  is_active INTEGER DEFAULT 1,
  photo_path TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  synced_at INTEGER,
  sync_status TEXT DEFAULT 'PENDING',
  CONSTRAINT unique_nik_iddata UNIQUE (nik, iddata)
);

CREATE INDEX idx_gate_employees_nik ON gate_employees (nik);
CREATE INDEX idx_gate_employees_iddata ON gate_employees (iddata);
CREATE INDEX idx_gate_employees_nik_iddata ON gate_employees (nik, iddata);
```

---

## 🔐 Keamanan

### Keamanan Tamu:
1. ✅ JWT signed dengan HMAC-SHA256
2. ✅ Expiry time (24 jam default)
3. ✅ Single-use enforcement via database
4. ✅ Intent-based validation (ENTRY/EXIT)
5. ✅ Cross-device support with JWT signature verification

### Keamanan Karyawan:
1. ✅ Dual validation: nik AND iddata must match
2. ✅ Format validation: iddata must contain nik
3. ✅ Active status check
4. ✅ Issuer validation (must be "HRIS")
5. ✅ No expiry (permanent until deactivated)

---

## 📊 Perbedaan Utama

| Aspek | Tamu (Guest) | Karyawan (Employee) |
|-------|--------------|---------------------|
| **Format** | JWT Token | Simple JSON |
| **Issuer** | agrinova-gate-check | HRIS |
| **Keamanan** | JWT Signature | Database Lookup |
| **Expiry** | 24 jam | Permanent |
| **Reusable** | ❌ (single-use) | ✅ (reusable) |
| **Intent** | ENTRY/EXIT | No intent check |
| **Database** | `guest_logs` + `used_tokens` | `access_logs` only |
| **Validation** | Complex (JWT + token tracking) | Simple (DB lookup) |

---

## 🚀 Usage Examples

### Generate QR Tamu:

```dart
final result = await jwtQRService.generateGuestToken(
  guestId: 'GUEST-001',
  name: 'John Doe',
  vehiclePlate: 'B1234XYZ',
  purpose: 'Pengiriman',
  cargoType: 'Kelapa Sawit',
  generationIntent: 'ENTRY', // QR ini untuk masuk
);

// QR akan valid untuk scan EXIT saja
```

### Generate QR Karyawan:

```dart
final employee = GateEmployee(
  employeeId: uuid.v4(),
  iddata: 'PT001_3201234567890123',
  nik: '3201234567890123',
  name: 'Ahmad Satpam',
  department: 'Security',
  ...
);

final qrData = EmployeeQRData.fromGateEmployee(employee);
final qrString = jsonEncode(qrData.toJson());

// QR permanent, bisa digunakan berkali-kali
```

### Scan QR (Universal):

```dart
final result = await jwtQRService.validateQR(
  qrString,
  scanDirection: 'ENTRY', // or 'EXIT'
  gateId: 'GATE-01',
);

if (result.success) {
  if (result.userType == 'guest') {
    // Handle guest access
    print('Guest: ${result.data['name']}');
  } else if (result.userType == 'employee') {
    // Handle employee access
    print('Employee: ${result.employee.name}');
  }
} else {
  // Show error
  print('Error: ${result.error}');
}
```

---

## 📁 File Locations

- **Models**: `lib/core/models/employee_qr_models.dart`
- **Service**: `lib/core/services/jwt_qr_service.dart`
- **Database**: `lib/core/database/database_tables_service.dart`
- **Schema**: Table `gate_employees` (line 782-801)
- **Indexes**: (line 1037-1043)

---

## ✅ Implementation Checklist

- [x] Create `employee_qr_models.dart`
- [x] Add `gate_employees` table to database
- [x] Add indexes for `gate_employees`
- [ ] Update `jwt_qr_service.dart` with employee validation
- [ ] Update gate check models
- [ ] Update gate check repository
- [ ] Update gate check UI
- [ ] Generate JSON serialization code
- [ ] Test guest QR validation
- [ ] Test employee QR validation
- [ ] Test cross-device QR scanning

---

**Last Updated**: 2025-10-14
**Version**: 1.0
**Author**: Claude Code (Agrinova Development)
