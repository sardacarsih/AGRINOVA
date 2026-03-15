const { test, expect } = require('playwright/test');

test('login page smoke test', async ({ page }) => {
  await page.goto('/login');
  const loginForm = page.locator('.login-form-content').first();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Masuk ke AgrInova' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Form Login' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /QR Code|QR/ })).toBeVisible();
  await expect(page.getByLabel('Username / Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: /Masuk ke AgrInova|Masuk/ })).toBeVisible();
  await expect(
    loginForm.getByText('Peran Anda akan ditentukan secara otomatis berdasarkan akun yang terdaftar.')
  ).toBeVisible();
});
