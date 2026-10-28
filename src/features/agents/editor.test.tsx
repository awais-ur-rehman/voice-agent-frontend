import { StrictMode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../../app/auth";
import { routes } from "../../app/router";
import {
  agent,
  draft,
  voices,
  version,
  testSnapshot,
} from "./fixtures.test-support";
import type { DraftOut } from "../../api/dashboard.generated";
let saved: DraftOut;
let slowRefresh = false;
let failSave = 0,
  failPublish = 0;
let writes: { path: string; body: unknown; key: string | null }[];
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  saved = structuredClone(draft);
  slowRefresh = false;
  failSave = 0;
  failPublish = 0;
  writes = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const path = new URL(input).pathname,
        method = init.method ?? "GET";
      const body = init.body ? JSON.parse(String(init.body)) : undefined;
      if (method !== "GET")
        writes.push({
          path,
          body,
          key: new Headers(init.headers).get("Idempotency-Key"),
        });
      if (path === "/auth/login")
        return Response.json({
          access_token: "staff",
          refresh_token: "refresh",
          expires_in: 300,
        });
      if (path === "/auth/me")
        return Response.json({
          id: "staff-one",
          tenant_id: "clinic-one",
          email: "owner@example.test",
          role: "owner",
        });
      if (path === "/dashboard/clinic")
        return Response.json({ name: "Test clinic", timezone: "Asia/Karachi" });
      if (path === "/dashboard/setup")
        return Response.json({
          profile: false,
          providers: false,
          services: false,
          hours: false,
          agent: true,
        });
      if (path === "/dashboard/agents")
        return Response.json(
          method === "POST"
            ? { ...agent, id: "new-agent", name: body.name }
            : [agent],
        );
      if (path === "/dashboard/voices") return Response.json(voices);
      if (path.endsWith("/draft")) {
        if (method === "PUT") {
          if (failSave)
            return Response.json(
              {
                error: {
                  code: "revision_conflict",
                  message: "Draft changed. Review saved values.",
                },
              },
              { status: failSave },
            );
          saved = { ...saved, ...body, revision: saved.revision + 1 };
        }
        if (method === "GET" && slowRefresh)
          await new Promise((r) => setTimeout(r, 300));
        return Response.json(saved);
      }
      if (path.endsWith("/versions")) return Response.json([version]);
      if (path.endsWith("/publish")) {
        if (failPublish)
          return Response.json(
            { error: { code: "unavailable", message: "Try again" } },
            { status: failPublish },
          );
        saved = { ...saved, revision: saved.revision + 1 };
        return Response.json({ ...version, number: 2 });
      }
      if (path.endsWith("/rollback")) {
        saved = { ...saved, revision: saved.revision + 1 };
        return Response.json({
          ...version,
          number: 2,
          rollback_source_id: version.id,
        });
      }
      if (path.endsWith("/tests")) return Response.json(testSnapshot);
      if (path.startsWith("/dashboard/agents/"))
        return Response.json(
          method === "DELETE"
            ? { ...agent, enabled: false, archived_at: "2026-10-29T00:00:00Z" }
            : method === "PATCH"
              ? { ...agent, ...body }
              : agent,
        );
      return new Response(null, { status: 204 });
    }),
  );
});
async function setup() {
  const router = createMemoryRouter(routes, { initialEntries: ["/login"] });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <StrictMode>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </StrictMode>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email *"), "owner@example.test");
  await user.type(screen.getByLabelText("Password *"), "a-good-password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("heading", { name: "Set up your clinic" });
  await user.click(screen.getByRole("link", { name: "Agents" }));
  await user.click(await screen.findByRole("link", { name: "Reception" }));
  await screen.findByLabelText("Agent name");
  return { user, client, router };
}
it("retains dirty values and captured revision through tabs, refresh and conflicting save", async () => {
  const { user, client } = await setup();
  await user.clear(screen.getByLabelText("Agent name"));
  await user.type(screen.getByLabelText("Agent name"), "Edited");
  await user.click(screen.getByRole("button", { name: "Voice" }));
  await user.click(screen.getByRole("button", { name: "General" }));
  saved = {
    ...saved,
    revision: 9,
    config: { ...saved.config, name: "Remote" },
  };
  await client.invalidateQueries();
  expect(screen.getByLabelText("Agent name")).toHaveValue("Edited");
  failSave = 409;
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Draft changed. Review saved values.");
  expect(writes.find((w) => w.path.endsWith("/draft"))?.body).toMatchObject({
    revision: 7,
    config: { name: "Edited" },
  });
  expect(screen.getByLabelText("Agent name")).toHaveValue("Edited");
  await user.click(screen.getByRole("link", { name: "Patients" }));
  const dialog = await screen.findByRole("dialog");
  expect(
    within(dialog).getByText("Your unsaved changes will be discarded."),
  ).toBeInTheDocument();
  await user.click(within(dialog).getByRole("button", { name: "Stay" }));
  expect(screen.getByLabelText("Agent name")).toHaveValue("Edited");
});
it("requires deliberate legacy upgrade and matching bilingual selections, removes frozen profiles on save", async () => {
  saved = {
    revision: 7,
    updated_at: draft.updated_at,
    config: {
      schema_version: 1,
      name: "Legacy",
      language_mode: "bilingual",
      instructions: "Ask one question.",
    },
  };
  const { user } = await setup();
  expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  await user.click(
    screen.getByRole("button", { name: "Review upgrade to version 2" }),
  );
  await user.type(screen.getByLabelText("English greeting"), "Hello");
  await user.type(screen.getByLabelText("Urdu greeting"), "سلام");
  await user.click(screen.getByRole("button", { name: "Voice" }));
  await user.selectOptions(screen.getByLabelText("English voice"), "en-female");
  await user.selectOptions(screen.getByLabelText("Urdu voice"), "ur-male");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Bilingual voices require matching gender.");
  await user.selectOptions(screen.getByLabelText("Urdu voice"), "ur-female");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(writes.some((w) => w.path.endsWith("/draft"))).toBe(true),
  );
  expect(writes.find((w) => w.path.endsWith("/draft"))?.body).toMatchObject({
    revision: 7,
    config: {
      schema_version: 2,
      voice_en_id: "en-female",
      voice_ur_id: "ur-female",
    },
  });
  expect(
    JSON.stringify(writes.find((w) => w.path.endsWith("/draft"))?.body),
  ).not.toContain("voice_profiles");
  expect(
    screen
      .getAllByRole("button", { name: "Preview unavailable" })
      .every((b) => b.hasAttribute("disabled")),
  ).toBe(true);
});
it("locks reviewed publish across uncertain retry and preserves exact body and key", async () => {
  const { user } = await setup();
  await user.click(screen.getByRole("button", { name: "Publish" }));
  const dialog = await screen.findByRole("dialog");
  failPublish = 503;
  await user.click(
    within(dialog).getByRole("button", { name: "Confirm publish" }),
  );
  await within(dialog).findByText(/outcome is unknown/i);
  await user.keyboard("{Escape}");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(
    within(dialog).getByRole("button", { name: "Back to editing" }),
  ).toBeDisabled();
  failPublish = 0;
  await user.click(
    within(dialog).getByRole("button", { name: "Retry same operation" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  const calls = writes.filter((w) => w.path.endsWith("/publish"));
  expect(calls).toHaveLength(2);
  expect(calls[0]).toEqual(calls[1]);
  expect(calls[0]?.body).toEqual({ revision: 7 });
  expect(calls[0]?.key).toBeTruthy();
});
it("keeps text testing available while unavailable speech never allocates media", async () => {
  const { user } = await setup();
  await user.click(screen.getByRole("button", { name: "Start isolated test" }));
  await screen.findByText("ASR and Urdu acceptance blocked.");
  expect(screen.getByRole("button", { name: "Start voice" })).toBeDisabled();
  expect(writes.some((w) => w.path.endsWith("/voice"))).toBe(false);
  expect(screen.getByText(/Tested draft revision 7/)).toBeInTheDocument();
});
it("retains own successful save revision before a background response arrives", async () => {
  const { user } = await setup();
  slowRefresh = true;
  await user.clear(screen.getByLabelText("Agent name"));
  await user.type(screen.getByLabelText("Agent name"), "New saved name");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Draft saved.");
  expect(screen.getByLabelText("Agent name")).toHaveValue("New saved name");
  expect(screen.getByText("Saved draft · revision 8")).toBeInTheDocument();
});
it("creates trimmed drafts, reviews rollback with source identity, and confirms admission changes", async () => {
  const { user } = await setup();
  await user.click(screen.getByRole("button", { name: "Versions" }));
  expect(screen.getByText(/Publisher staff-one/)).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Restore as new version" }),
  );
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Confirm restore",
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(writes.find((w) => w.path.endsWith("/rollback"))?.body).toEqual({
    revision: 7,
    version_id: "version-one",
  });
  await user.click(screen.getByRole("button", { name: "Disable agent" }));
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Confirm change",
    }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(
    writes.find((w) => w.path === "/dashboard/agents/agent-one")?.body,
  ).toEqual({ revision: 3, enabled: false });
  await user.click(screen.getByRole("button", { name: "Archive agent" }));
  expect(
    writes.filter((w) => w.path === "/dashboard/agents/agent-one"),
  ).toHaveLength(1);
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Confirm archive",
    }),
  );
  await screen.findByText(
    "Agent archived. Existing sessions retain their pinned versions.",
  );
  await user.click(screen.getByRole("link", { name: "All agents" }));
  await user.click(await screen.findByRole("button", { name: "Create agent" }));
  await user.type(screen.getByLabelText("New agent name"), "  Assistant  ");
  await user.click(screen.getByRole("button", { name: "Create draft" }));
  await waitFor(() =>
    expect(writes.find((w) => w.path === "/dashboard/agents")?.body).toEqual({
      name: "Assistant",
    }),
  );
});
it("dirty edits prevent rollback and blank names cannot be saved", async () => {
  const { user } = await setup();
  await user.clear(screen.getByLabelText("Agent name"));
  await user.type(screen.getByLabelText("Agent name"), "   ");
  await user.click(screen.getByRole("button", { name: "Save draft" }));
  await screen.findByText("Enter a nonblank agent name.");
  expect(writes.some((w) => w.path.endsWith("/draft"))).toBe(false);
  await user.click(screen.getByRole("button", { name: "Versions" }));
  expect(
    screen.getByRole("button", { name: "Restore as new version" }),
  ).toBeDisabled();
});
it("denied staff credentials stay signed out without an isolated allocation", async () => {
  const original = fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init?: RequestInit) =>
      input.endsWith("/auth/login")
        ? Promise.resolve(
            Response.json(
              {
                error: { code: "unauthorized", message: "Invalid credentials" },
              },
              { status: 401 },
            ),
          )
        : original(input, init),
    ),
  );
  const router = createMemoryRouter(routes, { initialEntries: ["/login"] });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email *"), "wrong@example.test");
  await user.type(screen.getByLabelText("Password *"), "wrong-password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByText("Invalid credentials");
  expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  expect(writes.some((w) => w.path.endsWith("/tests"))).toBe(false);
});
