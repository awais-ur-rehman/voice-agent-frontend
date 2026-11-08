# Phase 6 actual local analytics results

Local CPU/UI implementation is ready for independent root review; publication, hosted CI and owner acceptance are pending. Phases 4/5/6 stay unmerged and Phase 7 has not started.

On 2026-11-08 the maintained opt-in test logged into the real loopback API as fictional Pearl Dental Studio — Demo, selected the same-day cohort through UI filters, and displayed 5 Text/0 Voice,5 ended,0 appointment operations, booking0/5, handoff1/5 and abandonment1/5. Provider estimate stayed Unknown. STT showed 0/0 eligible sessions and unknown timing. Calls & sessions linked to real information-only session204b85e9-3441-4e31-b80c-bf153a77976d; protected transcript reported capture OFF and retained no text. Current capture remained OFF. All console error/warning arrays and local/session storage keys were empty; there were no unexpected post-login mutations. The test verifies the actual served API loopback origin before entering credentials, the authenticated fixed synthetic tenant, and uses no route mocks/intercepts. Private files are read only after explicit opt-in; ordinary CI explicitly skips this case.

The backend source events, rollups and APIs reconcile these actual observations:3 info-only,1 knowledge-unavailable abandoned,1 handoff;45 safe events;10 receipts;0 provider invocations/transcripts/appointment operations. One real synthetic handoff Callback has NULL phone and sends no external message.24 dental sources remain queued with 0 vectors. A controlled Urdu-script input retained its observed English classification. These are actual deterministic Text flows, not native/Urdu speech or retrieval quality qualification.

| Gate | Result |
| --- | --- |
| npm run check | Contracts/lint/types pass;167 unit tests pass; production build passes |
| Full maintained serial Playwright |16 pass,1 explicit local-demo skip,43.4s |
| Final opt-in actual normal-API test |1 pass,5.6s; actual console/storage/privacy assertions pass |
| Affected final e2e ESLint | Pass |

Actual screenshots: [analytics](evidence/actual-dental-analytics.png), [real call detail and capture-off](evidence/actual-dental-call-detail.png), [captured console arrays](evidence/actual-console.json). They contain only the fictional clinic and are separate from fixture screenshots. The information-command exact replay was verified through normal APIs and left only two receipts per session. Local durations measure code commands, not voice latency; provider usage and prices remain unknown.

Initial real login failed when the existing private CORS override was omitted from the API refresh; restoring it fixed the integration. Two actual favicon.ico404 console errors were resolved by the explicit empty favicon link, with no console filtering. Failed-run logs remain retained privately. Fixture503 scenarios, existing calendar ResizeObserver, terminal NO_COLOR/FORCE_COLOR and production bundle-size advisory remain visible in their gates. The latest real analytics console is clean. The full npm check covered final product code; later test-only API/cohort/console guard strengthening was checked by affected ESLint and actual Playwright. No product/UI/API contracts changed after those gates.

Reviewed input frontend head 3c27d6d4bc02a2febb5fcfe7b283bd7d01b68ab5. Final non-document file-hash-map SHA256 (canonical sorted JSON) is f3987357c70bee89dcbca5a3ac69ce1e282195d9a4711fc60584196e3b67717d. Backend source and actual image proof, private backup/migration/role preservation and full 1306-pass gate belong to its [results](../../backend/docs/phase-6-results.md). The sibling link is for this two-checkout workspace; the backend repository owns its published document.

Real embedding/RAG, native microphone/ASR/TTS, canonical first-token/first-byte/published audio, load, external exporter, known billing coverage and backup restore remain pending. See [owner testing](phase-6-testing.md).
