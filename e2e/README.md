# E2E tests (Playwright)

Smoke tests for advisor routes that previously broke with a router parser
SyntaxError → blank screen.

## Run

```bash
# Unauthenticated only (always runs; uses dev server on :8080)
bun run test:e2e

# With authenticated advisor flow
TEST_ADVISOR_EMAIL=advisor@example.com \
TEST_ADVISOR_PASSWORD='your-password' \
bun run test:e2e
```

If a dev server is already running, pass `PLAYWRIGHT_BASE_URL` to reuse it:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:8080 bun run test:e2e
```

## Sandbox / CI

Inside the Lovable sandbox (no apt available) the Playwright-bundled Chromium
fails to launch due to missing system libs. Use the nix-provided browsers and
match the npm package version (`@playwright/test@1.56.1` ↔ nix
`playwright-driver.browsers`):

```bash
PLAYWRIGHT_BROWSERS_PATH=/nix/store/wzfqrpwxk230xqjl1z27h7lis19gjs4f-playwright-browsers \
nix shell nixpkgs#playwright-driver.browsers --command \
  bash -c 'PLAYWRIGHT_BASE_URL=http://localhost:8080 bunx playwright test'
```

## What is verified

- `/advisor/dashboard` and `/advisor/queue` return HTTP < 500
- Page body is not empty and no Vite error overlay is shown
- No uncaught page errors
- When credentials are provided: page stays on the route after login and the
  `<header>` renders (proves the layout mounted, not just a redirect)
