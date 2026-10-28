import { test, expect } from "@playwright/test";
import {
  agent,
  draft,
  voices,
  version,
  testSnapshot,
} from "../src/features/agents/fixtures.test-support";
// Synthetic typed HTTP fixtures. This does not claim live backend/native speech acceptance.
test("agent editor responsive layouts, guarded publication, isolated text and unavailable speech", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) =>
    console.log("Browser console:", message.type(), message.text()),
  );
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame())
      console.log("Browser navigation:", frame.url());
  });
  let saved = structuredClone(draft),
    publishFails = true;
  let currentAgent = structuredClone(agent);
  const history = [structuredClone(version)];
  const publishRequests: { body: unknown; key: string | undefined }[] = [];
  await page.route("http://localhost:8000/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      method = request.method();
    let body: unknown = {};
    if (path === "/auth/login")
      body = {
        access_token: "synthetic-access",
        refresh_token: "synthetic-refresh",
        expires_in: 300,
      };
    else if (path === "/auth/me")
      body = {
        id: "staff-one",
        tenant_id: "clinic-one",
        email: "synthetic@example.test",
        role: "owner",
      };
    else if (path === "/dashboard/clinic")
      body = {
        name: "Synthetic clinic · مصنوعی کلینک",
        timezone: "Asia/Karachi",
      };
    else if (path === "/dashboard/setup")
      body = {
        profile: false,
        providers: false,
        services: false,
        hours: false,
        agent: true,
      };
    else if (path === "/dashboard/agents") body = [currentAgent];
    else if (path === "/dashboard/voices") body = voices;
    else if (path.endsWith("/draft")) {
      if (method === "PUT") {
        currentAgent = { ...currentAgent, draft_changed: true };
        saved = {
          ...request.postDataJSON(),
          updated_at: draft.updated_at,
          revision: saved.revision + 1,
        };
      }
      body = saved;
    } else if (path.endsWith("/versions")) body = history;
    else if (path.endsWith("/publish")) {
      publishRequests.push({
        body: request.postDataJSON(),
        key: request.headers()["idempotency-key"],
      });
      if (publishFails) {
        await route.fulfill({
          status: 503,
          json: {
            error: {
              code: "unavailable",
              message: "Fixture uncertain outcome",
            },
          },
        });
        return;
      }
      saved = { ...saved, revision: saved.revision + 1 };
      const published = {
        ...version,
        id: "version-two",
        number: 2,
        config: saved.config,
      };
      history.push(published);
      currentAgent = {
        ...currentAgent,
        name: saved.config.name ?? currentAgent.name,
        published_number: 2,
        active_version_id: published.id,
        draft_changed: false,
      };
      body = published;
    } else if (path.endsWith("/tests"))
      body = {
        ...testSnapshot,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        draft_revision: saved.revision,
      };
    else if (path.endsWith("/turns"))
      body = {
        id: testSnapshot.id,
        revision: 2,
        status: "active",
        messages: [
          { role: "user", text: request.postDataJSON().text },
          {
            role: "assistant",
            text: "مصنوعی کلینک میں ملاقات کا وقت دستیاب ہے۔ یہ صرف الگ ٹیسٹ ریکارڈ ہے۔",
          },
        ],
        tool_trace: [{ action: "find_slots", code: "available", ok: true }],
      };
    else if (path.endsWith("/end")) body = { ...testSnapshot, status: "ended" };
    else if (path.startsWith("/dashboard/agents/")) body = currentAgent;
    await route.fulfill({ status: 200, json: body });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByLabel("Email *").fill("synthetic@example.test");
  await page.getByLabel("Password *").fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Agents", exact: true }).click();
  await page.getByRole("link", { name: "Reception", exact: true }).click();
  await page
    .getByLabel("Agent name")
    .fill("Synthetic receptionist · مصنوعی معاون");
  await page
    .getByLabel("Urdu greeting")
    .fill(
      "السلام علیکم، یہ مصنوعی کلینک کا محفوظ ٹیسٹ ہے۔ میں ملاقات کی بکنگ میں آپ کی کیا مدد کر سکتا ہوں؟",
    );
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Preview unavailable" }),
  ).toHaveCount(2);
  await page.getByRole("button", { name: "General", exact: true }).click();
  await expect(page.getByLabel("Agent name")).toHaveValue(
    "Synthetic receptionist · مصنوعی معاون",
  );
  await page.getByRole("link", { name: "All agents" }).click();
  await expect(page.getByRole("dialog")).toContainText("unsaved");
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Saved draft · revision 8")).toBeVisible();
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(async () => {
      scrollTo(0, 0);
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `docs/evidence/task-6/agent-${width}.png`,
      fullPage: true,
    });
    if (width === 390) {
      const nameBox = await page.getByLabel("Agent name").boundingBox();
      console.log("Mobile agent name dimensions:", nameBox);
      expect(nameBox!.width).toBeGreaterThan(280);
      expect(nameBox!.height).toBeGreaterThanOrEqual(44);
      const buttons = await page
        .locator(".agent-tabs button")
        .evaluateAll((buttons) =>
          buttons.map((button) => button.getBoundingClientRect().height),
        );
      expect(buttons.every((height) => height >= 44)).toBe(true);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Changes from published version",
  );
  await expect(page.getByRole("dialog")).toContainText(
    "Synthetic receptionist",
  );
  await page.getByRole("button", { name: "Confirm publish" }).click();
  await expect(page.getByRole("dialog")).toContainText("outcome is unknown");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: "docs/evidence/task-6/publish-uncertain.png" });
  publishFails = false;
  await page.getByRole("button", { name: "Retry same operation" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(publishRequests[0]).toEqual(publishRequests[1]);
  await page.getByRole("button", { name: "Start isolated test" }).click();
  await expect(
    page.getByRole("button", { name: "Start voice", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("ASR and Urdu acceptance blocked."),
  ).toBeVisible();
  await page.getByLabel("Test message").fill("Show synthetic availability");
  await page.getByRole("button", { name: "Send test message" }).click();
  await expect(page.getByRole("log")).toContainText("مصنوعی کلینک");
  await page.getByText("Redacted tool decisions").click();
  await expect(
    page.getByText("find_slots · available · Succeeded"),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/evidence/task-6/isolated-text.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "End test", exact: true }).click();
  await expect(page.getByText("ended", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  console.log("Agent browser page errors:", errors);
  expect(errors).toEqual([]);
});
