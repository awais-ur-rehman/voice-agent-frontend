import { expect, test, type Page } from "@playwright/test";
import {
  agent,
  draft,
  version,
  voices,
} from "../src/features/agents/fixtures.test-support";

// Every API response is synthetic. A route outside the local fixture is blocked.
const apiOrigin = "http://localhost:8000";
const hostile =
  "<script>fixture-private@example.test</script> https://example.test/?sig=fixture-private";
const email = "synthetic@example.test";
const password = "synthetic-fixture-password";
const tokens = {
  access_token: "synthetic-fixture-access",
  refresh_token: "synthetic-fixture-refresh",
  expires_in: 300,
};

async function install(page: Page, appOrigin: string) {
  const counts = { login: 0, start: 0, refresh: 0 };
  const startKeys: (string | undefined)[] = [];
  const unexpected: string[] = [];
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => consoleMessages.push(message.text()));
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const headers = {
    "Access-Control-Allow-Origin": appOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, Idempotency-Key",
    "Access-Control-Expose-Headers": "Retry-After",
    "Cache-Control": "no-store",
  };
  const editor = `/dashboard/agents/${agent.id}`;
  await page.route("**/*", async (route) => {
    const { origin, pathname } = new URL(route.request().url());
    if (origin === appOrigin) return route.continue();
    if (origin !== apiOrigin) {
      unexpected.push(origin);
      return route.abort();
    }
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ status: 204, headers });

    const success = (json: unknown) =>
      route.fulfill({ status: 200, headers, json });
    const failure = (
      status: number,
      code: string,
      retry?: string,
      message = hostile,
    ) =>
      route.fulfill({
        status,
        headers: retry ? { ...headers, "Retry-After": retry } : headers,
        json: {
          error: { code, message, details: { fields: { [hostile]: hostile } } },
        },
      });
    switch (pathname) {
      case "/auth/login":
        return ++counts.login === 1
          ? failure(429, "rate_limited", "1")
          : success(tokens);
      case "/auth/refresh":
        counts.refresh++;
        return failure(429, "rate_limited", "5");
      case "/auth/me":
        return success({
          id: "synthetic-staff",
          tenant_id: "synthetic-clinic",
          email,
          role: "owner",
        });
      case "/dashboard/clinic":
        return success({
          name: "Synthetic clinic · مصنوعی کلینک",
          timezone: "Asia/Karachi",
        });
      case "/dashboard/setup":
        return success({
          profile: true,
          providers: true,
          services: true,
          hours: true,
          agent: true,
        });
      case "/dashboard/agents":
        return success([agent]);
      case "/dashboard/voices":
        return success(voices);
      case editor:
        return success(agent);
      case `${editor}/draft`:
        return success(draft);
      case `${editor}/versions`:
        return success([version]);
      case `${editor}/tests`:
        startKeys.push(route.request().headers()["idempotency-key"]);
        switch (++counts.start) {
          case 1:
            return failure(503, "service_draining", "3");
          case 2:
            return failure(
              503,
              "service_draining",
              "1, 2",
              hostile + "ی".repeat(9000),
            );
          default:
            return failure(401, "unauthorized");
        }
      default:
        unexpected.push(pathname);
        return failure(404, "not_found");
    }
  });
  return { counts, startKeys, unexpected, consoleMessages, pageErrors };
}

for (const width of [1440, 390]) {
  test(`safe manual retry notices and session fencing at ${width}px`, async ({
    page,
    baseURL,
  }, info) => {
    const fixture = await install(page, new URL(baseURL!).origin);
    await page.clock.install();
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/agents/${agent.id}`);
    const emailField = page.getByLabel("Email *");
    const signIn = page.getByRole("button", { name: "Sign in", exact: true });
    await emailField.focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password *")).toBeFocused();
    await emailField.fill(email);
    await page.getByLabel("Password *").fill(password);
    await page.keyboard.press("Enter");
    const loginWait = page
      .getByRole("alert")
      .filter({ hasText: "Too many requests." });
    await expect(loginWait).toHaveText(
      "Too many requests. Wait 1 second before trying again.",
    );
    await expect(loginWait).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(emailField).toBeFocused();
    await loginWait.focus();

    async function checkBoundary() {
      await expect(page.locator("body")).not.toContainText("fixture-private");
      await expect(page.locator("body")).not.toContainText(
        "synthetic-fixture-access",
      );
      expect(
        await page.evaluate(async () => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          local: localStorage.length,
          session: sessionStorage.length,
          cookies: document.cookie,
          cache: (await caches.keys()).length,
          databases: (await indexedDB.databases()).length,
        })),
      ).toEqual({
        overflow: false,
        local: 0,
        session: 0,
        cookies: "",
        cache: 0,
        databases: 0,
      });
      expect(await page.context().cookies()).toEqual([]);
    }

    await checkBoundary();
    await page.screenshot({ path: info.outputPath("sign-in-rate-limit.png") });
    await page.clock.runFor(1100);
    expect(fixture.counts).toEqual({ login: 1, start: 0, refresh: 0 });
    await signIn.click();

    const start = page.getByRole("button", { name: "Start isolated test" });
    await expect(page.getByLabel("Urdu greeting")).toHaveValue("السلام علیکم");
    await expect(page.getByLabel("Urdu greeting")).toHaveAttribute(
      "dir",
      "auto",
    );
    await start.focus();
    await page.keyboard.press("Enter");
    const drain = page
      .getByRole("alert")
      .filter({ hasText: "pausing new sessions" });
    await expect(drain).toHaveText(
      "The service is pausing new sessions. Wait 3 seconds before trying again.",
    );
    await expect(drain).toBeFocused();
    await checkBoundary();
    await drain.evaluate((alert) => alert.scrollIntoView({ block: "center" }));
    await expect(drain).toBeInViewport({ ratio: 1 });
    const [buttonBox, alertBox] = await Promise.all([
      start.boundingBox(),
      drain.boundingBox(),
    ]);
    expect(
      alertBox!.y - (buttonBox!.y + buttonBox!.height),
    ).toBeGreaterThanOrEqual(12);
    await page.screenshot({ path: info.outputPath("session-drain.png") });
    await page.clock.runFor(3100);
    expect(fixture.counts).toEqual({ login: 2, start: 1, refresh: 0 });

    await start.click();
    const oversized = page
      .getByRole("alert")
      .filter({ hasText: "Could not start the isolated test." });
    await expect(oversized).toBeFocused();
    await expect(oversized).toHaveText(
      "Could not start the isolated test. Retry uses the same request.",
    );
    await checkBoundary();
    expect(fixture.counts).toEqual({ login: 2, start: 2, refresh: 0 });

    await start.click();
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(loginWait).toHaveText(
      "Too many requests. Wait 5 seconds before trying again.",
    );
    await expect(loginWait).toBeFocused();
    await expect(emailField).toBeEmpty();
    await expect(page.getByLabel("Password *")).toBeEmpty();
    await checkBoundary();
    await page.screenshot({ path: info.outputPath("refresh-rate-limit.png") });
    await page.clock.runFor(5100);
    expect(fixture.counts).toEqual({ login: 2, start: 3, refresh: 1 });
    expect(fixture.startKeys[0]).toBeTruthy();
    expect(new Set(fixture.startKeys).size).toBe(1);
    expect(fixture.unexpected).toEqual([]);
    expect(fixture.pageErrors).toEqual([]);
    expect(fixture.consoleMessages.join("\n")).not.toMatch(
      /fixture-private|synthetic@example\.test|synthetic-fixture-(password|access|refresh)/,
    );
  });
}
