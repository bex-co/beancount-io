# w2 · m46 — Fix, recategorize, and reorganize an existing ledger through a reviewed diff with one-step undo

**Worker:** worker2 **Goal:** a user who tells their coding agent "fix the payee on yesterday's Starbucks entry", "move every Starbucks charge from Dining to Coffee", "rename Assets:Checking to Assets:Bank:Checking", or "tag my Japan trip" gets the exact change as a diff. The change is applied only after a yes, passes the root `bea check`, keeps the user's file layout, and lands as one commit that a single "undo" reverts. **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Define the contract, and get the owner's confirmation that this skill may change existing entries | 30m | — |
| t002 | Write the skill: fix, recategorize, rename, tag, and move entries | 90m | t001 |
| t003 | Enforce the safety rails: clean tree, checkpoint commit, check before and after, undo | 45m | t002 |
| t004 | Add executable recipes for locating, renaming, and moving entries | 45m | t002 |
| t005 | Write evals and fixtures, and route the edit prompts | 45m | t002 |
| t006 | Run the evals on Claude Code and Codex | 45m | t003, t004, t005 |
| t007 | Send sibling fix requests here, and update the inventory and catalogs | 20m | t002, w2/m40/t010 |
| t008 | Adoption surface | 30m | t006, t007 |
| t009 | Simplify | 15m | t008 |
| t010 | Test coverage | 45m | t008, t009 |
| t011 | Closeout | 15m | t010 |

## Blocked

- **t001 (2026-10-19)** — the `beancount-edit` contract is drafted in [t001](./t001.md) (triggers/skips, the five requests, preview on a temp copy, baseline-diffed `bea check`, one-commit-per-change with revert undo, dirty-tree/no-Git rules, both rename paths); what remains is the owner's explicit confirmation that a customer skill may change existing entries. Every other task waits behind it (t007 also on m40's closeout). **Unblock:** the owner confirms or declines, recorded in t001. **Who can clear it:** the repository owner.

## Definition of done

- A new `skills/<name>/` skill exists (name settled in t001). Its description routes the edit prompts correctly in the routing set on both clients. The entry "Fix the typo in the payee of yesterday's Starbucks transaction", which is `none` today, names it, and the set gains positives plus near-misses against `beancount-add`, `beancount-import`, and `beancount-reconcile`.
- For a local ledger, the skill handles:
  - fixing one entry's payee, narration, amount, date, or account;
  - recategorizing a matched set of entries, optionally adding the matching rule to the user's import rules;
  - renaming an account everywhere it appears, including import rules, or closing it and transferring to a new account when the user wants history kept;
  - adding a tag or link to a set of entries;
  - moving entries into another file with the `include` kept valid.
- Every change follows the contract:
  - the skill locates entries by their source file and line;
  - it shows a unified diff and waits for an explicit yes;
  - it changes only the lines it names;
  - after the change, the root `bea check` has no errors that were not there before;
  - each change is one commit, and "undo the last change" reverts exactly that commit.
- A dirty working tree or a ledger outside Git is handled the way t001's contract says, and never silently.
- New `<!-- recipe -->` blocks are executed by `test_beancount_skills.py` against isolated ledgers.
- The skill's evals pass on Claude Code and Codex, recorded with versions and dates.
- The installer inventory, `skills/README.md`, `skills/AGENTS.md`, `docs/skills/installation.md`, and the root `README.md` list the skill.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` research into published Beancount skills and community requests, at the user's request, 2026-10-18. Evidence:
  - The suite's own routing set (`scripts/skills/routing.json`) has no skill for "Fix the typo in the payee of yesterday's Starbucks transaction", because every skill appends only. [m40](../../done/m40/README.md) keeps that boundary for `beancount-add`.
  - Programmatic ledger rewriting is a long-standing upstream request ([beancount#586](https://github.com/beancount/beancount/issues/586)).
  - A user moved a whole setup to v3 with Claude Code after putting it off for a long time ([mailing list, 2026-03](https://groups.google.com/g/beancount/c/-lD0jnQkGIc/m/KA1znDpMCQAJ)).
  - Another user bulk-tagged trip spending with an agent and warned that skipping review "would silently corrupt the journal over months" ([Mandalivia, 2026-04](https://www.mandalivia.com/obsidian/hledger-obsidian-personal-finance-with-claude-code/)).
  - A hosted-Beancount plugin ships an undo command ([countbean-plugin](https://github.com/CPUtester5465/countbean-plugin)).
  - Users reject agents that impose a file layout ([accountant24 thread](https://forum.plaintextaccounting.org/t/accountant24-local-first-ai-agent-hledger-for-personal-accounting/799)).
- **Goal linkage:** **A1 — Agent-native accounting:** an agent can maintain a ledger, not only grow it, without falling back to freehand edits that skip every safeguard the suite enforces on writes.
- **Expected outcome:** a user corrects, recategorizes, renames, or reorganizes by describing the change, reviews one diff, and can undo it in one step. Signals: routing-set recall for edit prompts, and skill invocations once a registry listing exists.
- **Why now:** the routing set already records the gap, and agents asked to fix an entry today either refuse or edit by hand. [m40](../../done/m40/README.md) settles where `beancount-add` stops, so t007 waits for it. Write the skill after [m41](../../m41/README.md) where possible, so it follows the compacted style rather than the current one. Adoption surface is included because this adds a customer-facing skill.

## Out of scope

- Upgrading a Beancount v2 ledger, plugins, or importers to v3.
- Deleting entries or history. The one exception is reverting this skill's own checkpoint commit. Removing a duplicate, or undoing another skill's import, is a follow-up.
- Editing hosted ledgers through the MCP server.
- Reformatting whole files the user did not ask to reformat, and changing importer code (`beancount-importer-author`).
