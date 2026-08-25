# Beancount.io Monorepo

Monorepo for [Beancount.io](https://beancount.io/) — double-entry bookkeeping made easy.

This file holds repo-wide rules. Per-package guidance lives next to the code:

- `cli/CLAUDE.md` — Python CLI and vendored Fava reporting code
- `dashboard/CLAUDE.md` — web client
- `mobile/CLAUDE.md` — React Native app
- `backend-cluster/backend-v2/CLAUDE.md` — API gateway and background services
- `backend-cluster/ledger/CLAUDE.md` — rustledger-WASM ledger service
- `backend-cluster/idl/CLAUDE.md` — OpenAPI contracts and generated clients
- `backend-cluster/agent-box/CLAUDE.md` — Cloudflare Worker control plane for the Ask-AI sandbox (Claude Code in Cloudflare Sandbox)
- `deploy/CLAUDE.md` — local and hosted deployment targets
- `skills/CLAUDE.md` — agent skills package

## Codex and Claude Code compatibility

- `CLAUDE.md` is the canonical instruction file at every scope. The adjacent `AGENTS.md` must be a relative symlink to it so Claude Code and Codex always read the same instructions; never maintain duplicate copies.
- When adding, moving, or removing a scoped `CLAUDE.md`, make the same structural change to its `AGENTS.md` symlink. When editing either name, update the canonical `CLAUDE.md` through the symlink rather than replacing the symlink with a regular file.
- Shared skills live in `skills/.claude/skills/`. The root `.claude/skills` (Claude Code) and `.agents/skills` (Codex) symlinks must both continue to point there — as the relative link `../skills/.claude/skills` — so both agents use the same skill implementation. Never create a real directory at either path. Edit the canonical skill tree only; do not create divergent Claude-only and Codex-only copies.
- Slash commands are skills. Every `/name` workflow lives at `skills/.claude/skills/<name>/SKILL.md` (with `allowed-tools` in its frontmatter when it needs pre-approved tools); there is no `.claude/commands/` at the root. A command there would be invisible to Codex, and Claude Code lets a same-named skill shadow it anyway.
- Write instructions and skills using behavior supported by both Claude Code and Codex. If platform-specific configuration or tooling is unavoidable, label it clearly and provide equivalent behavior for the other agent.
- After changing instruction files, skills, or their symlinks, run `python3 scripts/check-agent-guidance.py`. It verifies every tracked scope, including nested feature guides, plus the shared-skills link.

## Packages

| Path               | Status | Description                                                                                                                                                                                                |
| ------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard/`       | active | Web client (React 19, TanStack Start, Apollo, TypeScript)                                                                                                                                                  |
| `mobile/`          | active | React Native iOS/Android app (Expo, Apollo, TypeScript)                                                                                                                                                    |
| `cli/`             | active | `beancount-cli` — directives, bean-check/format, BQL queries, reports, local-ledger chat (Python, Typer) — includes vendored `fava` reporting library                                                      |
| `backend-cluster/` | active | Backend services: `backend-v2` (GraphQL/REST/MCP API), `ledger` (rustledger-WASM ledger service), `idl` (OpenAPI specs + generated clients), `agent-box` (Cloudflare Worker sandbox control plane)         |
| `skills/`          | active | Agent skills: init, import, importer-author, reconcile, migrate, ask, close, options (see `skills/CLAUDE.md`)                                                                                              |
| `deploy/`          | active | Deployment targets: `deploy/docker-mac/` (Docker Compose, full stack locally), `deploy/docker/` (single-host production), and `deploy/bex/` (bex PaaS, no persistent disks — Blueprint at root `bex.yaml`) |
| `docs/`            | active | Documentation content                                                                                                                                                                                      |

There is no root `package.json`. Each package owns its own dependencies and scripts. Dashboard, mobile, ledger, and CLI also own their tracked lockfiles; backend-v2, agent-box, and the small IDL clients currently do not have one. CI is path-filtered for dashboard, mobile, CLI, and skills (see [Tooling](#tooling)).

When a new package gets real code, add a `<package>/CLAUDE.md` documenting its tech stack and conventions (with the `AGENTS.md` symlink per the compatibility rules above).

## Roadmap board (`.pm/`)

`.pm/` is the public TPM board for growing adoption in the open-source and agentic-coding community (workstreams → milestones → tasks). Conventions live canonically in `skills/.claude/skills/pm/SKILL.md`; `/pm` is the **only** skill that writes to `.pm/`, `/pm-brainstorm` proposes work as text, and `/loop-worker <wN>` drains a workstream milestone by milestone (implement → `/pm done` → `/ship`). Read `.pm/DO_NOT_DO.md` before proposing roadmap work. The board is public — no secrets, no private-repo references.

## Repo-wide rules

### Never hand-edit a lockfile

- Tracked lockfiles are `dashboard/yarn.lock`, `mobile/yarn.lock`, `backend-cluster/ledger/yarn.lock`, and `cli/uv.lock`.
- Lockfiles are generated — manual edits cause dependency drift.
- If deps need updating, run the owning package's package manager from inside that package. Ask the user before adding new dependencies.

### Scope changes to one package

- Always `cd` into the package directory before running scripts (`yarn`, `tsc`, `uv`, etc.).
- Don't introduce new cross-package imports — packages are otherwise independent.
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
- Packages pin different Yarn majors — always run Yarn from inside the package directory so its local configuration wins:
  - `dashboard/` → Yarn 4.17.0 (Berry); installs with `yarn install --immutable`.
  - `mobile/` → Yarn 1.22.22 (Classic); installs with `yarn install --frozen-lockfile`.
  - `backend-cluster/ledger/` → Yarn 4.17.0 (Berry); installs with `yarn install --immutable`.
  - `backend-cluster/backend-v2/`, `backend-cluster/agent-box/` (Yarn Classic/npm, `yarn install`; deploys with `wrangler deploy`), and the IDL clients use their package-local setup; none currently has a tracked lockfile.
- Python package `cli/` uses [uv](https://docs.astral.sh/uv/): `uv sync --all-groups`, then `make check-all`.
- CI — path-filtered workflows on push/PR to `main`:
  - `.github/workflows/ci.yml` (`CI`) → `mobile/**`: `yarn format:check`, `yarn lint`, `yarn typecheck`, `yarn test:unit`.
  - `.github/workflows/ci-dashboard.yml` (`CI (dashboard)`) → `dashboard/**`: `yarn format:check`, `yarn lint`, `yarn test`, `yarn build`.
  - `.github/workflows/ci-cli.yml` (`CI (cli)`) → `cli/**`: `make check-all`.
  - `.github/workflows/ci-skills.yml` (`CI (skills)`) → `skills/**`: `python3 skills/scripts/ci-check.py` (SKILL.md frontmatter, evals.json, fixture paths, Python syntax, bean-check on `*ledger.beancount`).
- Agent guidance: `.github/workflows/ci-agent-guidance.yml` validates `CLAUDE.md` / `AGENTS.md` and shared-skill symlinks whenever those surfaces change.
- Backend and deploy packages currently have no package-specific GitHub Actions test workflow; run the commands in their scoped `CLAUDE.md` files before handing off changes.
- Secret scan: `.github/workflows/secret-scan.yml` runs gitleaks over the whole tree on every push/PR — not path-filtered.
- Release: `.github/workflows/deploy.yml` (workflow name `Release (mobile)`) runs on every `mobile/**` push to `main` and verifies checks, but deploys only when `mobile/package.json`'s version has no `mobile-v<version>` git tag yet (i.e. after `yarn bump`): it ships the OTA update, runs the Expo EAS build/submit, then pushes the tag and a GitHub Release. A push without a version bump deploys nothing. Tag-after-success makes failed releases retry automatically on the next push.
