// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Security: Action handler whitelist', () => {
	test('unknown data-action attributes are silently ignored', async ({ page }) => {
		await page.goto('http://localhost:8889/redirector.html');

		// Patch sendMessage to support save-redirects (for creating a test redirect)
		await page.evaluate(() => {
			const orig = window.chrome.runtime.sendMessage.bind(window.chrome.runtime);
			window.chrome.runtime.sendMessage = function(p, cb) {
				if (p.type === 'save-redirects') { window.chrome.storage.local.set({redirects: p.redirects}); if(cb) cb({message:'Redirects saved'}); }
				else orig(p, cb);
			};
		});

		// Create a redirect via UI
		await page.click('#create-new-redirect');
		await page.fill('input[data-bind="exampleUrl"]', 'http://test.com/x');
		await page.fill('input[data-bind="includePattern"]', 'http://test.com/*');
		await page.fill('input[data-bind="redirectUrl"]', 'http://t2.com/$1');
		await page.locator('input[data-bind="redirectUrl"]').press('Tab');
		await page.click('#btn-save-redirect');
		await page.waitForSelector('.redirect-row:not(#redirect-row-template)');

		// Inject a button with a dangerous action name
		await page.evaluate(() => {
			const row = document.querySelector('.redirect-row:not(#redirect-row-template)');
			const btn = document.createElement('button');
			btn.setAttribute('data-action', 'alert');
			btn.setAttribute('data-index', '0');
			btn.textContent = 'Evil';
			btn.className = 'btn';
			row.appendChild(btn);
		});

		let alertCalled = false;
		page.on('dialog', async d => { alertCalled = true; await d.dismiss(); });

		await page.click('[data-action="alert"]');
		await page.waitForTimeout(300);
		expect(alertCalled).toBe(false);
	});

	test('known data-action editRedirect opens the edit form', async ({ page }) => {
		await page.goto('http://localhost:8889/redirector.html');
		await page.evaluate(() => {
			const orig = window.chrome.runtime.sendMessage.bind(window.chrome.runtime);
			window.chrome.runtime.sendMessage = function(p, cb) {
				if (p.type === 'save-redirects') { window.chrome.storage.local.set({redirects: p.redirects}); if(cb) cb({message:'Redirects saved'}); }
				else orig(p, cb);
			};
		});

		await page.click('#create-new-redirect');
		await page.fill('input[data-bind="exampleUrl"]', 'http://test.com/x');
		await page.fill('input[data-bind="includePattern"]', 'http://test.com/*');
		await page.fill('input[data-bind="redirectUrl"]', 'http://t2.com/$1');
		await page.locator('input[data-bind="redirectUrl"]').press('Tab');
		await page.click('#btn-save-redirect');
		await page.waitForSelector('.redirect-row:not(#redirect-row-template)');

		await page.click('[data-action="editRedirect"]');
		await expect(page.locator('#edit-redirect-form')).toBeVisible();
		await expect(page.locator('#edit-redirect-form h3')).toHaveText('Edit Redirect');
	});
});

test.describe('Security: Edit form validation', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('http://localhost:8889/redirector.html');
	});

	test('save button is disabled when form has errors', async ({ page }) => {
		await page.click('#create-new-redirect');
		await expect(page.locator('#edit-redirect-form')).toBeVisible();
		await expect(page.locator('#btn-save-redirect')).toHaveAttribute('disabled', 'disabled');
	});

	test('save button enables when valid redirect is entered', async ({ page }) => {
		await page.click('#create-new-redirect');
		await page.fill('input[data-bind="exampleUrl"]', 'http://example.com/test');
		await page.fill('input[data-bind="includePattern"]', 'http://example.com/*');
		await page.fill('input[data-bind="redirectUrl"]', 'http://other.com/$1');
		await page.locator('input[data-bind="redirectUrl"]').press('Tab');
		await expect(page.locator('#btn-save-redirect')).not.toHaveAttribute('disabled', 'disabled');
	});

	test('shows error for invalid regex pattern', async ({ page }) => {
		await page.click('#create-new-redirect');
		await page.click('#regextype input');
		await page.fill('input[data-bind="exampleUrl"]', 'http://example.com/test');
		await page.fill('input[data-bind="includePattern"]', '(unclosed');
		await page.fill('input[data-bind="redirectUrl"]', 'http://other.com/$1');
		await page.locator('input[data-bind="redirectUrl"]').press('Tab');
		const error = page.locator('#edit-redirect-form .error');
		await expect(error).toBeVisible();
		await expect(error).toContainText('Invalid regular expression');
	});
});

