import { test, expect } from "@playwright/test";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Explicit local operator checkpoint only. CI and ordinary fixture runs never read private files.
const enabled = process.env.PHASE6_LOCAL_DEMO === "1";
test("actual local dental analytics uses the API and retains no transcript", async ({
  page,
  baseURL,
}, info) => {
  test.skip(
    !enabled,
    "Opt in with PHASE6_LOCAL_DEMO=1 for the local synthetic API checkpoint",
  );
  const base = new URL(baseURL!);
  expect(["127.0.0.1", "localhost"]).toContain(base.hostname);
  expect(base.protocol).toBe("http:");
  expect(base.port).toBe("5176");
  const credentialPath = resolve("../backend/.local/dental-demo.json");
  expect(statSync(credentialPath).mode & 0o777).toBe(0o600);
  const demo = JSON.parse(readFileSync(credentialPath, "utf8"));
  expect(demo.tenant_id).toBe("05221b2a-0715-4d8a-8d9a-73db841bd7c0");
  expect(demo.agent_id).toBe("b58048f7-bec7-446a-926f-d6e0813743a7");
  expect(demo.clinic_name).toBe("Pearl Dental Studio — Demo");
  const proof = JSON.parse(
    readFileSync(resolve("../backend/.local/phase6/demo-proof.json"), "utf8"),
  );
  expect(proof.tenant_id).toBe(demo.tenant_id);
  expect(proof.sessions.length).toBeGreaterThanOrEqual(4);
  expect(proof.overview.voice_sessions).toBe(0);
  const errors: string[] = [],
    consoleProblems: string[] = [],
    unexpectedMutations: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type()))
      consoleProblems.push(`${m.text()} @ ${m.location().url}`);
  });
  // Observe only: no route interception or fake responses. After login this checkpoint is read-only.
  let signedIn = false;
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (
      signedIn &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(r.method()) &&
      !["/auth/refresh", "/auth/logout"].includes(u.pathname)
    )
      unexpectedMutations.push(`${r.method()} ${u.pathname}`);
    if (
      ["http:", "https:"].includes(u.protocol) &&
      !["127.0.0.1", "localhost"].includes(u.hostname)
    )
      errors.push("Non-loopback request attempted");
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    `/analytics?start=${proof.local_date}&end=${proof.local_date}`,
  );
  // Check the actual served API origin before putting credentials into the form.
  const apiURL = new URL(
    await page.evaluate(async () => {
      const modulePath = "/src/api/client.ts";
      return (await import(modulePath)).API_URL as string;
    }),
  );
  expect(["127.0.0.1", "localhost"]).toContain(apiURL.hostname);
  expect(apiURL.protocol).toBe("http:");
  expect(apiURL.port).toBe("8000");
  expect(apiURL.pathname).toBe("/");
  expect(apiURL.username + apiURL.password + apiURL.search + apiURL.hash).toBe(
    "",
  );
  await page.getByLabel("Email *").fill(demo.email);
  await page.getByLabel("Password *").fill(demo.password);
  const meResponse = page.waitForResponse(
    (r) => r.url() === `${apiURL.origin}/auth/me`,
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const me = await (await meResponse).json();
  expect(me.tenant_id).toBe(demo.tenant_id);
  signedIn = true;
  await page.getByLabel("From", { exact: true }).fill(proof.local_date);
  await page.getByLabel("Through", { exact: true }).fill(proof.local_date);
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`start=${proof.local_date}`));
  await expect(
    page.getByText(`0 voice · ${proof.overview.text_sessions} text`, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(demo.clinic_name, { exact: true })).toBeVisible();
  await expect(page.locator(".analytics-usage > strong")).toHaveText("Unknown");
  const speech = page.getByRole("row").filter({
    has: page.getByRole("cell", { name: "STT completion", exact: true }),
  });
  await expect(speech).toContainText("0 / 0");
  await expect(speech).toContainText("Unknown");
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("actual-dental-analytics.png"),
    fullPage: true,
  });
  const identity = proof.sessions.find(
    (s: { kind: string }) => s.kind === "english_info",
  ).session_id;
  await page
    .getByRole("link", { name: "Calls & sessions", exact: true })
    .click();
  await page.locator(`a[href="/calls/${identity}"]`).click();
  await expect(
    page.getByRole("heading", { name: "Session review" }),
  ).toBeVisible();
  await expect(page.getByText("Text · English", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Information only", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check protected transcript", exact: true })
    .click();
  await expect(page.locator(".protected-transcript")).toContainText(
    "Capture was off when this session started.",
  );
  await expect(page.locator(".analytics-transcript li")).toHaveCount(0);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("actual-dental-call-detail.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(() => ({
      local: Object.keys(localStorage),
      session: Object.keys(sessionStorage),
    })),
  ).toEqual({ local: [], session: [] });
  const consolePath = info.outputPath("actual-console.json");
  writeFileSync(
    consolePath,
    JSON.stringify({ errors, consoleProblems, unexpectedMutations }, null, 2),
    { mode: 0o600 },
  );
  await info.attach("actual-console.json", {
    path: consolePath,
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
  expect(consoleProblems).toEqual([]);
  expect(unexpectedMutations).toEqual([]);
});
