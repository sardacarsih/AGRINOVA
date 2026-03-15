---
name: presentations
description: Create or revise HTML slide presentations for Agrinova management. Use when asked to "buat presentasi", "revisi slide", "tambah slide", "update presentasi", "cetak PDF presentasi", or any task involving the management presentation files in docs/presentation/.
metadata:
  author: agrinova
  version: "1.0.0"
  argument-hint: <slide-topic-or-instruction>
---

# Agrinova Presentation Skill

Guide for creating and maintaining management presentation slides for Agrinova — the palm oil plantation management system.

## Output Files

There are always **two output files** for every presentation:

| File | Purpose |
|---|---|
| `docs/presentation/agrinova-management-presentation.html` | Interactive slide deck — keyboard/click/swipe navigation |
| `docs/presentation/agrinova-management-presentation-print.html` | Static print-optimized version — open in Chrome → Ctrl+P → Save as PDF |

## Design System

**Colors (CSS variables):**
- `--green: #16a34a` — primary brand color (Agrinova green)
- `--green-dark: #14532d` — dark green for covers & headers
- `--gold: #ca8a04` — accent color for highlights
- `--blue: #1d4ed8` — Asisten role, info cards
- `--purple: #7c3aed` — Manager/Admin role, analytics
- Gold/yellow `#fefce8 / #fde047` — Area Manager role
- Orange `#ffedd5 / #fdba74` — warnings, secondary accents

**Role color mapping:**
- Mandor → green (`#f0fdf4` bg, `#86efac` border)
- Asisten → blue (`#dbeafe` bg, `#93c5fd` border)
- Manager Kebun → purple (`#ede9fe` bg, `#c4b5fd` border)
- Area Manager → gold/yellow (`#fefce8` bg, `#fde047` border)

**Fonts:** System sans-serif only — no external CDN dependencies.
**Icons:** Unicode emoji / HTML entities only — no icon libraries.
**Self-contained:** No external JS/CSS/font dependencies. Single HTML file.

## Standard Slide Structure (12 slides)

1. **Cover** — Brand + tagline + subtitle (dark green gradient, animated logo ring)
2. **Problem Statement** — 5 pain points in red-tinted list items
3. **Solution** — Flow diagram (Lapangan → Mobile → Server → Dashboard → Manajemen) + 3 platform cards
4. **Untuk Siapa?** — Role cards grid (Mandor, Asisten, Manager Kebun, Area Manager) + highlight row
5. **Offline-First Mobile** — Sync visual banner + 4 feature detail cards (2×2 grid)
6. **Real-Time Dashboard** — 4 stat boxes + 3 feature cards
7. **Laporan Panen & Kualitas TBS** — Report banner + 4 report cards (2×2 grid)
8. **Keamanan & Governance** — 4 security cards (2×2 grid, color-coded)
9. **Nilai Bisnis & ROI** — 4 ROI cards with left-border accent colors
10. **Arsitektur & Keandalan** — 2×2 card grid + tech badge row
11. **Proses Implementasi** — 4 phase steps + highlight row
12. **Call to Action** — Dark cover with CTA box + next-steps chips

## Interactive File Requirements

- Slides hidden by default (`opacity: 0; transform: translateX(60px)`)
- `.active` class shows current slide; `.prev` animates out left
- Navigation: keyboard arrows, nav buttons, swipe touch
- Progress bar at top (gradient green → gold)
- **Print button** in nav bar: `onclick="window.print()"`, label "Cetak / Simpan PDF"
- `@media print` CSS: all slides stacked, `page-break-after: always`, nav hidden
- `@page { size: A4 landscape; margin: 0; }`

## Print File Requirements

- All 12 slides visible immediately — no JS, no navigation
- Each slide: `width: 297mm; height: 210mm` (A4 landscape exact)
- `@page { size: A4 landscape; margin: 0; }`
- `page-break-after: always; break-after: page` on every slide
- Screen preview: slides displayed stacked with gray background and box-shadow
- Sticky hint bar at top (hidden on print): explains Ctrl+P workflow
- `-webkit-print-color-adjust: exact; print-color-adjust: exact` on body & dark slides
- Font sizes ~2px smaller than interactive version to fit A4 landscape

## Workflow

### Adding a new slide
1. Add slide HTML to both files at the correct position
2. Add CSS for any new components
3. Update slide counter text if total changes
4. Update `@media print` if new full-bleed slides (like covers) need color-adjust

### Revising content (no structure change)
1. Read the target slide HTML in both files
2. Edit text/content in both files in parallel using Edit tool

### Changing roles (Slide 4)
- Always update **both** files simultaneously
- Role cards use `card-grid-3` for 3 roles, `card-grid-4` for 4 roles
- Add matching CSS for new role card color in both files
- Update highlight row text to reflect new roles

### Adding/removing roles from training (Slide 11)
- Update Phase 2 paragraph text in both files: Mandor, Asisten, Timbangan, Manager Kebun, Area Manager

## Content Rules

- **Internal IT Dept framing** — This is presented BY the IT Department TO internal management, NOT an external sales pitch or vendor proposal
- **No marketing language** — avoid "buktikan sendiri", "tanpa komitmen", "Tim Agrinova siap"
- **IT ownership** — use "kami kembangkan", "kami identifikasi", "Tim IT", "Departemen IT"
- **Slide 12 CTA** — frame as internal approval request: "Mohon Persetujuan", next steps = Persetujuan Manajemen → Alokasi Resource → Pilot → Rollout
- **Cover identity** — subtitle: "Presentasi Internal — Departemen IT kepada Manajemen", footer label: "DEPARTEMEN TEKNOLOGI INFORMASI · 2025"
- **Footer** — "Departemen IT · 2025" (not "AGRINOVA · 2025")
- **No Gate Check content** — this presentation focuses entirely on harvest management (manajemen panen)
- **No Satpam role** — removed from all slides
- **Language**: Bahasa Indonesia throughout
- **Tone**: Internal professional report to decision-makers, not technical documentation, not external pitch
- **TBS** = Tandan Buah Segar (Fresh Fruit Bunch)
- **PKS** = Pabrik Kelapa Sawit (Palm Oil Mill)
- All emojis must use HTML entities (`&#128119;` not direct emoji) for cross-platform safety

## Generating PDF (Browser Method)

Since no CLI PDF tools (Puppeteer/wkhtmltopdf) are available:
1. Open `agrinova-management-presentation-print.html` in Chrome/Edge
2. Press `Ctrl+P` → select **Save as PDF**
3. Set layout: **Landscape**, margins: **None**
4. Result: 12-page PDF, one slide per A4 landscape page
