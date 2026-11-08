import { StrictMode } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../../app/auth";
import { routes } from "../../app/router";
import { privacyCopy } from "./presentation";
import {
  analyticsFixture,
  id,
  secondId,
  transcript,
} from "./fixtures.test-support";
let fixture: ReturnType<typeof analyticsFixture>;
let hold: ((url: string) => Promise<void>) | undefined;
beforeEach(() => {
  fixture = analyticsFixture();
  hold = undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const response = fixture.handle(
        url,
        init.method ?? "GET",
        typeof init.body === "string" ? JSON.parse(init.body) : undefined,
        new Headers(init.headers),
      );
      if (hold) await hold(url);
      return response.status === 204
        ? new Response(null, { status: 204 })
        : Response.json(response.body, { status: response.status });
    }),
  );
});
async function setup(path = "/analytics?start=2026-11-02&end=2026-11-08") {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
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
  await signIn(user);
  return { user, router, client };
}
async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    await screen.findByLabelText("Email *"),
    "synthetic@example.test",
  );
  await user.type(screen.getByLabelText("Password *"), "synthetic-password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}
it("shows true zero, partial tiny USD, raw stage coverage and separate channel admissions", async () => {
  await setup();
  expect(await screen.findByText("1 voice · 2 text")).toBeVisible();
  expect(screen.getByText("0% · 0 / 2")).toBeVisible();
  expect(screen.getByText("< USD 0.000001")).toBeVisible();
  expect(screen.getByText(/Partial cost coverage/)).toBeVisible();
  expect(await screen.findByText("Unknown · 0 / 0")).toBeVisible();
  const stage = screen.getByRole("row", { name: /LLM first token/ });
  expect(within(stage).getAllByText("Unknown")).toHaveLength(2);
  expect(
    screen.getByRole("row", { name: /Audio queue · diagnostic/ }),
  ).toHaveTextContent("0 ms");
  expect(screen.getByText(/4 legacy \/ preview/)).toBeVisible();
  expect(screen.getByText("Unattributed queue work")).toBeVisible();
  expect(screen.getByText(/shares can exceed 100%/)).toBeVisible();
  expect(
    fixture.state.requests
      .filter((r) => r.path.includes("/analytics/"))
      .every((r) => new URLSearchParams(r.query).get("channel") === "all"),
  ).toBe(true);
});
it("validates inclusive ranges and retries a failed initial query", async () => {
  fixture.state.failure = "overview";
  const { user } = await setup();
  expect(
    await screen.findByText("Analytics temporarily unavailable"),
  ).toBeVisible();
  fixture.state.failure = "";
  await user.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByText("1 voice · 2 text")).toBeVisible();
  await user.clear(screen.getByLabelText("From"));
  await user.type(screen.getByLabelText("From"), "2026-09-01");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(
    await screen.findByText("Choose at most 31 inclusive dates."),
  ).toBeVisible();
});
it("keeps exact call seek totals and resets cursors when call-only filters change; back restores filters", async () => {
  const { user, router } = await setup(
    "/calls?start=2026-11-02&end=2026-11-08",
  );
  expect(await screen.findByText("1 on this page · 2 matching")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() =>
    expect(router.state.location.search).toContain("after=call-next"),
  );
  await user.click(
    await screen.findByRole("link", { name: `Review session ${secondId}` }),
  );
  expect(
    await screen.findByRole("heading", { name: "Session review" }),
  ).toHaveFocus();
  await user.click(screen.getByRole("link", { name: "Back to calls" }));
  expect(router.state.location.search).toContain("after=call-next");
  await user.selectOptions(await screen.findByLabelText("Outcome"), "error");
  await user.selectOptions(screen.getByLabelText("Review flag"), "handoff");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(
    await screen.findByText("No sessions match these filters."),
  ).toBeVisible();
  expect(router.state.location.search).not.toContain("after=");
  const last = fixture.state.requests
    .filter((r) => r.path === "/dashboard/calls")
    .at(-1)!;
  expect(last.query).toContain("outcome=error");
  expect(last.query).toContain("review_flag=handoff");
  expect(
    fixture.state.requests.filter((r) => r.path.endsWith("overview")),
  ).toHaveLength(0);
});
it("bounds independent event and measurement pages using actual ordinal associations and readable traces", async () => {
  const { user } = await setup(`/calls/${id}`);
  expect(
    await screen.findByText(
      "Completed 1 of 1 scheduling tasks; 1 booking operation.",
    ),
  ).toBeVisible();
  expect(screen.getByText(/Asia\/Karachi · UTC\+05:00/)).toBeVisible();
  await user.click(screen.getByText("Diagnostics"));
  expect(screen.getByText(/Correlation UUID:/)).toBeVisible();
  expect(
    screen.getByRole("row", { name: /7 Command total 123 ms/ }),
  ).toBeVisible();
  expect(
    screen.getByRole("row", { name: /Unassociated LLM completion/ }),
  ).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Next events" }));
  expect(await screen.findByText("Book appointment · Success")).toBeVisible();
  let request = fixture.state.requests
    .filter((r) => r.path === `/dashboard/calls/${id}`)
    .at(-1)!;
  expect(request.query).toContain("after=7");
  expect(request.query).not.toContain("measurement_after");
  await user.click(screen.getByRole("button", { name: "Next measurements" }));
  expect(
    await screen.findByRole("row", { name: /9 Tool 80 ms/ }),
  ).toBeVisible();
  request = fixture.state.requests
    .filter((r) => r.path === `/dashboard/calls/${id}`)
    .at(-1)!;
  expect(request.query).toContain("after=7");
  expect(request.query).toContain("measurement_after=measurement-next");
});
it("never fetches transcript or manager settings for staff, including direct routed detail", async () => {
  fixture.state.role = "staff";
  await setup(`/calls/${id}`);
  expect(
    await screen.findByText(
      /Transcript access is limited to owners and admins/,
    ),
  ).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Check protected transcript" }),
  ).toBeNull();
  expect(
    fixture.state.requests.some(
      (r) => r.path.endsWith("/transcript") || r.path.endsWith("/settings"),
    ),
  ).toBe(false);
});
it("fetches manager text only on explicit action, escapes bilingual text, and removes own deletion text/cache immediately", async () => {
  fixture.state.transcript = structuredClone(transcript);
  fixture.state.settings.capture_enabled = true;
  fixture.state.call.privacy.reason = "captured";
  const { user, client } = await setup(`/calls/${id}`);
  await screen.findByRole("heading", { name: "Transcript" });
  expect(
    fixture.state.requests.some((r) => r.path.endsWith("/transcript")),
  ).toBe(false);
  await user.click(
    screen.getByRole("button", { name: "Check protected transcript" }),
  );
  const text = await screen.findByText(/مصنوعی ملاقات چاہیے/);
  expect(text).toHaveAttribute("dir", "auto");
  expect(document.querySelector("main script")).toBeNull();
  expect(screen.getByText("2 on page · 3 retained messages")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Next text page" }));
  expect(await screen.findByText("Final synthetic reply.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Delete transcript" }));
  await user.click(
    screen.getByRole("button", { name: "Confirm transcript deletion" }),
  );
  await screen.findAllByText(/This transcript was deleted/);
  expect(screen.queryByText("Final synthetic reply.")).toBeNull();
  expect(
    JSON.stringify(
      client
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    ),
  ).not.toContain("Final synthetic reply.");
  await user.click(
    screen.getByRole("button", { name: "Close protected transcript" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Check protected transcript" }),
  );
  expect(
    await screen.findAllByText(/This transcript was deleted/),
  ).not.toHaveLength(0);
  expect(screen.queryByText(/مصنوعی ملاقات چاہیے/)).toBeNull();
});
it.each([
  "off",
  "pending",
  "declined",
  "live_disabled",
  "deleted",
  "expired",
  "no_captured",
] as const)(
  "shows authoritative manager privacy reason %s without fabricated text",
  async (reason) => {
    fixture.state.transcript = {
      ...fixture.state.transcript,
      privacy: { text_access: "manager", availability: "unavailable", reason },
      items: [],
      total: 0,
      has_more: false,
      next_cursor: null,
    };
    const { user } = await setup(`/calls/${id}`);
    await user.click(
      await screen.findByRole("button", { name: "Check protected transcript" }),
    );
    await screen.findByText(privacyCopy[reason], {
      selector: ".protected-transcript [role=status]",
    });
    expect(screen.queryByText(/مصنوعی ملاقات چاہیے/)).toBeNull();
    expect(
      await screen.findByRole("button", { name: "Close protected transcript" }),
    ).toBeVisible();
  },
);
it("loads default-off settings and submits current revision; 409 requires explicit revision reload", async () => {
  const { user } = await setup();
  await user.click(
    await screen.findByRole("button", { name: "Capture settings" }),
  );
  const dialog = await screen.findByRole("dialog");
  expect(await within(dialog).findByText("OFF", { exact: true })).toBeVisible();
  const checkbox = screen.getByLabelText("Enable capture for new sessions");
  expect(checkbox).not.toBeChecked();
  await user.click(checkbox);
  await user.clear(screen.getByLabelText("Text retention (days)"));
  await user.type(screen.getByLabelText("Text retention (days)"), "3");
  fixture.state.settingsFailure = 409;
  await user.click(
    screen.getByRole("button", { name: "Save capture settings" }),
  );
  await screen.findByText(
    "Settings changed. Reload current settings before saving.",
  );
  expect(checkbox).toBeChecked();
  fixture.state.settings.revision = 9;
  fixture.state.settingsFailure = 0;
  await user.click(
    screen.getByRole("button", { name: "Reload current settings" }),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Text retention (days)")).toHaveValue(7),
  );
  await user.click(screen.getByLabelText("Enable capture for new sessions"));
  await user.click(
    screen.getByRole("button", { name: "Save capture settings" }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(
    fixture.state.requests.filter((r) => r.method === "PUT").map((r) => r.body),
  ).toEqual([
    { capture_enabled: true, retention_days: 3, revision: 2 },
    { capture_enabled: true, retention_days: 7, revision: 9 },
  ]);
});
it("clears protected text on route close and account switch and rejects a late old-account transcript response", async () => {
  fixture.state.transcript = structuredClone(transcript);
  fixture.state.settings.capture_enabled = true;
  fixture.state.call.privacy.reason = "captured";
  const { user, client, router } = await setup(`/calls/${id}`);
  let release!: () => void;
  const pending = new Promise<void>((r) => {
    release = r;
  });
  hold = async (url) => {
    if (url.endsWith("/transcript?limit=25")) await pending;
  };
  await user.click(
    await screen.findByRole("button", { name: "Check protected transcript" }),
  );
  await waitFor(() =>
    expect(
      fixture.state.requests.some((r) => r.path.endsWith("/transcript")),
    ).toBe(true),
  );
  await user.click(screen.getByRole("button", { name: "Sign out" }));
  fixture.state.account = 2;
  fixture.state.role = "staff";
  await signIn(user);
  await act(() => router.navigate(`/calls/${id}`));
  hold = undefined;
  release();
  expect(
    await screen.findByText(
      /Transcript access is limited to owners and admins/,
    ),
  ).toBeVisible();
  expect(screen.getByRole("heading", { name: "Session review" })).toHaveFocus();
  expect(screen.queryByText(/مصنوعی ملاقات چاہیے/)).toBeNull();
  expect(
    JSON.stringify(
      client
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    ),
  ).not.toContain("مصنوعی ملاقات چاہیے");
});
it("shows an explicit hourly overflow for a cohort with enough distinct groups", async () => {
  fixture = analyticsFixture("hourly_limit");
  await setup();
  expect(
    await screen.findByText(/more than the 2000 group limit/),
  ).toBeVisible();
  expect(
    fixture.state.overview.days.reduce((sum, d) => sum + d.sessions, 0),
  ).toBe(2001);
});
it("shows raw-retention unavailability for a historical date selection", async () => {
  const { user } = await setup();
  fixture.state.overview.days = fixture.state.overview.days.map((day, i) => ({
    ...day,
    local_date: i === 0 ? "2026-07-30" : "2026-07-31",
  }));
  fixture.state.overview.hours.items = fixture.state.overview.hours.items.map(
    (hour) => ({
      ...hour,
      bucket_start: hour.bucket_start.replace("2026-11-08", "2026-07-31"),
      local_date: "2026-07-31",
    }),
  );
  fixture.state.latency.unavailable_reason = "raw_retention";
  fixture.state.latency.stages = [];
  fixture.state.intents.items = [];
  fixture.state.intents.unavailable_reason = "raw_retention";
  fixture.state.gaps.items = [];
  fixture.state.gaps.total = 0;
  fixture.state.gaps.unavailable_reason = "raw_retention";
  fixture.state.alerts.items = [];
  fixture.state.alerts.total = 0;
  await user.clear(screen.getByLabelText("From"));
  await user.type(screen.getByLabelText("From"), "2026-07-25");
  await user.clear(screen.getByLabelText("Through"));
  await user.type(screen.getByLabelText("Through"), "2026-07-31");
  await user.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(
    await screen.findByText(
      "Timing data unavailable: Outside the 90-day measurement window.",
    ),
  ).toBeVisible();
});
it("keeps initial loading distinct from an empty or zero analytics cohort", async () => {
  let release!: () => void;
  const pending = new Promise<void>((r) => {
    release = r;
  });
  hold = async (url) => {
    if (new URL(url).pathname.endsWith("/overview")) await pending;
  };
  await setup();
  await screen.findByRole("heading", { name: "Analytics" });
  expect(screen.queryByText("1 voice · 2 text")).toBeNull();
  expect(
    screen
      .getAllByRole("status")
      .some((n) => n.textContent?.includes("Loading")),
  ).toBe(true);
  hold = undefined;
  await act(async () => {
    release();
    await pending;
  });
  expect(await screen.findByText("1 voice · 2 text")).toBeVisible();
});
it("clears text and its in-memory queries on close, then checks fresh authoritative privacy on reopen", async () => {
  fixture.state.transcript = structuredClone(transcript);
  fixture.state.settings.capture_enabled = true;
  fixture.state.call.privacy.reason = "captured";
  const { user, client } = await setup(`/calls/${id}`);
  await user.click(
    await screen.findByRole("button", { name: "Check protected transcript" }),
  );
  await screen.findByText(/مصنوعی ملاقات چاہیے/);
  await user.click(
    screen.getByRole("button", { name: "Close protected transcript" }),
  );
  await waitFor(() =>
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain("مصنوعی ملاقات چاہیے"),
  );
  fixture.state.transcript = {
    ...fixture.state.transcript,
    privacy: {
      text_access: "manager",
      availability: "unavailable",
      reason: "live_disabled",
    },
    items: [],
    total: 0,
    has_more: false,
    next_cursor: null,
  };
  await user.click(
    screen.getByRole("button", { name: "Check protected transcript" }),
  );
  await screen.findByText(privacyCopy.live_disabled, {
    selector: ".protected-transcript [role=status]",
  });
  expect(screen.queryByText(/مصنوعی ملاقات چاہیے/)).toBeNull();
});
it("hides text immediately during an uncertain deletion and requires an explicit current-state check", async () => {
  fixture.state.transcript = structuredClone(transcript);
  fixture.state.settings.capture_enabled = true;
  fixture.state.call.privacy.reason = "captured";
  const { user, client } = await setup(`/calls/${id}`);
  await user.click(
    await screen.findByRole("button", { name: "Check protected transcript" }),
  );
  await screen.findByText(/مصنوعی ملاقات چاہیے/);
  let release!: () => void;
  const pending = new Promise<void>((r) => {
    release = r;
  });
  fixture.state.failure = "transcript";
  hold = async (url) => {
    if (new URL(url).pathname.endsWith("/transcript")) await pending;
  };
  await user.click(screen.getByRole("button", { name: "Delete transcript" }));
  await user.click(
    screen.getByRole("button", { name: "Confirm transcript deletion" }),
  );
  await screen.findByText("Deleting transcript…");
  expect(screen.queryByText(/مصنوعی ملاقات چاہیے/)).toBeNull();
  expect(
    JSON.stringify(
      client
        .getQueryCache()
        .getAll()
        .map((q) => q.state.data),
    ),
  ).not.toContain("مصنوعی ملاقات چاہیے");
  hold = undefined;
  await act(async () => {
    release();
    await pending;
  });
  await screen.findByText(/Deletion could not be confirmed/);
  expect(screen.queryByText(/مصنوعی ملاقات چاہیے/)).toBeNull();
  const reads = fixture.state.requests.filter(
    (r) => r.path.endsWith("/transcript") && r.method === "GET",
  ).length;
  fixture.state.failure = "";
  await user.click(
    screen.getByRole("button", { name: "Check current transcript state" }),
  );
  expect(await screen.findByText(/مصنوعی ملاقات چاہیے/)).toBeVisible();
  expect(
    fixture.state.requests.filter(
      (r) => r.path.endsWith("/transcript") && r.method === "GET",
    ).length,
  ).toBeGreaterThan(reads);
});

it("keeps text-session measurements free of voice-only stages and shows real voice eligibility separately", async () => {
  const voiceOnly = [
    "stt_completion",
    "tts_first_byte",
    "end_of_speech_to_audio",
    "tts_buffered_generation",
    "audio_queue",
    "end_of_speech_to_audio_queue",
  ];
  expect(fixture.state.call.call.channel).toBe("text");
  expect(
    fixture.state.call.measurements.items.some((m) =>
      voiceOnly.includes(m.stage),
    ),
  ).toBe(false);
  fixture.state.latency.stages = fixture.state.latency.stages.map((s) =>
    voiceOnly.includes(s.stage)
      ? {
          ...s,
          eligible_sessions: 0,
          sampled_sessions: 0,
          samples: 0,
          p50_ms: null,
          p95_ms: null,
        }
      : s,
  );
  await setup("/analytics?channel=text");
  const stage = await screen.findByRole("row", { name: /TTS first byte/ });
  expect(stage).toHaveTextContent("0 / 0");
  expect(within(stage).getAllByText("Unknown")).toHaveLength(2);
});
it("labels alert evidence with its actual units, counts and evaluation window", async () => {
  const base = fixture.state.alerts.items[0]!;
  fixture.state.alerts.items = [
    base,
    {
      ...base,
      id: "latency",
      kind: "latency",
      channel: "voice",
      language: "ur",
      observed_value: 2200,
      numerator: 6,
      denominator: 6,
    },
    {
      ...base,
      id: "tool",
      kind: "tool_failure",
      channel: "text",
      observed_value: 0.25,
      numerator: 2,
      denominator: 8,
    },
    {
      ...base,
      id: "provider",
      kind: "provider_failure",
      channel: "text",
      observed_value: 2,
      numerator: 2,
      denominator: 9,
    },
    {
      ...base,
      id: "ended",
      kind: "ended_error",
      channel: "text",
      observed_value: 1,
      numerator: 1,
      denominator: 4,
    },
  ];
  fixture.state.alerts.total = 5;
  await setup();
  expect(
    await screen.findByText("Oldest queued: 16m 40s · 1 queued job"),
  ).toBeVisible();
  expect(screen.getByText("2,200 ms p95 · Urdu · 6 samples")).toBeVisible();
  expect(screen.getByText("25% · 2 / 8 failed tool results")).toBeVisible();
  expect(
    screen.getByText("2 failed / 9 provider invocations · 15 min window"),
  ).toBeVisible();
  expect(
    screen.getByText("1 error / 4 ended sessions · 15 min window"),
  ).toBeVisible();
});

it("keeps a genuinely empty cohort unknown and separates configured zero-price usage", async () => {
  fixture = analyticsFixture("empty");
  await setup();
  expect(await screen.findByText("0 voice · 0 text")).toBeVisible();
  expect(screen.getAllByText("Unknown · 0 / 0")).not.toHaveLength(0);
  expect(screen.queryByText("USD 0")).toBeNull();
  expect(screen.queryByText(/group limit/)).toBeNull();
  expect(fixture.state.overview.usage.invocations).toBe(0);
  expect(fixture.state.quality.task_completion.denominator).toBe(0);
});
it.each([
  {
    name: "ended",
    ended_at: "2026-11-08T10:00:12Z",
    status: "ended",
    pending_expiry: false,
    expected: "12s",
  },
  {
    name: "real zero",
    ended_at: "2026-11-08T10:00:00Z",
    status: "ended",
    pending_expiry: false,
    expected: "0s",
  },
  {
    name: "active",
    ended_at: null,
    status: "active",
    pending_expiry: false,
    expected: "Ongoing",
  },
  {
    name: "disconnected",
    ended_at: null,
    status: "disconnected",
    pending_expiry: false,
    expected: "Ongoing",
  },
  {
    name: "awaiting expiry",
    ended_at: null,
    status: "active",
    pending_expiry: true,
    expected: "End pending",
  },
  {
    name: "failed without end timestamp",
    ended_at: null,
    status: "failed",
    pending_expiry: false,
    expected: "Unavailable",
  },
] as const)(
  "shows the actual $name session duration state in its call row",
  async ({ ended_at, status, pending_expiry, expected }) => {
    Object.assign(fixture.state.call.call, {
      ended_at,
      status,
      pending_expiry,
    });
    await setup("/calls");
    const review = await screen.findByRole("link", {
      name: `Review session ${id}`,
    });
    const row = review.closest("tr")!;
    expect(within(row).getByText(`Duration: ${expected}`)).toBeVisible();
  },
);
it.each(["/analytics", "/calls"])(
  "keeps production scope visible outside closed help on %s",
  async (path) => {
    await setup(path);
    expect(
      await screen.findByText("Production sessions · draft tests excluded"),
    ).toBeVisible();
    expect(document.querySelector(".analytics-help[open]")).toBeNull();
  },
);
it("returns close focus to the newly mounted transcript opener and reopens with the keyboard", async () => {
  fixture.state.transcript = structuredClone(transcript);
  fixture.state.settings.capture_enabled = true;
  fixture.state.call.privacy.reason = "captured";
  const { user } = await setup(`/calls/${id}`);
  const heading = await screen.findByRole("heading", {
    name: "Session review",
  });
  expect(heading).toHaveFocus();
  const original = await screen.findByRole("button", {
    name: "Check protected transcript",
  });
  await user.click(original);
  await screen.findByText(/مصنوعی ملاقات چاہیے/);
  await user.click(
    screen.getByRole("button", { name: "Close protected transcript" }),
  );
  const remounted = screen.getByRole("button", {
    name: "Check protected transcript",
  });
  expect(remounted).not.toBe(original);
  expect(remounted).toHaveFocus();
  await user.keyboard("{Enter}");
  expect(await screen.findByText(/مصنوعی ملاقات چاہیے/)).toBeVisible();
});
