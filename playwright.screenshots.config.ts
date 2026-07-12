import { defineConfig, devices } from '@playwright/test';

// Dedicated config for capturing marketing/README screenshots.
// Kept separate from playwright.config.ts so the normal `npm test` run
// (which matches *.spec.ts) never picks up tests/screenshots.ts.
export default defineConfig({
  testDir: './tests',
  testMatch: '**/screenshots.ts',
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:5173',
  },
  projects: [{
    name: 'chromium',
    // Spread the device first, then override so the larger, hi-DPI viewport wins.
    use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
