// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  reporter: [['list'], ['junit', { outputFile: 'test-results/e2e-results.xml' }]],

  use: {
    headless: true,
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'python3 -m http.server 8889',
    port: 8889,
    reuseExistingServer: true,
  },

  projects: [
    {
      name: 'mobile-firefox',
      use: {
        ...devices['Pixel 5'],
        channel: undefined,
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
          args: ['--no-sandbox', '--disable-gpu'],
        },
      },
    },
    {
      name: 'desktop-chrome',
      use: {
        viewport: { width: 1280, height: 720 },
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
          args: ['--no-sandbox', '--disable-gpu'],
        },
      },
    },
  ],
});
