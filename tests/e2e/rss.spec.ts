import { expect, test } from '@playwright/test';

test('header links to the feeds page', async ({ page }) => {
  await page.goto('');
  const rss = page.getByRole('link', { name: 'RSS feeds' }).filter({ visible: true }).first();
  await rss.click();
  await expect(page).toHaveURL(/\/feeds\/$/);
  await expect(page.locator('h1')).toHaveText('RSS & feeds');
});

test('feeds page lists site-wide and per-topic feeds with copyable URLs', async ({ page, request }) => {
  await page.goto('feeds/');
  for (const name of ['RSS 2.0', 'Atom', 'JSON Feed']) {
    await expect(page.getByRole('link', { name })).toBeVisible();
  }
  await expect(page.locator('code', { hasText: /^https:\/\/.*\/rss\.xml$/ })).toBeVisible();
  const tagFeed = page.locator('a[href$="/t/distributed-systems/rss.xml"]');
  await expect(tagFeed).toHaveCount(1);
  const res = await request.get(new URL((await tagFeed.getAttribute('href')) ?? '', page.url()).toString());
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('<rss');
});

test('subscribe page offers RSS, Atom and JSON feeds', async ({ page }) => {
  await page.goto('subscribe/');
  const section = page.getByRole('region', { name: 'Prefer RSS?' });
  await expect(section.getByRole('link', { name: 'RSS feed' })).toHaveAttribute('href', /rss\.xml$/);
  await expect(section.getByRole('link', { name: 'Atom' })).toHaveAttribute('href', /atom\.xml$/);
  await expect(section.getByRole('link', { name: 'JSON Feed' })).toHaveAttribute('href', /feed\.json$/);
});
