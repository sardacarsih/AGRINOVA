# 📋 Panduan Input Panen - Multiple Entry per Karyawan

## 🎯 Overview
Sistem Agrinova sekarang mendukung **multiple entry per karyawan** untuk mengatasi skenario real di lapangan dimana satu karyawan memanen berbagai jenis TBS di lokasi atau waktu yang berbeda dalam satu sesi panen.

## 🔍 Problem yang Dipecahkan

### Skenario Real di Lapangan:
1. **Pemanen A** memanen di **Area Utara** → Mayoritas TBS Matang (30 tandan, 450kg)
2. **Pemanen A** pindah ke **Area Selatan** → Mayoritas TBS Mentah (15 tandan, 180kg) 
3. **Pemanen A** di **Area Tengah** → Mixed TBS Lewat Matang (8 tandan, 144kg)

**Sebelumnya:** Data dicampur jadi satu entry → Analisis tidak akurat
**Sekarang:** 3 entry terpisah → Tracking detail per lokasi/kondisi

## 🚀 Fitur Multiple Entry

### ✅ **Yang Bisa Dilakukan:**
- **Multiple Entry per Karyawan**: Hingga 10 entries per karyawan
- **Detail per Entry**: Setiap entry punya breakdown TBS lengkap
- **Copy/Duplicate Entry**: Salin entry untuk mempercepat input
- **Summary Real-time**: Auto-calculation total semua entries
- **Quality Tracking**: Monitor kualitas per entry dan keseluruhan
- **Flexible Notes**: Catatan per entry untuk context

### 📊 **Data Structure per Entry:**
```typescript
interface EmployeeHarvestEntry {
  id: string;
  employeeId: string;
  entryNumber: number; // 1, 2, 3, dst.
  
  // TBS per kategori
  tbsMatang: number;
  beratMatang: number;
  tbsMentah: number;
  beratMentah: number;
  tbsLewatMatang: number;
  beratLewatMatang: number;
  tbsKosong: number;
  beratKosong: number;
  
  brondolan: number;
  quality: number;
  notes?: string; // "Area Utara", "Pagi hari", dll.
}
```

## 📱 User Interface

### 🎨 **Layout Komponen:**
1. **Employee Card Header**: Avatar, nama, total summary
2. **Entry Management**: Add, Remove, Duplicate, Reset buttons  
3. **Entry Cards**: Input form per entry dengan color-coding
4. **Real-time Calculations**: Summary per entry dan total keseluruhan
5. **Quality Indicators**: Badge kualitas dan rekomendasi

### 🟢 **Color Coding:**
- **TBS Matang**: Hijau (optimal quality)
- **TBS Mentah**: Merah (perlu perhatian)  
- **TBS Lewat Matang**: Orange (acceptable)
- **TBS Kosong**: Abu-abu (minimal value)

## 🔧 Cara Penggunaan

### **URL Akses:**
```
http://localhost:3000/dashboard/mandor/panen/multiple-entry
```

### **Step-by-Step:**

#### 1. **Setup Panen**
- Pilih tanggal panen
- Pilih blok/area
- Pilih shift (Pagi/Siang/Malam)
- Tambah catatan umum

#### 2. **Tambah Karyawan**
- Klik "Tambah Karyawan"
- Pilih dari daftar karyawan tersedia
- System auto-create entry pertama

#### 3. **Input Entry Pertama**
- Input TBS per kategori (Matang, Mentah, Lewat Matang, Kosong)
- Input brondolan dan kualitas
- Tambah catatan entry (opsional)
- Monitor real-time calculation

#### 4. **Tambah Entry Berikutnya**
- Klik "Tambah Entry" untuk entry baru
- Atau klik "Copy" untuk duplicate entry sebelumnya
- Modify data sesuai kondisi aktual
- Ulangi untuk semua sesi panen

#### 5. **Review & Submit**
- Cek summary total di bagian atas
- Pastikan semua data sudah benar
- "Simpan Draft" atau "Kirim untuk Persetujuan"

## 📈 **Contoh Penggunaan Praktis**

### **Case Study: Pemanen Budi**

**Entry #1 - Area Utara (Pagi)**
```
TBS Matang: 25 tandan (375kg) ✅
TBS Mentah: 2 tandan (24kg)
TBS Lewat Matang: 3 tandan (54kg)
Brondolan: 5kg
Quality: 5/5
Notes: "Area utara, kondisi optimal"
```

**Entry #2 - Area Selatan (Siang)** 
```
TBS Matang: 8 tandan (120kg)
TBS Mentah: 15 tandan (180kg) ⚠️
TBS Lewat Matang: 2 tandan (36kg)  
Brondolan: 8kg
Quality: 3/5
Notes: "Area selatan, banyak TBS mentah"
```