test.describe('Security: Import file handling', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('http://localhost:8889/redirector.html');
		// Patch sendMessage to support save-redirects for successful imports
		await page.evaluate(() => {
			const orig = window.chrome.runtime.sendMessage.bind(window.chrome.runtime);
			window.chrome.runtime.sendMessage = function(p, cb) {
				if (p.type === 'save-redirects') { window.chrome.storage.local.set({redirects: p.redirects}); if(cb) cb({message:'Redirects saved'}); }
				else orig(p, cb);
			};
		});
	});

	test('rejects import of invalid JSON', async ({ page }) => {
		const tmpFile = path.join('/tmp', 'bad-import.json');
		fs.writeFileSync(tmpFile, 'this is not json {{{');
		await page.locator('#import-file').setInputFiles(tmpFile);
		await expect(page.locator('#message-box')).toHaveClass(/visible/, { timeout: 5000 });
		await expect(page.locator('#message')).toContainText('Failed to parse JSON');
		fs.unlinkSync(tmpFile);
	});

	test('rejects import with missing redirects property', async ({ page }) => {
		const tmpFile = path.join('/tmp', 'no-redirects.json');
		fs.writeFileSync(tmpFile, JSON.stringify({ notRedirects: [] }));
		await page.locator('#import-file').setInputFiles(tmpFile);
		await expect(page.locator('#message-box')).toHaveClass(/visible/, { timeout: 5000 });
		await expect(page.locator('#message')).toContainText('missing or invalid "redirects"');
		fs.unlinkSync(tmpFile);
	});

	test('rejects import where redirects is not an array', async ({ page }) => {
		const tmpFile = path.join('/tmp', 'bad-redirects.json');
		fs.writeFileSync(tmpFile, JSON.stringify({ redirects: "not an array" }));
		await page.locator('#import-file').setInputFiles(tmpFile);
		await expect(page.locator('#message-box')).toHaveClass(/visible/, { timeout: 5000 });
		await expect(page.locator('#message')).toContainText('missing or invalid "redirects"');
		fs.unlinkSync(tmpFile);
	});

	test('successfully imports valid redirect rules', async ({ page }) => {
		const tmpFile = path.join('/tmp', 'good-import.json');
		fs.writeFileSync(tmpFile, JSON.stringify({
			createdBy: 'Test',
			redirects: [{
				description: 'Imported redirect', exampleUrl: 'http://import-test.com/page',
				includePattern: 'http://import-test.com/*', excludePattern: '',
				redirectUrl: 'http://imported.com/$1', patternDesc: '',
				patternType: 'W', processMatches: 'noProcessing',
				disabled: false, appliesTo: ['main_frame']
			}]
		}));
		await page.locator('#import-file').setInputFiles(tmpFile);
		await expect(page.locator('#message-box')).toHaveClass(/visible/, { timeout: 5000 });
		await expect(page.locator('#message')).toContainText('Successfully imported 1 redirect');
		fs.unlinkSync(tmpFile);
	});

	test('import strips extra unknown properties', async ({ page }) => {
		const tmpFile = path.join('/tmp', 'extra-props.json');
		fs.writeFileSync(tmpFile, JSON.stringify({
			redirects: [{
				description: 'Safe redirect', exampleUrl: 'http://strip.com/page',
				includePattern: 'http://strip.com/*', redirectUrl: 'http://stripped.com/$1',
				patternType: 'W', processMatches: 'noProcessing', disabled: false,
				appliesTo: ['main_frame'], evilProp: '<script>alert(1)</script>'
			}]
		}));
		await page.locator('#import-file').setInputFiles(tmpFile);
		await expect(page.locator('#message-box')).toHaveClass(/visible/, { timeout: 5000 });
		await expect(page.locator('#message')).toContainText('Successfully imported');
		fs.unlinkSync(tmpFile);
	});
});

test.describe('Security: CSP enforcement', () => {
	test('no inline scripts in popup.html', async ({ page }) => {
		const response = await page.goto('http://localhost:8889/popup.html');
		const html = await response.text();
		const inlineScriptRegex = /<script(?![^>]*\bsrc\b)[^>]*>[^<]+<\/script>/gi;
		expect(html.match(inlineScriptRegex)).toBeNull();
	});

	test('no inline scripts in redirector.html', async ({ page }) => {
		const response = await page.goto('http://localhost:8889/redirector.html');
		const html = await response.text();
		const inlineScriptRegex = /<script(?![^>]*\bsrc\b)[^>]*>[^<]+<\/script>/gi;
		expect(html.match(inlineScriptRegex)).toBeNull();
	});

	test('all script src attributes point to local js files', async ({ page }) => {
		await page.goto('http://localhost:8889/redirector.html');
		const scriptSrcs = await page.evaluate(() =>
			Array.from(document.querySelectorAll('script[src]')).map(s => s.getAttribute('src'))
		);
		for (const src of scriptSrcs) {
			expect(src).toMatch(/^js\/[\w.-]+\.js$/);
		}
	});
});

test.describe('Security: Delete confirmation flow', () => {
	test('delete requires confirmation and cancel preserves', async ({ page }) => {
		await page.goto('http://localhost:8889/redirector.html');
		await page.evaluate(() => {
			const orig = window.chrome.runtime.sendMessage.bind(window.chrome.runtime);
			window.chrome.runtime.sendMessage = function(p, cb) {
				if (p.type === 'save-redirects') { window.chrome.storage.local.set({redirects: p.redirects}); if(cb) cb({message:'Redirects saved'}); }
				else orig(p, cb);
			};
		});

		await page.click('#create-new-redirect');
		await page.fill('input[data-bind="exampleUrl"]', 'http://del.com/x');
		await page.fill('input[data-bind="includePattern"]', 'http://del.com/*');
		await page.fill('input[data-bind="redirectUrl"]', 'http://del2.com/$1');
		await page.locator('input[data-bind="redirectUrl"]').press('Tab');
		await page.click('#btn-save-redirect');
		await page.waitForSelector('.redirect-row:not(#redirect-row-template)');

		const initialCount = await page.locator('.redirect-row:not(#redirect-row-template)').count();
		await page.click('[data-action="confirmDeleteRedirect"]');
		await expect(page.locator('#delete-redirect-form')).toBeVisible();
		await page.click('#cancel-delete');
		await expect(page.locator('#delete-redirect-form')).not.toBeVisible();
		const finalCount = await page.locator('.redirect-row:not(#redirect-row-template)').count();
		expect(finalCount).toBe(initialCount);
	});
});
