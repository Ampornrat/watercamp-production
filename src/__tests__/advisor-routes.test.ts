import { describe, it, expect } from "vitest";

/**
 * Smoke test: these route modules previously broke the dev/SSR build
 * with `SyntaxError: Unexpected token (77:2)` from the TanStack router
 * code-splitter's babel parser (triggered by TS non-null assertions like
 * `instAdvisorEmails!` used as arguments to .in()/.eq()).
 *
 * If either module fails to parse/evaluate, the dynamic import here
 * throws and the test fails — catching a blank-screen regression
 * before it ships.
 */
describe("advisor route modules load without parser errors", () => {
  it("loads /advisor/dashboard route module", async () => {
    const mod = await import("../routes/advisor.dashboard");
    expect(mod.Route).toBeDefined();
    expect(mod.Route.id ?? mod.Route.fullPath ?? "/advisor/dashboard").toContain(
      "advisor/dashboard",
    );
  });

  it("loads /advisor/queue route module", async () => {
    const mod = await import("../routes/advisor.queue");
    expect(mod.Route).toBeDefined();
    expect(mod.Route.id ?? mod.Route.fullPath ?? "/advisor/queue").toContain(
      "advisor/queue",
    );
  });

  it("loads /advisor/register route module", async () => {
    const mod = await import("../routes/advisor.register");
    expect(mod.Route).toBeDefined();
  });

  it("advisor.dashboard source contains no TS non-null assertions on query args", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const src = await fs.readFile(
      path.resolve(process.cwd(), "src/routes/advisor.dashboard.tsx"),
      "utf8",
    );
    // These patterns previously crashed the router code-splitter parser.
    expect(src).not.toMatch(/instAdvisorEmails!\)/);
    expect(src).not.toMatch(/advisor!\.institute_id!/);
  });
});
