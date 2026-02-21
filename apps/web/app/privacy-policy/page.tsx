'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowLeft,
  FileText,
  Shield,
  Camera,
  MapPin,
  Smartphone,
  Users,
  Eye,
  Lock,
  Download,
  ExternalLink,
  Clock,
  Building,
  Mail,
  Phone,
  Globe,
  Printer,
  ChevronRight,
  Home
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// Table of Contents structure
const tableOfContents = [
  { id: 'pendahuluan', title: 'Pendahuluan', icon: FileText },
  { id: 'informasi-kumpul', title: 'Informasi yang Kami Kumpulkan', icon: Shield },
  { id: 'informasi-pribadi', title: 'Informasi Pribadi', icon: Users, indent: true },
  { id: 'informasi-perangkat', title: 'Informasi Perangkat', icon: Smartphone, indent: true },
  { id: 'data-lokasi', title: 'Data Lokasi', icon: MapPin, indent: true },
  { id: 'data-kamera', title: 'Data Kamera dan Media', icon: Camera, indent: true },
  { id: 'data-aktivitas', title: 'Data Aktivitas Kerja', icon: Eye, indent: true },
  { id: 'data-komunikasi', title: 'Data Komunikasi', icon: Mail, indent: true },
  { id: 'penggunaan-informasi', title: 'Bagaimana Kami Menggunakan Informasi', icon: Eye },
  { id: 'penyimpanan-keamanan', title: 'Penyimpanan Data dan Keamanan', icon: Lock },
  { id: 'berbagi-data', title: 'Berbagi dan Pengungkapan Data', icon: Users },
  { id: 'hak-privasi', title: 'Hak Privasi Anda', icon: Shield },
  { id: 'retensi-data', title: 'Retensi Data', icon: Clock },
  { id: 'privasi-anak', title: 'Privasi Anak', icon: Users },
  { id: 'transfer-internasional', title: 'Transfer Data Internasional', icon: Globe },
  { id: 'perubahan-kebijakan', title: 'Perubahan Kebijakan', icon: FileText },
  { id: 'kontak', title: 'Informasi Kontak', icon: Phone },
  { id: 'ringkasan', title: 'Ringkasan Izin Kamera', icon: Camera }
];

