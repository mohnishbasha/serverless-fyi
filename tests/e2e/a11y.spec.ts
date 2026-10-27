import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { TEMPLATES } from './helpers';

for (const scheme of ['light', 'dark'] as const) {
  for (const [name, path] of Object.entries(TEMPLATES)) {
    test(`axe: ${name} (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual(
        [],
      );
    });
  }
}

test('keyboard reaches header nav, search and subscribe', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit');
  await page.goto('');
  const seen = new Set<string>();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el ? `${el.tagName}:${(el.textContent ?? '').trim() || el.getAttribute('aria-label') || ''}` : '';
    });
    seen.add(label);
  }
  const all = [...seen].join('|');
  expect(all).toContain('A:Archive');
  expect(all).toContain('A:Search');
  expect(all).toMatch(/A:Subscribe|BUTTON:Subscribe/);
});
