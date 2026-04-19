#!/usr/bin/env node
// Visual verification: opens screenshots/index.html in a headless browser,
// checks interactions and renders preview PNGs at two breakpoints so a human
// (or agent) can eyeball the result.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const INDEX = 'file://' + path.join(ROOT, 'screenshots', 'index.html');
const OUT = path.join(ROOT, 'screenshots', 'verify');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const errors = [];
  const missing = [];

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => missing.push(`${r.failure()?.errorText} ${r.url()}`));

  await page.goto(INDEX, { waitUntil: 'networkidle' });

  const nav = await page.$$eval('nav.toc a', (els) => els.map((e) => e.textContent.trim()));
  const cardCount = await page.locator('.card').count();
  const shotCount = await page.locator('.shot img').count();

  await page.screenshot({ path: path.join(OUT, 'desktop-top.png'), fullPage: false });
  await page.screenshot({ path: path.join(OUT, 'desktop-full.png'), fullPage: true });

  // TOC navigation smoke test.
  await page.click('nav.toc a[href="#settings"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, 'desktop-settings-section.png'), fullPage: false });

  // Lightbox interaction smoke test (click actual image, not frame chrome).
  await page.locator('.shot img').first().click();
  await page.waitForSelector('.lightbox.open');
  const lightboxVisible = await page.locator('.lightbox.open').isVisible();
  await page.screenshot({ path: path.join(OUT, 'desktop-lightbox.png'), fullPage: false });
  await page.keyboard.press('Escape');

  await ctx.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mpage = await mobile.newPage();
  await mpage.goto(INDEX, { waitUntil: 'networkidle' });
  await mpage.screenshot({ path: path.join(OUT, 'mobile-top.png'), fullPage: false });
  await mpage.screenshot({ path: path.join(OUT, 'mobile-full.png'), fullPage: true });
  await mobile.close();

  await browser.close();

  console.log('Navigation:', nav);
  console.log('Cards:', cardCount);
  console.log('Shot images:', shotCount);
  console.log('Lightbox opens on image click:', lightboxVisible);
  console.log('Console errors:', errors);
  console.log('Missing assets:', missing);

  if (errors.length || cardCount === 0 || !lightboxVisible) process.exit(1);
})();
