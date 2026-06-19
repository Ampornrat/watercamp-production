import { test, expect } from "@playwright/test";

const ADVISOR_EMAIL = process.env.TEST_ADVISOR_EMAIL;
const ADVISOR_PASSWORD = process.env.TEST_ADVISOR_PASSWORD;

const ROUTES = ["/advisor/dashboard", "/advisor/queue"] as const;

/**
 * Treat a "blank screen" as: <body> has effectively no visible text content,
 * OR a known error overlay is present. The previous regression rendered a
 * white page due to a router code-splitter parse error.
 */
async function assertNotBlank(page: import("@playwright/test").Page) {
  // Vite error overlay (custom element) — present when SSR/transform fails.
  await expect(page.locator("vite-error-overlay")).toHaveCount(0);

  const bodyText = (await page.locator("body").innerText()).trim();
  expect(bodyText.length, "page body should not be empty (blank screen)").toBeGreaterThan(
    0,
  );
}

test.describe("advisor routes — unauthenticated", () => {
  for (const path of ROUTES) {
    test(`${path} renders without blank screen / parser error`, async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response, `no response for ${path}`).not.toBeNull();
      expect(response!.status(), `bad HTTP status for ${path}`).toBeLessThan(500);

      // Core regression check: the route module must parse and mount.
      // Previously a router code-splitter SyntaxError produced a blank page.
      await assertNotBlank(page);

      // useAuth either keeps the loading state or redirects to /login.
      // Either is acceptable proof the module loaded; we just must not be blank.
      await Promise.race([
        page.waitForURL(/\/login(\?|$|#)/, { timeout: 20_000 }).catch(() => null),
        page
          .getByText(/กำลังโหลด/)
          .waitFor({ timeout: 20_000 })
          .catch(() => null),
      ]);
      await assertNotBlank(page);

      expect(
        pageErrors,
        `unexpected page errors on ${path}: ${pageErrors.join(" | ")}`,
      ).toEqual([]);
    });
  }
});

test.describe("advisor routes — authenticated", () => {
  test.skip(
    !ADVISOR_EMAIL || !ADVISOR_PASSWORD,
    "Set TEST_ADVISOR_EMAIL and TEST_ADVISOR_PASSWORD to run authenticated checks",
  );

  test.beforeEach(async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page
      .getByLabel(/email|อีเมล/i)
      .first()
      .fill(ADVISOR_EMAIL!);
    await page
      .getByLabel(/password|รหัสผ่าน/i)
      .first()
      .fill(ADVISOR_PASSWORD!);
    await page
      .getByRole("button", { name: /login|sign in|เข้าสู่ระบบ/i })
      .first()
      .click();
    // Wait until we leave /login (any post-login destination).
    await page.waitForURL((url) => !/\/login(\?|$)/.test(url.pathname), {
      timeout: 20_000,
    });
  });

  for (const path of ROUTES) {
    test(`${path} loads as advisor (no blank screen, stays on route)`, async ({
      page,
    }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response!.status()).toBeLessThan(500);

      // Should not be bounced to /login while authenticated.
      await page.waitForTimeout(1500);
      expect(new URL(page.url()).pathname).toBe(path);

      await assertNotBlank(page);
      // SiteHeader/SiteFooter render on both pages → at least one <header> + <footer>.
      await expect(page.locator("header").first()).toBeVisible();

      expect(pageErrors).toEqual([]);
    });
  }
});
