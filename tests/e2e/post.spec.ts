import { expect, test } from '@playwright/test';
import { LONG_POST, POST } from './helpers';

test('post page has the frontmatter title as H1 and key furniture', async ({ page }) => {
  await page.goto(POST);
  await expect(page.locator('h1')).toHaveText('Understanding the DNS Header');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('.byline time').first()).toHaveAttribute('datetime', /2025-10-29/);
  await expect(page.locator('.cover img')).toHaveAttribute('fetchpriority', 'high');
  await expect(page.locator('.cover img')).not.toHaveAttribute('loading', 'lazy');
  // Migrated posts are aeoPending: no TL;DR box until the owner writes one.
  await expect(page.locator('.tldr')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
});

test('Markdown twin link returns text', async ({ page, request }) => {
  await page.goto(POST);
  const href = await page.getByRole('link', { name: 'Read as Markdown' }).getAttribute('href');
  expect(href).toMatch(/\/p\/understanding-the-dns-header\.md$/);
  const res = await request.get(new URL(href ?? '', page.url()).toString());
  expect(res.status()).toBe(200);
  expect(await res.text()).toContain('# Understanding the DNS Header');
});

test('prev/next navigation works', async ({ page }) => {
  await page.goto(POST);
  const nav = page.getByRole('navigation', { name: 'Previous and next posts' });
  const prev = nav.locator('a[rel="prev"]');
  const title = (await prev.textContent())?.replace('← Previous', '').trim() ?? '';
  await prev.click();
  await expect(page.locator('h1')).toHaveText(title);
});

test('long posts get a TOC whose links scroll to anchors', async ({ page }) => {
  await page.goto(LONG_POST);
  const toc = page.getByRole('navigation', { name: 'Table of contents' });
  await expect(toc).toBeVisible();
  const link = toc.getByRole('link').nth(1);
  const hash = (await link.getAttribute('href')) ?? '';
  await link.click();
  await expect(page).toHaveURL(new RegExp(`${hash}$`));
  await expect(page.locator(decodeURIComponent(hash).replace(/^#(\d)/, '#\\3$1 '))).toBeInViewport();
});

test('code blocks get a wrap toggle', async ({ page }) => {
  await page.goto(POST);
  const btn = page.getByRole('button', { name: 'Wrap' }).first();
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
});
