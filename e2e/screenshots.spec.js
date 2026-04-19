// @ts-check
// Screenshot-mode spec: captures visual snapshots of every page and key UI
// state for the Screenshots Gallery. Skipped unless SCREENSHOT_MODE=1.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_MODE = process.env.SCREENSHOT_MODE === '1';
const OUT_DIR = path.join(__dirname, '..', 'screenshots', 'captures');
const MANIFEST = path.join(__dirname, '..', 'screenshots', 'manifest.json');

test.skip(!SCREENSHOT_MODE, 'Screenshot mode disabled (set SCREENSHOT_MODE=1)');

/** @type {Array<{file:string,title:string,description:string,page:string,viewport:string,group:string}>} */
const entries = [];

function record(testInfo, meta) {
  const viewport = testInfo.project.name === 'mobile-firefox' ? 'mobile' : 'desktop';
  const slug = `${meta.page}-${meta.key}-${viewport}`.replace(/[^a-z0-9-]/gi, '-');
  const file = `${slug}.png`;
  entries.push({
    file,
    title: meta.title,
    description: meta.description,
    page: meta.page,
    viewport,
    group: meta.group,
  });
  return path.join(OUT_DIR, file);
}

test.beforeAll(() => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

test.afterAll(() => {
  // Merge with existing manifest so parallel projects don't clobber each other.
  let existing = [];
  if (fs.existsSync(MANIFEST)) {
    try { existing = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch {}
  }
  const seen = new Set(existing.map((e) => e.file));
  for (const e of entries) if (!seen.has(e.file)) existing.push(e);
  fs.writeFileSync(MANIFEST, JSON.stringify(existing, null, 2));
});

async function snap(page, testInfo, meta, opts = {}) {
  const file = record(testInfo, meta);
  if (opts.element) {
    await opts.element.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: true });
  }
}

test.describe('Screenshots - Popup', () => {
  test('popup default state', async ({ page }, testInfo) => {
    await page.goto('http://localhost:8889/popup.html');
    await expect(page.locator('h1')).toHaveText('REDIRECTOR');
    // Capture the body only so the narrow desktop popup doesn't leave a huge
    // blank canvas around it.
    await snap(page, testInfo, {
      page: 'popup',
      key: 'default',
      title: 'Toolbar popup',
      description: 'The compact popup shown when clicking the Redirector toolbar icon. Gives quick access to enable/disable, open settings and toggle logging or notifications.',
      group: 'Popup',
    }, { element: page.locator('body') });
  });

  test('popup with logging enabled', async ({ page }, testInfo) => {
    await page.goto('http://localhost:8889/popup.html');
    await page.locator('#enable-logging').check();
    await page.locator('#enable-notifications').check();
    await snap(page, testInfo, {
      page: 'popup',
      key: 'options-enabled',
      title: 'Popup with logging and notifications',
      description: 'Logging and notifications can be flipped on straight from the popup without opening the full settings page.',
      group: 'Popup',
    }, { element: page.locator('body') });
  });
});

test.describe('Screenshots - Settings', () => {
  test('settings empty state', async ({ page }, testInfo) => {
    await page.goto('http://localhost:8889/redirector.html');
    await expect(page.locator('h1')).toHaveText('REDIRECTOR');
    await snap(page, testInfo, {
      page: 'settings',
      key: 'list',
      title: 'Settings page',
      description: 'The main settings page. Existing redirects render as cards with quick actions (enable/disable, edit, delete, duplicate, reorder). The top bar handles creating, importing, exporting and organising rules.',
      group: 'Settings',
    });
  });

  test('create redirect form - basic', async ({ page }, testInfo) => {
    await page.goto('http://localhost:8889/redirector.html');
    await page.click('#create-new-redirect');
    await expect(page.locator('#edit-redirect-form')).toBeVisible();
    await page.fill('input[data-bind="description"]', 'Route old docs to new docs');
    await page.fill('input[data-bind="exampleUrl"]', 'https://old.example.com/docs/intro');
    await page.fill('input[data-bind="includePattern"]', 'https://old.example.com/docs/*');
    await page.fill('input[data-bind="redirectUrl"]', 'https://new.example.com/docs/$1');
    await snap(page, testInfo, {
      page: 'settings',
      key: 'create-form',
      title: 'Create redirect dialog',
      description: 'The Create Redirect form accepts a description, example URL, include pattern and a destination. Wildcards and full regular expressions are both supported.',
      group: 'Settings',
    });
  });

  test('create redirect form - advanced', async ({ page }, testInfo) => {
    await page.goto('http://localhost:8889/redirector.html');
    await page.click('#create-new-redirect');
    await page.fill('input[data-bind="description"]', 'Scoped redirect');
    await page.fill('input[data-bind="exampleUrl"]', 'https://old.example.com/docs/intro');
    await page.fill('input[data-bind="includePattern"]', 'https://old.example.com/docs/*');
    await page.fill('input[data-bind="redirectUrl"]', 'https://new.example.com/docs/$1');
    await page.click('#advanced-toggle a');
    await expect(page.locator('.advanced')).not.toHaveClass(/hidden/);
    await snap(page, testInfo, {
      page: 'settings',
      key: 'create-form-advanced',
      title: 'Advanced redirect options',
      description: 'Fine-tune when a redirect fires - exclude patterns, URL processing (encode/decode/base64) and per-resource-type filtering across iframes, scripts, images and more.',
      group: 'Settings',
    });
  });
});

test.describe('Screenshots - Help', () => {
  test('help page top', async ({ page }, testInfo) => {
    await page.goto('http://localhost:8889/help.html');
    await expect(page.locator('h1')).toHaveText('REDIRECTOR HELP');
    await snap(page, testInfo, {
      page: 'help',
      key: 'top',
      title: 'Help page',
      description: 'The full help and documentation page, with a table of contents, explanations of wildcards and regular expressions, plus a set of worked examples.',
      group: 'Help',
    });
  });

  test('help page examples', async ({ page }, testInfo) => {
    await page.goto('http://localhost:8889/help.html');
    await page.click('a[href="#examples"]');
    await page.locator('h4:has-text("Examples")').scrollIntoViewIfNeeded();
    await snap(page, testInfo, {
      page: 'help',
      key: 'examples',
      title: 'Help page - worked examples',
      description: 'Concrete examples walking through pattern construction: from simple wildcards to regex captures and URL-decoded query strings.',
      group: 'Help',
    });
  });
});
