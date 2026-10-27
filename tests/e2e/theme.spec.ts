import { expect, test } from '@playwright/test';

test('theme toggle persists across navigation and applies before first paint', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('');
  const toggle = page.locator('.theme-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  // Record data-theme at DOMContentLoaded on the next page: it must already be set (no flash).
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      (window as unknown as { __themeAtDcl: string | undefined }).__themeAtDcl = document.documentElement.dataset.theme;
    });
  });
  await page.goto('archive/');
  expect(await page.evaluate(() => (window as unknown as { __themeAtDcl?: string }).__themeAtDcl)).toBe('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
