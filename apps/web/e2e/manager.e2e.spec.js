const { test, expect } = require('playwright/test');
const { chooseSelectOption, listSelectOptions } = require('./area-manager.helpers');

const managerPageChecks = [
  {
    path: '/',
    sidebarLabel: 'Dashboard',
    markerLocators: [
      (page) => page.getByRole('heading', { name: /Target Achievement/i }).first(),
      (page) => page.getByRole('heading', { name: /Ringkasan Hari Ini/i }).first(),
      (page) => page.getByRole('heading', { name: /Pending Approvals/i }).first(),
    ],
  },
  {
    path: '/harvest',
    sidebarLabel: 'Manajemen Panen',
    markerLocators: [
      (page) => page.getByRole('heading', { name: /Pusat Monitoring Panen|Dashboard Panen/i }).first(),
      (page) => page.getByText(/Mode Aktif|Area Manager View/i).first(),
    ],
  },
  {
    path: '/tim',
    sidebarLabel: 'Tim',
    markerLocators: [
      (page) => page.getByRole('heading', { name: /^Tim$/i }).first(),
      (page) => page.getByText(/Pantau performa anggota tim secara real-time|Monitor Tim/i).first(),
    ],
  },
  {
    path: '/timbangan',
    sidebarLabel: 'Timbangan',
    markerLocators: [
      (page) => page.getByRole('heading', { name: /Dashboard Timbangan/i }).first(),
      (page) => page.getByRole('heading', { name: /Timbangan Hari Ini/i }).first(),
    ],
  },
  {
    path: '/grading',
    sidebarLabel: 'Grading',
    markerLocators: [
      (page) => page.getByRole('heading', { name: /Dashboard Quality Control/i }).first(),
      (page) => page.getByRole('heading', { name: /Grading Hari Ini/i }).first(),
    ],
  },
  {
    path: '/gate-check',
    sidebarLabel: 'Gate Check',
    markerLocators: [
      (page) => page.getByRole('heading', { name: /Regional Gate Check|Estate Gate Check/i }).first(),
      (page) => page.getByText(/Filter Range Tanggal|Perbandingan Perusahaan|Perbandingan Estate/i).first(),
    ],
  },
  {
    path: '/struktur-organisasi',
    sidebarLabel: 'Struktur Organisasi',
    markerLocators: [
      (page) => page.getByRole('heading', { name: /Struktur Organisasi/i }).first(),
      (page) => page.getByText(/Relasi pelaporan berdasarkan manager_id/i).first(),
    ],
  },
  {
    path: '/budget-divisi',
    sidebarLabel: 'Budget Divisi',
    markerLocators: [
      (page) => page.getByRole('heading', { name: /Budget Divisi \(Control Tower\)/i }).first(),
      (page) => page.getByRole('heading', { name: /Kontrol Pagu Divisi/i }).first(),
    ],
  },
  {
    path: '/budget-blok',
    sidebarLabel: 'Budget Blok',
    markerLocators: [
      (page) => page.getByRole('heading', { name: /Budget Produksi Per Blok/i }).first(),
      (page) => page.getByRole('heading', { name: /Daftar Budget Produksi Blok/i }).first(),
    ],
  },
  {
    path: '/reports',
    sidebarLabel: 'Laporan',
    markerLocators: [
      (page) => page.getByRole('heading', { name: /Laporan Potong Buah \(BKM\)/i }).first(),
      (page) => page.getByRole('heading', { name: /Filter Laporan/i }).first(),
    ],
  },
  {
    path: '/analytics',
    sidebarLabel: 'Analytics',
    markerLocators: [
      (page) => page.getByRole('heading', { name: /Analytics Dashboard/i }).first(),
      (page) => page.getByRole('heading', { name: /Filter Data/i }).first(),
    ],
  },
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function routeUrlPattern(pathname) {
  if (pathname === '/') {
    return /\/?(?:\?|#|$)/;
  }

  return new RegExp(`${escapeRegExp(pathname)}(?:\\?|#|$)`);
}

async function expectAnyMarkerVisible(page, markerLocators, contextLabel) {
  let lastError = null;

  for (const markerLocator of markerLocators) {
    try {
      await expect(markerLocator(page)).toBeVisible({ timeout: 4000 });
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`No marker visible for ${contextLabel}. Last error: ${String(lastError)}`);
}

test.describe('MANAGER e2e regression suite', () => {
  test.describe.configure({ mode: 'serial' });

  test.describe('MANAGER page smoke checks', () => {
    for (const pageCheck of managerPageChecks) {
      const pageName = pageCheck.path === '/' ? 'home' : pageCheck.path;

      test(`MANAGER can access ${pageName}`, async ({ page }) => {
        await page.goto(pageCheck.path);
        await expect(page).toHaveURL(routeUrlPattern(pageCheck.path));
        await expect(page).not.toHaveURL(/\/login(?:\?|#|$)/);
        await expect(page.getByText(/Access Denied|Akses Ditolak|You don't have permission/i)).toHaveCount(0);

        const activeSidebarLink = page
          .locator(`a[href="${pageCheck.path}"]`, { hasText: pageCheck.sidebarLabel })
          .filter({ hasText: 'Aktif' })
          .first();

        await expect(activeSidebarLink).toBeVisible();
        await expectAnyMarkerVisible(page, pageCheck.markerLocators, pageCheck.path);
      });
    }
  });

  test('MANAGER can use analytics filters and view output sections', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL(routeUrlPattern('/analytics'));
    await expect(page).not.toHaveURL(/\/login(?:\?|#|$)/);

    await expect(page.getByRole('heading', { name: /Analytics Dashboard/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Filter Data/i })).toBeVisible();

    const monthOptions = await listSelectOptions(page, 'Bulan');
    expect(monthOptions.length).toBeGreaterThan(0);

    const preferredMonth = monthOptions.find((option) => /Januari|Februari|Maret/i.test(option)) || monthOptions[0];
    await chooseSelectOption(page, 'Bulan', preferredMonth);

    const estateField = page
      .locator('xpath=.//*[normalize-space(text())="Estate"]/ancestor::*[.//*[@role="combobox"]][1]')
      .first();

    if (await estateField.count()) {
      const estateOptions = await listSelectOptions(page, 'Estate');
      expect(estateOptions.length).toBeGreaterThan(0);
    }

    await expectAnyMarkerVisible(
      page,
      [
        (nextPage) => nextPage.getByRole('heading', { name: /Daily Output vs Pekerja Panen/i }).first(),
        (nextPage) => nextPage.getByRole('heading', { name: /Top 10 Harvester/i }).first(),
        (nextPage) => nextPage.getByRole('heading', { name: /Output by Division/i }).first(),
      ],
      '/analytics regression'
    );
  });

  test('MANAGER can access reports and interact with report filters', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(routeUrlPattern('/reports'));
    await expect(page).not.toHaveURL(/\/login(?:\?|#|$)/);

    await expect(page.getByRole('heading', { name: /Laporan Potong Buah \(BKM\)/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Filter Laporan/i })).toBeVisible();

    const yearOptions = await listSelectOptions(page, 'Tahun');
    expect(yearOptions.length).toBeGreaterThan(0);

    const currentYear = String(new Date().getFullYear());
    const preferredYear = yearOptions.find((option) => option !== currentYear) || yearOptions[0];
    await chooseSelectOption(page, 'Tahun', preferredYear);

    await expect(page.getByRole('heading', { name: /Data Detail/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Excel \(XLSX\)/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Prev/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Next/i })).toBeVisible();
  });
});
