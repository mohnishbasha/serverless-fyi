import { expect, test } from '@playwright/test';

test('archive paginates and groups by year', async ({ page }) => {
  await page.goto('archive/');
  await expect(page.locator('.archive-list li')).toHaveCount(20);
  await expect(page.locator('h2.year').first()).toHaveText(/20\d\d/);
  await page.getByRole('link', { name: 'Older →' }).click();
  await expect(page).toHaveURL(/\/archive\/2\/$/);
  await expect(page.locator('.archive-list li').first()).toBeVisible();
});

test('legacy /archive/?page=2 redirects to /archive/2/', async ({ page }) => {
  await page.goto('archive/?page=2');
  await expect(page).toHaveURL(/\/archive\/2\/$/);
});

test('tag page lists tagged posts with CollectionPage JSON-LD', async ({ page }) => {
  await page.goto('t/distributed-systems/');
  await expect(page.locator('h1')).toContainText('Distributed Systems');
  expect(await page.locator('article.card').count()).toBeGreaterThan(0);
  const ld = await page.locator('script[type="application/ld+json"]').textContent();
  expect(ld).toContain('CollectionPage');
});

test('empty legacy tag page is noindex and links to the archive', async ({ page }) => {
  await page.goto('t/xrp/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByRole('link', { name: 'archive' }).first()).toBeVisible();
});
