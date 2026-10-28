import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../../app/auth";
import { routes } from "../../app/router";
import type {
  PatientDetail,
  CalendarAppointment,
  Slot,
} from "../../api/dashboard.generated";
vi.mock("./Calendar", () => ({
  default: () => <div aria-label="Calendar fixture" />,
}));
const id = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const source: PatientDetail = {
  id,
  name: "Synthetic patient",
  name_ur: "مصنوعی مریض عبدالرحمن",
  phone: "+923001234567",
  dob: "1990-01-01",
  revision: 3,
  merged_into_id: null,
};
const destination: PatientDetail = {
  ...source,
  id: other,
  name: "Retained patient",
  name_ur: null,
  dob: null,
  revision: 8,
};
const slot: Slot = {
  provider_id: id,
  service_id: id,
  starts_at: "2026-11-01T05:30:00Z",
  ends_at: "2026-11-01T06:00:00Z",
};
const alternative: Slot = {
  ...slot,
  starts_at: "2026-11-01T06:30:00Z",
  ends_at: "2026-11-01T07:00:00Z",
};
const appointment: CalendarAppointment = {
  id,
  patient_id: id,
  provider_id: id,
  service_id: id,
  starts_at: slot.starts_at,
  ends_at: slot.ends_at,
  created_at: "2026-10-01T00:00:00Z",
  status: "booked",
  rescheduled_from_id: null,
  patient_name: source.name,
  patient_name_ur: source.name_ur ?? null,
  provider_name: "Dr Fixture",
  provider_name_ur: null,
  service_name: "Consultation",
  service_name_ur: null,
};
type Write = { path: string; body: unknown; key: string | null };
let role = "owner",
  writes: Write[] = [],
  queries: URL[] = [],
  attempts = 0,
  mode = "success";
