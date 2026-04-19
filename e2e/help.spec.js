// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Help page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8889/help.html');
  });

  test('renders help page with all sections', async ({ page }) => {
    await expect(page.locator('h1')).toHaveText('REDIRECTOR HELP');
    await expect(page.locator('text=Table of contents')).toBeVisible();
    await expect(page.locator('h4:has-text("What is Redirector?")')).toBeVisible();
    await expect(page.locator('h4:has-text("Basic usage")')).toBeVisible();
    await expect(page.locator('h4:has-text("Wildcards")')).toBeVisible();
    await expect(page.locator('h4:has-text("Regular expressions")')).toBeVisible();
    await expect(page.locator('h4:has-text("Examples")')).toBeVisible();
  });

  test('body uses full width on mobile', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'mobile-firefox') return;

    const body = page.locator('body');
    const box = await body.boundingBox();
    const viewport = page.viewportSize();

    // On mobile, body should be close to full viewport width
    expect(box.width).toBeGreaterThan(viewport.width * 0.9);
  });

  test('tables are scrollable on mobile', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'mobile-firefox') return;

    const tables = page.locator('table');
    const count = await tables.count();
    expect(count).toBeGreaterThan(0);

    // First table should have overflow-x auto
    const overflowX = await tables.first().evaluate(el =>
      window.getComputedStyle(el).overflowX
    );
    expect(overflowX).toBe('auto');
  });

  test('navigation links are functional', async ({ page }) => {
    // Click on a TOC link and verify the heading is visible after scroll
    await page.click('a[href="#wildcards"]');
    const wildcardsHeading = page.locator('h4:has-text("Wildcards")');
    await expect(wildcardsHeading).toBeInViewport();
  });

  test('example tables contain all required fields', async ({ page }) => {
    const tables = page.locator('table');
    const count = await tables.count();

    // There should be 5 example tables
    expect(count).toBe(5);

    // Each table should have Example URL, Include pattern, Redirect to, Pattern type, Example result
    for (let i = 0; i < count; i++) {
      const table = tables.nth(i);
      await expect(table.locator('th:has-text("Example URL:")')).toBeVisible();
      await expect(table.locator('th:has-text("Include pattern:")')).toBeVisible();
      await expect(table.locator('th:has-text("Redirect to:")')).toBeVisible();
      await expect(table.locator('th:has-text("Example result:")')).toBeVisible();
    }
  });
});
