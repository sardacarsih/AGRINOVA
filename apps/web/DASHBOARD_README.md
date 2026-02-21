# Agrinova Dashboard Panen

Dashboard komprehensif untuk sistem manajemen panen kelapa sawit dengan dukungan real-time updates.

## 🌟 Fitur Utama

### 📊 Metrics & KPI Cards
- **Panen Hari Ini**: Jumlah dan berat panen hari ini dengan persentase perubahan
- **Panen Minggu Ini**: Akumulasi data panen mingguan
- **Panen Bulan Ini**: Akumulasi data panen bulanan
- **Menunggu Approval**: Jumlah entri yang menunggu persetujuan
- **Mandor Aktif**: Jumlah mandor yang bertugas
- **Kualitas TBS**: Persentase kualitas TBS (Excellent & Good)

### 📈 Visualisasi Data
1. **Tren Panen Harian (30 Hari Terakhir)**
   - Line chart menampilkan tren jumlah panen, berat, dan total TBS
   - Interactive tooltip dengan detail data

2. **Distribusi Kualitas TBS**
   - Pie chart menampilkan distribusi kualitas (Excellent, Good, Fair, Poor, Reject)
   - Warna-coded legend untuk kemudahan interpretasi

3. **Performa Estate**
   - Bar chart perbandingan berat dan efisiensi antar estate
   - Detail breakdown per blok

### 📋 Tabel Data Panen
- **Fitur Pencarian**: Cari berdasarkan nomor panen, nama mandor, atau nama blok
- **Filter Status**: Filter berdasarkan status (Pending, Approved, Rejected, PKS Received)
- **Responsive Design**: Layout adaptif untuk desktop dan mobile
- **Pagination**: Navigasi halaman dengan kontrol yang mudah
- **Quick Actions**: Tombol approve/reject untuk entri pending

### ⚡ Real-time Updates
- **WebSocket Integration**: Koneksi real-time dengan server
- **Live Notifications**: Notifikasi otomatis untuk update data
- **Auto Refresh**: Data diperbarui secara otomatis
- **Connection Status**: Indikator status koneksi

## 🎨 Design System

### Warna Tema
- **Primary (Green)**: #22c55e - Warna utama Agrinova
- **Secondary (Yellow)**: #f59e0b - Warna sekunder untuk aksen
- **Status Colors**: 
  - Pending: Yellow (#f59e0b)
  - Approved: Green (#22c55e)
  - Rejected: Red (#ef4444)
  - PKS Received: Blue (#3b82f6)

### Responsivitas
- **Mobile First**: Design mengutamakan pengalaman mobile
- **Breakpoints**: 
  - sm: 640px
  - md: 768px
  - lg: 1024px
  - xl: 1280px

## 📱 Fitur Mobile

### Mobile Cards (< lg breakpoint)
- Layout kartu untuk tabel data di perangkat mobile
- Touch-friendly buttons dan navigasi
- Optimized spacing dan typography

### Responsive Charts
- Charts otomatis menyesuaikan ukuran layar
- Simplified tooltips untuk touch devices
- Optimized legend positioning

## 🔧 Teknologi

### Frontend Stack
- **Next.js 14**: Framework React dengan App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Recharts**: Data visualization library
- **Radix UI**: Accessible component primitives

### State Management
- **React Hooks**: useState, useEffect untuk local state
- **Custom Hooks**: useDashboardUpdates untuk real-time updates
- **Context Providers**: Socket, Auth, Notifications

### Real-time Integration
- **Socket.IO Client**: WebSocket client untuk real-time updates
- **Custom Hook**: useDashboardUpdates untuk mengelola real-time data
- **Notification System**: Toast notifications untuk feedback user

## 📊 Mock Data

Dashboard menggunakan mock data realistis untuk demonstrasi:

- **50 Entri Panen**: Data panen dengan berbagai status
- **3 Estate**: Kebun Mekar Sari, Kebun Indah Jaya, Kebun Sejahtera Abadi
- **5 Blok**: Distribusi blok di berbagai estate
- **5 Mandor**: Data mandor dengan nomor karyawan
- **30 Hari Trend Data**: Data tren untuk visualisasi

## 🚀 Penggunaan

### Akses Dashboard
```
http://localhost:3000/dashboard/panen
```

### Navigasi
1. Buka halaman utama Agrinova
2. Klik tombol "Dashboard Panen" di section "Akses Cepat"
3. Dashboard akan terbuka dengan data real-time

### Interaksi
- **Refresh Manual**: Klik tombol "Refresh" di header
- **Filter Data**: Gunakan search box dan dropdown filter
- **Approve/Reject**: Klik tombol aksi di tabel untuk entri pending
- **Export Data**: Klik tombol "Export" (fitur akan datang)

## 🔮 Roadmap

### Phase 1 (Current)
- ✅ Dashboard layout dengan metrics cards
- ✅ Interactive charts dan visualisasi
- ✅ Data table dengan filtering dan searching
- ✅ Real-time updates setup
- ✅ Responsive design
- ✅ Mock data integration

### Phase 2 (Next)
- [ ] API integration dengan NestJS backend
- [ ] Real WebSocket connection
- [ ] Advanced filtering dan sorting
- [ ] Data export functionality (Excel, PDF)
- [ ] Print-friendly layouts

### Phase 3 (Future)
- [ ] Advanced analytics dan insights
- [ ] Customizable dashboard widgets
- [ ] Role-based access control
- [ ] Mobile app integration
- [ ] Offline data caching

## 🛠️ Development

### Setup
```bash
cd apps/web
npm install
npm run dev
```

### File Structure
```
apps/web/
├── app/dashboard/panen/
│   ├── page.tsx                 # Main dashboard page
│   └── layout.tsx               # Dashboard layout
├── components/dashboard/
│   ├── metrics-cards.tsx        # KPI metrics cards
│   ├── charts.tsx              # Data visualization
│   └── harvest-table.tsx       # Data table component
├── hooks/
│   └── use-dashboard-updates.ts # Real-time updates hook
├── types/
│   └── dashboard.ts            # TypeScript interfaces
└── lib/
    ├── mock-data.ts            # Mock data for demo
    └── utils.ts                # Utility functions
```

### Komponen Utama

#### MetricsCards
Props: `{ metrics: DashboardMetrics, isLoading?: boolean }`
- Menampilkan 6 kartu KPI utama
- Loading states dengan skeleton animation
- Trend indicators dengan persentase perubahan

#### Charts
Props: `{ trendData: TrendData[], metrics: DashboardMetrics, estatePerformance: EstatePerformance[], isLoading?: boolean }`
- Multi-line chart untuk tren panen
- Pie chart untuk distribusi kualitas
- Bar chart untuk performa estate
- Responsive dan interactive

#### HarvestTable
Props: `{ entries: HarvestEntry[], isLoading?: boolean }`
- Searchable dan filterable table
- Pagination dengan kontrol navigasi
- Mobile-responsive cards layout
- Action buttons untuk approval workflow

## 📝 License

Internal Agrinova Project - All Rights Reserved