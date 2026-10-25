# Contributing — 모두의 블루에이드 💙

Bluade welcomes people and agents who can explain *why* a change is useful, how they tested it, and what risks remain.

## Branch strategy

- `main`: protected trunk; **no direct push** during normal collaboration.
- `chatgpt/<topic>`: AI-driven feature integration branch.
- `chatgpt/<topic>-<subtopic>`: branch created **from** the parent integration branch and later merged back. Git cannot have both `refs/heads/chatgpt/<topic>` and a child with that prefix, so the history forms the tree (not the ref name).
- Other contributors: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`.
- Prefer `--no-ff` merge commits on PRs to preserve context; never force push `main`.

## Commit / push rhythm

- **Tiny, atomic commits** with **English Conventional prefix + Korean message** (`feat: ZIP 검사 화면 추가`, `fix: 경로 탈출 차단`, `docs: 기여 지침 작성`).
- As soon as each commit passes a minimum syntax check, **push it immediately**. Do not batch many local commits before the first remote backup.
- Each commit should make one coherent change and leave the branch in an understandable state. Safety-relevant changes must include tests.
- Make PRs small; when work is complex, open multiple PRs on nested branches and merge upstream explicitly.

## Review & automated merge

1. CI and Windows build checks must succeed.
2. Optional AI reviewer is **configured only if the repository maintainer provides a secret** `BLUADE_AI_REVIEW_KEY`. It produces a visible comment and `ai-reviewed` label on success, but **never counts as human approval**.
3. Require at least one approval by a human collaborator with write access, no active `CHANGES_REQUESTED`, and no merge conflicts.
4. A maintainer applies `safe-to-merge` only after review.
5. The `merge-guard` automation merges via GitHub's **merge commit (no-ff)** only after all signals have passed; if AI provider is unavailable, the PR stays open.
6. Configure GitHub branch protection/rulesets on `main` to require the checks and human approvals. Repository administrators must configure these via Settings, as CI workflows cannot safely create protection rules from PR code.

AI findings are recommendations, not evidence of correctness. Review the ZIP security boundary and filesystem behavior as a human, especially for destructive operations.

## Local development

```bash
npm install
npm test
npm start
```

Do not commit secrets, raw user ZIP content, developer machine paths or closed-source font files. See [AGENTS.md](AGENTS.md) and [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
