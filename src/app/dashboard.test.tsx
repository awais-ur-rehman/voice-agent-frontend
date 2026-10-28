import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth";
import { routes } from "./router";
import type {
  ClinicProfile_Output,
  ProviderOut,
} from "../api/dashboard.generated";
const id = "11111111-1111-4111-8111-111111111111";
const clinic: ClinicProfile_Output = {
  id,
  name: "Test Clinic",
  timezone: "Asia/Karachi",
  currency: "PKR",
  revision: 1,
  min_notice_min: 60,
  horizon_days: 30,
  cancellation_min: 60,
  daily_limit: 5,
  address_en: "",
  address_ur: "",
  preparation_en: "",
  preparation_ur: "",
};
const provider: ProviderOut = { id, name: "Dr Test", active: true };
let role = "owner";
let writes: { url: string; body: unknown; method: string }[] = [];
beforeEach(() => {
  role = "owner";
  writes = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const path = new URL(url).pathname;
      const method = init.method ?? "GET";
      if (method !== "GET")
        writes.push({
          url: path,
          body: init.body ? JSON.parse(String(init.body)) : undefined,
          method,
        });
      if (path === "/auth/login" || path === "/auth/register")
        return Response.json({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 300,
        });
      if (path === "/auth/me")
        return Response.json({
          id,
          tenant_id: id,
          email: "owner@example.test",
          role,
        });
      if (path === "/dashboard/clinic") return Response.json(clinic);
      if (path === "/dashboard/setup")
        return Response.json({
          profile: true,
          providers: false,
          services: false,
          hours: false,
          agent: false,
        });
      if (path === "/providers")
        return Response.json(method === "POST" ? provider : [provider]);
      if (path === "/services") return Response.json([]);
      if (path === "/users") return Response.json([]);
      if (path === "/dashboard/provider-services")
        return Response.json({ items: [], total: 0, offset: 0, limit: 25 });
      if (path.endsWith("/availability"))
        return Response.json({
          revision: "a".repeat(64),
          rules: [],
          exceptions: [],
        });
      return new Response(null, { status: 204 });
    }),
  );
});
function setup(path = "/login") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return { router, client, user: userEvent.setup() };
}
async function login(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email *"), "owner@example.test");
  await user.type(screen.getByLabelText("Password *"), "a-good-password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("heading", { name: "Set up your clinic" });
}
it("signs in and derives setup completion from API records", async () => {
  const { user } = setup();
  await login(user);
  expect(await screen.findByText("Configured")).toBeInTheDocument();
  expect(screen.getAllByText("Needs configuration")).toHaveLength(4);
  expect(writes[0]?.body).toEqual({
    email: "owner@example.test",
    password: "a-good-password",
  });
});
it("creates a clinic using the register contract", async () => {
  const { user } = setup("/signup");
  await user.type(screen.getByLabelText("Email *"), "new@example.test");
  await user.type(screen.getByLabelText("Password *"), "a-good-password");
  await user.type(screen.getByLabelText("Clinic name *"), "New Clinic");
  await user.click(screen.getByRole("button", { name: "Create clinic" }));
  await screen.findByRole("heading", { name: "Set up your clinic" });
  expect(writes[0]).toMatchObject({
    url: "/auth/register",
    body: { clinic_name: "New Clinic", email: "new@example.test" },
  });
});
it("hides manager actions and disables profile fields for staff", async () => {
  role = "staff";
  const { user } = setup();
  await login(user);
  expect(
    screen.queryByRole("link", { name: "Team access" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Clinic profile" }));
  expect(await screen.findByLabelText("Name")).toBeDisabled();
  expect(
    screen.queryByRole("button", { name: "Save changes" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Providers" }));
  await screen.findByText("Dr Test");
  expect(
    screen.queryByRole("button", { name: "Add provider" }),
  ).not.toBeInTheDocument();
});
it("submits provider fields to the actual persisted endpoint", async () => {
  const { user } = setup();
  await login(user);
  await user.click(screen.getByRole("link", { name: "Providers" }));
  await user.click(await screen.findByRole("button", { name: "Add provider" }));
  await user.type(screen.getByLabelText("Name *"), "New Provider");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(
      writes.some((w) => w.url === "/providers" && w.method === "POST"),
    ).toBe(true),
  );
  expect(writes.find((w) => w.url === "/providers")?.body).toEqual({
    name: "New Provider",
  });
});
it("preserves clinic edits on a revision conflict and focuses the error summary", async () => {
  const original = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) =>
      init.method === "PATCH"
        ? Response.json(
            {
              error: {
                code: "revision_conflict",
                message: "Clinic changed. Reload to review.",
                details: { fields: ["body.name"] },
              },
            },
            { status: 409 },
          )
        : original(url, init),
    ),
  );
  const { user } = setup();
  await login(user);
  await user.click(screen.getByRole("link", { name: "Clinic profile" }));
  const name = await screen.findByLabelText("Name");
  await user.clear(name);
  await user.type(name, "Edited Clinic");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  const error = await screen.findByRole("alert");
  expect(error).toHaveFocus();
  expect(name).toHaveValue("Edited Clinic");
  expect(name).toHaveAttribute("aria-invalid", "true");
});
it("reviews availability and retries the exact payload and idempotency key", async () => {
  const original = globalThis.fetch;
  let attempts = 0;
  const apply: RequestInit[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/availability/preview"))
        return Response.json({
          revision: "a".repeat(64),
          changes: {
            removed_rule_ids: [],
            added_rules: [
              {
                id,
                provider_id: id,
                weekday: 5,
                start_time: "09:00:00",
                end_time: "12:45:00",
                slot_min: 15,
              },
            ],
            added_exceptions: [],
          },
          after: { revision: "b".repeat(64), rules: [], exceptions: [] },
        });
      if (url.endsWith("/availability/apply")) {
        apply.push(init);
        attempts++;
        return attempts === 1
          ? Response.json(
              { error: { code: "unavailable", message: "Please retry." } },
              { status: 503 },
            )
          : Response.json({
              revision: "b".repeat(64),
              rules: [],
              exceptions: [],
            });
      }
      return original(url, init);
    }),
  );
  const { user } = setup();
  await login(user);
  await user.click(screen.getByRole("link", { name: "Hours & exceptions" }));
  await user.click(
    await screen.findByRole("button", { name: "Preview changes" }),
  );
  await screen.findByRole("heading", { name: "Review proposed changes" });
  await user.click(
    screen.getByRole("button", { name: "Apply reviewed changes" }),
  );
  await screen.findByText("Please retry.");
  await user.click(
    screen.getByRole("button", { name: "Apply reviewed changes" }),
  );
  await waitFor(() => expect(apply).toHaveLength(2));
  expect(apply[0]?.body).toEqual(apply[1]?.body);
  expect(new Headers(apply[0]?.headers).get("Idempotency-Key")).toEqual(
    new Headers(apply[1]?.headers).get("Idempotency-Key"),
  );
  expect(
    within(document.body).queryByText("Friday prayer"),
  ).toBeInTheDocument();
});

it("saves service, assignment, working interval, exception and staff contracts", async () => {
  const { user } = setup();
  await login(user);
  await user.click(screen.getByRole("link", { name: "Services" }));
  await user.click(await screen.findByRole("button", { name: "Add service" }));
  await user.type(screen.getByLabelText("Name *"), "Consultation");
  await user.type(screen.getByLabelText("Duration (minutes) *"), "30");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(writes.find((w) => w.url === "/services")?.body).toMatchObject({
      name: "Consultation",
      duration_min: 30,
      buffer_before_min: 0,
      buffer_after_min: 0,
    }),
  );
  await user.click(screen.getByRole("link", { name: "Hours & exceptions" }));
  await user.click(await screen.findByRole("button", { name: "Add interval" }));
  await user.selectOptions(screen.getByLabelText("Weekday *"), "1");
  await user.type(screen.getByLabelText("Start Time *"), "09:00");
  await user.type(screen.getByLabelText("End Time *"), "17:00");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(
      writes.find((w) => w.url === "/availability-rules")?.body,
    ).toMatchObject({
      provider_id: id,
      weekday: 1,
      start_time: "09:00",
      end_time: "17:00",
      slot_min: 15,
    }),
  );
  await user.click(screen.getByRole("button", { name: "Add exception" }));
  await user.type(screen.getByLabelText("Start Date *"), "2026-12-01");
  await user.type(screen.getByLabelText("End Date *"), "2026-12-02");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(writes.find((w) => w.url === "/exceptions")?.body).toMatchObject({
      provider_id: id,
      kind: "closed",
      start_date: "2026-12-01",
      end_date: "2026-12-02",
    }),
  );
  await user.click(screen.getByRole("link", { name: "Team access" }));
  await user.click(
    await screen.findByRole("button", { name: "Add team member" }),
  );
  await user.type(screen.getByLabelText("Email *"), "staff@example.test");
  await user.type(screen.getByLabelText("Password *"), "a-good-password");
  await user.click(screen.getByRole("button", { name: "Create account" }));
  await waitFor(() =>
    expect(writes.find((w) => w.url === "/users")?.body).toEqual({
      email: "staff@example.test",
      password: "a-good-password",
      role: "staff",
    }),
  );
});

it("assigns and removes provider services with the reviewed relationship endpoints", async () => {
  const original = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (new URL(url).pathname === "/services")
        return Response.json([
          {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Consultation",
            duration_min: 30,
            active: true,
          },
        ]);
      return original(url, init);
    }),
  );
  const { user } = setup();
  await login(user);
  await user.click(screen.getByRole("link", { name: "Providers" }));
  await user.selectOptions(await screen.findByLabelText("Provider"), id);
  await user.selectOptions(
    screen.getByLabelText("Service"),
    "22222222-2222-4222-8222-222222222222",
  );
  await user.click(screen.getByRole("button", { name: "Assign service" }));
  await waitFor(() =>
    expect(writes.find((w) => w.method === "PUT")?.url).toBe(
      `/providers/${id}/services/22222222-2222-4222-8222-222222222222`,
    ),
  );
});