beforeEach(() => {
  role = "owner";
  writes = [];
  queries = [];
  attempts = 0;
  mode = "success";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const u = new URL(url),
        p = u.pathname;
      const method = init.method ?? "GET";
      if (method === "GET") queries.push(u);
      else
        writes.push({
          path: p,
          body: init.body ? JSON.parse(String(init.body)) : null,
          key: new Headers(init.headers).get("Idempotency-Key"),
        });
      if (p === "/auth/login")
        return Response.json({
          access_token: "a",
          refresh_token: "r",
          expires_in: 300,
        });
      if (p === "/auth/me")
        return Response.json({
          id,
          tenant_id: id,
          email: "fixture@example.test",
          role,
        });
      if (p === "/dashboard/setup")
        return Response.json({
          profile: true,
          providers: true,
          services: true,
          hours: true,
          agent: true,
        });
      if (p === "/dashboard/clinic")
        return Response.json({
          id,
          name: "Fixture clinic",
          timezone: "America/New_York",
          revision: 1,
          currency: "PKR",
          min_notice_min: 0,
          horizon_days: 30,
          cancellation_min: 0,
          daily_limit: 5,
          address_en: "",
          address_ur: "",
          preparation_en: "",
          preparation_ur: "",
        });
      if (p === "/providers")
        return Response.json([{ id, name: "Dr Fixture", active: true }]);
      if (p === "/services")
        return Response.json([
          { id, name: "Consultation", duration_min: 30, active: true },
        ]);
      if (p === "/slots")
        return Response.json(attempts ? [alternative] : [slot]);
      if (p === "/dashboard/appointments")
        return Response.json({
          items: [appointment],
          limit: 100,
          offset: 0,
          total: 1,
        });
      if (p === "/dashboard/patients")
        return Response.json({
          items:
            u.searchParams.get("offset") === "25"
              ? [destination]
              : [source, destination],
          limit: 25,
          offset: Number(u.searchParams.get("offset") ?? 0),
          total: 26,
        });
      if (p === `/dashboard/patients/${id}`)
        return Response.json(
          mode === "tombstone" ? { ...source, merged_into_id: other } : source,
        );
      if (p === `/dashboard/patients/${other}`)
        return Response.json(destination);
      if (p.endsWith("/appointments") && p.startsWith("/patients/"))
        return Response.json([appointment]);
      if (p === "/appointments" || p.endsWith("/reschedule")) {
        attempts++;
        if (mode === "conflict" && attempts === 1)
          return Response.json(
            {
              error: {
                code: "slot_unavailable",
                message: "Slot changed. Choose an alternative.",
                details: { alternatives: [alternative] },
              },
            },
            { status: 409 },
          );
        if (mode === "retry" && attempts === 1)
          return Response.json(
            { error: { code: "unavailable", message: "Try again." } },
            { status: 503 },
          );
        return Response.json(appointment);
      }
      if (p.endsWith("/cancel"))
        return Response.json({ ...appointment, status: "cancelled" });
      if (p.endsWith("/merge"))
        return mode === "merge-conflict"
          ? Response.json(
              {
                error: {
                  code: "revision_conflict",
                  message: "Records changed. Review current records.",
                },
              },
              { status: 409 },
            )
          : Response.json(destination);
      return new Response(null, { status: 204 });
    }),
  );
});
async function setup(path = "/schedule") {
  const router = createMemoryRouter(routes, { initialEntries: ["/login"] });
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
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email *"), "fixture@example.test");
  await user.type(screen.getByLabelText("Password *"), "synthetic-password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("heading", { name: "Schedule" });
  if (path !== "/schedule") await router.navigate(path);
  return { user, router, client };
}
async function selectBooking(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "New appointment" }));
  await user.click(
    await within(
      screen.getByRole("region", { name: "Patient selection" }),
    ).findByRole("button", { name: /Synthetic patient/ }),
  );
  await user.selectOptions(screen.getByLabelText("Provider"), id);
  await user.selectOptions(screen.getByLabelText("Service"), id);
  await user.click(await screen.findByRole("radio"));
  await user.click(screen.getByRole("button", { name: "Review appointment" }));
}
it("lands existing clinics on schedule, uses joined names and clinic week boundaries, and exposes keyboard list", async () => {
  const { user } = await setup();
  expect(
    await screen.findByRole("button", { name: /Synthetic patient/ }),
  ).toHaveTextContent("مصنوعی مریض");
  fireEvent.change(screen.getByLabelText("Clinic date"), {
    target: { value: "2026-11-05" },
  });
  await waitFor(() =>
    expect(
      queries.some(
        (u) =>
          u.pathname === "/dashboard/appointments" &&
          u.searchParams.get("date_from") === "2026-11-02" &&
          u.searchParams.get("date_to") === "2026-11-08",
      ),
    ).toBe(true),
  );
  await user.click(screen.getByRole("button", { name: "List" }));
  expect(
    screen.getByRole("heading", { name: "Appointment list" }),
  ).toBeInTheDocument();
});
it("books only after slot review; preserves selection on conflict and submits returned actual alternative", async () => {
  mode = "conflict";
  const { user } = await setup();
  await selectBooking(user);
  expect(writes.filter((w) => w.path === "/appointments")).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "Confirm appointment" }));
  await screen.findByText("Slot changed. Choose an alternative.");
  expect(screen.getByText(/Selected patient:/)).toHaveTextContent(source.name);
  expect(screen.getByLabelText("Provider")).toHaveValue(id);
  await user.click(
    within(
      screen.getByRole("region", { name: "Server alternatives" }),
    ).getByRole("button"),
  );
  await user.click(screen.getByRole("button", { name: "Review appointment" }));
  await user.click(screen.getByRole("button", { name: "Confirm appointment" }));
  await waitFor(() =>
    expect(writes.filter((w) => w.path === "/appointments")).toHaveLength(2),
  );
  expect(
    writes.filter((w) => w.path === "/appointments")[1]?.body,
  ).toMatchObject({
    confirmed: true,
    starts_at: alternative.starts_at,
    patient_id: id,
  });
});
it("retains exact booking payload/key during uncertain retry and locks inputs", async () => {
  mode = "retry";
  const { user } = await setup();
  await selectBooking(user);
  await user.click(screen.getByRole("button", { name: "Confirm appointment" }));
  await screen.findByText("Try again.");
  expect(screen.getByLabelText("Provider")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Edit selection" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Confirm appointment" }));
  await waitFor(() =>
    expect(writes.filter((w) => w.path === "/appointments")).toHaveLength(2),
  );
  const bookings = writes.filter((w) => w.path === "/appointments");
  expect(bookings[0]?.body).toEqual(bookings[1]?.body);
  expect(bookings[0]?.key).toBeTruthy();
  expect(bookings[0]?.key).toBe(bookings[1]?.key);
});
it("reschedules through actual slots and explicitly confirms cancellation", async () => {
  const { user } = await setup();
  await user.click(
    await screen.findByRole("button", { name: /Synthetic patient/ }),
  );
  await user.click(screen.getByRole("button", { name: "Reschedule" }));
  await user.click(await screen.findByRole("radio"));
  await user.click(screen.getByRole("button", { name: "Review appointment" }));
  await user.click(screen.getByRole("button", { name: "Confirm appointment" }));
  await waitFor(() =>
    expect(writes.some((w) => w.path.endsWith("/reschedule"))).toBe(true),
  );
  await user.click(screen.getByRole("button", { name: /Synthetic patient/ }));
  await user.click(
    screen.getByRole("button", { name: "Confirm cancellation" }),
  );
  expect(writes.some((w) => w.path.endsWith("/cancel"))).toBe(false);
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Confirm cancellation",
    }),
  );
  await waitFor(() =>
    expect(writes.find((w) => w.path.endsWith("/cancel"))?.body).toEqual({
      confirmed: true,
    }),
  );
});
it("debounces Urdu search, paginates on server and keeps patient text out of browser URL/storage", async () => {
  const { user, router } = await setup("/patients");
  const search = await screen.findByLabelText(
    "Search patients by name or phone",
  );
  await user.type(search, "عبدالرحمن");
  await waitFor(() =>
    expect(
      queries.some(
        (u) =>
          u.pathname === "/dashboard/patients" &&
          u.searchParams.get("q") === "عبدالرحمن",
      ),
    ).toBe(true),
  );
  await user.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() =>
    expect(
      queries.some(
        (u) =>
          u.pathname === "/dashboard/patients" &&
          u.searchParams.get("offset") === "25",
      ),
    ).toBe(true),
  );
  expect(router.state.location.search).toBe("");
  expect(localStorage.length + sessionStorage.length).toBe(0);
});
it("requires all merge field choices including nullable Urdu/DOB and both captured revisions", async () => {
  const { user } = await setup(`/patients/${id}`);
  await user.click(
    await screen.findByRole("button", { name: "Merge patient" }),
  );
  const dialog = screen.getByRole("dialog");
  await user.click(
    await within(dialog).findByRole("button", { name: /Retained patient/ }),
  );
  expect(
    within(dialog).getByRole("button", { name: "Review merge" }),
  ).toBeDisabled();
  await user.selectOptions(
    within(dialog).getByLabelText("Retain name"),
    "source",
  );
  await user.selectOptions(
    within(dialog).getByLabelText("Retain phone"),
    "destination",
  );
  await user.selectOptions(
    within(dialog).getByLabelText("Retain Urdu name"),
    "clear",
  );
  await user.selectOptions(
    within(dialog).getByLabelText("Retain date of birth"),
    "destination",
  );
  await user.click(
    within(dialog).getByRole("button", { name: "Review merge" }),
  );
  expect(writes.some((w) => w.path.endsWith("/merge"))).toBe(false);
  await user.click(
    within(dialog).getByRole("button", { name: "Confirm merge" }),
  );
  await waitFor(() =>
    expect(writes.find((w) => w.path.endsWith("/merge"))?.body).toEqual({
      destination_id: other,
      source_revision: 3,
      destination_revision: 8,
      fields: {
        name: source.name,
        phone: destination.phone,
        name_ur: null,
        dob: null,
      },
    }),
  );
});
it("keeps tombstone read-only and links retained identity", async () => {
  mode = "tombstone";
  await setup(`/patients/${id}`);
  expect(
    await screen.findByRole("link", { name: "Open retained patient" }),
  ).toHaveAttribute("href", `/patients/${other}`);
  expect(
    screen.queryByRole("button", { name: "Edit patient" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Merge patient" }),
  ).not.toBeInTheDocument();
});
it("does not offer merge to ordinary staff while history remains available", async () => {
  role = "staff";
  await setup(`/patients/${id}`);
  await screen.findByRole("heading", { name: "Appointment history" });
  expect(
    screen.queryByRole("button", { name: "Merge patient" }),
  ).not.toBeInTheDocument();
  expect(
    await screen.findByRole("button", { name: "Edit patient" }),
  ).toBeInTheDocument();
});

it("retains explicit merge fields on revision conflict and offers current-record reload", async () => {
  mode = "merge-conflict";
  const { user } = await setup(`/patients/${id}`);
  await user.click(
    await screen.findByRole("button", { name: "Merge patient" }),
  );
  const dialog = screen.getByRole("dialog");
  await user.click(
    await within(dialog).findByRole("button", { name: /Retained patient/ }),
  );
  for (const label of [
    "Retain name",
    "Retain phone",
    "Retain Urdu name",
    "Retain date of birth",
  ])
    await user.selectOptions(within(dialog).getByLabelText(label), "source");
  await user.click(
    within(dialog).getByRole("button", { name: "Review merge" }),
  );
  await user.click(
    within(dialog).getByRole("button", { name: "Confirm merge" }),
  );
  await screen.findByText("Records changed. Review current records.");
  expect(within(dialog).getByLabelText("Retain name")).toHaveValue("source");
  expect(
    within(dialog).getByRole("button", {
      name: "Reload current records before another merge",
    }),
  ).toBeInTheDocument();
});
it("fetches every calendar projection page rather than truncating at 100", async () => {
  const original = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const u = new URL(url);
      if (u.pathname === "/dashboard/appointments") {
        const offset = Number(u.searchParams.get("offset"));
        return Response.json({
          items:
            offset === 0
              ? Array.from({ length: 100 }, (_, i) => ({
                  ...appointment,
                  id: `row-${i}`,
                }))
              : [
                  {
                    ...appointment,
                    id: "last-row",
                    patient_name: "Last paginated patient",
                  },
                ],
          total: 101,
          offset,
          limit: 100,
        });
      }
      return original(url, init);
    }),
  );
  await setup();
  expect(
    await screen.findByRole("button", { name: /Last paginated patient/ }),
  ).toBeInTheDocument();
});
it("aborts stale patient searches before requesting the next debounced query", async () => {
  const original = globalThis.fetch;
  let staleSignal: AbortSignal | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const u = new URL(url);
      if (
        u.pathname === "/dashboard/patients" &&
        u.searchParams.get("q") === "old"
      ) {
        staleSignal = init.signal ?? undefined;
        return new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      }
      return original(url, init);
    }),
  );
  const { user } = await setup("/patients");
  const input = await screen.findByLabelText(
    "Search patients by name or phone",
  );
  await user.type(input, "old");
  await waitFor(() => expect(staleSignal).toBeDefined());
  await user.clear(input);
  await user.type(input, "نیا");
  await waitFor(() => expect(staleSignal?.aborted).toBe(true));
  await waitFor(() =>
    expect(queries.some((u) => u.searchParams.get("q") === "نیا")).toBe(true),
  );
});
it("creates and edits patient records through generated validation and actual staff endpoints", async () => {
  const original = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const p = new URL(url).pathname;
      if (
        (p === "/patients" && init.method === "POST") ||
        (p === `/patients/${id}` && init.method === "PUT")
      ) {
        writes.push({
          path: p,
          body: JSON.parse(String(init.body)),
          key: null,
        });
        return Response.json(source);
      }
      return original(url, init);
    }),
  );
  const { user } = await setup("/patients");
  await user.click(await screen.findByRole("button", { name: "Add patient" }));
  await user.type(screen.getByLabelText("Name *"), "Synthetic new");
  await user.type(screen.getByLabelText("Phone *"), "+923009876543");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await user.click(await screen.findByRole("button", { name: "Edit patient" }));
  await user.clear(screen.getByLabelText("Name *"));
  await user.type(screen.getByLabelText("Name *"), "Synthetic edited");
  await user.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(
      writes.find((w) => w.path === `/patients/${id}`)?.body,
    ).toMatchObject({ name: "Synthetic edited", phone: source.phone }),
  );
  expect(writes.find((w) => w.path === "/patients")?.body).toMatchObject({
    name: "Synthetic new",
  });
});

