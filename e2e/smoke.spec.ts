import { test, expect } from '@playwright/test';

test('admin panel loads authenticated', async ({ page }) => {
  await page.goto('/');

  // Should NOT be redirected to login
  await expect(page).not.toHaveURL(/signin|login|auth/);

  // Should see authenticated content
  const body = await page.textContent('body');
  expect(body).toBeTruthy();

  // Take evidence screenshot
  await page.screenshot({ path: './e2e/screenshots/smoke-authenticated.png', fullPage: true });
});
