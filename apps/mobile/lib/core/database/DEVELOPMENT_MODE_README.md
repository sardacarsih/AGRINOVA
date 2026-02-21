# Database Development Mode

Sistem database Agrinova telah disederhanakan untuk tahap development, menghilangkan kompleksitas versioning dan migration yang rumit.

## 🚀 Fitur Development Mode

### **Auto-Recreation Database**
- Database otomatis dihapus dan dibuat ulang setiap kali aplikasi dimulai
- Tidak perlu mengelola migration scripts yang kompleks
- Schema selalu fresh dan up-to-date

### **Development Utilities**
```dart
// Initialize database service
final dbService = EnhancedDatabaseService();

// Check if in development mode
print('Development Mode: ${dbService.isDevelopmentMode}');

// Get development information
final info = await dbService.getDevelopmentInfo();

// Recreate database manually
await dbService.recreateDatabaseForDevelopment();

// Reset schema (drop all tables and recreate)
await dbService.resetDatabaseSchema();

// Print database status for debugging
await dbService.printDatabaseStatus();

// Get table names and row counts
final tables = await dbService.getTableNames();
final counts = await dbService.getTableRowCounts();
```

## 📁 File Structure

```
lib/core/database/
├── enhanced_database_service.dart          (686 lines) - Main orchestrator
├── database_tables_service.dart            (1,038 lines) - Schema management
├── database_operations_service.dart        (442 lines) - CRUD operations
├── database_sync_service.dart              (646 lines) - Sync & auth
├── development_example.dart                (242 lines) - Usage examples
└── DEVELOPMENT_MODE_README.md              - This documentation
```

## ⚙️ Configuration

```dart
class EnhancedDatabaseService {
  // Development mode settings
  static const int _currentDatabaseVersion = 1;
  static const bool _isDevelopmentMode = true;
  
  // Database file naming
  // Development Mandor: 'agrinova_mandor.db'
  // Development Satpam: 'agrinova_satpam.db'
  // Production: 'agrinova_v2.db'
}
```

## 🔄 Development Workflow

### **1. Simple Initialization**
```dart
// No complex migrations needed
final dbService = EnhancedDatabaseService();
await dbService.database; // Creates fresh DB automatically
```

### **2. Add Test Data**
```dart
await dbService.insert('companies', {
  'company_id': 'test-company-1',
  'code': 'TEST001',
  'name': 'Test Company',
  'is_active': 1,
  'created_at': DateTime.now().millisecondsSinceEpoch,
  'updated_at': DateTime.now().millisecondsSinceEpoch,
});
```

### **3. Debug & Monitor**
```dart
// Print comprehensive status
await dbService.printDatabaseStatus();

// Get specific information
final tableCounts = await dbService.getTableRowCounts();
print('Tables: $tableCounts');
```

### **4. Schema Changes**
Ketika ada perubahan schema:
1. Update table definitions in `database_tables_service.dart`
2. Restart aplikasi - database akan otomatis dibuat ulang
3. Tidak perlu migration scripts!

## 🛠️ Available Commands

### **Database Recreation**
```dart
// Completely recreate database
await dbService.recreateDatabaseForDevelopment();

// Reset schema only (keep database file)
await dbService.resetDatabaseSchema();

// Clear all data but keep structure
await DatabaseDevelopmentExample.clearAllDataKeepTables();
```

### **Debugging Tools**
```dart
// Development information
final info = await dbService.getDevelopmentInfo();

// Table analysis
final tables = await dbService.getTableNames();
final counts = await dbService.getTableRowCounts();

// Database health
final health = await dbService.getDatabaseHealth();

// Comprehensive stats
final stats = await dbService.getDatabaseStats();
```

## 📊 Benefits for Development

### **✅ Advantages**
- **No Migration Complexity**: Tidak perlu menulis dan mengelola migration scripts
- **Always Fresh Schema**: Database selalu sesuai dengan schema terbaru
- **Easy Debugging**: Tools lengkap untuk monitoring dan debugging
- **Rapid Development**: Perubahan schema langsung diterapkan tanpa migration
- **Clean Testing**: Setiap restart = database bersih untuk testing

### **⚠️ Development Only**
- Mode ini HANYA untuk development
- Tidak cocok untuk production karena akan menghapus semua data
- Production mode menggunakan versioning dan migration normal

## 🔄 Migration to Production

Untuk production, ubah konfigurasi:
```dart
class EnhancedDatabaseService {
  static const int _currentDatabaseVersion = 1; // Increment as needed
  static const bool _isDevelopmentMode = false; // Set to false
}
```

Dan tambahkan proper migration logic kembali jika diperlukan.

## 📝 Example Usage

Lihat `development_example.dart` untuk contoh lengkap penggunaan development mode dengan berbagai scenarios testing dan debugging.

---

**Mode Development** = Fleksibilitas maksimal untuk development
**Mode Production** = Stability dan data preservation untuk production
