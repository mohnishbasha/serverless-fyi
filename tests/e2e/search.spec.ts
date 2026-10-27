import { expect, test } from '@playwright/test';

test('search loads Pagefind lazily and finds a known term', async ({ page }) => {
  const pagefindRequests: string[] = [];
  page.on('request', (r) => r.url().includes('/pagefind/') && pagefindRequests.push(r.url()));
  await page.goto('');
  expect(pagefindRequests).toHaveLength(0);

  await page.goto('search/?q=vector%20clocks');
  const results = page.locator('[data-search-results] li');
  await expect(results.first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-search-results]')).toContainText('Vector Clocks');
});
