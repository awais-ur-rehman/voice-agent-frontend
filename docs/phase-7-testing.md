# Phase 7 frontend failure checks

Run from the frontend checkout with the locked dependencies installed.

```sh
npm run check
env -u PHASE6_LOCAL_DEMO CI=1 VITE_API_URL=http://localhost:8000 \
  PLAYWRIGHT_BASE_URL=http://127.0.0.1:5187 \
  npm run test:browser
```

Use an unused loopback port. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to the path of an installed Chromium-compatible browser if using one in place of Playwright’s bundled browser. To run just the new fixture, append `-- e2e/hardening.spec.ts`. Screenshots are written under the Playwright test output. The fixtures use synthetic identities and intercept the API.

## Error and retry behavior

The clients use the Phase 7 server contract in the backend’s `docs/phase-7-security.md`. The error reader buffers and decodes at most 16 KiB of response bytes for dashboard requests and 2 KiB for the legacy voice client. It counts actual bytes from the stream. It cancels incomplete reads when the body exceeds the cap, remains open after a 750 ms read deadline, or the caller cancels the request. This deadline starts after the error response arrives. A stalled cancellation cannot delay the alert.

Error text comes from the client’s code and status allowlists. The client ignores server message text, filters form fields against known names, substitutes its own field messages, and validates slot alternatives before displaying them. Voice and language availability messages describe what the current operation can do.

For operators, HTTP 503 with code `voice_urdu_unavailable` means the voice worker’s capability report lacks Urdu readiness. Check native Urdu synthesis readiness and compare measured model memory usage with the memory gate for the configured CPU profile before rerunning the voice check.

For HTTP 429 and 503, a decimal `Retry-After` header from 1 to 3600 seconds adds an instruction to wait before trying again. The notice is informational and retries are manual. Authentication still uses the existing single shared refresh on 401 with at most one replay per eligible request. A refresh rejected with 429 or 503 clears the signed-in state and carries only the controlled notice to sign-in. A subsequent sign-in, sign-out or session reset clears that notice.

## What the fixture checks

- At 1440 px and 390 px, submit sign-in with the keyboard and check that the rate-limit alert takes focus. Advance past the supplied wait and confirm the request count stays fixed until manual resubmission.
- Open the isolated agent test and confirm that a draining response shows the wait notice. Manually retry with the same request key. An oversized response with a malformed wait header should show controlled recovery text.
- On a 401 followed by a rate-limited refresh, confirm that sign-in shows the wait notice with empty credentials. The test mutation is never replayed.
- Inspect notice wrapping, focus and the direction of the Urdu greeting. Confirm that no hostile fixture content reaches the DOM or console and that app cookies, web storage, Cache Storage and IndexedDB remain empty.

Unit cases cover exact request counts, late responses after logout, shared refresh, stream cancellation, malformed headers, allowlisted fields, conflict alternatives and unreadable responses. These runs verify frontend behavior with intercepted HTTP responses and synthetic stream tests.

## Actual local API checkpoint

Reuse the owner frontend at `http://localhost:5176` and API at `http://localhost:8000`. If port 5176 is free, start the installed Vite server with `VITE_API_URL=http://localhost:8000 npm run dev -- --host 127.0.0.1 --port 5176 --strictPort`. The API must explicitly allow `http://localhost:5176` in its private CORS overlay.

Run the maintained real-browser case from the frontend checkout. Use the existing private operator directory for results and set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to the installed Chrome path when needed.

```sh
umask 077
phase7_output="$(cd ../backend/.local/phase7 && pwd)"
env -u CI PHASE6_LOCAL_DEMO=1 PLAYWRIGHT_BASE_URL=http://localhost:5176 \
  npm run test:browser -- e2e/analytics-local.spec.ts \
  --output "$phase7_output/owner-browser" --retries=0 --trace=off
```

The test checks the served loopback API origin before entering the existing fictional account credentials. It signs in normally, confirms the tenant, and reads the existing November 8 cohort and call detail through the real API. Keep screenshots, console attachments, and credentials private. The local opt-in case remains separate from ordinary CI and fixture tests.

On the Phase 7 rollout, the case passed in 2.9 seconds with a 6.6-second Playwright invocation. It showed five Text and zero Voice sessions, unknown provider usage and speech timing, and a real information-only call with capture off and no retained text. It observed no unexpected post-login mutations, browser console warnings or errors, or local or session storage keys. The Playwright terminal retained the existing Node color-environment warning. The frontend served the application bytes from `94ddc2e6b041908896e0b1884d862a009e640289`. This run exercises the existing read-only staff flow after authentication. The separate fixture suite exercises 429 and 503 behavior.
