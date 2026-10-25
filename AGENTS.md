# AGENTS.md — Bluade's rules for coding agents

Agents are first-class contributors, **not** privileged maintainers. Work from `main` through `chatgpt/<topic>-<subtopic>`; do not change protected branches without explicit maintainer review. Read `CONTRIBUTING.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md` before editing.

## Working contract

1. Explore before editing, keep changes scoped. Avoid replacing existing behavior unrelated to a task.
2. Every atomic change is committed as `<English-prefix>: <한국어 설명>` and pushed immediately. Always report failed pushes honestly.
3. `npm run check` before PR; tests for zip security, symlink, abort, collision and Unicode whenever affected.
4. Preserve `contextIsolation:true`, `sandbox:true`, `nodeIntegration:false`, CSP. Never inject unsanitized ZIP filenames via `innerHTML`.
5. Never overwrite user files; treat archive content as untrusted. Paths require validation in **main process** even if UI checks them.
6. Do not embed unpublished fonts or copyrighted reference app graphics. Third-party licenses must be documented.
7. AI review can recommend, but only actual human reviewers can approve. Do not self-approve or manufacture passing checks. If no model API key is set, document the blocker.
8. Minimize data sent to external AI. Do not send complete ZIP contents or private user file paths; review uses git diffs only.
9. No unrequested advertising, analytics, or background uploads.
10. Before merge, record tests and risks in PR description. Use merge commit with no-ff history; never force merge a failing PR.

## Allowed user-facing design

Single-window operation center; clear Korean labels; accessible keyboard support; high contrast; progress reports bytes, speed, ETA, current file and file counts; ad placeholder is explicitly labeled (lighter gradient above, dark below).

## Exit checklist

- [ ] Tests pass with output cited
- [ ] Changed files scoped and logically separated
- [ ] UI labels and progress deterministic
- [ ] No secrets, node_modules or font redistribution
- [ ] PR reviewers assigned / status checks green (CI가 주석으로 중단된 동안은 미충족으로 기록하고 자동 병합 금지)
- [ ] Pushes verified against remote branch
- [ ] No false claim of Windows binary or release
