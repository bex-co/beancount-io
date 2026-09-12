# Beancount.io Monorepo

Monorepo for [Beancount.io](https://beancount.io/) — double-entry bookkeeping made easy.

This file holds repo-wide rules. Per-package guidance lives next to the code:

- `cli/CLAUDE.md` — Python CLI (`bea` with a bundled subprocess helper)
- `dashboard/CLAUDE.md` — web client
- `mobile/CLAUDE.md` — React Native app
- `backend-cluster/backend-v2/CLAUDE.md` — API gateway and background services
- `backend-cluster/ledger/CLAUDE.md` — rustledger-WASM ledger service
- `backend-cluster/idl/CLAUDE.md` — OpenAPI contracts and generated clients
- `backend-cluster/agent-box/CLAUDE.md` — Cloudflare Worker control plane for the Ask-AI sandbox (Claude Code in Cloudflare Sandbox)
- `deploy/CLAUDE.md` — local and hosted deployment targets
- `skills/CLAUDE.md` — customer-facing Beancount skills package
- `.agents/CLAUDE.md` — internal repository development skills

## Codex and Claude Code compatibility

- `CLAUDE.md` is the canonical instruction file at every scope. The adjacent `AGENTS.md` must be a relative symlink to it so Claude Code and Codex always read the same instructions; never maintain duplicate copies.
- When adding, moving, or removing a scoped `CLAUDE.md`, make the same structural change to its `AGENTS.md` symlink. When editing either name, update the canonical `CLAUDE.md` through the symlink rather than replacing the symlink with a regular file.
- Internal development skills live in the real directory `.agents/skills/` (Codex). The root `.claude/skills` must be a relative symlink to `../.agents/skills` so Claude Code reads the same implementations. Edit `.agents/skills/` only; do not create platform-specific copies.
- Customer-facing `beancount-*` skills live separately in `skills/.claude/skills/`. Keep ledger workflows there and repository maintenance, QA, PM, and release workflows in `.agents/skills/`; do not mix the two trees or link the customer suite into the repository's development skill directory.
- Slash commands are skills. Every internal `/name` workflow lives at `.agents/skills/<name>/SKILL.md` (with `allowed-tools` in its frontmatter when it needs pre-approved tools); there is no `.claude/commands/` at the root. A command there would be invisible to Codex, and Claude Code lets a same-named skill shadow it anyway.
- Write instructions and skills using behavior supported by both Claude Code and Codex. If platform-specific configuration or tooling is unavoidable, label it clearly and provide equivalent behavior for the other agent.
- After changing instruction files, skills, or their symlinks, run `python3 scripts/check-agent-guidance.py`. It verifies every tracked scope, including nested feature guides, plus the development-skills link and separate customer skill directory.

## Packages

| Path               | Status | Description                                                                                                                                                                                                |
| ------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard/`       | active | Web client (React 19, TanStack Start, Apollo, TypeScript)                                                                                                                                                  |
| `mobile/`          | active | React Native iOS/Android app (Expo, Apollo, TypeScript)                                                                                                                                                    |
| `cli/`             | active | `beancount-io` — the `bea` command: directives, native check/format/query/doctor/example/treeify, BQL, reports, local-ledger ask (Python, Typer). Frontend never loads Beancount; managed engine via Homebrew install-time dual venv or PyPI first-use. Ships to PyPI and the `bex-co/homebrew-tap` Homebrew tap on `cli-v*` tags |
| `backend-cluster/` | active | Backend services: `backend-v2` (GraphQL/REST/MCP API), `ledger` (rustledger-WASM ledger service), `idl` (OpenAPI specs + generated clients), `agent-box` (Cloudflare Worker sandbox control plane)         |
| `skills/`          | active | Customer-facing `beancount-*` ledger skills: init, import, importer-author, reconcile, migrate, ask, close, options (see `skills/CLAUDE.md`) |
| `.agents/skills/`  | active | Internal development skills: `routine-*` code maintenance, `qa-find-bugs-*`, mermaid, pm, pm-brainstorm, loop-worker, mobile-release, ship (see `.agents/CLAUDE.md`) |
| `deploy/`          | active | Deployment targets: `deploy/docker-mac/` (Docker Compose, full stack locally), `deploy/dev-sandbox/` (full stack + Ask-AI sandbox for development), `deploy/docker/` (single-host production), and `deploy/bex/` (bex PaaS, no persistent disks — Blueprint at root `bex.yaml`) |
| `docs/`            | active | Documentation content; `docs/adrs/` centralizes every package's Architecture Decision Records (`ADR<NNN>-<package>-<slug>.md`)                                                                             |

There is no root `package.json`. Each package owns its own dependencies and scripts. Dashboard, mobile, ledger, and CLI also own their tracked lockfiles; backend-v2, agent-box, and the small IDL clients currently do not have one. CI is path-filtered for dashboard, mobile, CLI, skills, backend-v2 (parity/contract suite plus the authz model) (see [Tooling](#tooling)).

When a new package gets real code, add a `<package>/CLAUDE.md` documenting its tech stack and conventions (with the `AGENTS.md` symlink per the compatibility rules above).

## Roadmap board (`.pm/`)

`.pm/` is the public TPM board for growing adoption in the open-source and agentic-coding community (workstreams → milestones → tasks). Conventions live canonically in `.agents/skills/pm/SKILL.md`; `/pm` is the **only** skill that writes to `.pm/`, `/pm-brainstorm` proposes work as text, and `/loop-worker <wN>` drains a workstream milestone by milestone (triage → implement → `/pm done` → `/ship`, or `/pm drop` for work that should no longer be done). Read `.pm/DO_NOT_DO.md` before proposing roadmap work. The board is public — no secrets, no private-repo references.

## Repo-wide rules

### Keep REST, GraphQL, and MCP in parity

- Every customer-facing API capability must be available through REST, GraphQL, and MCP wherever the protocol and existing credential policy permit. Additions, behavior changes, fixes, and deprecations must update all eligible surfaces in the same change, including backend API work prompted by dashboard, mobile, or CLI changes.
- Parity covers accepted inputs and defaults, results, side effects, authorization, and failure behavior. MCP reads may use resources; writes and administrative actions use tools. A registry entry alone does not prove parity.
- Follow the [backend API parity requirements](backend-cluster/backend-v2/CLAUDE.md#required-api-parity-workflow) and its existing CI gate. Keep eligible gaps at zero; do not hide missing adapters behind exemptions, changed eligibility, or weakened tests. Preserve documented protocol and credential-policy exceptions.

### Never hand-edit a lockfile

- Tracked lockfiles are `dashboard/yarn.lock`, `mobile/yarn.lock`, `backend-cluster/ledger/yarn.lock`, and `cli/uv.lock`. The CLI also tracks generated `engine-requirements.lock` and `engine-optional-*.lock` runtime dependency snapshots.
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
- Every JavaScript/TypeScript package exposes `lint:deadcode` (detect unused files, exports, and exported types) and `lint:deadcode:fix` (apply Knip's removals, including orphan files). Detection is part of each package's normal lint gate. Review the fix command's diff before keeping it.
- The Python CLI exposes `make deadcode` for high-confidence Vulture detection and `make deadcode-fix` for Ruff-removable unused imports/variables; `make check-all` includes detection.
- From the repository root, `scripts/lint-deadcode.sh` runs every package's detector plus Vulture over the root and skills support scripts; `scripts/fix-deadcode.sh` applies every package's safe fixes. The latter can delete files; always review its diff and run the native package checks afterward.
- CI — path-filtered workflows on push/PR to `main`:
  - `.github/workflows/ci.yml` (`CI`) → `mobile/**`: `yarn format:check`, `yarn lint`, `yarn typecheck`, `yarn test:unit`; a macOS job runs `yarn metadata:validate`, `yarn screenshots:build`, and `yarn screenshots:validate` for Apple and Play listing assets.
  - `.github/workflows/ci-dashboard.yml` (`CI (dashboard)`) → `dashboard/**`: `yarn format:check`, `yarn lint`, `yarn test`, `yarn build`.
  - `.github/workflows/ci-cli.yml` (`CI (cli)`) → `cli/**`: `make check-all`.
  - `.github/workflows/ci-skills.yml` (`CI (skills)`) → `skills/**`, `.agents/**`, `.claude/skills`: `python3 skills/scripts/ci-check.py` (both skill trees: SKILL.md frontmatter, evals.json, fixture paths, Python syntax, bean-check and `bea check` on `*ledger.beancount`), checker unit tests, and the QA helper's Node tests.
  - `.github/workflows/ci-authz-model.yml` (`CI (authz model)`) → `backend-cluster/backend-v2/authz/**`: OpenFGA CLI `fga model validate` + `fga model test` on the declarative authorization model.
  - `.github/workflows/ci-backend-parity.yml` (`CI (backend parity)`) → `backend-cluster/backend-v2/**`: `yarn typecheck`, `yarn test` (includes the surface-parity zero-debt gate and op-class coverage), and an OpenAPI snapshot drift check via `yarn generate-v1-openapi`.
- Agent guidance: `.github/workflows/ci-agent-guidance.yml` validates `CLAUDE.md` / `AGENTS.md` and shared-skill symlinks whenever those surfaces change.
- The other backend packages and deploy have no package-wide GitHub Actions test workflow (backend-v2 has the parity and authz-model checks above); run the commands in their scoped `CLAUDE.md` files before handing off changes.
- Secret scan: `.github/workflows/secret-scan.yml` runs gitleaks over the whole tree on every push/PR — not path-filtered.
- Release (cli): `.github/workflows/release-cli.yml` (workflow name `Release (cli)`) runs on `cli-v<version>` tags. It validates the tag against `cli/pyproject.toml`, runs `make check-all`, and tests the exact sdist through a clean Homebrew installation on macOS. After those checks pass, it publishes the sdist and wheel to PyPI through trusted publishing, creates the GitHub Release, and pushes `Formula/bea.rb` to `bex-co/homebrew-tap`. A tag release requires `BEA_TAP_PUSH_KEY` before either channel publishes. `workflow_dispatch` with `test` rehearses the checks against TestPyPI without requiring the tap key or publishing to the tap. See `cli/README.md` for the tagging procedure.
- Release (mobile): `.github/workflows/deploy.yml` (workflow name `Release (mobile)`) runs on every `mobile/**` push to `main` and verifies checks, but deploys only when `mobile/package.json`'s version has no `mobile-v<version>` git tag yet (i.e. after `yarn bump`): it ships the OTA update, runs the Expo EAS build/submit, then pushes the tag and a GitHub Release. A push without a version bump deploys nothing. Tag-after-success makes failed releases retry automatically on the next push.
