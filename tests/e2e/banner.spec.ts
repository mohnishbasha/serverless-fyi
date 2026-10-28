import { expect, test } from '@playwright/test';

test('announcement banner sits below the header and links to the math', async ({ page }) => {
  await page.goto('');
  const banner = page.getByRole('complementary', { name: 'Site announcement' });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText('Beehiiv');
  const headerBox = await page.locator('header.site-header').boundingBox();
  const bannerBox = await banner.boundingBox();
  expect(bannerBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
  await banner.getByRole('link', { name: /see the math/i }).click();
  await expect(page).toHaveURL(/\/why-we-moved\/$/);
  await expect(page.locator('h1')).toContainText('Why we moved off Beehiiv');
});

test('why-we-moved page shows the cost math', async ({ page }) => {
  await page.goto('why-we-moved/');
  const table = page.getByRole('table').first();
  await expect(table).toContainText('Beehiiv');
  await expect(table).toContainText('$59');
  await expect(page.getByText(/\$708/).first()).toBeVisible();
});

test('banner can be dismissed and stays dismissed', async ({ page, javaScriptEnabled }) => {
  test.skip(javaScriptEnabled === false);
  await page.goto('');
  const banner = page.getByRole('complementary', { name: 'Site announcement' });
  await banner.getByRole('button', { name: /dismiss/i }).click();
  await expect(banner).toBeHidden();
  await page.goto('archive/');
  await expect(page.getByRole('complementary', { name: 'Site announcement' })).toBeHidden();
});
