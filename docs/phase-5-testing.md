# Phase 5 testing

`npm run check` covers contracts, lint, types, unit tests and build. `npm run test:browser` uses maintained injected browser fixtures. Ready sources, citations and ready model answers in those fixtures are not live retrieval evidence. On this workstation use the installed Chrome executable and a dedicated test port:

```sh
env -u FORCE_COLOR -u NO_COLOR PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npm run test:browser
```

Keep genuine browser, calendar and bundle warnings visible. Do not raise build thresholds or suppress console errors to make a gate pass.

## Optional real local QA

The separate `playwright.live.config.ts` selects only `live/`. Default CI/browser commands never collect this suite. Without `PHASE5_LIVE_QA=1` it skips before reading credentials. The dedicated frontend must already run on `http://localhost:5176`, allowed by the API CORS configuration. The credential file is ignored, mode 0600, and must identify the pre-existing synthetic `QA Crescent Clinic` with its `qa-phase4-…@example.com` or `qa-phase5-…@example.com` account and agent ID. Never point this command at an owner clinic.

```sh
env -u FORCE_COLOR -u NO_COLOR PHASE5_LIVE_QA=1 PHASE5_QA_ORIGIN=http://localhost:5176 PHASE5_QA_CREDENTIALS=/absolute/private/task7-qa.json PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npx playwright test --config playwright.live.config.ts
```

The test signs in through the UI, verifies the synthetic clinic and agent, uploads synthetic file bytes, replaces them, checks real HTTP status/SHA256 headers and queued revision, captures the result, and deletes only its named disposable source. Chromium may omit Blob request bodies from inspection; independent server blob checks provide exact stored-byte proof. No provider requests, real model inference, mocking, extension permission changes, browser token storage, or owner tabs are involved. If a check fails after creation, the uniquely named `QA Live Upload …` row may remain for review; delete that synthetic row through the UI after diagnosis.

## Manual acceptance

Sign in to a synthetic clinic, open an agent’s Knowledge section, and add text/Urdu FAQ/public URL/file. Reopen editors to check saved content, replace a file, reindex, preview and delete a disposable source. With embedding/worker execution disabled, processing must remain unavailable and sources queued. Search must not invent matches. Start an isolated test, ask `Is bicycle parking available?`, verify the no-answer processing trace, and end it. Check keyboard focus/navigation and narrow layouts. Published draft revision must not change just from source management.

Real own-KB answers, English/Urdu retrieval quality, model resource/latency acceptance and native voice remain pending. Keep these limits distinct from hosted adapter tests over fixed synthetic retrieved references. Stop before Phase 6.
