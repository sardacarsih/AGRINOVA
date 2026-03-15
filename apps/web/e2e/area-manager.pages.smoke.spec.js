const { test, expect } = require('playwright/test');

const pageChecks = [
  {
    path: '/',
    markerGroups: [['Monitoring Multi-Perusahaan'], ['Monitor Regional']],
  },
  {
    path: '/harvest',
    markerGroups: [['Pusat Monitoring Panen', 'Dashboard Panen'], ['Area Manager View', 'Mode Aktif']],
  },
  {
    path: '/tim',
    markerGroups: [['Tim', 'Monitor Tim'], ['Pantau produktivitas tim harian secara cepat', 'Tampilan Area Manager']],
  },
  {
    path: '/gate-check',
    markerGroups: [['Regional Gate Check', 'Estate Gate Check', 'Perbandingan Perusahaan', 'Perbandingan Estate'], ['Filter Range Tanggal']],
  },
  {
    path: '/struktur-organisasi',
    markerGroups: [['Struktur Organisasi', 'Struktur Organisasi Berdasarkan Manager ID'], ['Relasi pelaporan berdasarkan manager_id', 'Menampilkan relasi pelaporan untuk Area Manager']],
  },
  {
    path: '/reports',
    markerGroups: [['Laporan Potong Buah (BKM)', 'Regional Reports'], ['Filter Laporan', 'Area Manager reporting page - Coming soon']],
  },
  {
    path: '/analytics',
    markerGroups: [['Filter Data'], ['Output by Company']],
  },
];

test.describe('AREA_MANAGER page smoke checks', () => {
  test.describe.configure({ mode: 'serial' });

  for (const pageCheck of pageChecks) {
    const pageName = pageCheck.path === '/' ? 'home' : pageCheck.path;

    test(`AREA_MANAGER can access ${pageName}`, async ({ page }) => {
      await page.goto(pageCheck.path);
      await expect(page).toHaveURL(new RegExp(`${pageCheck.path === '/' ? '/?$' : pageCheck.path.replace('/', '\\/')}(?:\\?|#|$)`));
      await expect(page).not.toHaveURL(/\/login(?:\?|#|$)/);

      for (const markerGroup of pageCheck.markerGroups) {
        let foundMarker = null;

        for (const marker of markerGroup) {
          try {
            await expect(page.getByText(marker, { exact: false }).first()).toBeVisible({ timeout: 3000 });
            foundMarker = marker;
            break;
          } catch (_err) {
            // Keep trying fallback markers in this group.
          }
        }

        expect(foundMarker, `Expected one of [${markerGroup.join(', ')}] to be visible on ${pageCheck.path}`).toBeTruthy();
      }
    });
  }
});
