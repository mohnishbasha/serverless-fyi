import { expect, test } from '@playwright/test';
import { POST } from './helpers';

test('home and post render without JavaScript', async ({ page }) => {
  await page.goto('');
  await expect(page.locator('article.card').first()).toBeVisible();
  await page.goto(POST);
  await expect(page.locator('h1')).toHaveText('Understanding the DNS Header');
  await expect(page.locator('.prose p').first()).toBeVisible();
  // The theme toggle needs JS, so it stays hidden.
  await expect(page.locator('.theme-toggle').first()).toBeHidden();
});

test('subscribe form is a plain working form without JavaScript', async ({ page }) => {
  await page.goto('subscribe/');
  const form = page.locator('form[data-subscribe]').first();
  if ((await form.count()) === 0) {
    await expect(page.getByRole('heading', { name: 'Follow along' })).toBeVisible();
    return;
  }
  expect(await form.getAttribute('action')).toMatch(/^https:\/\//);
  expect(['get', 'post']).toContain(await form.getAttribute('method'));
  await expect(form.locator('input[type="email"][required]')).toBeVisible();
});

test('search falls back to a GET form', async ({ page }) => {
  await page.goto('');
  await page.goto('search/');
  const form = page.getByRole('search');
  await expect(form).toHaveAttribute('method', 'get');
});
