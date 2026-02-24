'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    ArrowUp,
    Calendar,
    ChevronDown,
    FileText,
    Mail,
    Globe,
    Shield,
    Lock,
    Camera,
    MapPin,
    Smartphone,
    Users,
    Eye,
    Phone,
    Building,
    Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types & Data                                                      */
/* ------------------------------------------------------------------ */

type TocItem = {
    id: string;
    label: string;
    number: string;
};

const TOC_ITEMS: TocItem[] = [
    { id: 'pendahuluan', label: 'Pendahuluan', number: '1' },
    { id: 'informasi-kumpul', label: 'Informasi yang Kami Kumpulkan', number: '2' },
    { id: 'penggunaan-informasi', label: 'Penggunaan Informasi', number: '3' },
    { id: 'penyimpanan-keamanan', label: 'Penyimpanan & Keamanan', number: '4' },
    { id: 'berbagi-data', label: 'Berbagi & Pengungkapan Data', number: '5' },
    { id: 'hak-privasi', label: 'Hak Privasi Anda', number: '6' },
    { id: 'retensi-data', label: 'Retensi Data', number: '7' },
    { id: 'privasi-anak', label: 'Privasi Anak', number: '8' },
    { id: 'perubahan-kebijakan', label: 'Perubahan Kebijakan', number: '9' },
    { id: 'kontak', label: 'Informasi Kontak', number: '10' },
    { id: 'ringkasan', label: 'Ringkasan Izin Kamera', number: '11' },
];

/* ------------------------------------------------------------------ */
/*  Reusable Components                                               */
/* ------------------------------------------------------------------ */

function HighlightBox({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="mt-6 rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-4 sm:p-5 print:border-emerald-300 print:bg-white">
            <div className="flex items-start gap-3">
                <Shield
                    className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600"
                    aria-hidden="true"
                />
                <div>
                    <p className="text-sm font-semibold text-slate-900">{title}</p>
                    <div className="mt-1.5 text-sm leading-relaxed text-slate-700">{children}</div>
                </div>
            </div>
        </div>
    );
}

function SectionHeading({
    number,
    children,
}: {
    number: string;
    children: React.ReactNode;
}) {
    return (
        <h2 className="flex items-start gap-3 text-xl font-semibold leading-snug tracking-tight text-slate-900 sm:items-baseline sm:text-2xl">
            <span className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 sm:mt-0 sm:h-8 sm:w-8 sm:text-sm">
                {number}
            </span>
            <span style={{ textWrap: 'balance' } as React.CSSProperties}>{children}</span>
        </h2>
    );
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="mt-8 text-base font-semibold text-slate-800">{children}</h3>
    );
}

function BulletList({
    items,
    color = 'emerald',
}: {
    items: Array<{ bold: string; text: string }>;
    color?: 'emerald' | 'red';
}) {
    const dotClass = color === 'red' ? 'bg-red-400' : 'bg-emerald-500';
    return (
        <ul className="mt-4 space-y-3 pl-1">
            {items.map((item) => (
                <li key={item.bold} className="flex items-start gap-3">
                    <span
                        className={cn('mt-2 block h-1.5 w-1.5 flex-shrink-0 rounded-full', dotClass)}
                    />
                    <span>
                        <strong className="font-semibold text-slate-900">{item.bold}:</strong>{' '}
                        {item.text}
                    </span>
                </li>
            ))}
        </ul>
    );
}

