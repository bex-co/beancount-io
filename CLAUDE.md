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

There is no root `package.json`. Each package owns its own dependencies, scripts, and lockfile. CI is per-package and path-filtered — one workflow per package, so a change under `mobile/**` runs only the mobile job and nothing else (see [Tooling](#tooling) for the full list).

When a new package gets real code, add a `<package>/CLAUDE.md` documenting its tech stack and conventions (with the `AGENTS.md` symlink per the compatibility rules above).

## Roadmap board (`.pm/`)

`.pm/` is the public TPM board for growing adoption in the open-source and agentic-coding community (workstreams → milestones → tasks). Conventions live canonically in `.claude/commands/pm.md`; `/pm` is the **only** command that writes to `.pm/`, and `/pm-brainstorm` proposes work as text. Read `.pm/DO_NOT_DO.md` before proposing roadmap work. The board is public — no secrets, no private-repo references.

## Repo-wide rules

### Never hand-edit a lockfile
- Each package owns its own lockfile: `dashboard/yarn.lock`, `mobile/yarn.lock`, `cli/uv.lock`, `fava-slim/uv.lock`.
- Lockfiles are generated — manual edits cause dependency drift.
- If deps need updating, run the package's own tool from inside its directory: `yarn install` / `yarn upgrade` for `dashboard/` and `mobile/`, `uv sync` / `uv lock` for `cli/` and `fava-slim/`. Ask the user before adding new dependencies.

### Scope changes to one package
- Always `cd` into the package directory before running scripts (`yarn`, `tsc`, `uv`, etc.).
- Don't introduce new cross-package imports — packages are otherwise independent. The one sanctioned dependency is `cli/` → `fava-slim/`, declared in `cli/pyproject.toml` as an editable `[tool.uv.sources]` path.
- If unsure which package a change belongs to, ask.

### Never commit secrets
- This is a public repo. Real credentials live only in gitignored `.env` files (the root `.gitignore` covers `.env`, `.env.local`, `.env.*.local`). Commit only `.env.example` with placeholder values.
- A gitleaks secret scan (`.github/workflows/secret-scan.yml`) gates every push and PR. Scan your working tree before pushing:
  ```zsh
  gitleaks dir . --redact --verbose
  ```
- See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full policy.

### Temporary files
- Use the current package's `tmp/` for scratch work — the root `.gitignore` covers `tmp/` everywhere, and `dashboard/.gitignore` repeats it locally.
- The repo root has a `.gitignore`; still, don't drop scratch files there — put them under a package's `tmp/`.
- Clean up when no longer needed.

## Tooling
- Node ≥ 20 (`mobile/package.json` sets `engines.node >= 20.19.4`); both Node CI jobs run Node 22.
- The two JS packages pin **different Yarn majors** via `packageManager` — always run Yarn from inside the package directory so Corepack picks the right one:
  - `dashboard/` → Yarn 4.17.0 (Berry); installs with `yarn install --immutable`.
  - `mobile/` → Yarn 1.22.22 (Classic); installs with `yarn install`.
- Python packages (`cli/`, `fava-slim/`) use [uv](https://docs.astral.sh/uv/): `uv sync --all-groups`, then `make check-all`.
- CI — one workflow per package, all on push/PR to `main`, each path-filtered to its own package plus its own workflow file:
  - `.github/workflows/ci.yml` (`CI`) → `mobile/**`: `yarn lint`, `yarn typecheck`, `yarn test:unit`.
  - `.github/workflows/ci-dashboard.yml` (`CI (dashboard)`) → `dashboard/**`: `yarn format:check`, `yarn lint`, `yarn test`, `yarn build`.
  - `.github/workflows/ci-cli.yml` (`CI (cli)`) → `cli/**` **or** `fava-slim/**`: two jobs, each running `make check-all`. Either path triggers both, since `cli/` depends on `fava-slim/`.
  - `skills/` has no CI job yet — add a workflow when it gains testable code.
- Secret scan: `.github/workflows/secret-scan.yml` runs gitleaks over the whole tree on every push/PR — not path-filtered.
- Release: `.github/workflows/deploy.yml` (workflow name `Release (mobile)`) runs on every `mobile/**` push to `main` and verifies checks, but deploys only when `mobile/package.json`'s version has no `mobile-v<version>` git tag yet (i.e. after `yarn bump`): it ships the OTA update, runs the Expo EAS build/submit, then pushes the tag and a GitHub Release. A push without a version bump deploys nothing. Tag-after-success makes failed releases retry automatically on the next push.
