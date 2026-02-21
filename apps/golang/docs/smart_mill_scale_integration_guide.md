# Panduan Integrasi Smart Mill Scale (Timbangan PKS) - GraphQL

Dokumen ini menjelaskan cara mengintegrasikan sistem Smart Mill Scale (Timbangan PKS) dengan Agrinova menggunakan GraphQL API.

## 1. Persiapan

Sebelum memulai, pastikan Anda telah memiliki:
1.  **API Key** dengan scope yang sesuai (diberikan oleh Administrator Agrinova).
    *   Required Scopes: `weighing:create`, `weighing:read`
2.  **GraphQL Endpoint**: `https://api.agrinova.com/query` (atau `http://localhost:8080/query` untuk dev).

## 2. Autentikasi

Gunakan API Key sebagai **Bearer Token** pada header `Authorization` di setiap request.

**Header:**
```http
Authorization: Bearer ak_live_xxxxxxxxxxxxxxxxxxxxxxxx
Content-Type: application/json
```

## 3. GraphQL Operations

### A. Kirim Data Timbangan (Mutation)

Gunakan mutation `createWeighingRecord` untuk mengirim data timbangan.

**Mutation:**
```graphql
mutation CreateWeighingRecord($input: CreateWeighingRecordInput!) {
  createWeighingRecord(input: $input) {
    id
    ticketNumber
    vehicleNumber
    netWeight
    companyId
    weighingTime
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "ticketNumber": "TKT-2024-11-001",
    "vehicleNumber": "BM 1234 AA",
    "driverName": "Budi Santoso",
    "vendorName": "PT Sawit Jaya",
    "grossWeight": 25000,
    "tareWeight": 8000,
    "netWeight": 17000,
    "cargoType": "TBS",
    "companyId": "uuid-company-id",
    "weighingTime": "2024-11-28T08:30:00Z"
  }
}
```

### B. Query Data Timbangan

Gunakan query `weighingRecords` untuk melihat data yang sudah masuk.

**Query:**
```graphql
query GetWeighingRecords {
  weighingRecords {
    id
    ticketNumber
    vehicleNumber
    netWeight
    weighingTime
  }
}
```

## 4. Contoh Implementasi (Python)

Berikut adalah contoh script Python menggunakan library `requests` untuk mengirim mutation GraphQL.

### `sync_scale_graphql.py`

```python
import requests
import json
import time
from datetime import datetime

# Konfigurasi
GRAPHQL_URL = "http://localhost:8080/query"
API_KEY = "ak_live_YOUR_API_KEY_HERE"

def get_headers():
    return {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

def send_weighing_record(data):
    """Mengirim data timbangan via GraphQL Mutation"""
    
    mutation = """
    mutation CreateWeighingRecord($input: CreateWeighingRecordInput!) {
      createWeighingRecord(input: $input) {
        id
        ticketNumber
        vehicleNumber
        netWeight
      }
    }
    """
    
    variables = {
        "input": {
            "ticketNumber": data['nomorTiket'],
            "vehicleNumber": data['nomorPolisi'],
            "driverName": data['driver'],
            "vendorName": data['vendor'],
            "grossWeight": data['beratBruto'],
            "tareWeight": data['beratTara'],
            "netWeight": data['beratNetto'],
            "cargoType": data['jenisMuatan'],
            "companyId": data['companyId'],
            "weighingTime": data['waktuKeluar']
        }
    }
    
    payload = {
        "query": mutation,
        "variables": variables
    }
    
    try:
        response = requests.post(GRAPHQL_URL, headers=get_headers(), json=payload)
        result = response.json()
        
        if 'errors' in result:
            print(f"❌ GraphQL Error: {json.dumps(result['errors'], indent=2)}")
            return False
            
        if 'data' in result and result['data']['createWeighingRecord']:
            print(f"✅ Sukses! ID: {result['data']['createWeighingRecord']['id']}")
            return True
            
    except Exception as e:
        print(f"❌ Koneksi error: {str(e)}")
    
    return False

# Simulasi data (sama seperti sebelumnya)
def read_scale_data():
    return {
        "nomorTiket": f"TKT-{int(time.time())}",
        "nomorPolisi": "BM 8888 XX",
        "beratBruto": 25500,
        "beratTara": 8500,
        "beratNetto": 17000,
        "waktuKeluar": datetime.now().isoformat() + "Z", # ISO 8601 format
        "driver": "Supriadi",
        "vendor": "CV Maju Terus",
        "jenisMuatan": "TBS",
        "companyId": "uuid-company-id-here"
    }

if __name__ == "__main__":
    print("🚀 Memulai sinkronisasi timbangan (GraphQL)...")
    
    # Test kirim satu data
    data = read_scale_data()
    send_weighing_record(data)
```
