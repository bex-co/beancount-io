# First-year investor rehearsal record

Real-client rehearsals of the [first-year investor journey](first-year-investor.md),
kept separate from its deterministic verifier
(`scripts/skills/verify-first-year-investor.py`) and tests.

## Claude Code — 2026-10-20 ✅

A Claude Code 2.1.289 (`claude-opus-5-5[1m]`) session ran all eight stages
from the guide's prompts in a fresh scratch workspace (suite installed from
`eda6b446d`, `bea` 0.3.1), approving each proposal as a user would. Every
verifier checkpoint passed against the live ledger:
`initialized`, `seeded`, `purchased`, `imported`, `paid`, `swapped`,
`closed_june`, `year_end`. Per stage:

- Init proposed the 14 starter accounts plus the 8 investor/property opens
  with the booking-method explanation (FIFO written; STRICT left as the
  unwritten default) and wrote only after the yes.
- Seeding tied each export to its printed total before proposing
  (2600.00 broker, 20000.00 crypto) and kept printed acquisition dates.
- The purchase tied closing arithmetic (515000 both sides) and booked the
  510000.00 basis lot with a −400000.00 mortgage.
- The April import staged the buy (fee as its own leg), dividend, and FIFO
  sell with a booking-produced 1000.00 gain. One in-character observation:
  the agent flagged the brokerage's transient −1505.00 cash between the
  04-01 buy and the 04-03 sell and offered a deposit transfer; the import
  itself wrote exactly the three export rows and figures still tied.
- Four mortgage payments tied to each printed new balance; a fresh
  `Expenses:Interest` open rode along in the proposal.
- The swap disposed 0.2 BTC `@@ 12000.00` with a booking-produced 4000.00
  gain; June reconciled to 25400.00 (residual 0.00) and closed with the
  subject `close: 2026-06 — 1 tied, 5 not tied`, `main.bean` the only
  committed path.
- Year-end answer quoted the shown-query figures: lots worth 656000.00
  against 537600.00 cost, unrealized 118400.00, realized 2026 gains
  5000.00 tied to the booked total.

Two verifier defects were found by this rehearsal and fixed before the run
above (each with a regression test): checkpoints before any commit crashed
on the missing HEAD (`ce6de36a6`), and a close as the repository's first
commit diffed empty without `--root` (`eda6b446d`).

Not run: the guide's optional negative control (a mortgage total with no
printed split) — that behavior is covered by beancount-property eval 3.

## Codex — original quota block (2026-10-20)

Codex 0.163.0 returned its account usage-limit error with a November 17
reset estimate, so the journey had not run then. Linux execution is restored
on November 8; the actual results follow.


## Codex — 2026-11-08: failures retained, candidate verified

Linux arm64 Codex CLI **0.167.0**, `gpt-6.1-sol`, default reasoning. Fresh
synthetic Git workspaces link all sixteen skills into both client folders;
original guide prompts and input files are unchanged. Model commands use
actual **published bea 0.3.1** through the login shell's `/usr/local/bin/bea`
(linked to `/opt/published-bea/bin/bea`). Native sandboxing stays enabled;
its close profile permits only the owned workspace/Git writes, with command
networking denied. No real financial account or production ledger is touched.

### Published suite 0.4.30: close fails the workspace check

At `8eb37d61f`, `initialized`, `seeded`, `purchased`, `imported`, `paid` and
`swapped` pass. Repeat broker import skips all three rows with zero new
entries and a byte-identical ledger. Every proposal waits for confirmation;
date mapping is explicitly confirmed before the activity import.

The June report correctly has one tied account and five unverified, correct
figures and the approved subject. The first commit contains only `main.bean`.
However, the agent leaves `.cache/june-close-commit.txt` after its `/tmp`
draft is refused by the native sandbox. `closed_june` correctly **fails**:
workspace files changed. The failed run is retained; the draft was not
removed and the failed workspace was not regraded. Year-end was not continued
on that failed journey. Follow-up [102](../../.pm/w2/blocked/102.md) records
the root fix and release condition.

