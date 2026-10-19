# w2 · m39 — Rename the two skills whose names collide with Beancount directives

**Worker:** worker2 **Goal:** `beancount-options` becomes `beancount-options-trades` and `beancount-close` becomes `beancount-close-month`. Existing installs upgrade without dangling links, and ledgers that already carry a `;; beancount-options config` block keep working unchanged. **Status:** blocked (t001 done; t002 onward wait for the owner's rename decision)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](./done/t001.md) | Confirm the renames with routing evidence — **DONE** | 30m | w2/m38/t011 |
| t002 | Keep the persisted config header stable — **BLOCKED** | 20m | t001 |
| t003 | Rename directories, frontmatter, and in-suite references | 45m | t002 |
| t004 | Retire the old names in the link installer | 45m | t003 |
| t005 | Update references outside `skills/` | 30m | t003 |
| t006 | Rehearse an upgrade on Claude Code and Codex | 30m | t004, t005 |
| t007 | Adoption surface | 20m | t006 |
| t008 | Simplify | 15m | t007 |
| t009 | Test coverage | 30m | t007, t008 |
| t010 | Closeout | 15m | t009 |

## Blocked

- **Milestone (2026-10-19)** — the rename itself (t002–t010) waits on a decision only the repository owner can make. t001's evidence ([routing rehearsal](../../../../docs/skills/routing-rehearsal.md), "Proposed renames") removes the premise this milestone was filed on. Every `close`/`option` collision prompt ("Close my old Amex card account", "Set the operating_currency option", options education, greeks) already routes to no suite skill under the current names on Claude Code and Codex, in every run before and after m38's skip clauses. The renamed suite routes them identically. What remains is readability in `/` menus and catalogs, which routing cannot measure, against the migration cost: retired-name links in every existing install, about 420 references, the hosted MCP prompts' source lines, and the slugs [w6/m6](../../../w6/blocked/m6/README.md) will publish. Shipped baseline: t001 `f419497ab`; m38's routing set and runner make the rename re-measurable at any time. **Unblock:** the owner either (a) confirms the rename for readability alone, so the worker unblocks and continues at t002 unchanged, or (b) declines it, so the worker drops this milestone citing this evidence. **Who can clear it:** the repository owner.

## Definition of done

- The suite's directories, frontmatter `name`s, cross-references, evals, routing labels, docs, and test inventory use `beancount-options-trades` and `beancount-close-month`. `git grep -E 'beancount-(options|close)\b'` finds only intentional history (rehearsal evidence, ADRs) and the persisted config header.
- The routing set ([m38](../../done/m38/README.md)) shows the renamed suite routes the collision prompts at least as well as before, with no regression, on both clients.
- `beancount-options-trades` reads and writes the `;; beancount-options config` header byte-for-byte, and `skills/AGENTS.md` says config headers are a persisted contract that does not follow skill names.
- `beancount-skills.py install` on an existing install replaces links under the retired names that point into this checkout; `verify` reports a retired name still linked; `uninstall` removes retired-name links into this checkout. A non-link copy under a retired name is still reported as a conflict and never deleted. Tests cover each case.
- The hosted MCP prompts' `Playbook source:` lines name the new paths, and the backend-v2 checks pass.
- An upgrade rehearsal from the previous revision on Claude Code and Codex lists the new names, leaves no dangling link, and re-reads an existing options config block. It is recorded with versions and dates.

## Source + Goal linkage

- **Source:** agentic-skill review of `skills/` at the user's request, 2026-10-18. "Options" in Beancount means `option` directives such as `operating_currency`, and the dashboard's settings section is literally `beancount-options-section`. `close` is also the directive that closes one account. `beancount-ask` (collides with `bea ask`) and `beancount-importer-author` were reviewed and are not renamed here: see [w2/081](../../done/081.md) for `ask`; `importer-author`'s rename would cost more than it gains.
- **Goal linkage:** **A1 — Agent-native accounting.** A name that says what the skill does reduces misroutes and makes explicit `/` invocation guessable. **A3 — Community & distribution:** registry slugs are permanent once published.
- **Expected outcome:** a user typing `/beancount-` sees `beancount-options-trades` and `beancount-close-month` and knows what each does. "Set my operating currency option" and "close my old card" stop reaching the wrong skill. Existing users upgrade with `git pull` plus `install` and nothing breaks.
- **Why now:** ClawHub versions are immutable. [w6/m6](../../../w6/blocked/m6/README.md) will publish slugs `beancount-<name>` (its t005/t007) once its owner decision clears, and a slug published under the old names would stay forever. Renaming later also means migrating more installs. [m38](../../done/m38/README.md) supplies the evidence first. Adoption surface is included because skill names are what users and agents see in every client and catalog.

## Out of scope

- Renaming `beancount-ask` (tracked in [w2/081](../../done/081.md)) or `beancount-importer-author`.
- Changing the `beancount-` prefix.
- Rewriting dated rehearsal evidence or ADR history; add a note where an old name would confuse a reader.
