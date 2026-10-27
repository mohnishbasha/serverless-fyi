import { expect, test } from '@playwright/test';

test('unknown URL shows the 404 page', async ({ page }) => {
  const res = await page.goto('definitely-not-a-page-xyz/');
  expect(res?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Page not found');
  await expect(page.getByRole('search')).toBeVisible();
});

test('404 fallback fixes legacy ~ tags without a trailing slash', async ({ page }) => {
  await page.goto('t/video~streaming');
  await expect(page).toHaveURL(/\/t\/video-streaming\/$/);
});

test('404 fallback fixes upper-case and .html URLs', async ({ page }) => {
  await page.goto('P/Understanding-The-DNS-Header.html');
  await expect(page).toHaveURL(/\/p\/understanding-the-dns-header\/$/);
});