export default function PrivacyPolicyPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('pendahuluan');

  // Handle smooth scrolling to sections
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  };

  // Track active section while scrolling
  useEffect(() => {
    const observerOptions = {
      rootMargin: '-20% 0px -70% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, observerOptions);

    // Observe all sections
    tableOfContents.forEach((item) => {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* SEO Meta Tags */}
      <head>
        <title>Kebijakan Privasi - Agrinova | PT. Kalimantan Sawit Kusuma</title>
        <meta name="description" content="Kebijakan Privasi Aplikasi Mobile Agrinova - PT. Kalimantan Sawit Kusuma. Perlindungan data dan privasi pengguna dalam sistem manajemen perkebunan kelapa sawit." />
        <meta name="keywords" content="kebijakan privasi, agrinova, privacy policy, perlindungan data, kelapa sawit, palm oil management" />
        <meta name="robots" content="index, follow" />
        <meta property="og:title" content="Kebijakan Privasi - Agrinova" />
        <meta property="og:description" content="Kebijakan Privasi untuk Aplikasi Mobile Agrinova - Sistem Manajemen Perkebunan Kelapa Sawit Digital" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="/privacy-policy" />
      </head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 print:bg-white">
        {/* Header with Navigation - Hidden in print */}
        <div className="print:hidden sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Breadcrumb Navigation */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/dashboard')}
                  className="hover:bg-blue-50"
                >
                  <Home className="h-4 w-4 mr-1" />
                  Dashboard
                </Button>
                <ChevronRight className="h-4 w-4" />
                <span className="font-medium text-gray-900">Kebijakan Privasi</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="bg-white shadow-sm hover:shadow-md"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                  className="bg-white shadow-sm hover:shadow-md"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Kembali
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 print:p-0 print:max-w-none">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Table of Contents Sidebar - Hidden in print */}
            <div className="print:hidden lg:w-80 flex-shrink-0">
              <div className="sticky top-24">
                <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Daftar Isi
                    </CardTitle>
                    <CardDescription>
                      Navigasi cepat ke bagian kebijakan
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[calc(100vh-16rem)]">
                      <div className="space-y-1 p-4">
                        {tableOfContents.map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              onClick={() => scrollToSection(item.id)}
                              className={cn(
                                "w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center gap-3 group",
                                item.indent && "ml-4 text-sm",
                                activeSection === item.id
                                  ? "bg-blue-100 text-blue-900 shadow-sm border-l-4 border-blue-500"
                                  : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                              )}
                            >
                              <Icon className={cn(
                                "flex-shrink-0 transition-colors",
                                item.indent ? "h-4 w-4" : "h-5 w-5",
                                activeSection === item.id ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                              )} />
                              <span className="font-medium leading-tight">{item.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl print:shadow-none print:border-0">
                  <CardHeader className="pb-8 print:pb-4">
                    {/* Company Logo and Header */}
                    <div className="text-center mb-8 print:mb-4">
                      <div className="flex items-center justify-center mb-4 print:mb-2">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center print:w-12 print:h-12">
                          <span className="text-white font-bold text-2xl print:text-lg">A</span>
                        </div>
                      </div>
                      <h1 className="text-4xl font-bold text-gray-900 mb-2 print:text-2xl">
                        Kebijakan Privasi
                      </h1>
                      <h2 className="text-xl text-gray-600 mb-6 print:text-lg print:mb-3">
                        Aplikasi Mobile Agrinova
                      </h2>

                      {/* Document Info */}
                      <div className="flex flex-wrap justify-center gap-4 print:gap-2 print:text-sm">
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-300">
                          <Clock className="h-4 w-4 mr-2 print:h-3 print:w-3" />
                          Berlaku: 19 September 2025
                        </Badge>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-300">
                          <FileText className="h-4 w-4 mr-2 print:h-3 print:w-3" />
                          Versi: 1.0
                        </Badge>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-300">
                          <Building className="h-4 w-4 mr-2 print:h-3 print:w-3" />
                          PT. Kalimantan Sawit Kusuma
                        </Badge>
                      </div>
                    </div>

                    <Separator className="print:hidden" />
                  </CardHeader>

                  <CardContent className="space-y-12 print:space-y-6">
                    {/* 1. Pendahuluan */}
                    <section id="pendahuluan" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-600 print:h-6 print:w-6" />
                        Pendahuluan
                      </h2>
                      <div className="prose prose-gray max-w-none print:text-sm">
                        <p className="text-gray-700 leading-relaxed">
                          PT. KALIMANTAN SAWIT KUSUMA ("kami," "milik kami," atau "kita") berkomitmen untuk melindungi privasi Anda.
                          Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, mengungkapkan, dan melindungi
                          informasi Anda ketika menggunakan aplikasi mobile Agrinova ("Aplikasi"). Kebijakan ini berlaku untuk semua
                          pengguna sistem manajemen perkebunan kelapa sawit kami.
                        </p>
                      </div>
                    </section>

                    {/* 2. Informasi yang Kami Kumpulkan */}
                    <section id="informasi-kumpul" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <Shield className="h-8 w-8 text-green-600 print:h-6 print:w-6" />
                        Informasi yang Kami Kumpulkan
                      </h2>

                      {/* 2.1 Informasi Pribadi */}
                      <div id="informasi-pribadi" className="scroll-mt-24 mb-8">
                        <h3 className="text-2xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2 flex items-center gap-2">
                          <Users className="h-6 w-6 text-blue-500 print:h-5 print:w-5" />
                          1. Informasi Pribadi
                        </h3>
                        <div className="bg-blue-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Otentikasi Pengguna:</strong> Username, password (terenkripsi), ID karyawan, penugasan peran
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Informasi Profil:</strong> Nama lengkap, jabatan, departemen, informasi kontak
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Data Penugasan Kerja:</strong> Penugasan estate, penugasan divisi, hierarki pelaporan
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* 2.2 Informasi Perangkat */}
                      <div id="informasi-perangkat" className="scroll-mt-24 mb-8">
                        <h3 className="text-2xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2 flex items-center gap-2">
                          <Smartphone className="h-6 w-6 text-green-500 print:h-5 print:w-5" />
                          2. Informasi Perangkat
                        </h3>
                        <div className="bg-green-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Identifikasi Perangkat:</strong> ID perangkat, sidik jari perangkat untuk otentikasi keamanan
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Spesifikasi Perangkat:</strong> Sistem operasi, versi aplikasi, model perangkat
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Informasi Jaringan:</strong> Alamat IP, status konektivitas jaringan untuk sinkronisasi
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* 2.3 Data Lokasi */}
                      <div id="data-lokasi" className="scroll-mt-24 mb-8">
                        <h3 className="text-2xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2 flex items-center gap-2">
                          <MapPin className="h-6 w-6 text-orange-500 print:h-5 print:w-5" />
                          3. Data Lokasi
                        </h3>
                        <div className="bg-orange-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <div className="space-y-4 print:space-y-2">
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2 print:mb-1 print:text-sm">Koordinat GPS:</h4>
                              <p className="text-gray-700 mb-3 print:text-sm print:mb-1">Data lokasi presisi untuk:</p>
                              <ul className="space-y-2 text-gray-700 ml-4 print:space-y-1 print:text-sm">
                                <li>• Verifikasi dan pemetaan blok panen</li>
                                <li>• Validasi lokasi gate check</li>
                                <li>• Penegakan batas area kerja</li>
                                <li>• Pelacakan lokasi estate dan divisi</li>
                              </ul>
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-2 print:mb-1 print:text-sm">Lokasi Latar Belakang:</h4>
                              <p className="text-gray-700 mb-3 print:text-sm print:mb-1">Akses lokasi latar belakang terbatas untuk:</p>
                              <ul className="space-y-2 text-gray-700 ml-4 print:space-y-1 print:text-sm">
                                <li>• Check-in/check-out estate otomatis</li>
                                <li>• Pemantauan batas keamanan</li>
                                <li>• Validasi jam kerja</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2.4 Data Kamera dan Media */}
                      <div id="data-kamera" className="scroll-mt-24 mb-8">
                        <h3 className="text-2xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2 flex items-center gap-2">
                          <Camera className="h-6 w-6 text-purple-500 print:h-5 print:w-5" />
                          4. Data Kamera dan Media
                        </h3>
                        <div className="bg-purple-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <div className="mb-4 print:mb-2">
                            <p className="font-semibold text-purple-800 mb-3 print:text-sm print:mb-1">
                              Izin kamera digunakan secara eksklusif untuk operasi bisnis:
                            </p>
                          </div>

                          <div className="space-y-6 print:space-y-3">
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-3 print:text-sm print:mb-1">Dokumentasi Panen</h4>
                              <ul className="space-y-2 text-gray-700 ml-4 print:space-y-1 print:text-sm">
                                <li>• Fotografi TBS (Tandan Buah Segar): Foto buah kelapa sawit yang dipanen</li>
                                <li>• Dokumentasi Blok: Gambar blok panen dan area kerja</li>
                                <li>• Dokumentasi Peralatan: Foto peralatan dan alat panen</li>
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-semibold text-gray-800 mb-3 print:text-sm print:mb-1">Gate Check dan Keamanan</h4>
                              <ul className="space-y-2 text-gray-700 ml-4 print:space-y-1 print:text-sm">
                                <li>• Pemindaian Kode QR: Akses kamera untuk memindai kode QR di gerbang</li>
                                <li>• Dokumentasi Kendaraan: Foto kendaraan yang masuk/keluar area estate</li>
                                <li>• Pengenalan Plat Nomor: Gambar plat nomor kendaraan untuk kontrol akses</li>
                                <li>• Dokumentasi Pengemudi: Foto untuk registrasi pengunjung</li>
                              </ul>
                            </div>

                            <div>
                              <h4 className="font-semibold text-gray-800 mb-3 print:text-sm print:mb-1">Kontrol Kualitas</h4>
                              <ul className="space-y-2 text-gray-700 ml-4 print:space-y-1 print:text-sm">
                                <li>• Penilaian Kualitas Panen: Gambar untuk penilaian kualitas</li>
                                <li>• Kondisi Peralatan: Foto yang mendokumentasikan status peralatan</li>
                                <li>• Dokumentasi Kepatuhan: Gambar yang diperlukan untuk sertifikasi</li>
                              </ul>
                            </div>

                            {/* Privacy Protection for Camera */}
                            <div className="bg-white p-4 rounded-lg border-2 border-purple-200 print:p-2 print:border">
                              <h4 className="font-semibold text-purple-800 mb-3 print:text-sm print:mb-1">
                                Perlindungan Privasi Kamera yang Penting:
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 print:gap-1">
                                <div className="space-y-2 print:space-y-1 print:text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-700">Foto hanya saat aktif menggunakan fitur</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-700">Semua gambar untuk operasi bisnis</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-700">Foto disimpan dengan enkripsi aman</span>
                                  </div>
                                </div>
                                <div className="space-y-2 print:space-y-1 print:text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-700">Izin dapat dicabut di pengaturan</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-700">Tidak ada pengawasan pribadi</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-700">Pembersihan otomatis file sementara</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2.5 Data Aktivitas Kerja */}
                      <div id="data-aktivitas" className="scroll-mt-24 mb-8">
                        <h3 className="text-2xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2 flex items-center gap-2">
                          <Eye className="h-6 w-6 text-indigo-500 print:h-5 print:w-5" />
                          5. Data Aktivitas Kerja
                        </h3>
                        <div className="bg-indigo-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Catatan Panen:</strong> Berat TBS, data blok panen, metrik produktivitas pekerja
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Log Gate Check:</strong> Waktu masuk/keluar, informasi kendaraan, catatan pengunjung
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Alur Kerja Persetujuan:</strong> Keputusan persetujuan/penolakan data, timestamp alur kerja
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Aktivitas Sinkronisasi:</strong> Log sinkronisasi data, manajemen antrean offline
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* 2.6 Data Komunikasi */}
                      <div id="data-komunikasi" className="scroll-mt-24 mb-8">
                        <h3 className="text-2xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2 flex items-center gap-2">
                          <Mail className="h-6 w-6 text-teal-500 print:h-5 print:w-5" />
                          6. Data Komunikasi
                        </h3>
                        <div className="bg-teal-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Notifikasi Push:</strong> Preferensi notifikasi, status pengiriman, log interaksi
                              </div>
                            </li>
                            <li className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-teal-500 rounded-full mt-2 flex-shrink-0"></div>
                              <div>
                                <strong>Pesan Dalam Aplikasi:</strong> Notifikasi sistem, penugasan kerja, permintaan persetujuan
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    {/* 3. Bagaimana Kami Menggunakan Informasi */}
                    <section id="penggunaan-informasi" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <Eye className="h-8 w-8 text-purple-600 print:h-6 print:w-6" />
                        Bagaimana Kami Menggunakan Informasi Anda
                      </h2>
                      <div className="space-y-6 print:space-y-3">
                        <div className="bg-purple-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Operasi Bisnis Inti</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Manajemen Perkebunan:</strong> Melacak aktivitas panen, memantau produktivitas, mengelola operasi estate</li>
                            <li>• <strong>Keamanan dan Kontrol Akses:</strong> Memverifikasi identitas pengguna, mengelola akses estate, memelihara log keamanan</li>
                            <li>• <strong>Jaminan Kualitas:</strong> Mendokumentasikan kepatuhan, memelihara jejak audit, memastikan standar kualitas</li>
                            <li>• <strong>Efisiensi Operasional:</strong> Mengkoordinasikan penugasan kerja, merampingkan proses persetujuan, mengoptimalkan alur kerja</li>
                          </ul>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Penggunaan Khusus Data Kamera</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Verifikasi Panen:</strong> Konfirmasi visual kualitas dan kuantitas TBS untuk pelaporan yang akurat</li>
                            <li>• <strong>Pemantauan Keamanan:</strong> Mendokumentasikan akses kendaraan dan aktivitas pengunjung untuk keamanan estate</li>
                            <li>• <strong>Dokumentasi Kepatuhan:</strong> Memelihara catatan visual yang diperlukan untuk sertifikasi industri</li>
                            <li>• <strong>Manajemen Aset:</strong> Melacak kondisi peralatan dan persyaratan pemeliharaan</li>
                          </ul>
                        </div>

                        <div className="bg-green-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Operasi Teknis</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Sinkronisasi Data:</strong> Sinkronisasi data offline ketika konektivitas pulih</li>
                            <li>• <strong>Optimisasi Kinerja:</strong> Memantau kinerja aplikasi, mengidentifikasi dan menyelesaikan masalah teknis</li>
                            <li>• <strong>Peningkatan Keamanan:</strong> Mendeteksi akses tidak sah, mencegah pelanggaran data</li>
                            <li>• <strong>Peningkatan Layanan:</strong> Menganalisis pola penggunaan untuk meningkatkan pengalaman pengguna</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    {/* 4. Penyimpanan Data dan Keamanan */}
                    <section id="penyimpanan-keamanan" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <Lock className="h-8 w-8 text-red-600 print:h-6 print:w-6" />
                        Penyimpanan Data dan Keamanan
                      </h2>
                      <div className="space-y-6 print:space-y-3">
                        <div className="bg-red-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Penyimpanan Lokal (Perangkat)</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Database SQLite:</strong> Penyimpanan lokal terenkripsi untuk operasi offline</li>
                            <li>• <strong>Penyimpanan Aman:</strong> Token JWT disimpan di Android Keystore/iOS Keychain</li>
                            <li>• <strong>Perlindungan Biometrik:</strong> Otentikasi sidik jari/Face ID opsional</li>
                            <li>• <strong>Pembersihan Otomatis:</strong> File sementara dan data cache dihapus setelah sinkronisasi</li>
                          </ul>
                        </div>

                        <div className="bg-orange-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Penyimpanan Server</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Transmisi Terenkripsi:</strong> Semua data dikirim menggunakan enkripsi TLS/SSL</li>
                            <li>• <strong>Keamanan Database:</strong> Database server dilindungi dengan keamanan tingkat enterprise</li>
                            <li>• <strong>Kontrol Akses:</strong> Pembatasan akses berbasis peran dan logging audit</li>
                            <li>• <strong>Sistem Backup:</strong> Prosedur backup aman dan pemulihan bencana</li>
                          </ul>
                        </div>

                        <div className="bg-yellow-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Keamanan Data Kamera</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Enkripsi Lokal:</strong> Foto dienkripsi di penyimpanan perangkat</li>
                            <li>• <strong>Upload Aman:</strong> Gambar dikirim hanya melalui saluran terenkripsi</li>
                            <li>• <strong>Keamanan Server:</strong> Foto disimpan di server aman dengan kontrol akses</li>
                            <li>• <strong>Kebijakan Retensi:</strong> Gambar disimpan hanya selama diperlukan untuk operasi bisnis</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    {/* 5. Berbagi dan Pengungkapan Data */}
                    <section id="berbagi-data" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <Users className="h-8 w-8 text-indigo-600 print:h-6 print:w-6" />
                        Berbagi dan Pengungkapan Data
                      </h2>
                      <div className="space-y-6 print:space-y-3">
                        <div className="bg-indigo-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Penggunaan Bisnis Internal</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Pelaporan Manajemen:</strong> Data agregat untuk manajemen estate dan analisis produktivitas</li>
                            <li>• <strong>Pelaporan Kepatuhan:</strong> Data yang diperlukan untuk sertifikasi industri dan kepatuhan regulasi</li>
                            <li>• <strong>Koordinasi Operasional:</strong> Berbagi informasi antara personel yang berwenang untuk koordinasi kerja</li>
                          </ul>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Layanan Pihak Ketiga</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Layanan Firebase:</strong> Notifikasi push dan analitik (Kebijakan Privasi Google berlaku)</li>
                            <li>• <strong>Penyimpanan Cloud:</strong> Penyimpanan cloud aman untuk backup dan sinkronisasi</li>
                            <li>• <strong>Layanan Keamanan:</strong> Otentikasi dan verifikasi keamanan perangkat</li>
                          </ul>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Persyaratan Hukum</h3>
                          <p className="text-gray-700 print:text-sm">
                            Kami dapat mengungkapkan informasi ketika diperlukan oleh hukum, regulasi, atau proses hukum,
                            atau untuk melindungi hak, properti, atau keselamatan kami.
                          </p>
                        </div>
                      </div>
                    </section>

                    {/* 6. Hak Privasi Anda */}
                    <section id="hak-privasi" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <Shield className="h-8 w-8 text-green-600 print:h-6 print:w-6" />
                        Hak Privasi Anda
                      </h2>
                      <div className="space-y-6 print:space-y-3">
                        <div className="bg-green-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Akses dan Kontrol</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Akses Data:</strong> Meminta salinan data pribadi Anda yang disimpan di sistem kami</li>
                            <li>• <strong>Koreksi Data:</strong> Memperbarui atau memperbaiki informasi pribadi yang tidak akurat</li>
                            <li>• <strong>Penghapusan Data:</strong> Meminta penghapusan data Anda ketika diizinkan secara hukum</li>
                            <li>• <strong>Manajemen Izin:</strong> Mengontrol izin aplikasi di pengaturan perangkat Anda</li>
                          </ul>
                        </div>

                        <div className="bg-purple-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Kontrol Izin Kamera</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Berikan/Cabut Akses:</strong> Aktifkan atau nonaktifkan izin kamera di pengaturan perangkat</li>
                            <li>• <strong>Penggunaan Selektif:</strong> Akses kamera hanya ketika Anda secara aktif menggunakan fitur foto</li>
                            <li>• <strong>Metode Alternatif:</strong> Fungsi inti aplikasi tersedia tanpa akses kamera</li>
                            <li>• <strong>Penghapusan Data:</strong> Meminta penghapusan foto tertentu atau semua data kamera</li>
                          </ul>
                        </div>

                        <div className="bg-cyan-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Preferensi Notifikasi</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Notifikasi Push:</strong> Aktifkan/nonaktifkan berbagai jenis notifikasi</li>
                            <li>• <strong>Preferensi Komunikasi:</strong> Kontrol bagaimana kami berkomunikasi dengan Anda tentang pembaruan dan fitur aplikasi</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    {/* 7. Retensi Data */}
                    <section id="retensi-data" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <Clock className="h-8 w-8 text-orange-600 print:h-6 print:w-6" />
                        Retensi Data
                      </h2>
                      <div className="space-y-6 print:space-y-3">
                        <div className="bg-orange-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Data Operasional</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Pekerjaan Aktif:</strong> Data disimpan selama masa kerja aktif dan penggunaan sistem</li>
                            <li>• <strong>Pasca-Pekerjaan:</strong> Catatan penting disimpan sesuai persyaratan hukum dan bisnis</li>
                            <li>• <strong>Kepatuhan Hukum:</strong> Beberapa data disimpan untuk memenuhi persyaratan regulasi dan audit</li>
                          </ul>
                        </div>

                        <div className="bg-yellow-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Retensi Data Kamera</h3>
                          <ul className="space-y-3 text-gray-700 print:space-y-1 print:text-sm">
                            <li>• <strong>Catatan Bisnis:</strong> Foto disimpan sebagai catatan bisnis sesuai kebijakan perusahaan</li>
                            <li>• <strong>Kontrol Kualitas:</strong> Gambar disimpan untuk jaminan kualitas dan verifikasi kepatuhan</li>
                            <li>• <strong>Penghapusan Otomatis:</strong> Gambar sementara dan cache secara otomatis dihapus</li>
                            <li>• <strong>Permintaan Pengguna:</strong> Penghapusan foto tertentu tersedia atas permintaan jika diizinkan secara hukum</li>
                          </ul>
                        </div>
                      </div>
                    </section>

                    {/* 8. Privasi Anak */}
                    <section id="privasi-anak" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <Users className="h-8 w-8 text-pink-600 print:h-6 print:w-6" />
                        Privasi Anak
                      </h2>
                      <div className="bg-pink-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                        <p className="text-gray-700 leading-relaxed print:text-sm">
                          Aplikasi Mobile Agrinova dirancang untuk penggunaan bisnis oleh karyawan dan personel yang berwenang.
                          Kami tidak secara sengaja mengumpulkan informasi pribadi dari anak-anak di bawah usia 18 tahun.
                          Jika kami mengetahui bahwa seorang anak telah memberikan informasi pribadi kepada kami,
                          kami akan mengambil langkah untuk menghapus informasi tersebut.
                        </p>
                      </div>
                    </section>

                    {/* 9. Transfer Data Internasional */}
                    <section id="transfer-internasional" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <Globe className="h-8 w-8 text-blue-600 print:h-6 print:w-6" />
                        Transfer Data Internasional
                      </h2>
                      <div className="bg-blue-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                        <p className="text-gray-700 leading-relaxed print:text-sm">
                          Informasi Anda dapat ditransfer ke dan diproses di negara selain negara tempat tinggal Anda.
                          Kami memastikan perlindungan yang tepat untuk melindungi data Anda selama transfer internasional,
                          termasuk menggunakan klausul kontrak standar dan memastikan tingkat perlindungan yang memadai.
                        </p>
                      </div>
                    </section>

                    {/* 10. Perubahan Kebijakan */}
                    <section id="perubahan-kebijakan" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <FileText className="h-8 w-8 text-purple-600 print:h-6 print:w-6" />
                        Perubahan Kebijakan Privasi Ini
                      </h2>
                      <div className="bg-purple-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                        <p className="text-gray-700 leading-relaxed print:text-sm">
                          Kami dapat memperbarui Kebijakan Privasi ini secara berkala untuk mencerminkan perubahan dalam praktik kami,
                          teknologi, persyaratan hukum, atau faktor lain. Kami akan memberi tahu pengguna tentang perubahan signifikan
                          melalui aplikasi atau cara yang sesuai lainnya. Tanggal "Terakhir Diperbarui" di bagian atas kebijakan ini
                          menunjukkan kapan perubahan terbaru dilakukan.
                        </p>
                      </div>
                    </section>

                    {/* 11. Informasi Kontak */}
                    <section id="kontak" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <Phone className="h-8 w-8 text-green-600 print:h-6 print:w-6" />
                        Informasi Kontak
                      </h2>
                      <div className="space-y-6 print:space-y-3">
                        <div className="bg-green-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Petugas Perlindungan Data</h3>
                          <div className="space-y-2 text-gray-700 print:text-sm">
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-green-500 print:h-4 print:w-4" />
                              <span><strong>Email:</strong> privacy@agrinova.com</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Phone className="h-5 w-5 text-green-500 print:h-4 print:w-4" />
                              <span><strong>Telepon:</strong> +62-XXX-XXXX-XXXX</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Building className="h-5 w-5 text-green-500 print:h-4 print:w-4" />
                              <span><strong>Alamat:</strong> [Alamat Perusahaan]</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Dukungan Teknis</h3>
                          <div className="space-y-2 text-gray-700 print:text-sm">
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-blue-500 print:h-4 print:w-4" />
                              <span><strong>Email:</strong> support@agrinova.com</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Phone className="h-5 w-5 text-blue-500 print:h-4 print:w-4" />
                              <span><strong>Telepon:</strong> +62-XXX-XXXX-XXXX</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-lg print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-gray-800 mb-4 print:text-lg print:mb-2">Pertanyaan Umum</h3>
                          <div className="space-y-2 text-gray-700 print:text-sm">
                            <div className="flex items-center gap-3">
                              <Mail className="h-5 w-5 text-gray-500 print:h-4 print:w-4" />
                              <span><strong>Email:</strong> info@agrinova.com</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Globe className="h-5 w-5 text-gray-500 print:h-4 print:w-4" />
                              <span><strong>Website:</strong> https://agrinova.com</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* 12. Ringkasan Izin Kamera */}
                    <section id="ringkasan" className="scroll-mt-24">
                      <h2 className="text-3xl font-bold text-gray-900 mb-6 print:text-xl print:mb-3 flex items-center gap-3">
                        <Camera className="h-8 w-8 text-amber-600 print:h-6 print:w-6" />
                        Ringkasan Izin Kamera
                      </h2>
                      <div className="space-y-6 print:space-y-3">
                        <div className="bg-amber-50 p-6 rounded-lg border-2 border-amber-200 print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-amber-800 mb-4 print:text-lg print:mb-2">
                            Mengapa kami memerlukan akses kamera:
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                            <div className="space-y-3 print:space-y-1">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                <span className="text-gray-700 print:text-sm">
                                  <strong>Pemindaian Kode QR</strong> - Untuk gate check dan kontrol akses estate
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                <span className="text-gray-700 print:text-sm">
                                  <strong>Dokumentasi Panen</strong> - Foto TBS dan aktivitas panen untuk catatan bisnis
                                </span>
                              </div>
                            </div>
                            <div className="space-y-3 print:space-y-1">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                <span className="text-gray-700 print:text-sm">
                                  <strong>Verifikasi Keamanan</strong> - Dokumentasi kendaraan dan pengunjung untuk keamanan estate
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                <span className="text-gray-700 print:text-sm">
                                  <strong>Kontrol Kualitas</strong> - Dokumentasi visual untuk kepatuhan dan jaminan kualitas
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200 print:bg-white print:p-3 print:border print:border-gray-300">
                          <h3 className="text-xl font-semibold text-green-800 mb-4 print:text-lg print:mb-2">
                            Perlindungan privasi Anda:
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
                            <div className="space-y-3 print:space-y-1">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-gray-700 print:text-sm">Kamera hanya diaktifkan ketika Anda menggunakan fitur foto</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-gray-700 print:text-sm">Foto digunakan secara eksklusif untuk operasi bisnis</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-gray-700 print:text-sm">Enkripsi aman untuk semua data gambar</span>
                              </div>
                            </div>
                            <div className="space-y-3 print:space-y-1">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-gray-700 print:text-sm">Izin dapat dicabut di pengaturan perangkat</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-gray-700 print:text-sm">Tidak ada pengawasan pribadi atau pengenalan wajah</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-gray-700 print:text-sm">Pembersihan otomatis file sementara</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-green-200 print:border-gray-300">
                            <p className="text-gray-700 print:text-sm">
                              <strong>Pertanyaan tentang penggunaan kamera?</strong> Hubungi tim privasi kami di
                              <span className="text-green-700 font-medium"> privacy@agrinova.com</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Footer */}
                    <div className="border-t pt-8 mt-12 print:border-gray-300 print:pt-4 print:mt-6">
                      <div className="text-center space-y-4 print:space-y-2">
                        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600 print:gap-2 print:text-xs">
                          <span>Kebijakan privasi ini tersedia dalam Bahasa Inggris atas permintaan.</span>
                          <span className="print:hidden">•</span>
                          <span>This privacy policy is available in English upon request.</span>
                        </div>

                        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 print:gap-2 print:text-xs">
                          <span><strong>Versi Dokumen:</strong> 1.0</span>
                          <span>•</span>
                          <span><strong>ID Kebijakan:</strong> AGRI-PRIVACY-2025-001</span>
                        </div>

                        <div className="text-sm text-gray-500 print:text-xs">
                          <strong>Disetujui Oleh:</strong> Departemen Hukum PT. KALIMANTAN SAWIT KUSUMA
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}