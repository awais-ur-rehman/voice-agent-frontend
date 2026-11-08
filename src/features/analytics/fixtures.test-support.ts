import type {
  Filters,
  CallDetail,
  CallPage,
  Overview,
  Quality,
  Latency,
  Intents,
  KnowledgeGaps,
  AlertPage,
  TranscriptPage,
  SettingsView,
} from "../../api/dashboard.generated";
import { knowledgeFixture } from "../knowledge/fixtures.test-support";
export const now = "2026-11-08T10:00:00Z";
export const id = "11111111-1111-4111-8111-111111111111";
export const secondId = "22222222-2222-4222-8222-222222222222";
const freshness = {
  as_of: now,
  stale: true,
  pending_buckets: 2,
  pending_expirations: 1,
};
const filters = {
  start: "2026-11-02",
  end: "2026-11-08",
  channel: "all" as const,
};
const shared = {
  filters,
  freshness,
  snapshot_at: now,
  timezones: ["Asia/Karachi"],
};
const nil = { value: null, numerator: 0, denominator: 0 };
export const overview: Overview = {
  ...shared,
  sessions: 3,
  text_sessions: 2,
  voice_sessions: 1,
  ended_sessions: 2,
  booking_conversion: { value: 0.5, numerator: 1, denominator: 2 },
  handoff_rate: { value: 0, numerator: 0, denominator: 2 },
  abandonment_rate: { value: 0.5, numerator: 1, denominator: 2 },
  average_duration_ms: 12000,
  duration_samples: 2,
  book_operations: 1,
  cancel_operations: 0,
  reschedule_operations: 0,
  usage: {
    invocations: 3,
    usage_known: 2,
    cost_known: 1,
    input_tokens: 100,
    output_tokens: 40,
    estimated_usd: "0.00000003",
  },
  days: [
    {
      local_date: "2026-11-07",
      sessions: 0,
      ended_sessions: 0,
      booking_sessions: 0,
    },
    {
      local_date: "2026-11-08",
      sessions: 3,
      ended_sessions: 2,
      booking_sessions: 1,
    },
  ],
  hours: {
    limit: 2000,
    unavailable_reason: null,
    items: [
      {
        bucket_start: "2026-11-08T05:00:00Z",
        timezone: "Asia/Karachi",
        utc_offset_minutes: 300,
        channel: "text",
        local_date: "2026-11-08",
        sessions: 2,
        ended_sessions: 1,
        booking_sessions: 1,
      },
      {
        bucket_start: "2026-11-08T06:00:00Z",
        timezone: "Asia/Karachi",
        utc_offset_minutes: 300,
        channel: "voice",
        local_date: "2026-11-08",
        sessions: 1,
        ended_sessions: 1,
        booking_sessions: 0,
      },
    ],
  },
};
export const quality: Quality = {
  ...shared,
  task_completion: { value: 0.5, numerator: 1, denominator: 2 },
  tool_failure: { value: 0, numerator: 0, denominator: 4 },
  repeated_question: nil,
  turns_per_task: { value: 2, numerator: 4, denominator: 2 },
};
export const latency: Latency = {
  ...shared,
  unavailable_reason: null,
  stages: [
    {
      stage: "command_total",
      diagnostic: false,
      eligible_sessions: 3,
      sampled_sessions: 2,
      samples: 4,
      p50_ms: 120,
      p95_ms: 190,
    },
    {
      stage: "llm_first_token",
      diagnostic: false,
      eligible_sessions: 3,
      sampled_sessions: 0,
      samples: 0,
      p50_ms: null,
      p95_ms: null,
    },
    {
      stage: "tts_first_byte",
      diagnostic: false,
      eligible_sessions: 1,
      sampled_sessions: 0,
      samples: 0,
      p50_ms: null,
      p95_ms: null,
    },
    {
      stage: "audio_queue",
      diagnostic: true,
      eligible_sessions: 1,
      sampled_sessions: 1,
      samples: 1,
      p50_ms: 0,
      p95_ms: 0,
    },
  ],
};
export const intents: Intents = {
  ...shared,
  unavailable_reason: null,
  overlapping: true,
  items: [
    {
      intent: "book",
      sessions: 2,
      share: { value: 2 / 3, numerator: 2, denominator: 3 },
    },
    {
      intent: "information",
      sessions: 2,
      share: { value: 2 / 3, numerator: 2, denominator: 3 },
    },
  ],
};
export const gaps: KnowledgeGaps = {
  ...shared,
  unavailable_reason: null,
  items: [
    {
      fingerprint: "keyed-946a2e9d",
      decision: "below_threshold",
      occurrences: 2,
    },
  ],
  irrelevant: 2,
  unavailable: 0,
  unattributed_observations: 4,
  total: 1,
  has_more: false,
  next_cursor: null,
};
export const alerts: AlertPage = {
  freshness,
  snapshot_at: now,
  date_basis: "last_seen_utc_date",
  total: 1,
  has_more: false,
  next_cursor: null,
  items: [
    {
      id: "alert",
      agent_id: "agent-one",
      channel: null,
      kind: "backlog",
      language: "unknown",
      state: "open",
      observed_value: 1000,
      numerator: 1,
      denominator: 1,
      opened_at: now,
      last_seen_at: now,
      resolved_at: null,
      window_start: "2026-11-08T09:45:00Z",
      window_end: now,
    },
  ],
};
export const call: CallDetail = {
  call: {
    session_id: id,
    agent_id: "agent-one",
    channel: "text",
    language: "ur",
    timezone: "Asia/Karachi",
    utc_offset_minutes: 300,
    local_date: "2026-11-08",
    started_at: now,
    ended_at: "2026-11-08T10:00:12Z",
    expires_at: "2026-11-08T10:30:00Z",
    status: "ended",
    outcome: "booked",
    end_reason: "caller_end",
    pending_expiry: false,
    quality_flags: ["repeated_prompt"],
  },
  attempted_tasks: 1,
  completed_tasks: 1,
  operations: { book: 1, cancel: 0, reschedule: 0 },
  summary: "Completed 1 of 1 scheduling tasks; 1 booking operation.",
  trace_id: "33333333-3333-4333-8333-333333333333",
  usage: overview.usage,
  privacy: {
    availability: "unavailable_to_role",
    text_access: "restricted",
    reason: "off",
  },
  events: {
    items: [
      {
        ordinal: 1,
        kind: "turn.user",
        language: "ur",
        occurred_at: now,
        tool_name: null,
        tool_status: null,
      },
      {
        ordinal: 7,
        kind: "turn.assistant",
        language: "ur",
        occurred_at: now,
        tool_name: null,
        tool_status: null,
      },
    ],
    total: 3,
    has_more: true,
    next_cursor: 7,
  },
  measurements: {
    items: [
      {
        id: "m1",
        stage: "command_total",
        duration_ms: 123,
        origin: "server",
        language: "ur",
        observed_at: now,
        turn_ordinal: 7,
      },
      {
        id: "m2",
        stage: "llm_completion",
        duration_ms: 0,
        origin: "server",
        language: "ur",
        observed_at: now,
        turn_ordinal: null,
      },
    ],
    total: 3,
    has_more: true,
    next_cursor: "measurement-next",
  },
};
export const transcript: TranscriptPage = {
  privacy: {
    availability: "available",
    text_access: "manager",
    reason: "available",
  },
  residual_sensitive_content: true,
  total: 3,
  has_more: true,
  next_cursor: 7,
  items: [
    {
      ordinal: 1,
      speaker: "user",
      occurred_at: now,
      text: "مصنوعی ملاقات چاہیے۔ <script>alert('escaped')</script>",
    },
    {
      ordinal: 7,
      speaker: "assistant",
      occurred_at: now,
      text: "Synthetic redacted reply · آپ کی ملاقات محفوظ ہے۔",
    },
  ],
};
export function analyticsFixture(
  mode:
    | "populated"
    | "empty"
    | "zero_cost"
    | "hourly_limit"
    | "sample_limit" = "populated",
) {
  const base = knowledgeFixture();
  const state = {
    role: "owner",
    account: 1,
    requests: [] as {
      path: string;
      query: string;
      method: string;
      body: unknown;
      authorization: string | null;
    }[],
    failure: "",
    settingsFailure: 0,
    settings: {
      capture_enabled: false as boolean,
      retention_days: 7,
      revision: 2,
      updated_at: now,
    } satisfies SettingsView,
    overview: structuredClone(overview),
    quality: structuredClone(quality),
    latency: structuredClone(latency),
    intents: structuredClone(intents),
    gaps: structuredClone(gaps),
    alerts: structuredClone(alerts),
    call: structuredClone(call),
    transcript: {
      ...structuredClone(transcript),
      privacy: {
        availability: "unavailable",
        text_access: "manager",
        reason: "off",
      },
      items: [],
      total: 0,
      has_more: false,
      next_cursor: null,
    } as TranscriptPage,
    deleted: false,
  };
  if (mode === "empty") {
    Object.assign(state.overview, {
      sessions: 0,
      text_sessions: 0,
      voice_sessions: 0,
      ended_sessions: 0,
      days: [],
      booking_conversion: { ...nil },
      handoff_rate: { ...nil },
      abandonment_rate: { ...nil },
      book_operations: 0,
      cancel_operations: 0,
      reschedule_operations: 0,
      average_duration_ms: null,
      duration_samples: 0,
      usage: {
        invocations: 0,
        usage_known: 0,
        cost_known: 0,
        input_tokens: null,
        output_tokens: null,
        estimated_usd: null,
      },
      hours: { items: [], limit: 2000, unavailable_reason: null },
    });
    Object.assign(state.quality, {
      task_completion: { ...nil },
      tool_failure: { ...nil },
      repeated_question: { ...nil },
      turns_per_task: { ...nil },
    });
    state.latency.stages = state.latency.stages.map((stage) => ({
      ...stage,
      eligible_sessions: 0,
      sampled_sessions: 0,
      samples: 0,
      p50_ms: null,
      p95_ms: null,
    }));
    state.intents.items = [];
    Object.assign(state.gaps, {
      items: [],
      total: 0,
      irrelevant: 0,
      unavailable: 0,
      unattributed_observations: 0,
    });
    state.alerts.items = [];
    state.alerts.total = 0;
    for (const view of [
      state.overview,
      state.quality,
      state.latency,
      state.intents,
      state.gaps,
      state.alerts,
    ])
      view.freshness = {
        as_of: now,
        stale: false,
        pending_buckets: 0,
        pending_expirations: 0,
      };
  }
  if (mode === "zero_cost")
    state.overview.usage = {
      ...state.overview.usage,
      usage_known: 3,
      cost_known: 3,
      estimated_usd: "0",
    };
  if (mode === "hourly_limit" || mode === "sample_limit") {
    Object.assign(state.overview, {
      sessions: 2001,
      voice_sessions: 1001,
      text_sessions: 1000,
    });
    state.intents.items = state.intents.items.map((item) => ({
      ...item,
      share: {
        value: item.sessions / 2001,
        numerator: item.sessions,
        denominator: 2001,
      },
    }));
    state.latency.stages = state.latency.stages.map((stage) => ({
      ...stage,
      eligible_sessions: ["tts_first_byte", "audio_queue"].includes(stage.stage)
        ? 1001
        : 2001,
    }));
    if (mode === "hourly_limit") {
      state.overview.timezones = [
        "Asia/Karachi",
        "UTC",
        "Europe/London",
        "America/New_York",
        "Asia/Kathmandu",
        "Asia/Tokyo",
        "Australia/Sydney",
      ];
      state.overview.days = Array.from({ length: 7 }, (_, i) => ({
        local_date: `2026-11-${String(i + 2).padStart(2, "0")}`,
        sessions: i === 0 ? 285 : 286,
        ended_sessions: i === 6 ? 2 : 0,
        booking_sessions: i === 6 ? 1 : 0,
      }));
      state.overview.hours = {
        items: [],
        limit: 2000,
        unavailable_reason: "series_limit",
      };
    } else {
      state.overview.days = [
        {
          local_date: "2026-11-08",
          sessions: 2001,
          ended_sessions: 2,
          booking_sessions: 1,
        },
      ];
      state.overview.hours.items = state.overview.hours.items.map((hour) => ({
        ...hour,
        sessions: hour.channel === "voice" ? 1001 : 1000,
      }));
      state.latency.stages = [];
      state.latency.unavailable_reason = "sample_limit";
    }
  }
  if (mode === "hourly_limit" || mode === "sample_limit")
    for (const view of [
      state.quality,
      state.latency,
      state.intents,
      state.gaps,
    ])
      view.timezones = [...state.overview.timezones];
  function handle(
    url: string,
    method: string,
    body: unknown,
    headers: Headers,
  ): { status: number; body: unknown } {
    const u = new URL(url),
      path = u.pathname;
    state.requests.push({
      path,
      query: u.search,
      method,
      body,
      authorization: headers.get("authorization"),
    });
    const ok = (body: unknown) => ({
      status: 200,
      body: structuredClone(body),
    });
    const scoped = <T extends { filters: Filters }>(view: T) =>
      ok({
        ...view,
        filters: {
          start: u.searchParams.get("start") ?? view.filters.start,
          end: u.searchParams.get("end") ?? view.filters.end,
          channel: u.searchParams.get("channel") ?? "all",
          ...(u.searchParams.has("agent_id")
            ? { agent_id: u.searchParams.get("agent_id") }
            : {}),
          ...(u.searchParams.has("timezone")
            ? { timezone: u.searchParams.get("timezone") }
            : {}),
        },
      });
    if (path === "/auth/me")
      return ok({
        id: `staff-${state.account}`,
        tenant_id: `clinic-${state.account}`,
        role: state.role,
        email: "synthetic@example.test",
      });
    if (state.failure && path.endsWith(state.failure))
      return {
        status: 503,
        body: {
          error: {
            code: "unavailable",
            message: "Analytics temporarily unavailable",
          },
        },
      };
    if (path === "/dashboard/analytics/settings") {
      if (method === "PUT") {
        if (state.settingsFailure)
          return {
            status: state.settingsFailure,
            body: {
              error: {
                code: "revision_conflict",
                message: "Settings changed. Reload current revision.",
              },
            },
          };
        const value = body as {
          capture_enabled: boolean;
          retention_days: number;
          revision: number;
        };
        if (value.revision !== state.settings.revision)
          return {
            status: 409,
            body: {
              error: {
                code: "revision_conflict",
                message: "Settings changed. Reload current revision.",
              },
            },
          };
        state.settings = {
          ...value,
          revision: value.revision + 1,
          updated_at: now,
        };
      }
      return ok(state.settings);
    }
    if (path.startsWith("/dashboard/analytics/")) {
      const name = path.split("/").at(-1);
      if (name === "overview") return scoped(state.overview);
      if (name === "quality") return scoped(state.quality);
      if (name === "latency") return scoped(state.latency);
      if (name === "intents") return scoped(state.intents);
      if (name === "knowledge-gaps") return scoped(state.gaps);
      if (name === "alerts") return ok(state.alerts);
    }
    if (path.endsWith("/transcript")) {
      if (state.role === "staff")
        return {
          status: 403,
          body: { error: { code: "forbidden", message: "Forbidden" } },
        };
      if (method === "DELETE") {
        state.deleted = true;
        state.call.privacy.reason = "deleted";
        return { status: 204, body: undefined };
      }
      if (state.deleted)
        return ok({
          ...state.transcript,
          privacy: {
            text_access: "manager",
            availability: "unavailable",
            reason: "deleted",
          },
          items: [],
          total: 0,
          has_more: false,
          next_cursor: null,
        });
      if (u.searchParams.has("after"))
        return ok({
          ...state.transcript,
          items: [
            {
              ordinal: 9,
              speaker: "assistant",
              occurred_at: now,
              text: "Final synthetic reply.",
            },
          ],
          has_more: false,
          next_cursor: null,
        });
      return ok(state.transcript);
    }
    if (path === "/dashboard/calls") {
      if (mode === "empty")
        return ok({
          snapshot_at: now,
          total: 0,
          items: [],
          has_more: false,
          next_cursor: null,
        });
      const page: CallPage = {
        snapshot_at: now,
        total: 2,
        has_more: !u.searchParams.has("after"),
        next_cursor: u.searchParams.has("after") ? null : "call-next",
        items: [
          {
            ...state.call.call,
            session_id: u.searchParams.has("after") ? secondId : id,
          },
        ],
      };
      if (u.searchParams.get("outcome") === "error")
        return ok({
          ...page,
          total: 0,
          items: [],
          has_more: false,
          next_cursor: null,
        });
      return ok(page);
    }
    if (path.startsWith("/dashboard/calls/")) {
      const result = structuredClone(state.call);
      result.call.session_id = path.split("/").at(-1)!;
      if (u.searchParams.has("after"))
        result.events = {
          items: [
            {
              ordinal: 9,
              kind: "tool.result",
              language: "ur",
              occurred_at: now,
              tool_name: "book_appointment",
              tool_status: "success",
            },
          ],
          total: 3,
          has_more: false,
          next_cursor: null,
        };
      if (u.searchParams.has("measurement_after"))
        result.measurements = {
          items: [
            {
              id: "m3",
              stage: "tool",
              duration_ms: 80,
              origin: "server",
              language: "ur",
              observed_at: now,
              turn_ordinal: 9,
            },
          ],
          total: 3,
          has_more: false,
          next_cursor: null,
        };
      return ok(result);
    }
    return base.handle(url, method, body, headers);
  }
  return { state, handle };
}