it("reviews rescheduling with original 30-minute duration after the service changes to 45 minutes", async () => {
  const original = globalThis.fetch;
  let moved = false;
  const saved = {
    ...appointment,
    starts_at: "2026-11-02T15:00:00Z",
    ends_at: "2026-11-02T15:30:00Z",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      const p = new URL(url).pathname;
      if (p.endsWith("/reschedule")) {
        await original(url, init);
        moved = true;
        return Response.json(saved);
      }
      if (p === "/dashboard/appointments" && moved)
        return Response.json({
          items: [saved],
          limit: 100,
          offset: 0,
          total: 1,
        });
      if (p === "/services")
        return Response.json([
          { id, name: "Consultation", duration_min: 45, active: true },
        ]);
      if (p === "/slots")
        return Response.json([
          {
            ...slot,
            starts_at: "2026-11-02T15:00:00Z",
            ends_at: "2026-11-02T15:45:00Z",
          },
        ]);
      return original(url, init);
    }),
  );
  const { user } = await setup();
  await user.click(
    await screen.findByRole("button", { name: /Synthetic patient/ }),
  );
  await user.click(screen.getByRole("button", { name: "Reschedule" }));
  await user.click(await screen.findByRole("radio"));
  await user.click(screen.getByRole("button", { name: "Review appointment" }));
  const review = screen.getByRole("region", { name: "Review appointment" });
  expect(review).toHaveTextContent(
    "10:00 (UTC-05:00) – 2026-11-02 10:30 (UTC-05:00)",
  );
  expect(review).not.toHaveTextContent("10:45");
  await user.click(screen.getByRole("button", { name: "Confirm appointment" }));
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Close appointment form" }),
    ).not.toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: /Synthetic patient/ }));
  expect(
    screen.getByText(
      "2026-11-02 10:00 (UTC-05:00) – 2026-11-02 10:30 (UTC-05:00) · America/New_York",
    ),
  ).toBeInTheDocument();
});

