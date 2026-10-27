import { expect, test } from '@playwright/test';

const GA = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/;

test.describe('Google Analytics (ADR-032)', () => {
  test('loads gtag only after the load event, and only on indexable builds', async ({ page }) => {
    // Record, inside the page, whether the load event had fired when the gtag <script> was inserted.
    await page.addInitScript(() => {
      const w = window as unknown as { __loaded: boolean; __gtagAfterLoad?: boolean };
      w.__loaded = false;
      window.addEventListener('load', () => (w.__loaded = true), { capture: true });
      new MutationObserver((muts) => {
        for (const m of muts)
          for (const n of m.addedNodes)
            if (n instanceof HTMLScriptElement && n.src.includes('googletagmanager.com/gtag/js'))
              w.__gtagAfterLoad = w.__loaded;
      }).observe(document, { childList: true, subtree: true });
    });
    const urls: string[] = [];
    await page.route(GA, (route) => {
      urls.push(route.request().url());
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
    });
    await page.goto('');
    const hasSnippet = (await page.locator('script[data-analytics="ga4"]').count()) > 0;
    test.skip(!hasSnippet, 'build without PUBLIC_GA_MEASUREMENT_ID or not indexable');
    await expect.poll(() => urls.length).toBeGreaterThan(0);
    expect(urls[0]).toContain('gtag/js?id=G-');
    expect(await page.evaluate(() => (window as unknown as { __gtagAfterLoad?: boolean }).__gtagAfterLoad)).toBe(true);
  });

  test('is not loaded when the browser sends Global Privacy Control', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'globalPrivacyControl', { value: true }));
    const requests: string[] = [];
    await page.route(GA, (route) => {
      requests.push(route.request().url());
      return route.fulfill({ status: 200, body: '' });
    });
    await page.goto('');
    await page.waitForLoadState('load');
    await page.waitForTimeout(500);
    expect(requests).toEqual([]);
  });
});