function SimpleBulletList({ items }: { items: string[] }) {
    return (
        <ul className="mt-4 space-y-2.5 pl-1">
            {items.map((item) => (
                <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function PrivacyPolicyClientPage() {
    const [activeSection, setActiveSection] = React.useState<string>(TOC_ITEMS[0].id);
    const [showBackToTop, setShowBackToTop] = React.useState(false);
    const [tocOpen, setTocOpen] = React.useState(false);

    /* ---- Intersection Observer ---- */
    React.useEffect(() => {
        const observedSections = TOC_ITEMS.map(({ id }) => document.getElementById(id)).filter(
            Boolean
        ) as HTMLElement[];

        if (observedSections.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

                if (visible[0]?.target?.id) {
                    setActiveSection(visible[0].target.id);
                }
            },
            { rootMargin: '-20% 0px -65% 0px', threshold: [0.1, 0.3, 0.6] }
        );

        observedSections.forEach((s) => observer.observe(s));
        return () => observer.disconnect();
    }, []);

    /* ---- Back-to-top visibility ---- */
    React.useEffect(() => {
        const onScroll = () => setShowBackToTop(window.scrollY > 480);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    /* ---- Smooth scroll to section ---- */
    const handleTocClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        event.preventDefault();
        const section = document.getElementById(id);
        if (!section) return;
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveSection(id);
        window.history.replaceState(null, '', `#${id}`);
        setTocOpen(false);
    };

    /* ---- TOC renderer ---- */
    const renderTocList = (isMobile: boolean) => (
        <ul className={cn('space-y-0.5', isMobile && 'mt-3')}>
            {TOC_ITEMS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                    <li key={item.id}>
                        <a
                            href={`#${item.id}`}
                            onClick={(e) => handleTocClick(e, item.id)}
                            className={cn(
                                'flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors transition-[background-color,color] duration-150',
                                isActive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                            )}
                        >
                            <span
                                className={cn(
                                    'inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[11px] font-bold transition-colors duration-150',
                                    isActive
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-slate-100 text-slate-400'
                                )}
                            >
                                {item.number}
                            </span>
                            <span className="leading-tight">{item.label}</span>
                        </a>
                    </li>
                );
            })}
        </ul>
    );

    /* ---- Section separator ---- */
    const sectionClass =
        'scroll-mt-32 border-b border-slate-100 py-8 sm:scroll-mt-24 sm:py-12 print:border-slate-300';
    const firstSectionClass =
        'scroll-mt-32 border-b border-slate-100 pb-8 sm:scroll-mt-24 sm:pb-12 print:border-slate-300';

    return (
        <main className="min-h-screen touch-manipulation bg-white text-slate-700 print:bg-white print:text-black">
            {/* ============================================================ */}
            {/*  HERO SECTION                                                */}
            {/* ============================================================ */}
            <div className="bg-gradient-to-b from-slate-50 via-slate-50/80 to-white print:bg-white">
                <div className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-8 sm:pb-10 sm:pt-10 lg:px-12 lg:pt-16">
                    {/* Back link */}
                    <Link
                        href="/login"
                        className="group inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 print:hidden"
                    >
                        <span
                            className="transition-transform duration-150 group-hover:-translate-x-0.5"
                            aria-hidden="true"
                        >
                            ←
                        </span>
                        Kembali ke Login
                    </Link>

                    {/* Title block */}
                    <div className="mt-6 flex items-start gap-4 sm:mt-8 sm:gap-5">
                        <div className="hidden rounded-2xl bg-emerald-100 p-3 sm:block print:hidden">
                            <Shield className="h-8 w-8 text-emerald-700" aria-hidden="true" />
                        </div>
                        <div>
                            <h1
                                className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-[3.25rem]"
                                style={{ textWrap: 'balance' } as React.CSSProperties}
                            >
                                Kebijakan Privasi
                            </h1>
                            <p className="mt-2 text-lg text-slate-600">Aplikasi Mobile Agrinova</p>
                            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                                PT. Kalimantan Sawit Kusuma
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4" aria-hidden="true" />
                                    Berlaku: 19 September 2025
                                </span>
                                <span className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" aria-hidden="true" />
                                    Versi 1.0
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Elegant divider */}
                    <div className="relative mt-10">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-gradient-to-b from-slate-50 to-white px-4">
                                <span className="block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/*  CONTENT AREA: SIDEBAR + ARTICLE                             */}
            {/* ============================================================ */}
            <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-8 sm:pb-20 lg:px-12">
                <div className="grid grid-cols-1 gap-8 sm:gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
                    {/* ---- MOBILE TOC (sticky) ---- */}
                    <nav className="sticky top-0 z-20 -mx-4 bg-white/95 px-4 py-3 backdrop-blur-sm print:hidden sm:-mx-8 sm:px-8 lg:hidden" aria-label="Daftar isi mobile">
                        <button
                            type="button"
                            onClick={() => setTocOpen(!tocOpen)}
                            className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                            aria-expanded={tocOpen}
                        >
                            <span className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                Daftar Isi
                            </span>
                            <ChevronDown
                                className={cn(
                                    'h-4 w-4 text-slate-400 transition-transform duration-200',
                                    tocOpen && 'rotate-180'
                                )}
                                aria-hidden="true"
                            />
                        </button>
                        {tocOpen && (
                            <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                                {renderTocList(true)}
                            </div>
                        )}
                    </nav>

                    {/* ---- DESKTOP SIDEBAR ---- */}
                    <aside className="hidden print:hidden lg:block">
                        <nav
                            className="sticky top-24 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4"
                            aria-label="Daftar isi"
                        >
                            <p className="mb-3 flex items-center gap-2 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">
                                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                                Daftar Isi
                            </p>
                            <div className="h-px bg-slate-200/80" />
                            <div className="mt-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
                                {renderTocList(false)}
                            </div>
                        </nav>
                    </aside>

                    {/* ---- ARTICLE CONTENT ---- */}
                    <article className="max-w-[800px] text-sm leading-relaxed sm:text-[15px] sm:leading-[1.8] print:max-w-none print:text-black">
                        {/* -- 1. Pendahuluan -- */}
                        <section id="pendahuluan" className={firstSectionClass}>
                            <SectionHeading number="1">Pendahuluan</SectionHeading>
                            <p className="mt-5">
                                <strong className="font-semibold text-slate-900">
                                    PT. KALIMANTAN SAWIT KUSUMA
                                </strong>{' '}
                                (&ldquo;kami,&rdquo; &ldquo;milik kami,&rdquo; atau &ldquo;kita&rdquo;)
                                berkomitmen untuk melindungi privasi Anda. Kebijakan Privasi ini menjelaskan
                                bagaimana kami mengumpulkan, menggunakan, mengungkapkan, dan melindungi informasi
                                Anda ketika menggunakan aplikasi mobile Agrinova (&ldquo;Aplikasi&rdquo;).
                            </p>
                            <p className="mt-3">
                                Kebijakan ini berlaku untuk semua pengguna sistem manajemen perkebunan kelapa
                                sawit kami.
                            </p>
                        </section>

                        {/* -- 2. Informasi yang Kami Kumpulkan -- */}
                        <section id="informasi-kumpul" className={sectionClass}>
                            <SectionHeading number="2">Informasi yang Kami Kumpulkan</SectionHeading>

                            <SubHeading>2.1 Informasi Pribadi</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Otentikasi Pengguna', text: 'Username, password (terenkripsi), ID karyawan, penugasan peran' },
                                    { bold: 'Informasi Profil', text: 'Nama lengkap, jabatan, departemen, informasi kontak' },
                                    { bold: 'Data Penugasan Kerja', text: 'Penugasan estate, penugasan divisi, hierarki pelaporan' },
                                ]}
                            />

                            <SubHeading>2.2 Informasi Perangkat</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Identifikasi Perangkat', text: 'ID perangkat, sidik jari perangkat untuk otentikasi keamanan' },
                                    { bold: 'Spesifikasi Perangkat', text: 'Sistem operasi, versi aplikasi, model perangkat' },
                                    { bold: 'Informasi Jaringan', text: 'Alamat IP, status konektivitas jaringan untuk sinkronisasi' },
                                ]}
                            />

                            <SubHeading>2.3 Data Lokasi</SubHeading>
                            <p className="mt-3">Data lokasi presisi untuk:</p>
                            <SimpleBulletList
                                items={[
                                    'Validasi lokasi gate check',
                                    'Pelacakan lokasi estate, divisi, dan blok panen',
                                ]}
                            />
                            <p className="mt-4">Akses lokasi latar belakang terbatas untuk:</p>
                            <SimpleBulletList
                                items={[
                                    'Check-in/check-out estate otomatis',
                                    'Pemantauan batas keamanan',
                                    'Validasi jam kerja',
                                ]}
                            />

                            <SubHeading>2.4 Data Kamera dan Media</SubHeading>
                            <p className="mt-3">
                                Izin kamera digunakan secara eksklusif untuk operasi bisnis:
                            </p>

                            <p className="mt-4 font-semibold text-slate-800">Dokumentasi Panen</p>
                            <SimpleBulletList
                                items={[
                                    'Fotografi TBS (Tandan Buah Segar): Foto buah kelapa sawit yang dipanen',
                                    'Dokumentasi Blok: Gambar blok panen dan area kerja',
                                    'Dokumentasi Peralatan: Foto peralatan dan alat panen',
                                ]}
                            />
                            <p className="mt-4 font-semibold text-slate-800">Gate Check dan Keamanan</p>
                            <SimpleBulletList
                                items={[
                                    'Pemindaian Kode QR: Akses kamera untuk memindai kode QR di gerbang',
                                    'Dokumentasi Kendaraan: Foto kendaraan yang masuk/keluar area estate',
                                    'Pengenalan Plat Nomor: Gambar plat nomor kendaraan untuk kontrol akses',
                                    'Dokumentasi Pengunjung: Foto untuk registrasi pengunjung',
                                ]}
                            />
                            <p className="mt-4 font-semibold text-slate-800">Kontrol Kualitas</p>
                            <SimpleBulletList
                                items={[
                                    'Penilaian Kualitas Panen: Gambar untuk penilaian kualitas',
                                    'Kondisi Peralatan: Foto yang mendokumentasikan status peralatan',
                                    'Dokumentasi Kepatuhan: Gambar yang diperlukan untuk sertifikasi',
                                ]}
                            />

                            <HighlightBox title="Perlindungan Privasi Kamera">
                                <ul className="mt-2 space-y-1.5">
                                    <li>• Foto hanya saat aktif menggunakan fitur</li>
                                    <li>• Semua gambar untuk operasi bisnis</li>
                                    <li>• Foto disimpan dengan enkripsi aman</li>
                                    <li>• Izin dapat dicabut di pengaturan perangkat</li>
                                    <li>• Tidak ada pengawasan pribadi</li>
                                    <li>• Pembersihan otomatis file sementara</li>
                                </ul>
                            </HighlightBox>

                            <SubHeading>2.5 Data Aktivitas Kerja</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Catatan Panen', text: 'Berat TBS, data blok panen, metrik produktivitas pekerja' },
                                    { bold: 'Log Gate Check', text: 'Waktu masuk/keluar, informasi kendaraan, catatan pengunjung' },
                                    { bold: 'Alur Kerja Persetujuan', text: 'Keputusan persetujuan/penolakan data, timestamp alur kerja' },
                                    { bold: 'Aktivitas Sinkronisasi', text: 'Log sinkronisasi data, manajemen antrean offline' },
                                ]}
                            />

                            <SubHeading>2.6 Data Komunikasi</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Notifikasi Push', text: 'Preferensi notifikasi, status pengiriman, log interaksi' },
                                    { bold: 'Pesan Dalam Aplikasi', text: 'Notifikasi sistem, penugasan kerja, permintaan persetujuan' },
                                ]}
                            />
                        </section>

                        {/* -- 3. Penggunaan Informasi -- */}
                        <section id="penggunaan-informasi" className={sectionClass}>
                            <SectionHeading number="3">
                                Bagaimana Kami Menggunakan Informasi Anda
                            </SectionHeading>

                            <SubHeading>Operasi Bisnis Inti</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Manajemen Perkebunan', text: 'Melacak aktivitas panen, memantau produktivitas, mengelola operasi estate' },
                                    { bold: 'Keamanan dan Kontrol Akses', text: 'Memverifikasi identitas pengguna, mengelola akses estate, memelihara log keamanan' },
                                    { bold: 'Jaminan Kualitas', text: 'Mendokumentasikan kepatuhan, memelihara jejak audit, memastikan standar kualitas' },
                                    { bold: 'Efisiensi Operasional', text: 'Mengkoordinasikan penugasan kerja, merampingkan proses persetujuan, mengoptimalkan alur kerja' },
                                ]}
                            />

                            <SubHeading>Penggunaan Khusus Data Kamera</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Verifikasi Panen', text: 'Konfirmasi visual kualitas dan kuantitas TBS untuk pelaporan yang akurat' },
                                    { bold: 'Pemantauan Keamanan', text: 'Mendokumentasikan akses kendaraan dan aktivitas pengunjung untuk keamanan estate' },
                                    { bold: 'Dokumentasi Kepatuhan', text: 'Memelihara catatan visual yang diperlukan untuk sertifikasi industri' },
                                    { bold: 'Manajemen Aset', text: 'Melacak kondisi peralatan dan persyaratan pemeliharaan' },
                                ]}
                            />

                            <SubHeading>Operasi Teknis</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Sinkronisasi Data', text: 'Sinkronisasi data offline ketika konektivitas pulih' },
                                    { bold: 'Optimisasi Kinerja', text: 'Memantau kinerja aplikasi, mengidentifikasi dan menyelesaikan masalah teknis' },
                                    { bold: 'Peningkatan Keamanan', text: 'Mendeteksi akses tidak sah, mencegah pelanggaran data' },
                                    { bold: 'Peningkatan Layanan', text: 'Menganalisis pola penggunaan untuk meningkatkan pengalaman pengguna' },
                                ]}
                            />
                        </section>

                        {/* -- 4. Penyimpanan & Keamanan -- */}
                        <section id="penyimpanan-keamanan" className={sectionClass}>
                            <SectionHeading number="4">Penyimpanan Data dan Keamanan</SectionHeading>

                            <SubHeading>Penyimpanan Lokal (Perangkat)</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Database SQLite', text: 'Penyimpanan lokal terenkripsi untuk operasi offline' },
                                    { bold: 'Penyimpanan Aman', text: 'Token JWT disimpan di Android Keystore / iOS Keychain' },
                                    { bold: 'Perlindungan Biometrik', text: 'Otentikasi sidik jari / Face ID opsional' },
                                    { bold: 'Pembersihan Otomatis', text: 'File sementara dan data cache dihapus setelah sinkronisasi' },
                                ]}
                            />

                            <SubHeading>Penyimpanan Server</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Transmisi Terenkripsi', text: 'Semua data dikirim menggunakan enkripsi TLS/SSL' },
                                    { bold: 'Keamanan Database', text: 'Database server dilindungi dengan keamanan tingkat enterprise' },
                                    { bold: 'Kontrol Akses', text: 'Pembatasan akses berbasis peran dan logging audit' },
                                    { bold: 'Sistem Backup', text: 'Prosedur backup aman dan pemulihan bencana' },
                                ]}
                            />

                            <SubHeading>Keamanan Data Kamera</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Enkripsi Lokal', text: 'Foto dienkripsi di penyimpanan perangkat' },
                                    { bold: 'Upload Aman', text: 'Gambar dikirim hanya melalui saluran terenkripsi' },
                                    { bold: 'Keamanan Server', text: 'Foto disimpan di server aman dengan kontrol akses' },
                                    { bold: 'Kebijakan Retensi', text: 'Gambar disimpan hanya selama diperlukan untuk operasi bisnis' },
                                ]}
                            />
                        </section>

                        {/* -- 5. Berbagi & Pengungkapan Data -- */}
                        <section id="berbagi-data" className={sectionClass}>
                            <SectionHeading number="5">Berbagi dan Pengungkapan Data</SectionHeading>

                            <SubHeading>Penggunaan Bisnis Internal</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Pelaporan Manajemen', text: 'Data agregat untuk manajemen estate dan analisis produktivitas' },
                                    { bold: 'Pelaporan Kepatuhan', text: 'Data yang diperlukan untuk sertifikasi industri dan kepatuhan regulasi' },
                                    { bold: 'Koordinasi Operasional', text: 'Berbagi informasi antara personel yang berwenang untuk koordinasi kerja' },
                                ]}
                            />

                            <SubHeading>Layanan Pihak Ketiga</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Layanan Firebase', text: 'Notifikasi push dan analitik (Kebijakan Privasi Google berlaku)' },
                                    { bold: 'Penyimpanan Cloud', text: 'Penyimpanan cloud aman untuk backup dan sinkronisasi' },
                                    { bold: 'Layanan Keamanan', text: 'Otentikasi dan verifikasi keamanan perangkat' },
                                ]}
                            />

                            <SubHeading>Persyaratan Hukum</SubHeading>
                            <p className="mt-3">
                                Kami dapat mengungkapkan informasi ketika diperlukan oleh hukum, regulasi, atau
                                proses hukum, atau untuk melindungi hak, properti, atau keselamatan kami.
                            </p>
                        </section>

                        {/* -- 6. Hak Privasi Anda -- */}
                        <section id="hak-privasi" className={sectionClass}>
                            <SectionHeading number="6">Hak Privasi Anda</SectionHeading>

                            <SubHeading>Akses dan Kontrol</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Akses Data', text: 'Meminta salinan data pribadi Anda yang disimpan di sistem kami' },
                                    { bold: 'Koreksi Data', text: 'Memperbarui atau memperbaiki informasi pribadi yang tidak akurat' },
                                    { bold: 'Penghapusan Data', text: 'Meminta penghapusan data Anda ketika diizinkan secara hukum' },
                                    { bold: 'Manajemen Izin', text: 'Mengontrol izin aplikasi di pengaturan perangkat Anda' },
                                ]}
                            />

                            <SubHeading>Kontrol Izin Kamera</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Berikan/Cabut Akses', text: 'Aktifkan atau nonaktifkan izin kamera di pengaturan perangkat' },
                                    { bold: 'Penggunaan Selektif', text: 'Akses kamera hanya ketika Anda secara aktif menggunakan fitur foto' },
                                    { bold: 'Metode Alternatif', text: 'Fungsi inti aplikasi tersedia tanpa akses kamera' },
                                    { bold: 'Penghapusan Data', text: 'Meminta penghapusan foto tertentu atau semua data kamera' },
                                ]}
                            />

                            <SubHeading>Preferensi Notifikasi</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Notifikasi Push', text: 'Aktifkan/nonaktifkan berbagai jenis notifikasi' },
                                    { bold: 'Preferensi Komunikasi', text: 'Kontrol bagaimana kami berkomunikasi dengan Anda tentang pembaruan dan fitur aplikasi' },
                                ]}
                            />
                        </section>

                        {/* -- 7. Retensi Data -- */}
                        <section id="retensi-data" className={sectionClass}>
                            <SectionHeading number="7">Retensi Data</SectionHeading>

                            <SubHeading>Data Operasional</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Pekerjaan Aktif', text: 'Data disimpan selama masa kerja aktif dan penggunaan sistem' },
                                    { bold: 'Pasca-Pekerjaan', text: 'Catatan penting disimpan sesuai persyaratan hukum dan bisnis' },
                                    { bold: 'Kepatuhan Hukum', text: 'Beberapa data disimpan untuk memenuhi persyaratan regulasi dan audit' },
                                ]}
                            />

                            <SubHeading>Retensi Data Kamera</SubHeading>
                            <BulletList
                                items={[
                                    { bold: 'Catatan Bisnis', text: 'Foto disimpan sebagai catatan bisnis sesuai kebijakan perusahaan' },
                                    { bold: 'Kontrol Kualitas', text: 'Gambar disimpan untuk jaminan kualitas dan verifikasi kepatuhan' },
                                    { bold: 'Penghapusan Otomatis', text: 'Gambar sementara dan cache secara otomatis dihapus' },
                                    { bold: 'Permintaan Pengguna', text: 'Penghapusan foto tertentu tersedia atas permintaan jika diizinkan secara hukum' },
                                ]}
                            />
                        </section>

                        {/* -- 8. Privasi Anak -- */}
                        <section id="privasi-anak" className={sectionClass}>
                            <SectionHeading number="8">Privasi Anak</SectionHeading>
                            <p className="mt-5">
                                Aplikasi Mobile Agrinova dirancang untuk penggunaan bisnis oleh karyawan dan
                                personel yang berwenang. Kami tidak secara sengaja mengumpulkan informasi pribadi
                                dari anak-anak di bawah usia 18 tahun.
                            </p>
                            <p className="mt-3">
                                Jika kami mengetahui bahwa seorang anak telah memberikan informasi pribadi kepada
                                kami, kami akan mengambil langkah untuk menghapus informasi tersebut.
                            </p>
                        </section>

                        {/* -- 9. Perubahan Kebijakan -- */}
                        <section id="perubahan-kebijakan" className={sectionClass}>
                            <SectionHeading number="9">Perubahan Kebijakan Privasi Ini</SectionHeading>
                            <p className="mt-5">
                                Kami dapat memperbarui Kebijakan Privasi ini secara berkala untuk mencerminkan
                                perubahan dalam praktik kami, teknologi, persyaratan hukum, atau faktor lain.
                            </p>
                            <p className="mt-3">
                                Kami akan memberi tahu pengguna tentang perubahan signifikan melalui aplikasi atau
                                cara yang sesuai lainnya. Tanggal &ldquo;Terakhir Diperbarui&rdquo; di bagian atas
                                kebijakan ini menunjukkan kapan perubahan terbaru dilakukan.
                            </p>
                        </section>

                        {/* -- 10. Informasi Kontak -- */}
                        <section id="kontak" className={sectionClass}>
                            <SectionHeading number="10">Informasi Kontak</SectionHeading>

                            <SubHeading>Petugas Perlindungan Data</SubHeading>
                            <div className="mt-4 flex flex-col gap-2 text-[15px]">
                                <span className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                    <strong className="font-semibold text-slate-900">Email:</strong>{' '}
                                    <a
                                        href="mailto:privacy@agrinova.com"
                                        className="text-emerald-700 underline-offset-2 transition-colors hover:text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                    >
                                        privacy@agrinova.com
                                    </a>
                                </span>
                                <span className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                    <strong className="font-semibold text-slate-900">Telepon:</strong>{' '}
                                    +62-XXX-XXXX-XXXX
                                </span>
                                <span className="flex items-center gap-3">
                                    <Building className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                    <strong className="font-semibold text-slate-900">Alamat:</strong>{' '}
                                    [Alamat Perusahaan]
                                </span>
                            </div>

                            <SubHeading>Dukungan Teknis</SubHeading>
                            <div className="mt-4 flex flex-col gap-2 text-[15px]">
                                <span className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                    <strong className="font-semibold text-slate-900">Email:</strong>{' '}
                                    <a
                                        href="mailto:support@agrinova.com"
                                        className="text-emerald-700 underline-offset-2 transition-colors hover:text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                    >
                                        support@agrinova.com
                                    </a>
                                </span>
                                <span className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                                    <strong className="font-semibold text-slate-900">Telepon:</strong>{' '}
                                    +62-XXX-XXXX-XXXX
                                </span>
                            </div>
                        </section>

                        {/* -- 11. Ringkasan Izin Kamera -- */}
                        <section id="ringkasan" className="scroll-mt-32 py-8 sm:scroll-mt-24 sm:py-12">
                            <SectionHeading number="11">Ringkasan Izin Kamera</SectionHeading>

                            <HighlightBox title="Mengapa kami memerlukan akses kamera">
                                <ul className="mt-2 space-y-1.5">
                                    <li>
                                        • <strong>Pemindaian Kode QR</strong> — Untuk gate check dan kontrol akses
                                        estate
                                    </li>
                                    <li>
                                        • <strong>Dokumentasi Panen</strong> — Foto TBS dan aktivitas panen untuk
                                        catatan bisnis
                                    </li>
                                    <li>
                                        • <strong>Verifikasi Keamanan</strong> — Dokumentasi kendaraan dan pengunjung
                                        untuk keamanan estate
                                    </li>
                                    <li>
                                        • <strong>Kontrol Kualitas</strong> — Dokumentasi visual untuk kepatuhan dan
                                        jaminan kualitas
                                    </li>
                                </ul>
                            </HighlightBox>

                            <div className="mt-6 rounded-lg border border-emerald-200/70 bg-emerald-50/60 p-5 print:border-emerald-300 print:bg-white">
                                <div className="flex items-start gap-3">
                                    <Lock
                                        className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600"
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Perlindungan privasi Anda</p>
                                        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-slate-700">
                                            <li>• Kamera hanya diaktifkan ketika Anda menggunakan fitur foto</li>
                                            <li>• Foto digunakan secara eksklusif untuk operasi bisnis</li>
                                            <li>• Enkripsi aman untuk semua data gambar</li>
                                            <li>• Izin dapat dicabut di pengaturan perangkat</li>
                                            <li>• Tidak ada pengawasan pribadi atau pengenalan wajah</li>
                                            <li>• Pembersihan otomatis file sementara</li>
                                        </ul>
                                        <p className="mt-4 border-t border-emerald-200/50 pt-3 text-sm text-slate-600">
                                            <strong>Pertanyaan tentang penggunaan kamera?</strong> Hubungi tim privasi
                                            kami di{' '}
                                            <a
                                                href="mailto:privacy@agrinova.com"
                                                className="font-semibold text-emerald-700 transition-colors hover:text-emerald-800"
                                            >
                                                privacy@agrinova.com
                                            </a>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ---- FOOTER ---- */}
                        <footer className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-6 print:border-slate-300 print:bg-white">
                            <p className="text-sm font-bold uppercase tracking-widest text-slate-400">
                                Kontak Perusahaan
                            </p>
                            <p className="mt-3 font-semibold text-slate-900">PT. Kalimantan Sawit Kusuma</p>
                            <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:gap-6">
                                <a
                                    href="mailto:privacy@agrinova.com"
                                    className="inline-flex items-center gap-2 text-emerald-700 underline-offset-2 transition-colors hover:text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                >
                                    <Mail className="h-4 w-4" aria-hidden="true" />
                                    privacy@agrinova.com
                                </a>
                                <a
                                    href="https://agrinova.kskgroup.web.id"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 text-emerald-700 underline-offset-2 transition-colors hover:text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                                >
                                    <Globe className="h-4 w-4" aria-hidden="true" />
                                    agrinova.kskgroup.web.id
                                </a>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-200/60 pt-4 text-xs text-slate-400">
                                <span>
                                    <strong>Versi:</strong> 1.0
                                </span>
                                <span>
                                    <strong>ID Kebijakan:</strong> AGRI-PRIVACY-2025-001
                                </span>
                                <span>
                                    <strong>Disetujui oleh:</strong> Departemen Hukum PT. KSK
                                </span>
                            </div>
                            <p className="mt-3 text-xs text-slate-400">
                                Kebijakan privasi ini tersedia dalam Bahasa Inggris atas permintaan. This privacy
                                policy is available in English upon request.
                            </p>
                        </footer>
                    </article>
                </div>
            </div>

            {/* ============================================================ */}
            {/*  BACK TO TOP BUTTON                                          */}
            {/* ============================================================ */}
            <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={cn(
                    'fixed bottom-6 right-6 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-700 text-white shadow-lg transition-opacity,transform duration-200 hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 print:hidden',
                    showBackToTop
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-4 opacity-0'
                )}
                aria-label="Kembali ke atas"
            >
                <ArrowUp className="h-5 w-5" />
            </button>
        </main>
    );
}
