# Beancount.io Monorepo

Monorepo for [Beancount.io](https://beancount.io/) — double-entry bookkeeping made easy.

This file holds repo-wide rules. Per-package guidance lives next to the code:
- `dashboard/CLAUDE.md` — web client
- `mobile/CLAUDE.md` — React Native app
- `fava-slim/CLAUDE.md` — typed Python reporting library
- `skills/CLAUDE.md` — agent skills package

## Codex and Claude Code compatibility
- `CLAUDE.md` is the canonical instruction file at every scope. The adjacent `AGENTS.md` must be a relative symlink to it so Claude Code and Codex always read the same instructions; never maintain duplicate copies.
- When adding, moving, or removing a scoped `CLAUDE.md`, make the same structural change to its `AGENTS.md` symlink. When editing either name, update the canonical `CLAUDE.md` through the symlink rather than replacing the symlink with a regular file.
- Shared skills live in `skills/.claude/skills/`. The root `.agents/skills` symlink must continue to point there so both agents use the same skill implementation. Edit the canonical skill tree only; do not create divergent Claude-only and Codex-only copies.
- Write instructions and skills using behavior supported by both Claude Code and Codex. If platform-specific configuration or tooling is unavoidable, label it clearly and provide equivalent behavior for the other agent.
- After changing instruction files, skills, or their symlinks, verify that each applicable `AGENTS.md` resolves to its sibling `CLAUDE.md` and that `.agents/skills` resolves to `skills/.claude/skills/`.

## Packages

| Path | Status | Description |
|------|--------|-------------|
| `dashboard/` | active | Web client (React 19, TanStack Start, Apollo, TypeScript) |
| `mobile/` | active | React Native iOS/Android app (Expo, Apollo, TypeScript) |
| `cli/` | active | `beancount-cli` — directives, bean-check/format, BQL queries, reports, local-ledger chat (Python, Typer) |
| `fava-slim/` | active | Ledger loading, account trees, queries, financial statements without the Fava web UI (typed Python) |
| `skills/` | active | Agent skills: init, import, importer-author, reconcile, migrate, ask, close, options (see `skills/CLAUDE.md`) |
| `docs/` | active | Documentation content |

There is no root `package.json`. Each package owns its own dependencies, scripts, and lockfile. CI is per-package and path-filtered: a change under `mobile/**` runs only the mobile job (see `.github/workflows/ci.yml`).

When a new package gets real code, add a `<package>/CLAUDE.md` documenting its tech stack and conventions (with the `AGENTS.md` symlink per the compatibility rules above).

## Roadmap board (`.pm/`)

`.pm/` is the public TPM board for growing adoption in the open-source and agentic-coding community (workstreams → milestones → tasks). Conventions live canonically in `.claude/commands/pm.md`; `/pm` is the **only** command that writes to `.pm/`, and `/pm-brainstorm` proposes work as text. Read `.pm/DO_NOT_DO.md` before proposing roadmap work. The board is public — no secrets, no private-repo references.

## Repo-wide rules

### Never modify any `yarn.lock`
- Each package owns its own `yarn.lock` (today, only `mobile/yarn.lock` exists).
- Lock files are managed by Yarn — manual edits cause dependency drift.
- If deps need updating, run `yarn install` / `yarn upgrade` from inside the package directory. Ask the user before adding new dependencies.

### Scope changes to one package
- Always `cd` into the package directory before running scripts (`yarn`, `tsc`, etc.).
- Don't introduce cross-package imports — packages are independent.
- If unsure which package a change belongs to, ask.

### Never commit secrets
- This is a public repo. Real credentials live only in gitignored `.env` files (the root `.gitignore` covers `.env`, `.env.local`, `.env.*.local`). Commit only `.env.example` with placeholder values.
- A gitleaks secret scan (`.github/workflows/secret-scan.yml`) gates every push and PR. Scan your working tree before pushing:
  ```zsh
  gitleaks dir . --redact --verbose
  ```
- See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full policy.

### Temporary files
- Use `mobile/tmp/` for scratch work while in the mobile package — it's gitignored.
- The repo root has a `.gitignore`; still, don't drop scratch files there — put them under a package's `tmp/`.
- Clean up when no longer needed.

## Tooling
- Node ≥ 20.
- Yarn 1.22.x (Classic) — pinned via `mobile/package.json`'s `packageManager`.
- CI: `.github/workflows/ci.yml` runs `yarn lint`, `yarn typecheck`, `yarn test:unit` inside `mobile/`, path-filtered on `mobile/**`, on push/PR to `main`. Add a job (or workflow) per package as `cli/` and `skills/` gain code.
- Secret scan: `.github/workflows/secret-scan.yml` runs gitleaks over the whole tree on every push/PR — not path-filtered.
- Release: `.github/workflows/deploy.yml` (workflow name `Release (mobile)`) runs on every `mobile/**` push to `main` and verifies checks, but deploys only when `mobile/package.json`'s version has no `mobile-v<version>` git tag yet (i.e. after `yarn bump`): it ships the OTA update, runs the Expo EAS build/submit, then pushes the tag and a GitHub Release. A push without a version bump deploys nothing. Tag-after-success makes failed releases retry automatically on the next push.
