# Phase 3 frontend evidence and owner checkpoint

## Automated evidence

Verified locally: `npm ci --ignore-scripts --prefer-offline` succeeded (audit: zero reported vulnerabilities), `npm run check` passed with 26 tests, and `npm run test:browser` passed one Chromium flow. Lint, generated-contract drift, strict types and production build all passed. The browser run used the installed Chromium headless shell at revision 1228.

The frontend is isolated on `feat/phase-3-voice-console`, branched from `develop`. No Phase 3 merge or production readiness claim.

- Interaction tests: rejected/expired staff auth; busy and unavailable workers; bounded Urdu capability errors; denied microphone cleanup; end; speaker autoplay retry; reconnect and discarded captions; stale/mismatched grant refusal; allocation response after unmount is ended.
- Protocol/media tests: participant/session/generation/sequence binding, strict exported-schema validation, oversized/replayed/forged messages, ACK only after segment_end plus actual audio-currentTime progress, no timeout-based ACK, mute/autoplay/disconnect invalidation, stale room listeners removed.
- Browser fixture test: desktop 1440 px and mobile 390 px; keyboard email/password navigation; reduced motion; locally bundled Urdu font/agent label; no horizontal overflow; explicit unavailable Urdu error, no Listening state.
- `docs/evidence/desktop-sign-in.png`, `desktop-session.png`, `mobile-unavailable.png` are synthetic API fixture screenshots, visually inspected. They show UI behavior only. No real room, model, microphone, speaker or booking is represented by them.

The LiveKit SDK loads dynamically at connection time. The build emits a >500 kB raw lazy SDK chunk advisory (about 138 kB gzip); initial sign-in does not load this chunk. No claim of speech response latency is derived from browser media connection timing.

## Playback lower bound

Only `worker` data on topic `voice.v1`, matching the current scoped grant and monotonically increasing worker sequence, reaches UI state. Remote audio also requires worker identity. ACK uses a separate monotonic caller sequence and targets only worker. Captions are ephemeral, disabled by default and never establish delivery.

For a segment to be acknowledged, audio must already be playing when segment metadata arrives; the full sample duration must then pass on the audio element's real currentTime, and segment_end must have arrived. Paused, muted, waiting, blocked, interrupted, disconnected or stale output cannot satisfy this ledger. Worker invalidation detaches the playback source until a new segment; automatic SDK reconnect disconnects the old room and requires an explicit fresh-grant resume. Segments without a safe playback baseline remain unacknowledged; the worker must reissue the full readback. This is deliberately a conservative lower bound, not word alignment or proof that a human heard unmuted hardware. Device-volume/offline speaker state cannot be proven by browser code.

## Owner test steps — pending real audio acceptance

1. Start the backend's documented local API/LiveKit/CPU worker stack. Open http://localhost:5173 and sign in with the existing development staff account. Use synthetic patients only.
2. Select an enabled English agent, start, and allow microphone and sound. Media connected means the room/mic connected; wait for an actual worker Listening state. If a model is unavailable, verify the explicit error and stop that flow.
3. Speak an actual synthetic booking, wait through the complete readback, then affirm. Check the real scheduling result using the backend checkpoint steps. Repeat correction/reschedule/cancel and subject switch only when the runtime supports them.
4. During readback, interrupt before completion and say yes early. Verify no appointment mutation, no stale audio, and that a fresh full readback is required.
5. Deny microphone access, then enable it and start again. Block sound, use Enable audio, and verify actual speaker output. Mute/unmute deliberately; it must remain distinguishable from model failure.
6. Interrupt network briefly, use Reconnect within the grace window, and verify old captions/audio/readback do not establish delivery. End and verify microphone indicator stops, room/worker cleanup and hold release. Refresh requires staff sign-in again.
7. Urdu synthesis currently fails its CPU memory gate. Confirm the explicit capability error; do not record functional Urdu speech acceptance. Native Urdu MOS/multi-speaker accuracy, GPU latency and concurrency remain separate pending gates.

Real browser-to-worker speech, physical playback and database mutation proof are not collected by the fixture browser test. They must be recorded separately when the runtime is available.


Final independent-review regressions pass: preserve pending playback through worker Listening, refuse zero-volume baselines/audibility transitions, and fence/clear the previous account session after authentication expires. Root reran all 26 tests, lint/types/schema/build and the desktop/mobile Chromium fixture. Both backend speech capabilities remain false: English turbo ASR exceeded its tested safe memory budget as well as Urdu's preflight refusal. Actual PCM transport passed separately; neither the fixture nor transport is spoken scheduling acceptance.
