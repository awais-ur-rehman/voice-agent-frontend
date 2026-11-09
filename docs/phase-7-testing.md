# Phase 7 frontend failure checks

Run from the frontend checkout with the locked dependencies installed.

```sh
npm run check
env -u PHASE6_LOCAL_DEMO CI=1 VITE_API_URL=http://localhost:8000 \
  PLAYWRIGHT_BASE_URL=http://127.0.0.1:5187 \
  npm run test:browser
```

Use an unused loopback port. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to the path of an installed Chromium-compatible browser if using one in place of Playwright’s bundled browser. To run just the new fixture, append `-- e2e/hardening.spec.ts`. Screenshots are written under the Playwright test output. The fixtures use synthetic identities and intercept the API. Actual local API, CORS and dental demo verification belong to Task 6. The local analytics checkpoint is opt-in and uses its own runbook.

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
