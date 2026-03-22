// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8889/redirector.html');
  });

  test('renders main page elements', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('REDIRECTOR');
    await expect(page.locator('#create-new-redirect')).toBeVisible();
    await expect(page.locator('label[for="import-file"]')).toBeVisible();
    await expect(page.locator('#export-link')).toBeVisible();
    await expect(page.locator('#organize-mode')).toBeVisible();
    await expect(page.locator('a[href="help.html"]')).toBeVisible();
  });

  test('menu buttons stack vertically on mobile', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'mobile-firefox') return;

    const createBtn = page.locator('#create-new-redirect');
    const helpBtn = page.locator('a[href="help.html"]');

    const createBox = await createBtn.boundingBox();
    const helpBox = await helpBtn.boundingBox();

    // On mobile, help button should be below create button (stacked)
    expect(helpBox.y).toBeGreaterThan(createBox.y + createBox.height - 1);

    // Buttons should be nearly full width on mobile
    const viewport = page.viewportSize();
    expect(createBox.width).toBeGreaterThan(viewport.width * 0.5);
  });

  test('create redirect form opens and shows fields', async ({ page }) => {
    await page.click('#create-new-redirect');

    const form = page.locator('#edit-redirect-form');
    await expect(form).toBeVisible();
    await expect(page.locator('#edit-redirect-form h3')).toHaveText('Create Redirect');

    // All form fields visible
    await expect(page.locator('input[data-bind="description"]')).toBeVisible();
    await expect(page.locator('input[data-bind="exampleUrl"]')).toBeVisible();
    await expect(page.locator('input[data-bind="includePattern"]')).toBeVisible();
    await expect(page.locator('input[data-bind="redirectUrl"]')).toBeVisible();
  });

  test('edit form inputs are full-width on mobile', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'mobile-firefox') return;

    await page.click('#create-new-redirect');
    await expect(page.locator('#edit-redirect-form')).toBeVisible();

    const input = page.locator('input[data-bind="description"]');
    const inputBox = await input.boundingBox();

    // On mobile, inputs should be at least 70% of viewport width
    const viewport = page.viewportSize();
    expect(inputBox.width).toBeGreaterThan(viewport.width * 0.7);
  });

  test('edit form is full-screen on mobile', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'mobile-firefox') return;

    await page.click('#create-new-redirect');

    const form = page.locator('#edit-redirect-form');
    const formBox = await form.boundingBox();

    // Form should span full width on mobile
    const viewport = page.viewportSize();
    expect(formBox.width).toBeGreaterThanOrEqual(viewport.width - 2);
  });

  test('advanced options toggle works', async ({ page }) => {
    await page.click('#create-new-redirect');

    // Advanced options should be hidden initially
    const advanced = page.locator('.advanced');
    await expect(advanced).toHaveClass(/hidden/);

    // Click to show advanced options
    await page.click('#advanced-toggle a');
    await expect(advanced).not.toHaveClass(/hidden/);
    await expect(page.locator('input[data-bind="excludePattern"]')).toBeVisible();

    // Click to hide again
    await page.click('#advanced-toggle a');
    await expect(advanced).toHaveClass(/hidden/);
  });

  test('cancel closes the edit form', async ({ page }) => {
    await page.click('#create-new-redirect');
    await expect(page.locator('#edit-redirect-form')).toBeVisible();

    await page.click('#btn-cancel-edit');
    // Form should be hidden after cancel
    await expect(page.locator('#edit-redirect-form')).not.toBeVisible();
  });
});
