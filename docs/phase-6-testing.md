# Phase 6 analytics owner testing

Keep Phase6 stacked on Phase5 and unmerged; stop at owner review. Backend [checkpoint instructions](../../backend/docs/phase-6-testing.md) describe the private backup, additive0010–0016 rollout, narrow role, disabled inference and actual ledger/API reconciliation. The sibling link is local-workspace guidance; the backend repository owns the published counterpart.

Open http://localhost:5176/analytics?start=2026-11-08&end=2026-11-08 and sign in with the fictional Pearl Dental Studio — Demo account in backend `.local/dental-demo.json` (mode0600; never commit or print). Confirm5 Text/0 Voice,5 ended,0 bookings/cancellations/reschedules, booking0/5, handoff1/5, abandonment1/5, fresh rollups, unknown model cost and absent canonical speech latency. The single Urdu-script controlled-command input retained observed English classification; this is not an Urdu/native quality acceptance claim. Later owner sessions can change counts.

Navigate Calls & sessions to the actual information session and check protected transcript. Capture was OFF at start and remains OFF; no text rows exist. Review the processing_pending knowledge gap. Its24 dental sources remain queued with0 vectors. Fixture tests are separate from these actual observations.

Run `npm run check` and `npm run test:browser` for ordinary local/CI coverage. The real integration case is opt-in and otherwise explicitly skipped before private files are read:

```sh
PHASE6_LOCAL_DEMO=1 PLAYWRIGHT_BASE_URL=http://localhost:5176 PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:browser -- e2e/analytics-local.spec.ts
```

It uses the existing frontend when available, or Playwright's own temporary dev server, fixed loopback/synthetic-tenant guards, backend `.local/phase6/demo-proof.json` and private credentials in process. It uses normal API login without mocks and is read-only afterward. It captures actual analytics/detail screenshots and all console warnings/errors, checks real session ID linkage, and verifies empty local/session storage. No trace/video or reusable browser credential store is configured. Keep failed private artifacts private: login-error snapshots may include form state.

Existing calendar ResizeObserver, terminal NO_COLOR/FORCE_COLOR and bundle advisory messages remain visible in their runs. Native speech, embeddings, unknown usage/rates, exporter, production load and backup restore remain unqualified. See [results](phase-6-results.md) for exact evidence and source heads; root review/publication/hosted CI and owner acceptance are separate finishing steps.


## Final correction checks

On both Analytics and Calls, dates remain saved local admission dates. With no URL dates, defaults wait for the clinic profile and use that timezone, or the explicitly selected timezone. The allowed envelope is UTC today−365 through UTC today+1, at most 31 inclusive dates. For example, `2026-11-08T21:00:00Z` is already November 9 in Karachi; the deterministic tests use that instant rather than assuming the host's date. Explicit dates and unsaved edits must survive profile/name refreshes. Open an agent-filtered URL and verify that delayed names replace “Historical agent” with the active name without changing the selected ID; Apply must retain that ID on both pages.

The correction gates are full native controls plus native Ruff/format, full frontend `npm run check`, maintained browser fixtures and the separate opt-in read-only actual-API case. No backend-core/schema/image changes were required; the prior full core proof remains tied to unchanged bytes. Do not recreate demo sessions to refresh process telemetry after a container restart. Keep durable counts distinct from counters scoped to one API process.
