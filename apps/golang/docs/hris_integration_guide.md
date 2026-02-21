# Panduan Integrasi HRIS - Sinkronisasi Data Karyawan

Dokumen ini menjelaskan cara mengintegrasikan sistem HRIS dengan Agrinova untuk sinkronisasi data karyawan. Data karyawan ini digunakan untuk validasi di Gate System (Security) dan pencatatan Panen (Mandor).

## 1. Persiapan

Sebelum memulai, pastikan Anda telah memiliki:
1.  **API Key** dengan scope yang sesuai (diberikan oleh Administrator Agrinova).
    *   Required Scopes: `employees:sync`, `employees:read`
2.  **GraphQL Endpoint**: `https://api.agrinova.com/query` (atau `http://localhost:8080/query` untuk dev).

## 2. Autentikasi

Gunakan API Key sebagai **Bearer Token** pada header `Authorization` di setiap request.

**Header:**
```http
Authorization: Bearer ak_live_xxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

## 3. Sinkronisasi Karyawan (Bulk Sync)

Gunakan mutation `syncEmployees` untuk mengirim data karyawan (baru atau update) secara batch. Sistem akan menggunakan kombinasi **NIK dan CompanyID** sebagai kunci unik untuk menentukan apakah data harus dibuat baru atau diupdate (Upsert).

**Mutation:**
```graphql
mutation SyncEmployees($input: [SyncEmployeeInput!]!) {
  syncEmployees(input: $input) {
    id
    nik
    name
    role
    isActive
    updatedAt
  }
}
```

**Variables:**
```json
{
  "input": [
    {
      "nik": "1234567890",
      "name": "Budi Santoso",
      "role": "HARVESTER",
      "companyId": "uuid-company-id-pt-sawit-jaya",
      "photoUrl": "https://hris.company.com/photos/1234567890.jpg",
      "isActive": true
    },
    {
      "nik": "0987654321",
      "name": "Siti Aminah",
      "role": "DRIVER",
      "companyId": "uuid-company-id-pt-sawit-jaya",
      "photoUrl": "https://hris.company.com/photos/0987654321.jpg",
      "isActive": true
    }
  ]
}
```

### Field Penjelasan:
*   `nik` (String!): Nomor Induk Karyawan (Unique Key per Company).
*   `name` (String!): Nama lengkap karyawan.
*   `role` (String!): Jabatan/Peran. Contoh: `HARVESTER`, `DRIVER`, `SECURITY`, `MANDOR`.
*   `companyId` (ID!): ID Perusahaan di Agrinova.
*   `photoUrl` (String): URL foto karyawan (opsional, digunakan untuk verifikasi wajah di Gate System).
*   `isActive` (Boolean!): Status aktif karyawan. Set `false` jika karyawan resign/keluar.

## 4. Contoh Implementasi (Python)

Berikut adalah contoh script Python untuk sinkronisasi data karyawan dari database HRIS lokal ke Agrinova.

### `sync_hris.py`

```python
import requests
import json

# Konfigurasi
GRAPHQL_URL = "http://localhost:8080/query"
API_KEY = "ak_live_YOUR_API_KEY_HERE"
COMPANY_ID = "uuid-company-id-here"

def get_headers():
    return {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

def sync_employees(employees_data):
    """Mengirim data karyawan via GraphQL Mutation"""
    
    mutation = """
    mutation SyncEmployees($input: [SyncEmployeeInput!]!) {
      syncEmployees(input: $input) {
        nik
        name
        updatedAt
      }
    }
    """
    
    # Transform data ke format GraphQL Input
    sync_input = []
    for emp in employees_data:
        sync_input.append({
            "nik": emp['nik'],
            "name": emp['full_name'],
            "role": map_role(emp['position']), # Mapping jabatan HRIS ke Role Agrinova
            "companyId": COMPANY_ID,
            "photoUrl": emp.get('photo_url'),
            "isActive": emp['status'] == 'ACTIVE'
        })
    
    payload = {
        "query": mutation,
        "variables": {"input": sync_input}
    }
    
    try:
        response = requests.post(GRAPHQL_URL, headers=get_headers(), json=payload)
        result = response.json()
        
        if 'errors' in result:
            print(f"❌ Sync Error: {json.dumps(result['errors'], indent=2)}")
            return False
            
        if 'data' in result and result['data']['syncEmployees']:
            count = len(result['data']['syncEmployees'])
            print(f"✅ Sukses sinkronisasi {count} karyawan!")
            return True
            
    except Exception as e:
        print(f"❌ Koneksi error: {str(e)}")
    
    return False

def map_role(hris_position):
    """Mapping jabatan HRIS ke Role Agrinova"""
    mapping = {
        "Pemanen": "HARVESTER",
        "Supir": "DRIVER",
        "Satpam": "SECURITY",
        "Mandor Lapangan": "MANDOR"
    }
    return mapping.get(hris_position, "OTHER")

# Simulasi data dari DB HRIS
def get_hris_data():
    return [
        {
            "nik": "EMP001",
            "full_name": "Agus Pemanen",
            "position": "Pemanen",
            "status": "ACTIVE",
            "photo_url": "https://hris.local/img/emp001.jpg"
        },
        {
            "nik": "EMP002",
            "full_name": "Bambang Supir",
            "position": "Supir",
            "status": "ACTIVE",
            "photo_url": "https://hris.local/img/emp002.jpg"
        }
    ]

if __name__ == "__main__":
    print("🚀 Memulai sinkronisasi HRIS...")
    
    data = get_hris_data()
    sync_employees(data)
```
