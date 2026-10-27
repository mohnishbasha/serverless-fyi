import { expect, test } from '@playwright/test';

test('Beehiiv ~ tag URL lands on the hyphenated tag page', async ({ page }) => {
  await page.goto('t/distributed~systems/');
  await expect(page).toHaveURL(/\/t\/distributed-systems\/$/);
  await expect(page.locator('h1')).toContainText('Distributed Systems');
});

test('slashless legacy post URL resolves', async ({ page }) => {
  await page.goto('p/understanding-the-dns-header');
  await expect(page).toHaveURL(/\/p\/understanding-the-dns-header\/$/);
  await expect(page.locator('h1')).toHaveText('Understanding the DNS Header');
});

test('account and author detail URLs redirect, preserving the hash', async ({ page }) => {
  await page.goto('login/#x');
  await expect(page).toHaveURL(/\/subscribe\/#x$/);
  await page.goto('authors/mohinish-s/');
  await expect(page).toHaveURL(/\/authors\/$/);
});
