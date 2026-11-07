import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import {
  knowledgeFixture,
  source,
} from "../src/features/knowledge/fixtures.test-support";
// All endpoints are intercepted. These fixtures demonstrate UI control, not model readiness.
async function install(page: Page) {
  const fixture = knowledgeFixture();
  const failures = { expire: false };
  let authGeneration = 0;
  const uploads: {
    bytes: Buffer;
    checksum?: string;
    key?: string;
    url: string;
    authorization?: string;
  }[] = [];
  const errors: string[] = [],
    consoleProblems: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error")
      consoleProblems.push(message.text());
  });
  await page.route("http://localhost:8000/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    if (
      failures.expire &&
      (path.endsWith("/upload") || path === "/auth/refresh")
    ) {
      await route.fulfill({
        status: 401,
        json: { error: { code: "expired", message: "Sign-in expired" } },
      });
      return;
    }
    const binary =
      request.headers()["content-type"] === "application/octet-stream";
    if (binary)
      uploads.push({
        bytes: request.postDataBuffer()!,
        checksum: request.headers()["x-content-sha256"],
        key: request.headers()["idempotency-key"],
        url: request.url(),
        authorization: request.headers()["authorization"],
      });
    const response = fixture.handle(
      request.url(),
      request.method(),
      binary
        ? new Blob([request.postDataBuffer()!])
        : request.postData()
          ? request.postDataJSON()
          : undefined,
      new Headers(request.headers()),
    );
    if (path === "/auth/login") {
      authGeneration++;
      response.body = {
        access_token: `synthetic-access-${authGeneration}`,
        refresh_token: `synthetic-refresh-${authGeneration}`,
        expires_in: 300,
      };
    }
    if (path === "/auth/me")
      response.body = {
        id: `staff-${authGeneration}`,
        tenant_id: `clinic-${authGeneration}`,
        role: "owner",
        email: "synthetic@example.test",
      };
    await route.fulfill({ status: response.status, json: response.body });
  });
  return { ...fixture, uploads, failures, errors, consoleProblems };
}
async function signIn(page: Page) {
  await page.getByLabel("Email *").fill("synthetic@example.test");
  await page.getByLabel("Password *").fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function openKnowledge(page: Page) {
  await page.goto("/");
  await signIn(page);
  await page.getByRole("link", { name: "Agents", exact: true }).click();
  await page.getByRole("link", { name: "Reception", exact: true }).click();
  await page.getByRole("button", { name: "Knowledge", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Knowledge sources" }),
  ).toBeVisible();
}
test("binary bytes, canceled picker, exact retry, Back and native unload, auth reset", async ({
  page,
}) => {
  const fixture = await install(page);
  await openKnowledge(page);
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page.getByLabel("Source type").selectOption("file");
  await page.getByLabel("Source name", { exact: true }).fill("Synthetic bytes");
  const bytes = Buffer.from([0, 255, 128, 65, 10, 66]);
  await page.getByLabel("Source file", { exact: true }).setInputFiles({
    name: "synthetic.txt",
    mimeType: "text/plain",
    buffer: bytes,
  });
  await page.getByLabel("Source file", { exact: true }).setInputFiles([]);
  await expect(
    page.getByText("Selected: synthetic.txt · 6 bytes"),
  ).toBeVisible();
  fixture.state.writeFailure = 503;
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("outcome is unknown");
  expect(fixture.uploads).toHaveLength(1);
  expect(fixture.uploads[0]!.bytes.equals(bytes)).toBe(true);
  expect(fixture.uploads[0]!.checksum).toBe(
    createHash("sha256").update(bytes).digest("hex"),
  );
  await page.goBack();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(page.getByRole("dialog")).toContainText(
    "Resolve this operation before leaving",
  );
  await page.getByRole("button", { name: "Stay", exact: true }).click();
  const unload = page.waitForEvent("dialog");
  await page.evaluate(() => {
    setTimeout(() => window.location.reload(), 0);
  });
  const dialog = await unload;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.dismiss();
  await expect(page.getByRole("dialog")).toContainText("outcome is unknown");
  fixture.state.writeFailure = 0;
  await page
    .getByRole("button", { name: "Retry same operation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.uploads[1]).toEqual(fixture.uploads[0]);
  expect(fixture.uploads[0]!.authorization).toBe("Bearer synthetic-access-1");
  const fileRow = page.getByRole("row").filter({ hasText: "Synthetic bytes" });
  await fileRow.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Source name", { exact: true }).fill("Replaced bytes");
  const replacement = Buffer.from([255, 0, 42]);
  await page.getByLabel("Replacement file", { exact: true }).setInputFiles({
    name: "replacement.pdf",
    mimeType: "application/pdf",
    buffer: replacement,
  });
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.uploads[2]!.bytes.equals(replacement)).toBe(true);
  expect(fixture.uploads[2]!.checksum).toBe(
    createHash("sha256").update(replacement).digest("hex"),
  );
  expect(new URL(fixture.uploads[2]!.url).searchParams.get("revision")).toBe(
    "1",
  );
  expect(new URL(fixture.uploads[2]!.url).searchParams.get("format")).toBe(
    "pdf",
  );
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page.getByLabel("Source type").selectOption("file");
  await page
    .getByLabel("Source name", { exact: true })
    .fill("Auth-bound bytes");
  await page
    .getByLabel("Source file", { exact: true })
    .setInputFiles({ name: "auth.txt", mimeType: "text/plain", buffer: bytes });
  fixture.state.writeFailure = 503;
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("outcome is unknown");
  fixture.failures.expire = true;
  await page
    .getByRole("button", { name: "Retry same operation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  const beforeSignIn = fixture.uploads.length;
  fixture.failures.expire = false;
  await signIn(page);
  await page.getByRole("link", { name: "Agents", exact: true }).click();
  await page.getByRole("link", { name: "Reception", exact: true }).click();
  await page.getByRole("button", { name: "Knowledge", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(fixture.uploads).toHaveLength(beforeSignIn);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  expect(fixture.errors).toEqual([]);
  expect(
    fixture.consoleProblems.filter(
      (message) => !message.includes("Failed to load resource"),
    ),
  ).toEqual([]);
});
test("compact responsive source table, keyboard preview, Urdu provenance and cited test replies", async ({
  page,
}) => {
  const fixture = await install(page);
  await openKnowledge(page);
  await expect(page.getByText("Update failed", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Previous version available", { exact: true }),
  ).toBeVisible();
  for (const width of [1440, 1024, 390]) {
    await expect(page.locator("time")).toHaveText("29 Oct 2026, 10:00 UTC");
    await expect(page.locator("time")).toHaveAttribute(
      "datetime",
      source.updated_at,
    );
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
    if (width === 390)
      expect(
        await page
          .locator("main")
          .evaluate((node) => getComputedStyle(node).paddingLeft),
      ).toBe("16px");
    const targets = await page
      .locator(".knowledge-workspace button:visible")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().height),
      );
    expect(targets.every((height) => height >= 44)).toBe(true);
    await page.screenshot({
      path: `docs/evidence/phase-5-knowledge/sources-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Preview", exact: true }).focus();
  await page.keyboard.press("Enter");
  const preview = page.getByRole("dialog");
  await expect(preview.getByText(/محفوظ مصنوعی رہنما/)).toHaveAttribute(
    "dir",
    "auto",
  );
  await expect(preview).toContainText("<script>alert('escaped')</script>");
  await expect(preview.locator("script")).toHaveCount(0);
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('[role="dialog"]'),
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/evidence/phase-5-knowledge/urdu-preview-390.png",
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Preview", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Start isolated test", exact: true })
    .click();
  await page
    .getByLabel("Test message", { exact: true })
    .fill("When should I arrive?");
  await page
    .getByRole("button", { name: "Send test message", exact: true })
    .click();
  const citation = page.getByRole("region", {
    name: "Knowledge used in this reply",
    exact: true,
  });
  await expect(citation).toContainText(source.name);
  await expect(
    citation.getByText("اپنی ملاقات سے دس منٹ پہلے آئیں۔"),
  ).toHaveAttribute("dir", "auto");
  await citation.screenshot({
    path: "docs/evidence/phase-5-knowledge/cited-reply-390.png",
  });
  expect(fixture.errors).toEqual([]);
  expect(fixture.consoleProblems).toEqual([]);
});
test("protected edit conflict and deletion preserve parent drafts; direct knowledge route", async ({
  page,
}) => {
  const fixture = await install(page);
  await openKnowledge(page);
  await page.getByRole("button", { name: "General", exact: true }).click();
  await page
    .getByLabel("Agent name", { exact: true })
    .fill("Retained general draft");
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await page
    .getByLabel("English voice", { exact: true })
    .selectOption("en-male");
  await page.getByRole("button", { name: "Knowledge", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Source text", { exact: true })).toContainText(
    "محفوظ مصنوعی رہنما",
  );
  await page
    .getByLabel("Source text", { exact: true })
    .fill("Retained source edit");
  fixture.state.writeFailure = 409;
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(
    page.getByText("Source changed. Reload its revision."),
  ).toBeVisible();
  fixture.state.sources[0]!.revision = 8;
  await page
    .getByRole("button", {
      name: "Reload revision, keep my input",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("Source text", { exact: true })).toHaveValue(
    "Retained source edit",
  );
  fixture.state.writeFailure = 0;
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await expect(page.getByText("No knowledge sources yet.")).toBeVisible();
  expect(fixture.state.writes.at(-1)?.query).toBe("?revision=9");
  await page.getByRole("button", { name: "Voice", exact: true }).click();
  await expect(page.getByLabel("English voice", { exact: true })).toHaveValue(
    "en-male",
  );
  await page.getByRole("button", { name: "General", exact: true }).click();
  await expect(page.getByLabel("Agent name", { exact: true })).toHaveValue(
    "Retained general draft",
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sign in", exact: true }),
  ).toBeVisible();
  // Auth remains memory-only; a protected deep link resumes after sign-in.
  await page.goto("/agents/agent-one/knowledge");
  await signIn(page);
  await expect(
    page.getByRole("heading", { name: "Knowledge sources", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/agents\/agent-one\/knowledge$/);
  expect(fixture.errors).toEqual([]);
  expect(
    fixture.consoleProblems.filter(
      (message) => !message.includes("Failed to load resource"),
    ),
  ).toEqual([]);
});
test("source edit opening loads fresh content and initial detail errors offer visible recovery", async ({
  page,
}) => {
  const fixture = await install(page);
  await openKnowledge(page);
  fixture.state.detailFailure = 503;
  const edit = page.getByRole("button", { name: "Edit", exact: true });
  await edit.click();
  await expect(
    page.getByText("Source detail unavailable", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry source detail", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(edit).toBeFocused();
  await edit.click();
  await expect(
    page.getByText("Source detail unavailable", { exact: true }),
  ).toBeVisible();
  fixture.state.detailFailure = 0;
  await page
    .getByRole("button", { name: "Retry source detail", exact: true })
    .click();
  await expect(page.getByLabel("Source text", { exact: true })).toContainText(
    "محفوظ مصنوعی رہنما",
  );
  await page
    .getByLabel("Source text", { exact: true })
    .fill("Saved current content");
  await page
    .getByLabel("Source name", { exact: true })
    .fill("Saved current name");
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const readsBeforeOpen = fixture.state.detailReads;
  await edit.click();
  await expect(page.getByLabel("Source text", { exact: true })).toHaveValue(
    "Saved current content",
  );
  await expect(page.getByLabel("Source name", { exact: true })).toHaveValue(
    "Saved current name",
  );
  await expect(page.getByText(/Reviewed revision 4/)).toBeVisible();
  expect(fixture.state.detailReads).toBeGreaterThan(readsBeforeOpen);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(edit).toBeFocused();
  expect(fixture.errors).toEqual([]);
  expect(
    fixture.consoleProblems.filter(
      (message) => !message.includes("Failed to load resource"),
    ),
  ).toEqual([]);
});

test("failed-only sources show neutral availability and update time on narrow screens", async ({
  page,
}) => {
  const fixture = await install(page);
  Object.assign(fixture.state.sources[0]!, {
    available: false,
    active_generation_id: null,
    chunk_count: 0,
  });
  fixture.state.capabilities.query_available = false;
  fixture.state.capabilities.query_unavailable_reason = "processing_pending";
  await openKnowledge(page);
  await page.setViewportSize({ width: 390, height: 1000 });
  await expect(page.getByText("Failed", { exact: true })).toBeVisible();
  await expect(
    page.getByText("No processed knowledge is available. Check source status."),
  ).toBeVisible();
  await expect(page.locator("time")).toHaveText("29 Oct 2026, 10:00 UTC");
  await expect(
    page.getByText(/Knowledge is still processing|Checking processing status/),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "docs/evidence/phase-5-knowledge/failed-only-390.png",
    fullPage: true,
  });
  expect(fixture.errors).toEqual([]);
});
