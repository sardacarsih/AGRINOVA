'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowUp, Calendar, ChevronDown, FileText, Mail, Globe, Shield } from 'lucide-react';
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
  { id: 'informasi-umum', label: 'Informasi Umum', number: '1' },
  { id: 'ruang-lingkup', label: 'Ruang Lingkup Layanan', number: '2' },
  { id: 'akun-keamanan', label: 'Akun dan Keamanan', number: '3' },
  { id: 'lokasi-kamera-data', label: 'Penggunaan Lokasi, Kamera, dan Data', number: '4' },
  { id: 'larangan-penggunaan', label: 'Larangan Penggunaan', number: '5' },
  { id: 'hak-kekayaan-intelektual', label: 'Hak Kekayaan Intelektual', number: '6' },
  { id: 'pembatasan-tanggung-jawab', label: 'Pembatasan Tanggung Jawab', number: '7' },
  { id: 'perubahan-ketentuan', label: 'Perubahan Ketentuan', number: '8' },
  { id: 'hukum-berlaku', label: 'Hukum yang Berlaku', number: '9' },
];

/* ------------------------------------------------------------------ */
/*  Highlight Box                                                     */
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

/* ------------------------------------------------------------------ */
/*  Section Heading                                                   */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export function TermsConditionsClientPage() {
  const [activeSection, setActiveSection] = React.useState<string>(TOC_ITEMS[0].id);
  const [showBackToTop, setShowBackToTop] = React.useState(false);
  const [tocOpen, setTocOpen] = React.useState(false);

  /* ---- Intersection Observer for active section tracking ---- */
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
      {
        rootMargin: '-20% 0px -65% 0px',
        threshold: [0.1, 0.3, 0.6],
      }
    );

    observedSections.forEach((section) => observer.observe(section));
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

  /* ---- TOC renderer (shared between mobile & desktop) ---- */
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
              <FileText className="h-8 w-8 text-emerald-700" aria-hidden="true" />
            </div>
            <div>
              <h1
                className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-[3.25rem]"
                style={{ textWrap: 'balance' } as React.CSSProperties}
              >
                Syarat &amp; Ketentuan
              </h1>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                PT. Kalimantan Sawit Kusuma
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span>Terakhir diperbarui: 24 Februari 2026</span>
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
              <div className="mt-2">{renderTocList(false)}</div>
            </nav>
          </aside>

          {/* ---- ARTICLE CONTENT ---- */}
          <article className="max-w-[800px] text-sm leading-relaxed sm:text-[15px] sm:leading-[1.8] print:max-w-none print:text-black">
            {/* -- Pasal 1 -- */}
            <section
              id="informasi-umum"
              className="scroll-mt-32 border-b border-slate-100 pb-8 sm:scroll-mt-24 sm:pb-12 print:border-slate-300"
            >
              <SectionHeading number="1">Informasi Umum</SectionHeading>
              <p className="mt-5">
                Aplikasi ini dikelola dan dioperasikan oleh{' '}
                <strong className="font-semibold text-slate-900">
                  PT. KALIMANTAN SAWIT KUSUMA
                </strong>{' '}
                (&ldquo;Perusahaan&rdquo;).
              </p>
              <p className="mt-3">
                Aplikasi ini disediakan untuk mendukung kegiatan operasional dan aktivitas internal
                perusahaan.
              </p>

              <HighlightBox title="Persetujuan Pengguna">
                <p>
                  Dengan menggunakan aplikasi ini, Anda dianggap telah membaca, memahami, dan
                  menyetujui seluruh isi Syarat &amp; Ketentuan ini.
                </p>
              </HighlightBox>
            </section>

            {/* -- Pasal 2 -- */}
            <section
              id="ruang-lingkup"
              className="scroll-mt-32 border-b border-slate-100 py-8 sm:scroll-mt-24 sm:py-12 print:border-slate-300"
            >
              <SectionHeading number="2">Ruang Lingkup Layanan</SectionHeading>
              <h3 className="mt-6 text-base font-semibold text-slate-800">Cakupan Layanan</h3>
              <p className="mt-3">
                Aplikasi ini disediakan secara gratis untuk mendukung kegiatan operasional
                perusahaan, termasuk namun tidak terbatas pada:
              </p>
              <ul className="mt-4 space-y-2.5 pl-1">
                {[
                  'Pencatatan data operasional',
                  'Pengambilan dan penyimpanan foto atau dokumen',
                  'Penggunaan fitur lokasi untuk verifikasi dan validasi aktivitas',
                  'Pengiriman notifikasi sistem',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-slate-500">
                Aplikasi ini tidak digunakan untuk transaksi keuangan atau pembayaran.
              </p>
            </section>

            {/* -- Pasal 3 -- */}
            <section
              id="akun-keamanan"
              className="scroll-mt-32 border-b border-slate-100 py-8 sm:scroll-mt-24 sm:py-12 print:border-slate-300"
            >
              <SectionHeading number="3">Akun dan Keamanan</SectionHeading>
              <h3 className="mt-6 text-base font-semibold text-slate-800">Kewajiban Pengguna</h3>
              <ul className="mt-4 space-y-2.5 pl-1">
                {[
                  'Pengguna wajib menggunakan akun resmi yang diberikan Perusahaan.',
                  'Pengguna bertanggung jawab menjaga kerahasiaan akun dan kata sandi.',
                  'Segala aktivitas yang terjadi melalui akun pengguna menjadi tanggung jawab pengguna.',
                  'Perusahaan berhak menangguhkan atau menonaktifkan akun jika ditemukan pelanggaran.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <HighlightBox title="Ketentuan Penting">
                <p>
                  Akun bersifat personal dan tidak boleh dipinjamkan, dibagikan, atau digunakan
                  oleh pihak yang tidak berwenang.
                </p>
              </HighlightBox>
            </section>

            {/* -- Pasal 4 -- */}
            <section
              id="lokasi-kamera-data"
              className="scroll-mt-32 border-b border-slate-100 py-8 sm:scroll-mt-24 sm:py-12 print:border-slate-300"
            >
              <SectionHeading number="4">Penggunaan Lokasi, Kamera, dan Data</SectionHeading>
              <h3 className="mt-6 text-base font-semibold text-slate-800">Jenis Akses Perangkat</h3>
              <ul className="mt-4 space-y-2.5 pl-1">
                {[
                  'Informasi lokasi perangkat',
                  'Kamera untuk dokumentasi kegiatan',
                  'Penyimpanan perangkat untuk menyimpan dokumen dan foto',
                  'Data operasional yang diinput pengguna',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-8 text-base font-semibold text-slate-800">Tujuan Penggunaan Data</h3>
              <p className="mt-3">
                Data digunakan untuk kepentingan operasional, pelaporan, dan pengawasan internal
                perusahaan.
              </p>
              <p className="mt-3">
                Pengelolaan data pribadi diatur lebih lanjut dalam{' '}
                <Link
                  href="/privacy-policy"
                  className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-[3px] transition-colors hover:text-emerald-800 hover:decoration-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  Kebijakan Privasi
                </Link>
                .
              </p>
            </section>

            {/* -- Pasal 5 -- */}
            <section
              id="larangan-penggunaan"
              className="scroll-mt-32 border-b border-slate-100 py-8 sm:scroll-mt-24 sm:py-12 print:border-slate-300"
            >
              <SectionHeading number="5">Larangan Penggunaan</SectionHeading>
              <p className="mt-5">Pengguna dilarang:</p>
              <ul className="mt-4 space-y-2.5 pl-1">
                {[
                  'Menggunakan aplikasi di luar kepentingan operasional resmi',
                  'Memalsukan atau memanipulasi data',
                  'Mengakses sistem tanpa izin',
                  'Menyalin, mendistribusikan, atau memodifikasi aplikasi tanpa izin tertulis',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <HighlightBox title="Peringatan">
                <p>
                  Pelanggaran terhadap ketentuan di atas dapat mengakibatkan penangguhan akun,
                  tindakan disipliner, dan/atau proses hukum sesuai peraturan yang berlaku.
                </p>
              </HighlightBox>
            </section>

            {/* -- Pasal 6 -- */}
            <section
              id="hak-kekayaan-intelektual"
              className="scroll-mt-32 border-b border-slate-100 py-8 sm:scroll-mt-24 sm:py-12 print:border-slate-300"
            >
              <SectionHeading number="6">Hak Kekayaan Intelektual</SectionHeading>
              <p className="mt-5">
                Seluruh sistem, fitur, desain, logo, dan konten dalam aplikasi merupakan milik{' '}
                <strong className="font-semibold text-slate-900">
                  PT. KALIMANTAN SAWIT KUSUMA
                </strong>{' '}
                dan dilindungi oleh hukum yang berlaku.
              </p>
              <p className="mt-3">
                Pengguna tidak diperkenankan untuk mereproduksi, menyalin, atau mendistribusikan
                bagian mana pun dari aplikasi tanpa persetujuan tertulis dari Perusahaan.
              </p>
            </section>

            {/* -- Pasal 7 -- */}
            <section
              id="pembatasan-tanggung-jawab"
              className="scroll-mt-32 border-b border-slate-100 py-8 sm:scroll-mt-24 sm:py-12 print:border-slate-300"
            >
              <SectionHeading number="7">Pembatasan Tanggung Jawab</SectionHeading>
              <h3 className="mt-6 text-base font-semibold text-slate-800">Kondisi Layanan</h3>
              <p className="mt-3">
                Aplikasi disediakan sebagaimana adanya (&ldquo;as is&rdquo;). Perusahaan tidak
                bertanggung jawab atas:
              </p>
              <ul className="mt-4 space-y-2.5 pl-1">
                {[
                  'Gangguan jaringan internet',
                  'Kerusakan perangkat pengguna',
                  'Kerugian tidak langsung akibat penggunaan aplikasi',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* -- Pasal 8 -- */}
            <section
              id="perubahan-ketentuan"
              className="scroll-mt-32 border-b border-slate-100 py-8 sm:scroll-mt-24 sm:py-12 print:border-slate-300"
            >
              <SectionHeading number="8">Perubahan Ketentuan</SectionHeading>
              <p className="mt-5">
                Perusahaan berhak memperbarui Syarat &amp; Ketentuan ini sewaktu-waktu.
              </p>
              <p className="mt-3">
                Perubahan akan diumumkan melalui aplikasi atau situs resmi perusahaan. Penggunaan
                berkelanjutan setelah perubahan dianggap sebagai persetujuan terhadap ketentuan baru.
              </p>
            </section>

            {/* -- Pasal 9 -- */}
            <section id="hukum-berlaku" className="scroll-mt-32 py-8 sm:scroll-mt-24 sm:py-12">
              <SectionHeading number="9">Hukum yang Berlaku</SectionHeading>
              <p className="mt-5">
                Syarat &amp; Ketentuan ini tunduk dan ditafsirkan berdasarkan hukum Republik
                Indonesia.
              </p>
              <p className="mt-3">
                Segala perselisihan yang timbul dari penggunaan aplikasi akan diselesaikan secara
                musyawarah. Apabila musyawarah tidak mencapai mufakat, penyelesaian dilakukan
                melalui pengadilan yang berwenang di Indonesia.
              </p>
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
