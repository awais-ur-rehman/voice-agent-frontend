# Contribution workflow

- `main` is the release branch. `develop` integrates the current phase.
- Branch from `develop`: `feat/phase-0-<topic>`, `feat/phase-1-<topic>`, `feat/phase-4-<topic>`, `feat/phase-5-<topic>`, `fix/<topic>`, or `docs/<topic>`.
- Keep commits focused, with plain descriptions (`feat:`, `fix:`, `docs:`, `chore:`).
- Open pull requests into `develop`. Describe the behavior, validation, limitations, and owner testing steps.
- Complete the current phase and owner checkpoint before starting the next phase. Promote `develop` to `main` through a release pull request after owner acceptance; tag releases with semantic versions once runnable releases exist.
- Urgent release fixes branch from `main` as `hotfix/<topic>` and merge back into both long-lived branches.
- Never force-push or delete `main` or `develop`. Require pull requests and resolve review conversations. Add required CI checks when executable checks exist; do not configure nonexistent checks.
- Commit dependency locks, migrations, and public schemas with the changes they support.
- Never commit `.env`, API keys, patient information, raw recordings, or unredacted evaluation output. Use synthetic public fixtures.

Run `npm run check` and the maintained `npm run test:browser` suite. Synchronize the backend public contract snapshots before generating types. Browser fixtures and live deployed API checks are separate evidence; follow [Phase 4 testing](docs/phase-4-testing.md).

Approved stacked phases may target their unmerged dependency branch. Phase 5 `feat/phase-5-knowledge` targets `feat/phase-4-dashboard` in both repositories while Phase 4 remains unmerged. Identify the dependency and tested heads in the draft PR; retarget only after the dependency is integrated. Do not merge either phase or start Phase 6 without the owner checkpoint.
