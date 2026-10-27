import { expect, test } from '@playwright/test';
import { LONG_POST, TEMPLATES } from './helpers';

for (const [name, path] of Object.entries({ ...TEMPLATES, longPost: LONG_POST })) {
  test(`no horizontal overflow: ${name}`, async ({ page }) => {
    await page.goto(path);
    const { scroll, width } = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      width: window.innerWidth,
    }));
    expect(scroll).toBeLessThanOrEqual(width);
  });
}
