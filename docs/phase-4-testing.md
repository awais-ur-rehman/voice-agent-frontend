# Phase 4 dashboard testing

Use Node 24.13.0 or newer and the committed lockfile. Start the sibling backend with its Phase 4 guide, preserving the existing database and keeping voice disabled.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`; the API origin defaults to `http://localhost:8000`. No Vite proxy is configured. `VITE_API_URL` is a public origin only, never a credential. Local account creation requires the backend's explicit private registration setting; registration is disabled by default. Use a fresh synthetic clinic and keep its credentials private.

```sh
npm run check
npm run test:browser
```

The maintained Playwright suite uses synthetic HTTP fixtures and launches Vite. With installed Chrome, Task7 used:

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' PLAYWRIGHT_BASE_URL=http://127.0.0.1:5175 npm run test:browser
```

`check` verifies copied/generated contracts, ESLint/Prettier, strict types, all interaction/protocol tests and production build. After an intentional API change, copy `backend/packages/schemas/dashboard.v1.json` to `contracts/dashboard.v1.json`, then run `npm run contracts:generate`. Voice snapshot generation remains separate and excludes private worker grants.

For production manual QA, build then run `npx vite preview --host 127.0.0.1 --port 5176 --strictPort`. Visit `http://localhost:5176`. The backend must explicitly allow that exact origin alongside its normal `http://localhost:5173`; Task7 used an ignored local Compose environment override. Do not add wildcard CORS or place secrets in frontend configuration.

Check clinic setup/profile, provider-service assignments, hours/templates, staff access, patient Urdu search/merge, manual booking/move/cancel, agent draft save/publish/restore/disable, and isolated text tests. Review exact fields and captured revisions before mutations. The server validates conflicts and canonical identity. Failed unknown publish/rollback retries retain their exact intent; draft save/enable/archive do not have backend idempotency receipts and can return a definitive conflict on retry.

Inspect actual day/week calendar and mobile list at 1440/1024/390, keyboard dialogs, mixed Urdu text, responsive transitions and lazy editor navigation. Tokens and test conversations stay in memory; refreshing intentionally requires signing in again. No raw patient data, credentials or transcripts should enter public logs or screenshots; public evidence uses synthetic fixtures only.

Start isolated testing with an enabled agent. The API clones configuration into a child clinic with synthetic patients, never live patient records. Text can run while speech is unavailable. Inspect live schedule isolation and end the scope. All native voices remain provisional, previews unavailable and speech acceptance pending; text success is not audio readiness. See [measured results](phase-4-results.md).
