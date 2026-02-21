# 🌴 Sistem Panen Berdasarkan Tingkat Kematangan TBS

## Overview
Sistem Agrinova telah diperbarui untuk menangani input panen berdasarkan tingkat kematangan TBS (Tandan Buah Segar), sesuai dengan praktik terbaik industri kelapa sawit.

## 📊 Kategori TBS

### 1. **TBS Matang (Ripe)** 🟢
- **Bobot Kualitas**: 100% (1.0)
- **Range Berat**: 8-25 kg per tandan (optimal: 15 kg)
- **Karakteristik**: TBS optimal untuk processing, kandungan minyak tinggi
- **Target**: >80% dari total panen

### 2. **TBS Mentah (Unripe)** 🔴  
- **Bobot Kualitas**: 70% (0.7)
- **Range Berat**: 6-20 kg per tandan (optimal: 12 kg)
- **Karakteristik**: Kandungan minyak rendah, tidak optimal
- **Warning**: >20% dapat menyebabkan penalty 10% pada BJR

### 3. **TBS Lewat Matang (Overripe)** 🟠
- **Bobot Kualitas**: 80% (0.8)  
- **Range Berat**: 8-28 kg per tandan (optimal: 18 kg)
- **Karakteristik**: Potensi fermentasi, kualitas menurun
- **Warning**: >15% dapat menyebabkan penalty 5% pada BJR

### 4. **TBS Kosong (Empty Bunches)** ⚪
- **Bobot Kualitas**: 10% (0.1)
- **Range Berat**: 1-8 kg per tandan (optimal: 3 kg)
- **Karakteristik**: Nilai minimal, mostly fiber
- **Catatan**: Digunakan untuk kompos atau biomass

## 🧮 Formula Perhitungan

### Rasio Kematangan (Maturity Ratio)
```
Maturity Ratio = (TBS Matang / Total TBS) × 100%
```

### Kualitas Tertimbang (Weighted Quality)
```
Weighted Quality = (
  (Berat Matang × 1.0) +
  (Berat Mentah × 0.7) +  
  (Berat Lewat Matang × 0.8) +
  (Berat Kosong × 0.1)
) / Total Berat × 5
```

### BJR Adjusted (Adjusted Bunch-to-Juice Ratio)
```
Base BJR = Total Berat / Total TBS

Penalty:
- Jika TBS Mentah >20%: BJR × 0.9 (penalty 10%)
- Jika TBS Lewat Matang >15%: BJR × 0.95 (penalty 5%)

BJR Adjusted = Base BJR × Penalty Factors
```

## 📈 Sistem Penilaian Kualitas

### Excellent (Sangat Baik) ⭐⭐⭐⭐⭐
- Rasio Kematangan: ≥80%
- Status: Panen optimal, tidak perlu perbaikan

### Good (Baik) ⭐⭐⭐⭐
- Rasio Kematangan: 60-79%
- Status: Masih dalam standar yang diterima

### Fair (Cukup) ⭐⭐⭐
- Rasio Kematangan: 40-59%
- **Rekomendasi Perbaikan**:
  - Tingkatkan seleksi TBS matang
  - Pelatihan identifikasi kematangan buah
  - Panen lebih sering untuk mengurangi TBS lewat matang

### Poor (Kurang) ⭐⭐
- Rasio Kematangan: <40%
- **Tindakan Urgent**:
  - Pelatihan ulang cara identifikasi TBS matang
  - Supervisi lebih ketat dari Asisten
  - Evaluasi jadwal rotasi panen
  - Penalty untuk kualitas rendah berulang

## 🔧 Implementasi Teknis

### Data Structure Baru
```typescript
interface HarvestEmployee {
  // TBS Matang (Ripe)
  tbsMatang: number;
  beratMatang: number;
  
  // TBS Mentah (Unripe)  
  tbsMentah: number;
  beratMentah: number;
  
  // TBS Lewat Matang (Overripe)
  tbsLewatMatang: number;
  beratLewatMatang: number;
  
  // TBS Kosong (Empty)
  tbsKosong: number;
  beratKosong: number;
  
  // Calculated fields
  totalTbs?: number;
  totalWeight?: number;
  maturityRatio?: number;
}
```

### Komponen UI Baru
1. **`MaturityInput`**: Input TBS berdasarkan kategori kematangan
2. **Auto-calculation**: Real-time calculation of ratios and quality
3. **Validation**: Warning system untuk kualitas rendah
4. **Recommendations**: Saran perbaikan berdasarkan kualitas

## 📱 User Experience

### Input Form Features
- **4 Kategori Input**: Matang, Mentah, Lewat Matang, Kosong
- **Real-time Calculations**: Rasio, BJR, kualitas tertimbang  
- **Visual Indicators**: Color-coded categories dengan progress bars
- **Validation Messages**: Warning dan error real-time
- **Quality Recommendations**: Saran improvement berbasis data

### Mobile Optimization
- **Responsive Grid**: 1-4 kolom berdasarkan screen size
- **Touch-Friendly**: Input fields besar untuk field workers
- **Visual Feedback**: Clear indicators untuk setiap kategori TBS
- **Offline Support**: Bekerja tanpa koneksi internet

## 🎯 Business Impact

### Quality Control
- **Standarisasi**: Konsisten classification across all workers
- **Traceability**: Detail breakdown per worker dan kategori
- **Performance Tracking**: Monitor improvement over time
- **Penalty System**: Automatic penalty untuk kualitas rendah

### Operational Excellence  
- **Real-time Analysis**: Immediate feedback untuk mandor
- **Predictive Quality**: Early warning untuk potential issues
- **Training Insights**: Data-driven training recommendations
- **Yield Optimization**: Maximize output melalui quality control

## 🚀 Cara Penggunaan

### Untuk Mandor:
1. Akses `/dashboard/mandor/panen`
2. Pilih block dan tanggal panen
3. Select workers yang akan input
4. **Input per kategori TBS**:
   - Jumlah tandan per kategori
   - Berat per kategori  
5. Monitor real-time quality indicators
6. Submit untuk approval Asisten

### Untuk Asisten:
- Review detailed maturity breakdown
- Approve/reject berdasarkan quality standards
- Monitor trend kualitas per mandor
- Provide feedback dan training recommendations

## 📊 Reporting & Analytics

### Dashboard Metrics
- **Maturity Ratio Trends**: Track improvement over time
- **Quality Distribution**: Breakdown per kategori TBS
- **Worker Performance**: Individual quality scoring
- **Block Analysis**: Identify low-performing areas

### Export Features
- **Detailed Breakdown**: Export dengan kategori TBS detail  
- **Quality Reports**: Summary untuk management
- **Training Reports**: Identify workers needing training
- **Trend Analysis**: Historical quality patterns

---

## 🔗 Integration Points

- **Mobile Apps**: Offline-first input dengan sync
- **Web Dashboard**: Real-time monitoring dan approval
- **PKS Integration**: Quality data untuk processing optimization
- **Notification System**: Alert untuk quality issues

Sistem ini memberikan kontrol kualitas yang lebih baik dan membantu meningkatkan yield serta efisiensi operasional perkebunan kelapa sawit secara keseluruhan.