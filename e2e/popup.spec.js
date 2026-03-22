// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Popup page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8889/popup.html');
  });

  test('renders all UI elements', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('REDIRECTOR');
    await expect(page.locator('#toggle-disabled')).toBeVisible();
    await expect(page.locator('#open-redirector-settings')).toBeVisible();
    await expect(page.locator('#enable-logging')).toBeVisible();
    await expect(page.locator('#enable-notifications')).toBeVisible();
  });

  test('buttons have adequate touch targets on mobile', async ({ page, browserName }, testInfo) => {
    if (testInfo.project.name !== 'mobile-firefox') return;

    const toggleBtn = page.locator('#toggle-disabled');
    const settingsBtn = page.locator('#open-redirector-settings');

    const toggleBox = await toggleBtn.boundingBox();
    const settingsBox = await settingsBtn.boundingBox();

    // Minimum 44px touch target for mobile
    expect(toggleBox.height).toBeGreaterThanOrEqual(44);
    expect(settingsBox.height).toBeGreaterThanOrEqual(44);
  });

  test('body expands beyond 180px on mobile viewport', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'mobile-firefox') return;

    const body = page.locator('body');
    const box = await body.boundingBox();

    // On mobile, body should expand beyond the fixed 180px desktop width
    expect(box.width).toBeGreaterThan(180);
  });

  test('checkboxes are visible and clickable', async ({ page }) => {
    const loggingCheckbox = page.locator('#enable-logging');
    const notifCheckbox = page.locator('#enable-notifications');

    await expect(loggingCheckbox).not.toBeChecked();
    await loggingCheckbox.check();
    await expect(loggingCheckbox).toBeChecked();

    await expect(notifCheckbox).not.toBeChecked();
    await notifCheckbox.check();
    await expect(notifCheckbox).toBeChecked();
  });
});
