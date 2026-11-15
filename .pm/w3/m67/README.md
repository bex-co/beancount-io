# w3 · m67 — Port the CLI to typer 0.29 and lift the version cap

**Worker:** worker3 **Goal:** a fresh `bea` install resolves current typer, and the CLI no longer depends on typer internals that 0.29 removed **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Run API codegen in its own tool environment | 45m | — |
| t002 | Rebuild the empty-path refusal and the three path types | 90m | t001 |
| t003 | Port native forwarding and single-value parsing | 60m | t001 |
| t004 | Relock the frontend and the engine | 45m | t002, t003 |
| t005 | Regenerate the reference and prove installs | 30m | t004 |
| t006 | Adoption surface | 20m | t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

`cli/pyproject.toml` allows typer 0.29+; a fresh resolve takes it; `make check-all` and `scripts/test-install.py` (wheel and sdist) pass; private typer imports are confined to one documented module (w1/241's original "grep finds nothing" criterion cannot hold, since the vendored parser has no public replacement).

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w1` 2026-11-14 (revised after the user excluded `SELF_HOST` work), item 5; the user routed it to w3. Promoted from [w1/241](../../w1/241.md), whose 2026-11-13 triage measured the port; the user chose its option (b) by routing it here on 2026-11-14.
- **Goal linkage:** **A2 — Frictionless onboarding**: installs stop pinning users to an old typer that can conflict with other tools in the same environment.
- **Expected outcome:** A new user's `pip install beancount-io` or `uv tool install` resolves current typer, and the next typer change does not break installs again.
- **Why now:** The `typer<0.29` cap from w1/239 is a stopgap that holds every user on an old typer; 241's triage already mapped the work.
- **Adoption surface:** included — the CLI README install steps (Homebrew, PyPI, `uv tool`) still work exactly as written on a fresh resolve
- **Owner approval:** declaring `click` as a direct dependency, if t004 needs it, waits on the owner (root `AGENTS.md`).