### Fresh commit-fix candidate: all eight checkpoints pass

Local, **unpublished** commit `de48f4cdb` adds stdin-based commit messaging,
preserves other workspace files, and adds a verifier regression. The full
journey restarts in a fresh workspace, without deleting or repairing the
failed run. All eight checkpoints pass:

| Checkpoint | Observed result |
| --- | --- |
| initialized | 22 reviewed opens, brokerage FIFO / wallet STRICT explained, checking 150000. |
| seeded | Broker 2600 and crypto 20000 tie-outs, original VTI/BTC acquisition dates retained. |
| purchased | 515000 sources = uses, 510000 property basis, checking 35000, loan −400000, escrow 3000. |
| imported | Three original activity rows; cash 32.50, VTI lots 5/5/10, inferred FIFO gain 1000; repeat adds nothing. |
| paid | Four printed statement splits tie sequentially; checking 25400, loan −397540, escrow 4200, interest 5940. |
| swapped | 0.3 BTC remains, 4 ETH at 3000 acquired June 15, total booked gains 5000. |
| closed_june | July 1 assertion 25400; one tied / five unverified; only main.bean committed with the reviewed report; other workspace contents, modes and paths unchanged. No draft cleanup or push. |
| year_end | Six dated lots shown, value 656000, cost 537600, unrealized 118400; two disposed lots and holding buckets, realized 5000 tied to booked gains; December 1 prices explicitly distinguished from December 31 quotes. |

The local unit/external verifier PATH audit found that the Docker default
non-login PATH selected the checkout despite both executables reporting
0.3.1. This was corrected, not hidden: live close/year-end verification pins
`/opt/published-bea/bin/bea`; the first six saved checkpoint ledgers from
both runs were rechecked independently on that exact executable (12/12),
without modifying the original workspaces. Actual-published recipe tests
pass **63/63**, and verifier tests pass **7/7**. Disabling the workspace
preservation guard makes the new draft regression fail with one assertion
and zero test errors. Remote published-minimum CI already pinned its venv
correctly; [the audit](routing-rehearsal.md#published-executable-selection-audit--2026-11-08)
keeps those sources of evidence distinct.

### Capability clarification and independent report rerun

Published 0.3.1 lacks `report capital-gains`; the checkout of the same version
has it. The original report instruction therefore needs a capability check,
not a guessed minimum-version claim. Follow-up [103](../../.pm/w2/blocked/103.md)
records that mismatch. Local **unpublished** commit `7fd6e3f87` clarifies
`bea report --help` selection and the already documented per-lot/bucket BQL
fallback, and aligns the guide. This is additional to the fresh full journey
above, not a claim that the final combined tree ran as one untouched snapshot.

A separate fresh Codex workspace asks the original year-end question against
the verified synthetic final ledger. It reads the shared reference and actual
published CLI help, uses the BQL fallback directly, shows all six lots and
both disposed lots with holding buckets, ties realized gains to 5000, and
leaves the ledger byte-identical. Independent actual-published `year_end`
verification passes. No unsupported report invocation is required.

The six-file candidate is preserved on local branch
`codex/w2-m53-codex-20261108`, worktree
`scripts/skills/tmp/w2-m53-codex-candidate/`, and patch
`scripts/skills/tmp/w2-codex-linux/m53-codex-candidate.patch`. Version 0.4.31
was reserved locally; rebase and bump again if main has advanced before
release. Main's product files were restored to published 0.4.30.

Claude's October 20 full run remains dated evidence. **No fresh Claude run is
claimed:** current Claude Code 2.1.319 is not logged in and the login request
is unanswered. Release needs the affected close/report validation on that
client and reconciliation with the preserved m48 candidate. These failures
and follow-ups satisfy t003's explicit recorded-failure alternative; they do
not close the milestone's both-client/current-instructions definition of done.
