# Dashboard design decisions

The Phase 4 compact clinic operations direction was approved on 2026-10-28. It replaces the earlier console with a consistent settings, schedule, patient and agent workspace. Warm neutral surfaces, DM Sans typography, ink text and one teal status accent keep attention on permission, connection and call controls. Urdu captions use locally bundled Noto Nastaliq Urdu and direction-aware, generous line spacing. Tokens establish spacing, focus, motion and color before screen composition.

References inspected on 2026-10-28:

- [BoardUI](https://github.com/BoardUI/boardui): its restrained chat controls and explicit activity states inform hierarchy. Its [license](https://github.com/BoardUI/boardui/blob/main/LICENSE) must be checked per source before copying; no BoardUI component source is adopted here.
- [Awesome Design Systems](https://github.com/alexpate/awesome-design-systems): a directory of systems, not a component dependency. Used to compare coherent foundations; individual systems retain their own licenses.
- [Thinking Orbs](https://libraries.dev/orbs): the documented nine visual states do not establish worker availability. Thinking Orbs 0.3.2 is now installed under MIT and follows actual isolated-test activity; idle and reduced-motion states pause it.
- [React Bits](https://reactbits.dev): decorative effects add no required call behavior. Not adopted; no source copied.
- [Lenis](https://lenis.darkroom.engineering): smooth scrolling adds no value to a single-screen harness. Not adopted; native scrolling remains accessible.
- [shadcn/ui button](https://ui.shadcn.com/docs/components/radix/button): MIT source pattern with Radix Slot, cva and standard semantic HTML. A single reusable button foundation, native inputs and native select form one coherent accessible control system.

No fabricated metrics, decorative waveforms, fake speech or persistent credential/caption storage. The media connection is distinct from inference readiness. Worker state/captions require a validated current worker message. CPU timing data is shown only when actually measured.
