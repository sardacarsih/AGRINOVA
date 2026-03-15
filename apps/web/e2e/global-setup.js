const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright');

const ROLE_SETUPS = [
  {
    role: 'AREA_MANAGER',
    identifier: process.env.PLAYWRIGHT_AREA_MANAGER_EMAIL || 'sugianto',
    password: process.env.PLAYWRIGHT_AREA_MANAGER_PASSWORD || 'demo123',
    storageStatePath: path.join(__dirname, '.auth', 'area-manager.json'),
  },
  {
    role: 'MANAGER',
    identifier: process.env.PLAYWRIGHT_MANAGER_USERNAME || process.env.PLAYWRIGHT_MANAGER_EMAIL || 'managerje',
    password: process.env.PLAYWRIGHT_MANAGER_PASSWORD || 'demo123',
    storageStatePath: path.join(__dirname, '.auth', 'manager.json'),
  },
];

async function loginAndPersistState(browser, baseURL, roleSetup) {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  try {
    await page.goto('/login');
    await page.getByLabel('Username / Email').fill(roleSetup.identifier);
    await page.getByLabel('Password').fill(roleSetup.password);

    const loginResponsePromise = page
      .waitForResponse((response) => {
        if (!response.url().includes('/api/graphql')) {
          return false;
        }

        const requestBody = response.request().postData() || '';
        return requestBody.includes('webLogin') || requestBody.includes('WebLogin');
      }, { timeout: 20000 })
      .catch(() => null);

    await page.getByRole('button', { name: /Masuk ke AgrInova|Masuk/ }).click();

    const loginResponse = await loginResponsePromise;
    if (loginResponse) {
      const payload = await loginResponse.json();
      const loginResult = payload?.data?.webLogin;

      if (!loginResult?.success) {
        throw new Error(`${roleSetup.role} login failed for ${roleSetup.identifier}: ${JSON.stringify(payload)}`);
      }
    }

    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30000 });
    await context.storageState({ path: roleSetup.storageStatePath });
  } finally {
    await context.close();
  }
}

module.exports = async (config) => {
  const appProject = config.projects.find((project) => project.name !== 'login');
  const resolvedBaseURL = appProject?.use?.baseURL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  await fs.mkdir(path.join(__dirname, '.auth'), { recursive: true });

  const browser = await chromium.launch();

  try {
    for (const roleSetup of ROLE_SETUPS) {
      await loginAndPersistState(browser, resolvedBaseURL, roleSetup);
    }
  } finally {
    await browser.close();
  }
};
