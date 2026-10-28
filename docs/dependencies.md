# Dependency and reference ledger

Verified 2026-10-28 from npm registry metadata, installed package manifests and lockfile. Node 24.13.0 / npm 11.18.0. React 19 satisfies Query and Radix peers; Vite 8 and Vitest 5 support Node 24. TypeScript 6.0.3 is the newest stable compatible with typescript-eslint 8.72.1 (>=4.8.4 <6.1.0). No forced peer resolution.

| Package | Exact version | License | Use |
| --- | --- | --- | --- |
| @fontsource/dm-sans | 5.3.0 | OFL-1.1 | runtime |
| @fontsource/noto-nastaliq-urdu | 5.3.0 | OFL-1.1 | runtime |
| @radix-ui/react-slot | 1.5.0 | MIT | runtime |
| @tanstack/react-query | 5.105.0 | MIT | runtime |
| ajv | 8.20.0 | MIT | runtime |
| ajv-formats | 3.0.1 | MIT | runtime |
| class-variance-authority | 0.7.1 | Apache-2.0 | runtime |
| clsx | 2.1.1 | MIT | runtime |
| livekit-client | 2.23.0 | Apache-2.0 | runtime |
| react | 19.3.1 | MIT | runtime |
| react-dom | 19.3.1 | MIT | runtime |
| tailwind-merge | 3.7.0 | MIT | runtime |
| @eslint/js | 10.0.1 | MIT | development |
| @playwright/test | 1.64.1 | Apache-2.0 | development |
| @testing-library/jest-dom | 7.0.1 | MIT | development |
| @testing-library/react | 16.3.3 | MIT | development |
| @testing-library/user-event | 14.6.8 | MIT | development |
| @types/node | 26.6.5 | MIT | development |
| @types/react | 19.3.0 | MIT | development |
| @types/react-dom | 19.3.0 | MIT | development |
| @vitejs/plugin-react | 6.1.2 | MIT | development |
| eslint | 10.13.0 | MIT | development |
| globals | 17.13.0 | MIT | development |
| jsdom | 29.1.1 | MIT | development |
| json-schema-to-typescript | 16.0.0 | MIT | development |
| prettier | 3.9.10 | MIT | development |
| typescript | 6.0.3 | Apache-2.0 | development |
| typescript-eslint | 8.72.1 | MIT | development |
| vite | 8.3.5 | MIT | development |
| vitest | 5.0.5 | MIT | development |

Font files are bundled locally under OFL-1.1. Keep their installed license notices when redistributing. LiveKit client is Apache-2.0; the shadcn Button source pattern is MIT. No BoardUI, Libraries.dev, React Bits or Lenis code is adopted. See [design decisions](design-decisions.md) for references and rationale.

Transitive artifacts are pinned in package-lock.json. `npm audit` reported zero vulnerabilities at installation. This is a point-in-time result, not a future security guarantee.

## Phase 4 foundation

Verified directly with `npm view PACKAGE version license peerDependencies engines --json` on 2026-10-28 before installation. `npm install` resolved without peer overrides, with zero audit vulnerabilities.

| Package | Version | License | Purpose / primary source |
| --- | --- | --- | --- |
| react-router | 8.5.1 | MIT | DataRouter, nested layouts and future unsaved-edit blockers; [package](https://www.npmjs.com/package/react-router/v/8.5.1), [docs](https://reactrouter.com/start/data/installation) |
| react-hook-form | 7.91.0 | MIT | Form state, pending controls and field errors; [package](https://www.npmjs.com/package/react-hook-form/v/7.91.0), [docs](https://react-hook-form.com/get-started) |
| @radix-ui/react-dialog | 1.3.1 | MIT | Focus containment, accessible confirmations and keyboard dismissal; [package](https://www.npmjs.com/package/@radix-ui/react-dialog/v/1.3.1), [docs](https://www.radix-ui.com/primitives/docs/components/dialog) |
| zod | 4.6.7 | MIT | Bounded validation of server error field arrays/maps; [package](https://www.npmjs.com/package/zod/v/4.6.7), [docs](https://zod.dev/) |

Router requires Node >=22.22 and React >=19.2.7; installed Node24/React19.3 satisfy these. RHF and Radix explicitly support React19. Keep upstream MIT notices with redistribution.

`openapi-typescript`7.13.0 was reviewed but rejected because its TypeScript^5 peer conflicts with this repository's TypeScript6.0.3. Existing `json-schema-to-typescript`16 generates the dashboard types and HTTP operation map from the copied public OpenAPI artifact. Generation checks both the upstream artifact and generated outputs. Form runtime schemas are an automatically extracted subset; validation is Ajv against those schemas, not hand-maintained domain duplicates. Existing voice generation and Ajv protocol validation remain intact.

BoardUI remains a visual reference only. Thinking Orbs0.3.2 (MIT, React>=18 per controller research) is deferred to the real agent-test state in Task6. No decorative React Bits or Lenis dependency is needed: ordinary operations pages use native scrolling, restrained CSS and reduced-motion support. No source from those references is copied into this foundation. Current shadcn-style Button and Radix Dialog form one primitive system; native selects preserve keyboard interaction without an additional custom select package.

## Phase 4 scheduling

Verified npm metadata on 2026-10-29: `@fullcalendar/react` **7.1.3** (MIT; React/React DOM 17–19, `temporal-polyfill ^1.0.1` peer), `temporal-polyfill` **1.0.6** (MIT). Installed exact versions without peer overrides. Keep upstream MIT copyright/license notices in distributions ([FullCalendar React](https://www.npmjs.com/package/@fullcalendar/react/v/7.1.3), [Temporal polyfill](https://www.npmjs.com/package/temporal-polyfill/v/1.0.6)).

FullCalendar v7 bundles the free time-grid and theme modules under React subpath exports; no legacy v6 packages or premium resource scheduler is installed. The calendar is dynamically imported within the lazy Schedule route. Native server-backed list/buttons remain the mobile and keyboard alternative; drag/resize mutations are disabled. Named IANA timezones use the Temporal peer, following [React setup](https://fullcalendar.io/docs/react), [timezones](https://fullcalendar.io/docs/timeZone) and [time-grid documentation](https://fullcalendar.io/docs/timegrid-view). No interaction plugin is needed because booking uses explicit actual-slot selection and review.
