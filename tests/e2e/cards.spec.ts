import { expect, test } from '@playwright/test';

test('post cards show cover thumbnails that do not shift layout', async ({ page }) => {
  await page.goto('');
  const cards = page.locator('article.card');
  const n = await cards.count();
  expect(n).toBeGreaterThan(10);
  for (let i = 0; i < n; i++) {
    const img = cards.nth(i).locator('.card-thumb img');
    await expect(img).toHaveCount(1);
    await expect(img).toHaveAttribute('width', /\d+/);
    await expect(img).toHaveAttribute('height', /\d+/);
    // Decorative: the title link right below already names the post.
    await expect(img).toHaveAttribute('alt', '');
  }
  // Below-the-fold thumbnails are lazy.
  await expect(cards.last().locator('.card-thumb img')).toHaveAttribute('loading', 'lazy');
});

test('home features the newest post as a large card', async ({ page }) => {
  await page.goto('');
  const featured = page.locator('article.card.featured');
  await expect(featured).toHaveCount(1);
  const latestFirst = page
    .locator('section', { has: page.getByRole('heading', { name: 'Latest posts' }) })
    .locator('article.card')
    .first();
  await expect(latestFirst).toHaveClass(/featured/);
});

test('tag and listing cards also have thumbnails', async ({ page }) => {
  await page.goto('t/distributed-systems/');
  await expect(page.locator('article.card .card-thumb img').first()).toBeVisible();
});
