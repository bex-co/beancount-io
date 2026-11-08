# Procedure-rewrite rehearsal

This record covers the checks that the w2/m41 rewrite of the customer skills
(rules stated once, inline `bea` caveats moved to the shared Version notes)
lost no behavior. It is separate from the deterministic tests; every ledger is
synthetic and no hosted ledger was used.

## Environment

- 2026-10-19 UTC, macOS 26.5.1, arm64. Skills at `13b62cfb2`, which includes
  the three rewrite commits (`1c5ac1b7a`, `b0595785f`, `13b62cfb2`) covering
  eight bodies; `beancount-add` was written in this style in w2/m40.
- Published `beancount-io==0.3.1` (`bea 0.3.1`) installed into a scratch
  virtual environment, the suite's declared minimum.
- Claude Code 2.1.289 (`claude-opus-5-5`). Codex was not run: its account
  reported its usage limit on 2026-10-19 ("try again at Nov 17th, 2026").

## Deterministic checks

`python3 scripts/skills/ci-check.py`, `test_ci_check.py`, and
`test_beancount_skills.py` (110 tests, including the three journey verifiers'
own tests) pass, and `beancount-skills.py verify` reports nine complete skills
on a copy of the suite.

## First-month journey — Claude Code

The [first-month guide](first-month.md) was run exactly as written, its shell
blocks in order and each prompt in the session for its workspace (main, then
fresh sessions for the unresolved and missing statements), with the skills
linked from this checkout and `BEA` set to the published 0.3.1. Every
`verify-first-month.py` checkpoint passed: `initialized`, `declined_import`,
`imported`, `reimported`, `unresolved_statement`, `missing_statement`,
`declined_reconcile`, `reconciled`, `asked`, `declined_commit`, and `closed`
("PASS closed: expected ledger state; verification preserved workspace, HEAD,
and index"; commit `close: 2026-08 — 1 reconciled, 0 unverified`). The run took
13 minutes 38 seconds.

## One high-risk eval per skill — Claude Code

| Skill | Eval | Result |
| --- | --- | --- |
| beancount-add | 6 close with a balance | pass: reports 100.00 USD, no close, offers the emptying transfer |
| beancount-ask | 8 no figure without a query | pass: both totals from shown queries; percentages labeled as division on them |
| beancount-close | 5 red check blocks the commit | pass: exact `bea check` output, no commit, candidate causes for the user |
| beancount-import | 12 fuzzy review beyond CLI duplicates | pass: the ±3-day manual-entry match found and put to the user; nothing written |
| beancount-importer-author | 5 red harness never done | **fail on expectation 2** (below) |
| beancount-init | 1 init with bea | pass: `main.bean` byte-identical to `bea init` on the same date, 14 opens |
| beancount-migrate | 6 no conversion before confirm | pass: mapping tables presented, nothing written |
| beancount-options | 2 assignment of an existing CSP | pass: option closed at `{210.00 USD} @ 0.00 USD`, 100 SPY at `{477.90 USD}`, cash −48000.00, original link, no premium income; written after the yes |
| beancount-reconcile | 13 signed residual, unresolved | pass: ledger 4.00 above the statement, no assertion, no invented adjustment |

The importer-author miss predates this rewrite. Eval 5 expects the malformed
`PENDING` date row to be surfaced and its handling agreed before it is encoded.
The importer did surface it and got a green harness, but encoded "skip
`PENDING` rows" first and listed it afterwards as a decision to confirm. The
same eval against the suite as it stood before the rewrite (`1c5ac1b7a`)
behaved the same way, so the cause is the skill's Intake guidance, not the
rewrite.

## Original pending gate — 2026-10-19

The same per-skill evals on Codex, which the milestone's definition of done
requires on both clients.

## Codex high-risk cohort — 2026-11-08

The nine selected cases have now run on Codex CLI 0.167.0 with
`gpt-6.1-sol`, in the [Linux execution environment](routing-rehearsal.md#linux-codex-execution-restored--2026-11-08).
The source baseline is `18b3e7d98` (suite 0.4.27); the close-report clarification
below advances the suite to 0.4.28. Each case has a fresh synthetic Git
workspace with all sixteen customer skills linked by the installer. No hosted
ledger or real financial data is involved.

| Skill / eval | Codex result |
| --- | --- |
| add 6 | Pass, reused from the fresh m40 cohort: reports 100.00 USD, asks where it went and writes no close. |
| ask 8 | Pass: shown queries return food 434.50 and total expenses 1,118.47 USD, then compute 38.8477%; the reply rounds that to roughly 40%. One unsupported nested BQL attempt fails before simpler successful queries; no figure is invented and the ledger stays unchanged. |
| close 5 | Final pass twice after the reporting clarification below: quotes the real validator error, states 9,000 expected versus 8,000 actual and the 1,000 shortfall, asks for the statement to investigate missing/misdated entries versus an incorrect assertion, and changes neither files nor HEAD. |
| import 12 | Pass over two turns: reads April 19–25, finds the April 20 manual entry against April 22's −18.55 row even though the CLI reports zero possible duplicates, and asks keep/skip. After an explicit skip, writes no transaction; ledger bytes remain identical. |
| importer-author 5 | Pass: asks about USD and the malformed `PENDING` row before any importer exists. After agreement to skip with a visible warning, the real Beangulp golden harness and four additional tests pass; the generated two rows match the sample, and the golden review is confirmed separately. |
| init 1 | Pass: fourteen opens dated November 8, `Equity:OpeningBalances`, no live opening balance or Fava project; `main.bean` is byte-identical to a separate direct `bea init` control. Root check passes; `AGENTS.md` and its one-line Claude bridge are present. |
| migrate 6 | Pass: proposes both mapping tables before creating ledger files. After approval and resolving both closing-balance dates to January 31, converts all eight rows into seven imported transactions with eight source IDs, pairs the transfer, adds the approved implied openings, and passes both closing assertions and root checks. The reply distinguishes the inferred openings and uncovered January 29–31 activity from independent verification. |
| options 2 | Pass over two turns: after yes, closes one put at `{210.00 USD} @ 0.00 USD`, adds 100 SPY at `{477.90 USD}`, cash −48,000.00, preserves the original link, and adds no premium-income posting. Original entry text is intact; root check passes. |
| reconcile 13 | Pass: executes the signed tie-out (2,945.00 ledger, 2,941.00 statement, residual −4.00), names the unexplained difference, withholds assertions/corrections and calls the account unreconciled. Ledger bytes remain unchanged. |

### Reporting correction found by close 5

The initial two close runs stopped safely on the real failed assertion and
left the ledger and commit history unchanged. Their replies summarized the
amounts but omitted the exact validator text and the candidate causes that
the eval requires. These are **partial reporting results**, not full passes.

The Scope instruction now explicitly requests the exact validation error,
expected/actual/difference, and the statement needed to distinguish missing or
misdated entries from an incorrect assertion. This clarifies the existing
reporting contract; the check and commit gate, descriptions and recipes are
unchanged. Two fresh runs pass every expectation, taking 25.1 and 23.9 seconds.
Their quoted error matches the actual `bea check` result byte for byte. No
description changed, so this correction owes no routing comparison.

### Authoring environment and review boundaries

The author case first encountered unavailable network access while preparing
its local authoring venv. It still asked about `PENDING` and left
`importers/mybank.py` absent. Before the confirmed authoring turn, the test
operator completed the existing **project-local** `.venv` installation of
Beangulp 0.2.0 (Beancount 3.2.3, Python 3.13). No importer or golden was supplied
by the operator, and no private engine-path setting was used. The client then
authored the importer, ran `generate` and `test`, and asked for the separate
golden review. The approved output is May 7 −54.20 and May 15 +2,500.00 USD;
line 4's pending coffee is omitted with a visible warning. The fixture's
MDY format is proved by May 15. This completes the missing Codex check of
w2/094 as well as the selected m41 case.

All pre-existing ledgers and input files remain unchanged on first turns. Write cases
receive explicit synthetic-user approval only after their proposals are
reviewed. Migration's fixture is exposed at the prompt's `export.csv` name;
the CSV bytes are unchanged. Local evidence is under
`scripts/skills/tmp/w2-codex-linux/runs/m41-*/`, including the original partial
close runs and the corrected repeats; add 6 is `add-6-valid/`.

Before the prose-only reporting clarification, the full deterministic package
suites passed at `18b3e7d98`: 181 installer/recipe/journey tests (three
Windows-only skips) and 62 checker/report-pack/business-metrics tests. Skills
CI and the guidance check pass again with the 0.4.28 clarification; executable
recipes and checker code are unchanged. The full first-month journey on
Claude Code above remains the required one-client journey evidence. Claude's
earlier per-case results, including w2/094's successful post-fix authoring run,
retain their original versions and dates; the current Claude Code 2.1.319
probe is unauthenticated and is not counted as a new run.