**Entry #3 - Area Tengah (Sore)**
```
TBS Matang: 12 tandan (180kg)
TBS Mentah: 3 tandan (36kg)
TBS Lewat Matang: 8 tandan (144kg) ⚠️
Brondolan: 3kg
Quality: 4/5
Notes: "Area tengah, ada TBS lewat matang"
```

### **Summary Otomatis:**
- **Total TBS**: 78 tandan
- **Total Berat**: 1149kg  
- **Rasio Matang**: 57.7% (Good)
- **BJR Adjusted**: 14.73 (dengan penalty)
- **Rekomendasi**: "Pelatihan identifikasi kematangan"

## 🎯 **Business Benefits**

### 📊 **Analytics yang Lebih Detail:**
1. **Per-Location Analysis**: Identifikasi area dengan kualitas rendah
2. **Time-based Patterns**: Analisis kualitas berdasarkan waktu panen
3. **Worker Performance**: Tracking detail performance per sesi
4. **Training Insights**: Data spesifik untuk program pelatihan

### 🔍 **Quality Control:**
- **Root Cause Analysis**: Identifikasi penyebab kualitas rendah
- **Targeted Training**: Training spesifik berdasarkan data entry
- **Area Management**: Fokus perbaikan di area bermasalah
- **Productivity Optimization**: Optimasi jadwal dan rotasi area

### 📈 **Operational Excellence:**
- **Detailed Traceability**: Track panen sampai level micro-location
- **Performance Benchmarking**: Compare performance antar area/waktu
- **Predictive Analytics**: Predict quality berdasarkan pola historical
- **Resource Allocation**: Optimasi alokasi karyawan ke area terbaik

## ⚙️ **Technical Features**

### 🔧 **Form Management:**
- **Dynamic Entries**: Add/remove entries sesuai kebutuhan
- **Entry Validation**: Real-time validation per entry
- **Auto-numbering**: Automatic entry numbering (1, 2, 3...)
- **Duplicate Protection**: Prevent duplicate entries yang tidak perlu

### 💾 **Data Persistence:**
- **Auto-save**: Draft auto-saved ke localStorage
- **Offline Support**: Bekerja tanpa koneksi internet
- **Sync Management**: Auto-sync saat koneksi tersedia
- **Version Control**: Track changes dan updates

### 📱 **Mobile Optimization:**
- **Responsive Design**: Optimal di tablet/mobile
- **Touch-friendly**: Input fields besar untuk field workers
- **Collapsible UI**: Hide/show details untuk menghemat space
- **Gesture Support**: Swipe untuk navigate antar entries

## 🚨 **Limitations & Best Practices**

### ⚠️ **Limitations:**
- **Max 10 entries** per karyawan (untuk menghindari kompleksitas berlebihan)
- **Memory Usage**: Banyak entries = lebih banyak memory usage
- **Performance**: Loading time bertambah dengan entry yang banyak

### ✅ **Best Practices:**
1. **Gunakan entry terpisah untuk**:
   - Lokasi panen berbeda
   - Waktu panen berbeda (pagi vs siang)
   - Kondisi TBS yang significantly berbeda

2. **Jangan gunakan entry terpisah untuk**:
   - Perbedaan minor dalam kualitas
   - Split data yang tidak perlu
   - Artificial inflation jumlah entries

3. **Naming Convention**:
   - Entry notes yang deskriptif: "Area A - Pagi", "Blok 01 - Siang"
   - Konsisten dalam penamaan untuk analytics

## 🔗 **Integration**

### 📊 **Dashboard Analytics:**
- Entry-level breakdown dalam reporting
- Heat map per area berdasarkan entries
- Time-based quality analysis
- Worker efficiency per entry

### 📱 **Mobile Apps:**
- Sync entries ke mobile untuk review
- Offline entry creation di mobile
- Real-time sync dengan web dashboard

### 🏭 **PKS Integration:**
- Detail traceability sampai entry level
- Quality mapping per micro-batch
- Processing optimization berdasarkan entry data

---

## 🎉 **Ready to Use!**

Fitur Multiple Entry sudah siap digunakan dan akan significantly meningkatkan detail dan akurasi data panen Anda. 

**Test URL:** `http://localhost:3000/dashboard/mandor/panen/multiple-entry`

Dengan sistem ini, setiap sesi panen akan terdokumentasi dengan detail yang sangat tinggi, memberikan insights yang valuable untuk optimasi operasional dan peningkatan kualitas panen! 🌴📊