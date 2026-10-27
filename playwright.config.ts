import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 4399);
const BASE = `/${process.env.BASE_PATH ?? '/'}/`.replace(/\/{2,}/g, '/');
export const baseURL = `http://127.0.0.1:${PORT}${BASE}`;

export default defineConfig({
  testDir: 'tests',
  testMatch: ['e2e/**/*.spec.ts', 'visual/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  snapshotPathTemplate: '{testDir}/visual/__snapshots__/{arg}-{projectName}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' } },
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: {
    command: `node scripts/serve-dist.mjs ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testIgnore: ['**/nojs.spec.ts'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 15'] },
      testIgnore: ['**/nojs.spec.ts', 'visual/**', '**/a11y.spec.ts'],
    },
    { name: 'pixel-7', use: { ...devices['Pixel 7'] }, testIgnore: ['**/nojs.spec.ts', '**/a11y.spec.ts'] },
    {
      name: 'narrow-320',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 640 } },
      testMatch: ['e2e/overflow.spec.ts'],
    },
    { name: 'no-js', use: { ...devices['Desktop Chrome'], javaScriptEnabled: false }, testMatch: ['e2e/nojs.spec.ts'] },
  ],
});
