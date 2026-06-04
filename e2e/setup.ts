import { chromium } from '@playwright/test';

async function setupAuth() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3008');

  console.log('Complete GitHub OAuth login in the browser window — you have 120 seconds');

  // Wait for successful auth — look for a post-login element
  await page.waitForSelector('[data-testid="dashboard"], nav, .sidebar, main h1', {
    timeout: 120000,
  });

  console.log('Login detected! Saving auth state...');

  await context.storageState({ path: './e2e/auth-state.json' });
  console.log('Auth state saved to e2e/auth-state.json');

  await browser.close();
}

setupAuth().catch(console.error);
