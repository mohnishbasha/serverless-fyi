import { expect, test } from '@playwright/test';

test('home renders latest posts and navigation', async ({ page }) => {
  await page.goto('');
  await expect(page.getByRole('heading', { level: 1, name: '2 Minute Serverless' })).toBeVisible();
  const latest = page.locator('section', { has: page.getByRole('heading', { name: 'Latest posts' }) });
  await expect(latest.locator('article.card')).toHaveCount(10);
  await page
    .getByRole('navigation', { name: /^Main/ })
    .filter({ visible: true })
    .getByRole('link', { name: 'Archive' })
    .click();
  await expect(page).toHaveURL(/\/archive\/$/);
});

test('skip link moves focus to main', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'WebKit does not Tab to links by default');
  await page.goto('');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});
