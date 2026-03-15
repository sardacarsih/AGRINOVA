const { expect } = require('playwright/test');

const AREA_MANAGER_EMAIL = process.env.PLAYWRIGHT_AREA_MANAGER_EMAIL || 'sugianto';
const AREA_MANAGER_PASSWORD = process.env.PLAYWRIGHT_AREA_MANAGER_PASSWORD || 'demo123';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getFilterField(page, labelText) {
  const analyticsFilterSection = page
    .locator('div, section, article', { has: page.getByRole('heading', { name: /Filter Data/i }) })
    .first();

  const scope = (await analyticsFilterSection.count()) > 0 ? analyticsFilterSection : page;

  const modernField = scope
    .locator(`xpath=.//*[normalize-space(text())="${labelText}"]/ancestor::*[.//*[@role="combobox"]][1]`)
    .first();

  if (await modernField.count()) {
    await expect(modernField).toBeVisible();
    return modernField;
  }

  const legacyField = scope
    .locator('div.space-y-2', { has: scope.locator(`label:text-is("${labelText}")`) })
    .first();

  await expect(legacyField).toBeVisible();
  return legacyField;
}

async function openSelect(page, labelText) {
  const field = await getFilterField(page, labelText);
  const roleTrigger = field.getByRole('combobox').first();
  const trigger = (await roleTrigger.count()) > 0 ? roleTrigger : field.locator('button').first();

  await trigger.click();
  await expect(page.getByRole('option').first()).toBeVisible();

  return { field, trigger };
}

async function listSelectOptions(page, labelText) {
  await openSelect(page, labelText);
  const options = await page.getByRole('option').allTextContents();
  await page.keyboard.press('Escape');
  return options.map((option) => option.trim()).filter(Boolean);
}

async function chooseSelectOption(page, labelText, optionText) {
  const { trigger } = await openSelect(page, labelText);
  const exactOption = page.getByRole('option', { name: optionText, exact: true });

  if (await exactOption.count()) {
    await exactOption.first().click();
  } else {
    const partialOption = page.getByRole('option', {
      name: new RegExp(`^${escapeRegExp(optionText)}\\b`, 'i'),
    }).first();

    await expect(partialOption).toBeVisible();
    await partialOption.click();
  }

  await expect(trigger).toContainText(optionText);
}

async function loginAsAreaManager(page) {
  await page.goto('/login');
  await page.getByLabel('Username / Email').fill(AREA_MANAGER_EMAIL);
  await page.getByLabel('Password').fill(AREA_MANAGER_PASSWORD);

  const loginResponsePromise = page
    .waitForResponse((response) => {
      if (!response.url().includes('/api/graphql')) {
        return false;
      }

      const requestBody = response.request().postData() || '';
      return requestBody.includes('webLogin') || requestBody.includes('WebLogin');
    }, { timeout: 15000 })
    .catch(() => null);

  await page.getByRole('button', { name: /Masuk ke AgrInova|Masuk/ }).click();

  const loginResponse = await loginResponsePromise;
  if (loginResponse) {
    const payload = await loginResponse.json();
    const loginResult = payload?.data?.webLogin;

    if (!loginResult?.success) {
      throw new Error(`AREA_MANAGER login failed for ${AREA_MANAGER_EMAIL}: ${JSON.stringify(payload)}`);
    }
  }

  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20000 });
}

module.exports = {
  AREA_MANAGER_EMAIL,
  AREA_MANAGER_PASSWORD,
  chooseSelectOption,
  getFilterField,
  listSelectOptions,
  loginAsAreaManager,
  openSelect,
};