for (const failure of ["conflict", "retry"])
  it(`reschedule ${failure} retains patient and original intent until actual-slot confirmation`, async () => {
    mode = failure;
    const { user } = await setup();
    await user.click(
      await screen.findByRole("button", { name: /Synthetic patient/ }),
    );
    await user.click(screen.getByRole("button", { name: "Reschedule" }));
    await user.click(await screen.findByRole("radio"));
    await user.click(
      screen.getByRole("button", { name: "Review appointment" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Confirm appointment" }),
    );
    if (failure === "conflict") {
      await screen.findByText("Slot changed. Choose an alternative.");
      expect(screen.getByLabelText("Provider")).toHaveValue(id);
      await user.click(
        within(
          screen.getByRole("region", { name: "Server alternatives" }),
        ).getByRole("button"),
      );
      await user.click(
        screen.getByRole("button", { name: "Review appointment" }),
      );
    } else {
      await screen.findByText("Try again.");
      expect(
        screen.getByRole("button", { name: "Close appointment form" }),
      ).toBeDisabled();
    }
    await user.click(
      screen.getByRole("button", { name: "Confirm appointment" }),
    );
    await waitFor(() =>
      expect(writes.filter((w) => w.path.endsWith("/reschedule"))).toHaveLength(
        2,
      ),
    );
    const requests = writes.filter((w) => w.path.endsWith("/reschedule"));
    if (failure === "retry") {
      expect(requests[0]?.body).toEqual(requests[1]?.body);
      expect(requests[0]?.key).toBe(requests[1]?.key);
    } else
      expect(requests[1]?.body).toMatchObject({
        starts_at: alternative.starts_at,
        confirmed: true,
      });
  });

it("announces uncertain cancellation inside its confirmation dialog and retries the same key", async () => {
  const original = globalThis.fetch;
  let cancellations = 0;
  const requests: RequestInit[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit) => {
      if (new URL(url).pathname.endsWith("/cancel")) {
        requests.push(init);
        cancellations++;
        return cancellations === 1
          ? Response.json(
              {
                error: {
                  code: "unavailable",
                  message: "Cancellation outcome uncertain.",
                },
              },
              { status: 503 },
            )
          : Response.json({ ...appointment, status: "cancelled" });
      }
      return original(url, init);
    }),
  );
  const { user } = await setup();
  await user.click(
    await screen.findByRole("button", { name: /Synthetic patient/ }),
  );
  await user.click(
    screen.getByRole("button", { name: "Confirm cancellation" }),
  );
  const dialog = screen.getByRole("dialog");
  await user.click(
    within(dialog).getByRole("button", { name: "Confirm cancellation" }),
  );
  await within(dialog).findByText("Cancellation outcome uncertain.");
  await user.click(
    within(dialog).getByRole("button", { name: "Confirm cancellation" }),
  );
  await waitFor(() => expect(requests).toHaveLength(2));
  expect(requests[0]?.body).toBe(requests[1]?.body);
  expect(new Headers(requests[0]?.headers).get("Idempotency-Key")).toBe(
    new Headers(requests[1]?.headers).get("Idempotency-Key"),
  );
});

it("keeps the selected day window and provider when switching from calendar to list", async () => {
  const { user } = await setup();
  fireEvent.change(screen.getByLabelText("Clinic date"), {
    target: { value: "2026-11-05" },
  });
  await user.selectOptions(screen.getByLabelText("Provider filter"), id);
  await user.click(screen.getByRole("button", { name: "Day" }));
  await user.click(screen.getByRole("button", { name: "List" }));
  await waitFor(() =>
    expect(
      queries
        .filter((u) => u.pathname === "/dashboard/appointments")
        .at(-1)
        ?.searchParams.get("date_to"),
    ).toBe("2026-11-05"),
  );
  const query = queries
    .filter((u) => u.pathname === "/dashboard/appointments")
    .at(-1);
  expect(query?.searchParams.get("date_from")).toBe("2026-11-05");
  expect(query?.searchParams.get("provider_id")).toBe(id);
});
