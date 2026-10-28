# Phase 4 dashboard results

Measured 2026-10-29 local time. Backend was rebuilt and migrated before real UI QA; the fresh QA Crescent Clinic contains synthetic records only. Design was approved 2026-10-28. Owner acceptance and public draft PR review remain separate.

| Check | Result | Evidence under `docs/evidence/task-7/` |
| --- | --- | --- |
| Full contract/lint/type/unit/build | Pass;9 files, 96 tests | `frontend-check.log` |
| Maintained fixture browser suite | 3 passed | `browser-fixtures.log` |
| Publisher display regression | RED 1 failed/10 passed; GREEN 11 passed | `publisher-{red,green}.log` |
| Real speech reason copy regression | RED 1 failed/10 passed; GREEN 11 passed | `speech-copy-{red,green}.log` |
| Final lint/type/build | Pass | `frontend-final-static.log` |
| Production CUA console | No warnings/errors in scoped flow | `live-production-console.json` |

Production CUA signed in through the real API at `localhost:8000` from preview `localhost:5176`, navigated Schedule→Agents→editor, enabled the synthetic agent with a reviewed revision, started/ended isolated tests and inspected real publisher history. Navigation preserved authentication on both initial and fresh final-build sign-ins. The live backend separately passed setup/templates, manual booking/move/cancel, Urdu search/merge, rollback/disable and staff-role checks. Its bounded hosted 7-turn booking and independent child-database verification are distinct from the fixture browser suite and prove no parent-calendar mutation during the isolated booking.

CUA also booked a synthetic appointment through patient/provider/service/slot selection, review and confirmation, then opened actual appointment details. The production day/week calendar was inspected at 1440/1024, with transitions through 390 and back to 1024/1440; mobile uses the existing appointment-list alternative. The captured detail and booking dialogs retain readable Urdu and controls. There was no whole-page overflow in the measured 390px editor (client/scroll/body width 390). The maintained fixture suite separately measures responsive targets and overflow.

Screenshots: `live-schedule-day-1440.png`, `live-schedule-week-1024.png`, `live-schedule-390.png`, `live-booking-review-390.png`, `live-details-390.png`, `live-publisher-history.png`, and final `live-test-final-{1440,1024,390}.png`. Earlier `live-agent-*` screenshots preserve the raw `voice_unavailable` text that inspection caught; final screenshots show the corrected bounded explanation. Real names now come from the tenant-scoped API projection; missing/legacy names have explicit fallback copy without inventing authors.

The initial full build passed before the small speech-copy correction; the final correction received its focused 11-test suite plus lint/type/build. The final broad suite was not rerun solely for unchanged counts. Expected fixture 503 resource errors and NO_COLOR/FORCE_COLOR warning remain visible in browser logs.

Shared entry remains 682.89KB raw/207.88KB gzip; AgentEditor approximately 82KB, Calendar 245.83KB and LiveKit 532.25KB remain separate lazy chunks. The >500KB warning remains visible, without threshold changes. No dependency was added in Task7. Thinking Orbs 0.3.2's installed MIT notice and peer compatibility were rechecked and documented.

Earlier Vite ResizeObserver and unexpected lazy-editor auth-reset observations were not reproduced in this production scenario; their causes remain unconfirmed and no fix is claimed. Native speech/ASR/Urdu quality, microphone/speaker device acceptance, GPU and performance acceptance remain pending. A connected media session or successful hosted text test does not establish audio readiness. No Phase 5 implementation, push, merge or public publication was performed by Task7.
