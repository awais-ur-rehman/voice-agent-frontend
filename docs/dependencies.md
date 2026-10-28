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
