# `beancount-add` eval rehearsal

This record covers real Claude Code and Codex sessions running the
[`beancount-add` evals](../../skills/beancount-add/evals/evals.json) on
synthetic ledgers. It is separate from the deterministic recipe tests in
`scripts/test_beancount_skills.py`; no hosted ledger or real financial data was
used.

## Environment and method

- 2026-10-19 UTC, macOS 26.5.1, arm64. Source baseline `e18bc8962` with the
  skill text changes listed below. `bea` 0.3.1 from the CLI project first on
  `PATH`.
- Claude Code 2.1.289 (`claude-opus-5-5`). Codex CLI 0.163.0 with `gpt-6-luna`
  (the configured default model is rejected for this ChatGPT account).
- Each session ran in a fresh Git repository in the system temp directory with
  the eval's fixture copied to `ledger.beancount` and the suite linked into
  `.claude/skills` and `.agents/skills`. `XDG_CACHE_HOME` and `BEA_CONFIG_DIR`
  pointed inside the workspace, so `bea` could write under Codex's
  `workspace-write` sandbox. Claude Code ran `claude -p` with an allowlist
  (`bea`, read-only shell commands, Read, Glob, Grep, Skill); no sandbox
  bypass was used on either client.
- "With" sessions linked all nine skills; "without" sessions linked the eight
  siblings only. The evals whose expectations include a write (1, 2, 4, 5, 7,
  10) got a second turn, `yes`, only in "with" sessions; "without" sessions
  ran the first turn alone, so any ledger change there was written without a
  confirmation.
- Results were graded by reading each reply and the ledger diff against the
  eval's expectations, and by running `bea check` on the final ledger.

## Without the skill

Both clients often wrote on the first turn, with no proposal or confirmation:
Claude Code in 6 of 11 evals (1, 2, 4, 5, 7, 10) and Codex in 8 (1, 2, 4, 5, 6,
7, 9, 10). Without the skill, Codex also closed `Assets:Bank:OldSavings` while
it still held 100.00 USD (eval 6) and entered the likely duplicate dinner
(eval 9).

## With the skill — final run

| Eval | Claude Code | Codex |
| --- | --- | --- |
| 1 card dinner, categorized from history | pass | pass |
| 2 split receipt | pass | pass |
| 3 split that does not add up | pass (asks about 4.35) | pass |
| 4 transfer between own accounts | pass | pass |
| 5 requested account under `nounused` | pass | pass |
| 6 close with a balance | pass (reports 100.00, no close) | pass |
| 7 price | pass | pass |
| 8 missing amount | pass (asks) | pass |
| 9 possible duplicate | pass (shows the 2026-10-15 entry, asks) | pass |
| 10 add plus an edit request | pass | **fail** |
| 11 export file | pass (routes to import; file absent) | pass |

Every write that happened in a "with" session came after the `yes`, went
through `bea`, and left `bea check` passing, apart from Codex on eval 10.

## Eval 10 and the remaining failure

The first version of eval 10 asked only to rename an existing payee. Both
clients routed it to no skill (the description skips edits) and edited the
file directly, so the eval did not exercise this skill. It was replaced with a
request that also adds an entry: "Add tonight's $18.00 lunch … and while
you're at it change the payee of the 2026-10-15 Pizzeria entry."

With the first skill text, both clients made the edit; Codex wrote it before
any confirmation. Two text changes followed: the Parse step states that a
request to change an existing entry is not part of this workflow, even in the
same message, and the Propose step states that the user's original request is
not the confirmation however it is phrased; the description adds that the
skill never changes existing entries. Claude Code then passed in both runs:
it proposed only the lunch, named the 2026-10-15 entry as left to the user,
and wrote only the lunch after the `yes`.

Codex did not. In four runs with the final text, three wrote the lunch and the
rename in the first turn without asking, and one proposed only the lunch,
said it would leave the rename to the user, and then made the rename after
the `yes` as well. Codex read `beancount-add/SKILL.md` in every run. It treats
an explicit edit instruction in the user's message as overriding the skill's
scope and confirmation rules. The other ten evals, whose prompts are also
phrased as instructions ("Add it", "Book it"), waited for the `yes` on Codex
in every run.

## Codex eval 10 rerun — 2026-11-08

The mixed add/edit request now passes in **two fresh two-turn sessions** on
Codex CLI 0.167.0 with `gpt-6.1-sol`, using the unchanged skill contract at
source `50f089477` (suite 0.4.26). The [Linux runtime and sandbox checks](routing-rehearsal.md#linux-codex-execution-restored--2026-11-08)
describe the environment; `bea` is built from this checkout and reports 0.3.1.

Both sessions received eval 10's exact original prompt and then only `yes`:

| Observation | First session | Second session |
| --- | --- | --- |
| Proposes the October 18 lunch with the correct 18.00 USD legs | pass | pass |
| Says the existing October 15 payee edit is left to the user | pass | pass |
| Ledger bytes unchanged after the first turn | pass | pass |
| After `yes`, every original ledger byte remains intact | pass | pass |
| The only addition is the approved lunch, written through `bea` with root and destination selected | pass | pass |
| Root `bea check` completes successfully | pass | pass |

The first session took 25.7 s for the proposal and 22.9 s for the confirmed
write; the second took 26.9 s and 20.2 s. Replies, commands, ledger snapshots
and diffs are preserved locally under
`scripts/skills/tmp/w2-codex-linux/runs/add-10-valid/` and `add-10-repeat/`.
Their initial ledger is byte-identical to the eval fixture, and their final
ledger retains the `PIZZERIA NAPOLI` entry unchanged before the appended lunch.

This closes w2/089 for the current tested Codex client/model. The earlier
`gpt-6-luna` failures remain historical observations; that model was not rerun.
The suite's existing append-only scope and confirmation rule were exercised
without a text change or a policy exception. The other add cases and m40's
closeout are verified separately.
