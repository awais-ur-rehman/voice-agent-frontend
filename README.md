# Voice Agent Frontend

Clinic dashboard and web voice-session interface for an English/Urdu appointment scheduler.

## Status

Repository setup only. Phase 0 feasibility work is pending; there is no runnable dashboard yet. Production screens follow the voice feasibility checkpoint and review of the combined v0.1/v0.2 requirements.

## Intended foundation

React, Vite, strict TypeScript, TanStack Query, and shadcn/ui, as specified in v0.2. Verify supported stable versions, peer compatibility, and licenses at installation time and commit the lockfile.

Use shared tokens and reusable primitives before composing feature screens. Build clear navigation, tables, filters, forms, and loading/empty/error states around staff workflows. English is the MVP interface language, while Urdu patient names, knowledge content, and transcripts must render correctly from the start with `dir="auto"` and suitable Nastaliq typography.

## Design references

- [BoardUI](https://github.com/BoardUI/boardui): dashboard composition, semantic tokens, consistent components.
- [Awesome Design Systems](https://github.com/alexpate/awesome-design-systems): reference collection, not a runtime dependency.
- [Thinking Orbs](https://libraries.dev/orbs): preferred candidate for voice/agent feedback; verify package license and map only supported, real session states.
- React Bits and Lenis: evaluate for specific interactions, with keyboard accessibility and reduced-motion behavior. Avoid application-wide animation or scroll interception by default.

See [Phase 0](docs/phase-0.md), [engineering rules](AGENTS.md), and [contribution workflow](CONTRIBUTING.md).
