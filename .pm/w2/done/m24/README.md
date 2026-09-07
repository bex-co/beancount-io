# w2 · m24 — Beancount.io CLI becomes `bea`: package, command tree, automation contract

**Worker:** worker2 **Goal:** a developer or a coding agent installs `beancount-io` and drives a local ledger through one short command, `bea`, with a stable automation contract — explicit `--file`, `--json`, `--no-input`, documented exit codes — and no AI dependencies in the default install **Status:** done

## Tasks (in order)

| id   | title                                                                                   | est | depends_on       |
| ---- | --------------------------------------------------------------------------------------- | --- | ---------------- |
| t001 | Rename package and entry point: `beancount-io` / `bea` — **DONE** | 30m | —                |
| t002 | Command tree: `list`/`add`, `ledger create --clone`, safe hosted defaults — **DONE** | 45m | t001             |
| t003 | `ask` replaces `chat` as the optional `[ask]` extra with lazy imports — **DONE** | 45m | t001             |
| t004 | Global target and mode options: `--file`, `--json`, `--no-input`, `--yes`, `--version` — **DONE** | 1h  | t002             |
| t005 | Exit codes, structured errors, and no-input behavior — **DONE** | 1h  | t004             |
| t006 | JSON output for the read-side commands — **DONE** | 1h  | t005             |
| t007 | Config directory `~/.config/bea/` and `BEA_*` environment — **DONE** | 30m | t001             |
| t008 | Docs converge: USAGE.md, README, PRFAQ, skills, backend client name — **DONE** | 45m | t003, t006, t007 |
| t009 | Adoption surface — `bea` discoverable and usable on every surface — **DONE** | 30m | t008             |
| t010 | Simplify — **DONE** | 20m | t009             |
| t011 | Test coverage — contract tests for target resolution, exit codes, JSON, and no-input — **DONE** | 1h  | t009             |
| t012 | Closeout — **DONE** | 15m | t011             |

## Command tree after this milestone

```
bea check | format | query "<BQL>"
bea list <type> | bea add <type>          # eleven directive types; add transactions --from PATH
bea report balance-sheet | income-statement | trial-balance | overview
bea ask ["question"]                      # requires beancount-io[ask]
bea auth login | logout | status
bea ledger list | create [--clone] | clone | delete [--yes]
bea --file PATH | --json | --no-input | --yes | --version
```

Exit codes: 0 success · 1 ledger or validation error · 2 usage (arguments, missing target, missing extra, input needed under `--no-input`) · 3 authentication or permission · 4 conflict or unknown write outcome.

## Definition of done

From `cli/`, `uv sync && uv run bea --help` works and no `beancount-cli` script is installed. The default install imports neither `openai` nor `pydantic_ai` (`python -X importtime -m cli.main --help` shows neither). `bea --version` prints the version with no network call. `bea --file X check`, `BEA_FILE=X bea check`, and `./main.bean` fallback resolve in that order and a missing file exits 2. `bea --json list transaction` and every other read-side command emit the documented envelope on stdout and a JSON error object on stderr on failure. `bea add transactions --from` with an invalid row writes nothing and exits 1. `bea ledger create` defaults to private; `bea ledger delete` needs a confirmation or `--yes`; `bea ledger init` no longer exists. Per-user state lives under `~/.config/bea/`; the CLI reads only `BEA_*` variables. `git grep -l beancount-cli` lists nothing outside `.pm/**/done/` and PRFAQ's historical inventory. `docs/USAGE.md` examples run as written. `make check-all` is green.

## Source + Goal linkage

- **Source:** TPM discussion 2026-09-06 on the Beancount.io CLI (three naming layers: product "Beancount.io CLI", package `beancount-io`, command `bea`; `beancount-cli` on PyPI is an unrelated, actively maintained third-party project, so the old name could never be published), building on `cli/docs/PRFAQ.md` FAQ 3, 4, 10, and 16 (documented-but-unimplemented `--file`/`--json`, silent partial-failure exits, AI dependencies loaded at import time). User decisions: delete `beancount-cli` outright, `read`/`write` → `list`/`add`, `chat` → `ask` as an optional extra.
- **Goal linkage:** **A2 — Frictionless onboarding:** one memorable three-letter command, and a first `bea check` that needs no account and no LLM client. **A1 — Agent-native accounting:** `--json`, `--no-input`, explicit targets, and a fixed exit-code table turn the CLI into a primitive a coding agent or CI job can depend on; the `beancount-ask` skill shells out to it.
- **Expected outcome:** a newcomer runs `bea check` on their ledger within a minute of installing; an agent gets structured data and structured failures from every read-side command, and a failed bulk write can no longer look like success.
- **Why now:** the CLI is unreleased, so breaking changes are free today and expensive after the first PyPI release. Every later increment in the PRFAQ (REST transport, prepared-change imports) builds on this contract, and the distribution milestone (m25) must not ship the old name or the old defaults. Adoption surface included: ships a user- and agent-facing command.
