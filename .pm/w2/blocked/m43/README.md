# w2 · m43 — Install the suite from the standard skill channels without the development skills

**Worker:** worker2 **Goal:** someone who installs Beancount.io's skills the way agents now find skills (`npx skills`, `gh skill`, a Hermes tap) gets exactly the customer `beancount-*` suite, never the repository's development skills. Every customer `SKILL.md` meets the Agent Skills specification, and the install guide documents each channel as rehearsed on Claude Code and Codex. **Status:** todo (t001–t002, t004 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](./done/t001.md) | Hide the 19 development skills from public skill installers — **DONE** | 30m | — |
| [t002](./done/t002.md) | Make every customer SKILL.md meet the Agent Skills specification without losing ClawHub's metadata — **DONE** | 45m | — |
| t003 | Enforce the specification's frontmatter rules in `CI (skills)` | 30m | t002 |
| [t004](./done/t004.md) | Document the `npx skills`, `gh skill`, and Hermes installs beside the link installer — **DONE** | 45m | t001, w2/m42/t006 |
| t005 | Rehearse each channel on Claude Code and Codex | 45m | t004 |
| t006 | Adoption surface | 30m | t005 |
| t007 | Simplify | 15m | t006 |
| t008 | Test coverage | 45m | t006, t007 |
| t009 | Closeout | 15m | t008 |

## Blocked

- **t003 (2026-10-19)** — waits for the owner's dependency decision recorded in [t003](./t003.md): a pinned `skills-ref` in CI, or the specification's frontmatter rules in `ci-check.py`. **Who can clear it:** the repository owner.
- **t005 (2026-10-19)** — both working channels (`npx`, `gh`) rehearsed end to end on one client with the exact first-query figures, and Hermes removed from the guide because its scanner refuses `beancount-init` outright (evidence in [t005](./t005.md)). What remains is the Codex first-query answer per channel. **Unblock:** Codex usage returns (2026-11-17); run it, record it, close t005. t006 onward wait behind it and t003. **Who can clear it:** the operator (Codex usage).
- **t004's m42 dependency — cleared 2026-10-19.** It named m42's closeout (t011) for one reason: the channels need the flat `skills/<name>/` layout. That layout shipped in m42/t001–t006 and is live on `main`; only m42's adoption/closeout chain remains. At the owner's direction to keep draining w2, t004's `depends_on` was repointed to `w2/m42/t006` and the milestone unblocked; t003 stays blocked above.

## Definition of done

- `npx skills add bex-co/beancount-io --list` against `main` lists only the customer `beancount-*` skills. With `INSTALL_INTERNAL_SKILLS=1` the development skills appear, which shows they are flagged rather than deleted. Claude Code and Codex still load every development skill inside this repository.
- Every customer skill passes `skills-ref validate`. The one exception allowed: if a rule cannot be met without breaking the `metadata.openclaw` block that ClawHub reads, that rule is named in `skills/AGENTS.md` with the validator's output. `CI (skills)` enforces every other rule of the specification.
- `docs/skills/installation.md` gives a whole-suite install and an update for `npx skills`, `gh skill`, and Hermes, next to the link installer, and says how to switch methods. Each channel was rehearsed on Claude Code and Codex through to the first-query answer, recorded with versions and dates.
- The ClawHub metadata still parses to the same `requires` and `install` values, and [w6/m6](../../../w6/m6/README.md)'s `beancount-skills.py bundle` still runs.

## Source + Goal linkage

- **Source:** skills-research brainstorm, 2026-10-18 (item 1), materialized at the user's request. The [skills.sh listing](https://skills.sh/bex-co/beancount-io) indexes the repository without any submission: eight skills, one install each, observed 2026-10-19. A research run of `npx skills add bex-co/beancount-io --list` on 2026-10-18 found 28 skills, the customer suite plus the 19 under `.agents/skills/`. The [vercel-labs/skills](https://github.com/vercel-labs/skills) CLI scans `skills/`, `.agents/skills/`, and `.claude/skills/` up to three levels deep, and hides a skill whose frontmatter sets `metadata.internal: true` unless `INSTALL_INTERNAL_SKILLS=1`. The [Agent Skills specification](https://agentskills.io/specification) defines `metadata` as "a map from string keys to string values", while our customer skills nest `openclaw` and `hermes` objects in one line of JSON (w6/m6 t004).
- **Goal linkage:** **A3 — Community & distribution:** these are the channels where agents and their users already look for skills, and skills.sh, Hermes, and `gh skill` read the same layout. **A2 — Frictionless onboarding:** one command installs the suite, exactly as the guide says.
- **Expected outcome:** a skills.sh, `gh skill`, or Hermes user installs the nine ledger skills and nothing else, and per-skill install counts on skills.sh become a meaningful signal (baseline: one install each, 2026-10-19).
- **Why now:** the leak is live. Anyone who runs the obvious command today gets 19 contributor workflows installed into their agent, such as `ship`, which commits and pushes to `origin/main`, and `loopx`. skills.sh lists the repository whether or not we act. t001–t003 can start now. t004–t005 wait for [m42](../m42/README.md), because `gh skill` and Hermes taps skip hidden folders, which the suite's pre-m42 layout used. Adoption surface is included because the install guide and catalog change.

## Out of scope

- The Claude Code and Codex plugin (w2/m44) and the ClawHub publish ([w6/m6](../../../w6/m6/README.md)).
- A mirror repository for the plugin directories (w2/087), a `/.well-known/agent-skills/` index on beancount.io, and awesome-list submissions.
- Changing any skill's behavior or description beyond frontmatter form.
