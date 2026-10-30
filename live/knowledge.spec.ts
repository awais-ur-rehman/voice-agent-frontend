import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

test.skip(
  process.env.PHASE5_LIVE_QA !== "1",
  "Explicit local live QA opt-in required",
);

// Separate opt-in suite. Never collected by the default browser/CI configuration.
test("live synthetic clinic uploads and replaces exact bytes without processing", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const path = process.env.PHASE5_QA_CREDENTIALS;
  if (!path) throw new Error("Supply the private synthetic QA credential file");
  const qa = JSON.parse(await readFile(path, "utf8"));
  if (
    qa.clinic_name !== "QA Crescent Clinic" ||
    !/^qa-phase[45]-.*@example\.com$/.test(qa.email) ||
    !qa.agent_id
  ) {
    throw new Error("Only the designated synthetic QA clinic is permitted");
  }
  await page.goto("/login");
  await page.getByLabel("Email", { exact: false }).fill(qa.email);
  await page.getByLabel("Password", { exact: false }).fill(qa.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("banner")).toContainText("QA Crescent Clinic");
  await page.getByRole("link", { name: "Agents", exact: true }).click();
  await page
    .getByRole("link", { name: "QA Crescent Reception", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/agents/${qa.agent_id}$`));
  await page.getByRole("button", { name: "Knowledge", exact: true }).click();
  await expect(
    page.getByText("Processing unavailable", { exact: true }),
  ).toBeVisible();
  const name = `QA Live Upload ${Date.now()}`;
  await page.getByRole("button", { name: "Add source", exact: true }).click();
  await page.getByLabel("Source type", { exact: true }).selectOption("file");
  await page.getByLabel("Source name", { exact: true }).fill(name);
  const original = Buffer.from(
    "Synthetic QA guide: bicycle parking is beside the blue gate.\n",
  );
  const replacement = Buffer.from(
    "Synthetic QA guide: bicycle parking is beside the green gate.\n",
  );
  await page.getByLabel("Source file", { exact: true }).setInputFiles({
    name: "qa-guide.txt",
    mimeType: "text/plain",
    buffer: original,
  });
  const uploaded = page.waitForResponse(
    (r) =>
      r.url().includes("/knowledge/sources/upload") &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  const response = await uploaded;
  expect(response.status()).toBe(201);
  expect(response.request().headers()["content-type"]).toBe(
    "application/octet-stream",
  );
  expect(response.request().headers()["x-content-sha256"]).toBe(
    createHash("sha256").update(original).digest("hex"),
  );
  // Chromium may omit a Blob body from request inspection; server validates its SHA256 before 201.
  const source = await response.json();
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toContainText("revision 1");
  await expect(row).toContainText("Queued");
  await row.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Source name", { exact: true })).toHaveValue(
    name,
  );
  await page.getByLabel("Replacement file", { exact: true }).setInputFiles({
    name: "qa-replacement.txt",
    mimeType: "text/plain",
    buffer: replacement,
  });
  const replaced = page.waitForResponse(
    (r) =>
      r.url().includes(`/sources/${source.id}/content`) &&
      r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Save source", exact: true }).click();
  const updated = await replaced;
  expect(updated.status()).toBe(200);
  // Disk-byte proof is checked independently against the private API blob after this flow.
  expect(updated.request().headers()["x-content-sha256"]).toBe(
    createHash("sha256").update(replacement).digest("hex"),
  );
  await expect(row).toContainText("revision 2");
  await expect(row).toContainText("Not available for answers");
  await writeFile(
    testInfo.outputPath("live-source-proof.json"),
    JSON.stringify({
      source_id: source.id,
      name,
      sha256: createHash("sha256").update(replacement).digest("hex"),
      bytes: replacement.length,
    }),
  );
  await page.screenshot({
    path: testInfo.outputPath("live-upload-replaced.png"),
    fullPage: true,
  });
  await row.getByRole("button", { name: "Delete", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await expect(row).toHaveCount(0);
  console.log(
    "LIVE QA: upload 201, replacement 200, SHA256 headers, queued revision 2, delete removed row; no model execution.",
  );
});
