import { test, expect, type Page, type TestInfo } from "@playwright/test";
import {
  analyticsFixture,
  id,
  secondId,
  transcript,
} from "../src/features/analytics/fixtures.test-support";
// Synthetic public fixtures only. This suite is not deployed API/worker or voice evidence.
async function install(
  page: Page,
  mode: Parameters<typeof analyticsFixture>[0] = "populated",
) {
  const fixture = analyticsFixture(mode);
  const errors: string[] = [],
    consoleProblems: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      consoleProblems.push(m.text());
  });
  const pending = { blockText: false, release: () => {} };
  await page.route("http://localhost:8000/**", async (route) => {
    const r = route.request();
    const response = fixture.handle(
      r.url(),
      r.method(),
      r.postData() ? r.postDataJSON() : undefined,
      new Headers(r.headers()),
    );
    if (pending.blockText && new URL(r.url()).pathname.endsWith("/transcript"))
      await new Promise<void>((resolve) => {
        pending.release = resolve;
      });
    if (response.status === 204) await route.fulfill({ status: 204, body: "" });
    else await route.fulfill({ status: response.status, json: response.body });
  });
  return { ...fixture, errors, consoleProblems, pending };
}
async function signIn(page: Page) {
  await page.getByLabel("Email *").fill("synthetic@example.test");
  await page.getByLabel("Password *").fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function open(page: Page, path: string) {
  await page.goto(path);
  await signIn(page);
}
async function capture(
  page: Page,
  info: TestInfo,
  name: string,
  width: number,
) {
  await page.setViewportSize({ width, height: 1000 });
  await page.evaluate(async () => {
    scrollTo(0, 0);
    await document.fonts.ready;
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  if (width === 390)
    expect(
      await page
        .locator("main")
        .evaluate((n) => getComputedStyle(n).paddingLeft),
    ).toBe("16px");
  const targets = await page
    .locator(
      ".analytics-workspace button:visible, .analytics-workspace input:visible, .analytics-workspace select:visible, .analytics-workspace a.button:visible",
    )
    .evaluateAll((nodes) => nodes.map((n) => n.getBoundingClientRect().height));
  expect(targets.every((n) => n >= 44)).toBe(true);
  await page.screenshot({
    path: info.outputPath(`${name}-${width}.png`),
    fullPage: true,
  });
}
test("compact analytic figures, exact coverage and UTC hour alternatives at 1440/1024/390", async ({
  page,
}, info) => {
  const f = await install(page);
  await open(page, "/analytics?start=2026-11-02&end=2026-11-08");
  await expect(
    page.getByText("Production sessions · draft tests excluded", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("1 voice · 2 text")).toBeVisible();
  await expect(page.getByText("< USD 0.000001", { exact: true })).toBeVisible();
  await expect(page.getByText("0% · 0 / 2", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Unknown · 0 / 0", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Unattributed queue work")).toBeVisible();
  await expect(
    page.getByText("Oldest queued: 16m 40s · 1 queued job"),
  ).toBeVisible();
  for (const width of [1440, 1024, 390])
    await capture(page, info, "analytics", width);
  const hour = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Peak hours", exact: true }),
  });
  await hour.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(
    hour.getByRole("cell", { name: "2026-11-08 05:00:00 UTC", exact: true }),
  ).toBeVisible();
  expect(f.errors).toEqual([]);
  expect(f.consoleProblems).toEqual([]);
});
test("call seek, call-only filters, routed detail and Back retain focus/context", async ({
  page,
}, info) => {
  const f = await install(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, "/calls?start=2026-11-02&end=2026-11-08");
  await expect(page.getByText("1 on this page · 2 matching")).toBeVisible();
  await expect(
    page.getByText("Production sessions · draft tests excluded", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText("Duration: 12s", { exact: true })).toBeVisible();
  for (const width of [1440, 1024, 390]) {
    await expect(
      page.getByText("Duration: 12s", { exact: true }),
    ).toBeVisible();
    await capture(page, info, "calls", width);
  }
  await expect(
    page.getByRole("link", { name: `Review session ${id}`, exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page).toHaveURL(/after=call-next/);
  const review = page.getByRole("link", {
    name: `Review session ${secondId}`,
    exact: true,
  });
  await review.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Session review", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole("row", { name: /7 Command total 123 ms/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next events", exact: true }).click();
  await expect(page.getByText("Book appointment · Success")).toBeVisible();
  await page
    .getByRole("button", { name: "Next measurements", exact: true })
    .click();
  await expect(page.getByRole("row", { name: /9 Tool 80 ms/ })).toBeVisible();
  const detailRequests = f.state.requests.filter(
    (r) =>
      r.path.startsWith("/dashboard/calls/") && !r.path.endsWith("/transcript"),
  );
  expect(detailRequests.at(-1)!.query).toContain(
    "measurement_after=measurement-next",
  );
  expect(detailRequests.at(-1)!.query).toContain("after=7");
  await page.getByRole("link", { name: "Back to calls", exact: true }).click();
  await expect(page).toHaveURL(/after=call-next/);
  await expect(review).toBeFocused();
  await page.getByLabel("Outcome", { exact: true }).selectOption("error");
  await page.getByLabel("Review flag", { exact: true }).selectOption("handoff");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page.getByText("No sessions match these filters."),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.has("after")).toBe(false);
  expect(f.errors).toEqual([]);
  expect(f.consoleProblems).toEqual([]);
});
test("manager protected bilingual text, bounded pages, keyboard deletion and no stale text flash", async ({
  page,
}, info) => {
  const f = await install(page);
  f.state.transcript = structuredClone(transcript);
  f.state.call.privacy.reason = "captured";
  f.state.settings.capture_enabled = true;
  await open(page, `/calls/${id}`);
  await expect(
    page.getByRole("heading", { name: "Session review", exact: true }),
  ).toBeVisible();
  expect(f.state.requests.some((r) => r.path.endsWith("/transcript"))).toBe(
    false,
  );
  await page
    .getByRole("button", { name: "Check protected transcript", exact: true })
    .click();
  await expect(page.getByText(/مصنوعی ملاقات چاہیے/)).toHaveAttribute(
    "dir",
    "auto",
  );
  await expect(page.locator("main script")).toHaveCount(0);
  await expect(page.getByText("2 on page · 3 retained messages")).toBeVisible();
  for (const width of [1440, 1024, 390])
    await capture(page, info, "protected-detail", width);
  await page
    .getByRole("button", { name: "Next text page", exact: true })
    .click();
  await expect(
    page.getByText("Final synthetic reply.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete transcript", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Delete transcript", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Delete transcript", exact: true })
    .click();
  await page.evaluate(() => {
    const node = document.querySelector(".protected-transcript")!;
    (window as unknown as { staleText: boolean }).staleText = false;
    let hidden = false;
    new MutationObserver(() => {
      if (!node.textContent?.includes("Final synthetic reply.")) hidden = true;
      if (hidden && node.textContent?.includes("Final synthetic reply."))
        (window as unknown as { staleText: boolean }).staleText = true;
    }).observe(node, { childList: true, subtree: true, characterData: true });
  });
  await page
    .getByRole("button", { name: "Confirm transcript deletion", exact: true })
    .click();
  await expect(page.locator(".protected-transcript")).toContainText(
    "This transcript was deleted.",
  );
  await expect(
    page.getByText("Final synthetic reply.", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Close protected transcript", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  const reopenedTrigger = page.getByRole("button", {
    name: "Check protected transcript",
    exact: true,
  });
  await expect(reopenedTrigger).toBeFocused();
  await page.screenshot({
    path: info.outputPath("closed-transcript-focus-390.png"),
    fullPage: false,
  });
  await page.keyboard.press("Enter");
  await expect(page.locator(".protected-transcript")).toContainText(
    "This transcript was deleted.",
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { staleText: boolean }).staleText,
    ),
  ).toBe(false);
  await capture(page, info, "deleted-detail", 390);
  expect(f.errors).toEqual([]);
  expect(f.consoleProblems).toEqual([]);
});
test("default-off settings, consent/retention warnings and staff account switch reject late manager response", async ({
  page,
}, info) => {
  const f = await install(page);
  await open(page, "/analytics?start=2026-11-02&end=2026-11-08");
  await page
    .getByRole("button", { name: "Capture settings", exact: true })
    .click();
  await expect(
    page.getByLabel("Enable capture for new sessions", { exact: true }),
  ).not.toBeChecked();
  await expect(page.getByRole("dialog")).toContainText(
    "separate caller recording consent",
  );
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.screenshot({
    path: info.outputPath("capture-settings-390.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Capture settings", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Toggle navigation", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Calls & sessions", exact: true })
    .click();
  await page
    .getByRole("link", { name: `Review session ${id}`, exact: true })
    .click();
  f.state.transcript = structuredClone(transcript);
  f.state.call.privacy.reason = "captured";
  f.state.settings.capture_enabled = true;
  f.pending.blockText = true;
  await page
    .getByRole("button", { name: "Check protected transcript", exact: true })
    .click();
  await expect(page.locator(".protected-transcript")).toContainText("Loading");
  const managerReads = f.state.requests.filter((r) =>
    r.path.endsWith("/transcript"),
  ).length;
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  f.state.role = "staff";
  f.state.account = 2;
  await signIn(page);
  f.pending.blockText = false;
  f.pending.release();
  await expect(
    page.getByText(/Transcript access is limited to owners and admins/),
  ).toBeVisible();
  await expect(page.getByText(/مصنوعی ملاقات چاہیے/)).toHaveCount(0);
  expect(
    f.state.requests.filter((r) => r.path.endsWith("/transcript")),
  ).toHaveLength(managerReads);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await capture(page, info, "staff-detail", 390);
  expect(f.errors).toEqual([]);
  expect(f.consoleProblems).toEqual([]);
});
test("empty cohorts show unknown rates and no invented usage or overflow", async ({
  page,
}, info) => {
  const f = await install(page, "empty");
  await open(page, "/analytics?start=2026-11-02&end=2026-11-08");
  await expect(page.getByText("0 voice · 0 text")).toBeVisible();
  await expect(page.locator(".analytics-usage > strong")).toHaveText("Unknown");
  await expect(page.getByText("USD 0", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/group limit/)).toHaveCount(0);
  await expect(page.getByText(/More than 100,000 samples/)).toHaveCount(0);
  expect(f.state.overview.usage.invocations).toBe(0);
  expect(f.state.quality.task_completion.denominator).toBe(0);
  await capture(page, info, "empty-analytics", 390);
  await page.getByLabel("From", { exact: true }).fill("2026-09-01");
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(
    page.getByText("Choose at most 31 inclusive dates.", { exact: true }),
  ).toBeVisible();
  expect(f.errors).toEqual([]);
  expect(f.consoleProblems).toEqual([]);
});
test("configured zero USD rates remain a known zero in a nonempty cohort", async ({
  page,
}, info) => {
  const f = await install(page, "zero_cost");
  await open(page, "/analytics");
  await expect(page.getByText("1 voice · 2 text")).toBeVisible();
  await expect(page.locator(".analytics-usage > strong")).toHaveText("USD 0");
  await expect(page.getByText(/3 \/ 3 priced invocations/)).toBeVisible();
  await expect(page.getByText(/Partial cost coverage/)).toHaveCount(0);
  await capture(page, info, "known-zero-cost", 390);
  expect(f.errors).toEqual([]);
  expect(f.consoleProblems).toEqual([]);
});
test("hourly overflow preserves complete nonempty totals without drawing a truncated series", async ({
  page,
}, info) => {
  const f = await install(page, "hourly_limit");
  await open(page, "/analytics");
  await expect(page.getByText("1001 voice · 1000 text")).toBeVisible();
  await expect(page.getByText(/more than the 2000 group limit/)).toBeVisible();
  expect(
    f.state.overview.days.reduce((sum, day) => sum + day.sessions, 0),
  ).toBe(2001);
  expect(f.state.overview.timezones.length * 7 * 24 * 2).toBeGreaterThan(2000);
  await capture(page, info, "hourly-limit", 390);
  expect(f.errors).toEqual([]);
  expect(f.consoleProblems).toEqual([]);
});
test("raw sample overflow stays unavailable for a nonempty measured cohort", async ({
  page,
}, info) => {
  const f = await install(page, "sample_limit");
  await open(page, "/analytics");
  await expect(page.getByText("1001 voice · 1000 text")).toBeVisible();
  await expect(
    page.getByText("Timing data unavailable: More than 100,000 samples."),
  ).toBeVisible();
  await expect(page.getByText(/more than the 2000 group limit/)).toHaveCount(0);
  expect(
    f.state.overview.hours.items.reduce((sum, hour) => sum + hour.sessions, 0),
  ).toBe(2001);
  await capture(page, info, "sample-limit", 390);
  expect(f.errors).toEqual([]);
  expect(f.consoleProblems).toEqual([]);
});
