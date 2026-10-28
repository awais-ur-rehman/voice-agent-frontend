# Clinic voice console

Phase 3 browser test harness for the guarded clinic assistant. Staff can sign in, select a tenant-scoped published agent, and start/mute/end/reconnect a LiveKit microphone session. This is the CPU testing checkpoint; no dashboard or agent configuration is included.

**Speech acceptance is blocked on the tested memory budget: English ASR exceeded its safe cap and Urdu synthesis failed the headroom preflight.** The UI reports capability failure explicitly. A media connection alone never means the speech worker is ready. GPU latency, native English/Urdu voice quality and physical microphone/speaker acceptance remain pending.

## Run locally

Use Node **24.13.0 or newer** and the committed npm lockfile:

```sh
npm ci
npm run dev
```

Open **http://localhost:5173** so the browser origin matches the API's development CORS allowlist. The default API origin is `http://localhost:8000`. Optionally set `VITE_API_URL` to a public API origin; never put provider keys, LiveKit signing secrets or model credentials in browser configuration. `VITE_API_URL` rejects embedded credentials, query strings and fragments.

Run the backend API, PostgreSQL/Valkey, self-hosted LiveKit and native CPU worker using the backend Phase 3 instructions. Sign in with an existing synthetic development staff account. No credentials are supplied or persisted by the frontend. Refreshing the page requires signing in again. There is no typed transcript shortcut or browser speech replacement.

## Verify

```sh
npm run check
npx playwright install chromium
npm run test:browser
```

`check` runs schema/type drift checks, ESLint/format checks, strict TypeScript, interaction/protocol tests and a production build. Browser tests cover fixture-based login, keyboard navigation, desktop/mobile layout, mixed English/Urdu agent labels and unavailable-worker errors. They do **not** prove model inference, audible speech, physical microphone permission or a real booking.

The backend schema snapshot is `contracts/voice.v1.json`; types and runtime validation derive from it. After an intentional backend contract change, copy the exported schema and run `npm run contracts:generate`. `contracts:check` compares generated output and, when the sibling backend checkout exists, the upstream schema bytes. In standalone CI it verifies the pinned snapshot/type pairing; backend CI owns export freshness. Browser type generation explicitly allowlists public models and excludes WorkerGrant.

See [testing evidence and owner steps](docs/phase-3-testing.md), [dependency/license pins](docs/dependencies.md), and [design decisions](docs/design-decisions.md).
