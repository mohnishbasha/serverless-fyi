import { expect, test } from '@playwright/test';
import { TEMPLATES } from '../e2e/helpers';

// Snapshots are committed; update only via a PR labelled `update-snapshots` (docs/TEST_PLAN.md).
const pick = {
  home: TEMPLATES.home,
  post: TEMPLATES.post,
  tag: TEMPLATES.tag,
  archive: TEMPLATES.archive,
  authors: TEMPLATES.authors,
  subscribe: TEMPLATES.subscribe,
};

test.skip(process.platform !== 'linux', 'Snapshots are rendered on Linux; run scripts/update-snapshots.sh locally.');

for (const scheme of ['light', 'dark'] as const) {
  for (const [name, path] of Object.entries(pick)) {
    test(`visual: ${name} ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${name}-${scheme}.png`, {
        fullPage: false,
        mask: [page.locator('.site-footer p').first()],
      });
    });
  }
}
