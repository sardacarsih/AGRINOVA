const { defineConfig, devices } = require('playwright/test');
const path = require('path');

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const useManagedWebServer = process.env.PLAYWRIGHT_NO_WEBSERVER !== '1';
const areaManagerStorageStatePath = path.join(__dirname, 'e2e', '.auth', 'area-manager.json');
const managerStorageStatePath = path.join(__dirname, 'e2e', '.auth', 'manager.json');
const parsedBaseURL = new URL(baseURL);
const webServerHost =
  parsedBaseURL.hostname === 'localhost' || parsedBaseURL.hostname === '127.0.0.1'
    ? parsedBaseURL.hostname
    : '127.0.0.1';
const loginURL = new URL('/login', baseURL).toString();

module.exports = defineConfig({
  testDir: './e2e',
  globalSetup: path.join(__dirname, 'e2e', 'global-setup.js'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.join(__dirname, 'playwright-report') }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: useManagedWebServer ? {
    command: `npm run dev -- --hostname ${webServerHost}`,
    cwd: __dirname,
    url: loginURL,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 120000,
  } : undefined,
  projects: [
    {
      name: 'login',
      testMatch: '**/login.smoke.spec.js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'area-manager',
      dependencies: ['login'],
      testMatch: '**/area-manager*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        storageState: areaManagerStorageStatePath,
      },
    },
    {
      name: 'manager',
      dependencies: ['login'],
      testMatch: '**/manager*.spec.js',
      use: {
        ...devices['Desktop Chrome'],
        storageState: managerStorageStatePath,
      },
    },
  ],
});
