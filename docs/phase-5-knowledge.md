# Phase 5 knowledge workspace

Task 6 extends the approved compact operations design. This is frontend fixture acceptance only. The owner API remains on Phase 4 until Task 7; real embedding qualification and live knowledge rollout remain deferred.

## Public contracts

`contracts/dashboard.v1.json` is copied verbatim from the approved backend schema. `npm run contracts:generate` emits typed JSON unions and `Blob` bodies for the two `application/octet-stream` operations. `npm run contracts:check` compares the snapshot with the adjacent backend when present.

The source library uses `/dashboard/agents/{agent_id}/knowledge/capabilities`, `/sources`, protected `/sources/{source_id}` detail, and `/preview`. Text, FAQ and public HTTPS inputs use the exact discriminated create/update schemas. Updates and reindex capture a revision in the JSON body; deletion uses the revision query parameter. File uploads/replacements use raw bytes, `name`/`format` query parameters, replacement `revision`, `X-Content-SHA256`, and `Idempotency-Key`. Source list/write responses contain metadata only; editable input comes from protected detail.

Processing and query availability are separate. A failed or queued replacement may leave a previous processed generation available. Source status never implies query-service availability. Queued/processing metadata triggers a two-second poll while Knowledge is visible; settled sources do not poll. Failed refreshes retain visible cached data and expose an explicit refresh action.

Manager search sends trimmed query, `en`/`ur` language and a generated `query_id`. An uncertain response retains that same query identity for retry. It displays up to four returned matches, not generated prose. The existing isolated test panel consumes optional `TurnResult.knowledge`, reports the returned decision, and renders up to four bounded citations with names, headings and quoted text. No second test console is introduced.

## State and navigation

`/agents/:identity/*` owns one persistent editor keyed by authenticated session and agent. `/agents/:identity/knowledge` is the Knowledge section. General and Voice draft values survive route changes, source writes and query refreshes. Source writes invalidate only knowledge queries. Protected deep links resume after sign-in; credentials remain memory-only.

The existing AgentEditor blocker is the single router authority. Dirty agent drafts may move between the same agent's sections but require discard review when leaving the editor. Pending source writes block all route departure and native unload. Source forms remain mounted beneath the navigation confirmation so reviewed input stays visible after Stay.

`KnowledgeWrite` captures the exact operation, parameters, input, revision and key. For a file, the immutable File and SHA256 digest stay in that in-memory intent. Network/5xx/408 uncertainty freezes editing and retries the same request. Definite rejection releases the intent but preserves form input. A 409 requires explicit revision reload and renewed submission with a new key; reloading never overwrites typed content. Auth cleanup clears the captured command, releases the guard and permanently revokes that controller's ability to submit under a new account. Neither file bytes, content, tokens nor operation keys are written to browser storage.

Each edit opening initializes from a fresh protected detail request scoped to that dialog opening. The detail cache is discarded on close; background refreshes within the open form do not overwrite typed input or its reviewed revision. Initial detail-loading and error states expose Cancel, and failed reads expose Retry outside the shared query-content boundary.

File sources have no metadata-only write endpoint: editing a file name requires replacement content. Canceling the native picker retains the previously selected File and displays its name/size. The client enforces a nonempty file and the advertised limit capped at 10 MiB; format/content parsing remains server authority.

## Layout and accessibility

The existing fonts, colors, panels, status badge, QueryState, ErrorSummary, native form controls and Radix dialogs are reused. Desktop retains the 232px sidebar, 64px topbar and 24px workspace gutters; mobile retains 16px gutters. Knowledge actions are at least 44px. The source table uses aligned action columns and becomes stacked source rows on narrow screens. No dependency, global restyle or new menu was added.

Preview and citations use escaped text, `dir="auto"`, bounded excerpts and source provenance. Urdu uses the bundled font and generous line height. Dialogs retain keyboard focus and restore focus to their initiating control. Unknown writes cannot be dismissed by Escape or outside interaction. The UI distinguishes immediate processed-knowledge changes from Publish draft.

## Maintained verification

Run the focused behavioral tests with `npm test -- src/features/knowledge`. Run all contract/lint/type/unit/build checks with `npm run check`. Run browser fixtures using the existing serial configuration:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npm run test:browser
```

`e2e/knowledge.spec.ts` intercepts every application API request with synthetic typed fixtures. It checks upload and replacement byte equality (including non-UTF8 bytes), SHA256, query metadata, original auth token, exact unknown replay, canceled picker retention, browser Back, a real native beforeunload prompt, auth reset, zero browser storage, source conflicts/deletion, dirty parent drafts, deep links, keyboard/focus behavior, console/page errors and 1440/1024/390 layout measurements. The existing browser workers, timeouts and assertions are unchanged.

Curated synthetic screenshots are in `docs/evidence/phase-5-knowledge/`: source layouts at all three widths, escaped Urdu preview, and an isolated reply with citations. Raw development logs remain private. These fixtures do not establish live service readiness, actual parsing/retrieval quality, real embedding admission or model/server acceptance.
