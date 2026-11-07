import {
  agent,
  draft,
  voices,
  version,
  testSnapshot,
} from "../agents/fixtures.test-support";
import type {
  Knowledge_Contracts__Capabilities as Capabilities,
  SourceDetailOut,
  SourceOut,
} from "../../api/dashboard.generated";
export const source: SourceDetailOut = {
  id: "11111111-1111-4111-8111-111111111111",
  agent_id: agent.id,
  kind: "text",
  name: "Clinic guide · کلینک رہنما",
  revision: 3,
  status: "failed",
  available: true,
  active_generation_id: "22222222-2222-4222-8222-222222222222",
  chunk_count: 2,
  error_code: "embedding_unavailable",
  error_at: "2026-10-29T10:00:00Z",
  updated_at: "2026-10-29T10:00:00Z",
  input: {
    kind: "text",
    format: "md",
    text: "محفوظ مصنوعی رہنما۔ <script>alert('escaped')</script>",
  },
};
export const capabilities: Capabilities = {
  enabled: true,
  processing_available: false,
  unavailable_reason: "worker_stale",
  query_available: true,
  query_unavailable_reason: null,
  upload_max_bytes: 10485760,
  source_limit: 64,
};
export function knowledgeFixture() {
  const state = {
    sources: [structuredClone(source)],
    capabilities: structuredClone(capabilities),
    writes: [] as {
      path: string;
      method: string;
      body: unknown;
      key: string | null;
      checksum: string | null;
      query: string;
    }[],
    writeFailure: 0,
    readFailure: 0,
    searchFailure: false,
    searches: [] as unknown[],
    detailReads: 0,
    detailFailure: 0,
    listReads: 0,
  };
  function handle(
    url: string,
    method: string,
    body: unknown,
    headers: Headers,
  ): { status: number; body: unknown } {
    const parsed = new URL(url),
      path = parsed.pathname;
    const ok = (body: unknown) => ({ status: 200, body });
    if (path === "/auth/login")
      return ok({
        access_token: "synthetic-access",
        refresh_token: "synthetic-refresh",
        expires_in: 300,
      });
    if (path === "/auth/me")
      return ok({
        id: "staff",
        tenant_id: "clinic",
        role: "owner",
        email: "synthetic@example.test",
      });
    if (path === "/auth/logout") return ok({});
    if (path === "/dashboard/clinic")
      return ok({ name: "Synthetic clinic", timezone: "Asia/Karachi" });
    if (path === "/dashboard/setup")
      return ok({
        profile: false,
        providers: false,
        services: false,
        hours: false,
        agent: true,
      });
    if (path === "/dashboard/agents") return ok([agent]);
    if (path === "/dashboard/voices") return ok(voices);
    if (path.endsWith("/draft")) return ok(draft);
    if (path.endsWith("/versions")) return ok([version]);
    if (path.endsWith("/tests"))
      return ok({
        ...testSnapshot,
        expires_at: new Date(Date.now() + 1800000).toISOString(),
      });
    if (path.endsWith("/turns"))
      return ok({
        id: testSnapshot.id,
        revision: 2,
        status: "active",
        messages: [{ role: "assistant", text: "مصنوعی کلینک کی رہنمائی۔" }],
        tool_trace: [],
        knowledge: {
          status: "ready",
          citations: [
            {
              source_id: source.id,
              source_name: source.name,
              chunk_id: "33333333-3333-4333-8333-333333333333",
              heading: "آمد",
              language: "ur",
              cosine: 0.72,
              quote: "اپنی ملاقات سے دس منٹ پہلے آئیں۔",
            },
          ],
        },
      });
    if (path.endsWith("/end")) return ok({ ...testSnapshot, status: "ended" });
    if (!path.includes("/knowledge")) return ok(agent);
    if (path.endsWith("/search")) {
      state.searches.push(body);
      if (state.searchFailure)
        return {
          status: 503,
          body: {
            error: { code: "unavailable", message: "Search unavailable" },
          },
        };
      return ok({
        reason: "ready",
        chunks: [
          {
            chunk_id: "chunk",
            source_id: source.id,
            generation_id: source.active_generation_id,
            profile: "fixture",
            name: source.name,
            heading: "آمد",
            language: "ur",
            text: "اپنی ملاقات سے دس منٹ پہلے آئیں۔",
            cosine: 0.72,
            score: 0.03,
          },
        ],
      });
    }
    if (method === "GET") {
      if (path.endsWith("/capabilities")) return ok(state.capabilities);
      if (path.endsWith("/sources")) {
        state.listReads++;
        if (state.readFailure)
          return {
            status: state.readFailure,
            body: {
              error: {
                code: "unavailable",
                message: "Sources could not refresh",
              },
            },
          };
        return ok(
          state.sources.map((item) => {
            const metadata = { ...item };
            delete (metadata as Partial<SourceDetailOut>).input;
            return metadata;
          }),
        );
      }
      if (path.endsWith("/preview"))
        return ok({
          source_id: source.id,
          available: true,
          reason: "ready",
          excerpts: [source.input.kind === "text" ? source.input.text : ""],
        });
      state.detailReads++;
      if (state.detailFailure)
        return {
          status: state.detailFailure,
          body: {
            error: {
              code: "unavailable",
              message: "Source detail unavailable",
            },
          },
        };
      return ok(state.sources.find((s) => path.endsWith(s.id)) ?? source);
    }
    state.writes.push({
      path,
      method,
      body,
      key: headers.get("Idempotency-Key"),
      checksum: headers.get("X-Content-SHA256"),
      query: parsed.search,
    });
    if (state.writeFailure)
      return {
        status: state.writeFailure,
        body: {
          error: {
            code:
              state.writeFailure === 409 ? "revision_conflict" : "unavailable",
            message:
              state.writeFailure === 409
                ? "Source changed. Reload its revision."
                : "Outcome could not be confirmed.",
            details: {
              fields:
                state.writeFailure === 422
                  ? { name: "Check this source name." }
                  : {},
            },
          },
        },
      };
    const existing = state.sources.find((s) => path.includes(s.id));
    if (method === "DELETE") {
      state.sources = state.sources.filter((s) => s.id !== existing?.id);
      return ok({ ...existing, status: "deleted", available: false });
    }
    const payload =
      body && typeof body === "object" && !(body instanceof Blob)
        ? (body as Record<string, unknown>)
        : {};
    const kind =
      path.endsWith("/upload") || path.endsWith("/content")
        ? "file"
        : (payload.kind ?? existing?.kind ?? "text");
    const result = {
      ...(existing ?? source),
      id: existing?.id ?? crypto.randomUUID(),
      kind,
      name: parsed.searchParams.get("name") ?? payload.name ?? existing?.name,
      revision: (existing?.revision ?? 0) + 1,
      status: "queued",
      error_code: null,
      available: existing?.available ?? false,
      input:
        kind === "file"
          ? { kind: "file", format: parsed.searchParams.get("format") }
          : { ...payload, kind },
    } as SourceDetailOut;
    state.sources = [
      ...state.sources.filter((s) => s.id !== result.id),
      result,
    ];
    const metadata = { ...result };
    delete (metadata as Partial<SourceDetailOut>).input;
    return ok(metadata as SourceOut);
  }
  return { state, handle };
}
