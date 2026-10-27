import { expect, test } from '@playwright/test';

test.describe('subscribe form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('subscribe/');
  });

  test('renders a form, or the follow block when provider=none', async ({ page }) => {
    const form = page.locator('#page-subscribe-email');
    if ((await form.count()) === 0) {
      await expect(page.getByRole('heading', { name: 'Follow along' })).toBeVisible();
      return;
    }
    await expect(form).toHaveAttribute('type', 'email');
    await expect(form).toHaveAttribute('autocomplete', 'email');
    await expect(form).toHaveAttribute('required', '');
  });

  test('validates, ignores bots and shows success with a mocked network', async ({ page }) => {
    const email = page.locator('#page-subscribe-email');
    test.skip((await email.count()) === 0, 'provider=none build');
    const form = page.locator('form[data-subscribe]').filter({ has: email });
    const status = form.locator('.status');
    let calls = 0;
    await page.route(/magic\.beehiiv\.com|lists\.serverless\.fyi|buttondown\.com|app\.kit\.com/, (route) => {
      calls++;
      return route.fulfill({ status: 200, body: 'ok' });
    });

    await email.fill('not-an-email');
    await form.getByRole('button', { name: 'Subscribe' }).click();
    await expect(status).toHaveText(/valid email/);
    expect(calls).toBe(0);

    await form.locator('.hp input').evaluate((el: HTMLInputElement) => (el.value = 'bot'));
    await email.fill('reader@example.com');
    await form.getByRole('button', { name: 'Subscribe' }).click();
    await page.waitForTimeout(300);
    expect(calls).toBe(0);

    await form.locator('.hp input').evaluate((el: HTMLInputElement) => (el.value = ''));
    await form.getByRole('button', { name: 'Subscribe' }).click();
    await expect(status).toHaveText(/Thanks!/);
    expect(calls).toBe(1);
  });

  test('shows an error when the provider is unreachable', async ({ page }) => {
    const email = page.locator('#page-subscribe-email');
    test.skip((await email.count()) === 0, 'provider=none build');
    await page.route(/magic\.beehiiv\.com|lists\.serverless\.fyi|buttondown\.com|app\.kit\.com/, (route) =>
      route.abort(),
    );
    const form = page.locator('form[data-subscribe]').filter({ has: email });
    await email.fill('reader@example.com');
    await form.getByRole('button', { name: 'Subscribe' }).click();
    await expect(form.locator('.status')).toHaveText(/went wrong/);
  });
});
