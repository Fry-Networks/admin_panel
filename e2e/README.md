# Admin Panel E2E Tests with Playwright

This directory contains end-to-end tests for the admin panel using Playwright with persistent authentication context.

## Setup

### Prerequisites
- Node.js (already installed)
- npm (already installed)
- Running admin panel at `http://localhost:3008`

### Initial Setup - Install Playwright
```bash
cd /home/helpdesk/subdomains/admin_panel
npm install -D @playwright/test --legacy-peer-deps
npx playwright install chromium --with-deps
```

### First Run - Create Auth State
Run the interactive setup script to authenticate once via GitHub OAuth:
```bash
npx playwright test e2e/setup.ts --headed
```

A browser window will open. Complete the GitHub OAuth login flow manually. The script will detect successful login and save the auth state to `e2e/auth-state.json`. This state persists for the lifetime of the session.

### Run Tests
After auth state is saved, run all tests:
```bash
npx playwright test e2e/smoke.spec.ts
```

Or run with headed browser to see what's happening:
```bash
npx playwright test e2e/smoke.spec.ts --headed
```

## Test Structure

- **setup.ts**: One-time auth script. Runs headless=false to allow manual GitHub OAuth. Saves auth state.
- **smoke.spec.ts**: Baseline smoke test. Verifies authenticated access to the admin panel.

## Auth State
- Location: `e2e/auth-state.json`
- Ignored by git (see `.gitignore`)
- Re-run `e2e/setup.ts` if the session expires or auth state becomes stale

## Playwright Configuration
- Config: `playwright.config.ts` (in repo root)
- Base URL: `http://localhost:3008`
- Storage state: `e2e/auth-state.json`
- Screenshot: captured on failure only
- Trace: recorded on first retry

## Next Steps
- Add more test specs in this directory following the pattern of `smoke.spec.ts`
- Use `page.goto()` to navigate authenticated routes
- Auth is automatically injected via `storageState` in playwright.config.ts
