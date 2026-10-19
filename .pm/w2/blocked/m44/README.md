# w2 · m44 — Install the suite as a Claude Code plugin and a Codex plugin

**Worker:** worker2 **Goal:** a Claude Code user adds one marketplace and installs a `beancount-io` plugin, and a Codex user installs the same plugin. Both get the whole customer suite from the same `skills/` folders the link installer uses, with in-client updates and no Python helper. **Status:** todo (t001–t002, t004–t005 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](./done/t001.md) | Choose the manifest layout and the plugin name, verified against current docs — **DONE** | 45m | w2/m42/t006 |
| [t002](./done/t002.md) | Add the Claude Code marketplace and plugin entry — **DONE** | 45m | t001 |
| t003 | Add the Codex plugin manifest for the same `skills/` | 45m | t001 |
| [t004](./done/t004.md) | Decide how a skill change reaches plugin users, and enforce it in CI — **DONE** | 30m | t002 |
| [t005](./done/t005.md) | Document the plugin install beside the other install paths — **DONE** | 30m | t002 |
| t006 | Rehearse install, update, and first query on both clients | 45m | t004, t005 |
| t007 | Adoption surface | 30m | t006 |
| t008 | Simplify | 15m | t007 |
| t009 | Test coverage | 45m | t007, t008 |
| t010 | Closeout | 15m | t009 |

## Blocked

- **t003 (2026-10-19)** — its manifests shipped (`f790f265a`) and installed correctly from GitHub on the second client; only the live prompt showing it reading the shared `bea-cli.md` from the plugin cache remains, which needs a model turn the usage-limited account cannot run until 2026-11-17 (recorded in [t003](./t003.md)). t004 and t005 needed only the shipped manifests, so their `depends_on` was repointed to t002 in the same ship.
- **t006 (2026-10-19)** — rehearsed end to end on one client (install, exact first-query figures, update, uninstall) and mechanically on the other; only its first-query answer remains (evidence in [t006](./t006.md)). t007 onward wait behind it. **Unblock:** Codex usage returns; one session closes both t003 and t006. **Who can clear it:** the operator (Codex usage).

## Definition of done

- A Claude Code user who runs the documented marketplace command, which fetches only the manifest and `skills/` rather than the whole monorepo, can then run `/plugin install beancount-io@<marketplace>` and see every `beancount-*` skill in the client.
- A Codex user who follows the documented plugin install sees the same skills, with the same descriptions.
- Both manifests point at `skills/`. No skill file is copied or generated into another tracked location, and `skills/` still passes m42's layout guard: only skill folders, `README.md`, and `AGENTS.md`.
- A skill change merged to `main` reaches an installed plugin through the documented update, under the version rule t004 chose. CI enforces that rule.
- `docs/skills/installation.md` documents the plugin path, how plugin and linked installs coexist, and how to switch between them.
- t006 records a fresh install, an update, and one first-query routing prompt on each client, with versions and dates.

## Answers to 082's questions

- **Naming:** skill names stay exactly as they are. Plugin skills are namespaced by plugin, so an explicit invocation reads `/beancount-io:beancount-ask`, while model routing still goes by each description. Dropping the `beancount-` prefix inside the plugin would create a second set of names next to the linked install and ClawHub, so it is rejected. A later rename ([m39](../m39/README.md)) applies to every channel at once.
- **Single source:** the manifests sit outside `skills/` and point at it, because m42's guard rejects a `.claude-plugin/` folder inside `skills/`. t001 confirms the formats allow this. If one does not, the milestone stops for a layout decision rather than copying skills.
- **Versioning:** t004 picks one rule: either a single suite version that the plugin manifests share and [w6/m6](../../../w6/blocked/m6/README.md) can reuse for ClawHub, or no version, so each commit is an update. The rule depends on what each client does with a missing or unchanged version. Today's `install` reports a Git revision; the plugin docs say how a user maps one to the other.

## Source + Goal linkage

- **Source:** inbox note [082](../../done/082.md), promoted 2026-10-18 after the skills-distribution research in that day's `/pm-brainstorm`. Neither Anthropic marketplace listed a Beancount plugin. [giltotherescue/slashbooks](https://github.com/giltotherescue/slashbooks) ships Claude Code and Codex manifests for one skill tree. [Countbean](https://github.com/CPUtester5465/countbean-plugin), a hosted-Beancount plugin, already installs through Claude Code's plugin system.
- **Goal linkage:** **A3 — Community & distribution:** plugins are the install path Claude Code and Codex now promote, and a self-hosted marketplace is the prerequisite for the vendor directories. **A2 — Frictionless onboarding:** one in-client command replaces a sparse clone, a Python helper, and manual `git pull` updates.
- **Expected outcome:** a newcomer installs the suite without leaving the client and receives updates there. Signals: plugin installs (once a directory listing reports them), fewer install-guide issues, and skill invocations from plugin users.
- **Why now:** m42 gives the suite the flat `skills/<name>/` layout a plugin expects, so this follows it directly. Land the install-guide section after w2/m43 documents the other channels, so both milestones do not edit the same section at once. Adoption surface is included because this adds a customer install path and changes the install guide.

## Out of scope

- A slim public mirror repository for the Anthropic, OpenAI, and Gemini directories. This monorepo exceeds Anthropic's 10,000-file limit, so that needs an owner decision (w2/087).
- Bundling the hosted Beancount.io MCP server into the plugin. The suite is local-first, and connecting a hosted ledger stays a separate, explicit step.
- Renaming skills (m39), publishing to ClawHub (w6/m6), and the `npx skills` / `gh skill` channels (w2/m43).
