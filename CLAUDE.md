# Beancount.io Monorepo

Monorepo for [Beancount.io](https://beancount.io/) — double-entry bookkeeping made easy.

This file holds repo-wide rules. Per-package guidance lives next to the code:
- `mobile/CLAUDE.md` — React Native app

## Packages

| Path | Status | Description |
|------|--------|-------------|
| `mobile/` | active | React Native iOS/Android app (Expo, Apollo, TypeScript) |
| `skills/` | placeholder | Skills package — empty, only `.gitkeep` |
| `cli/` | placeholder | CLI tool — empty, only `.gitkeep` |

There is no root `package.json`. Each package owns its own dependencies, scripts, and `yarn.lock`. CI is per-package and path-filtered: a change under `mobile/**` runs only the mobile job (see `.github/workflows/ci.yml`).

When `skills/` or `cli/` get real code, add a `skills/CLAUDE.md` / `cli/CLAUDE.md` documenting their tech stack and conventions.

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
- Deploy: `.github/workflows/deploy.yml` triggers an Expo EAS build/submit when `mobile/package.json`'s `version` changes on `main`.
