# w3 · m45 — Keep generated import identities exact across amounts and currencies

**Worker:** worker3 **Goal:** reordering a CSV export cannot turn previously imported distinct amounts or commodities into stable-ID conflicts **Status:** done

**Severity:** minor (valid repeated imports are blocked; no destructive write observed).
**Estimate:** about 3 hours including compatibility, shared documentation and regressions.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Define and implement exact generated identities | 45m | — | — **DONE**
| t002 | Preserve legacy IDs without treating generated collisions as native-ID conflicts | 45m | t001 | — **DONE**
| t003 | Adoption surface — document the shared identity and compatibility policy | 25m | t002 | — **DONE**
| t004 | Simplify | 15m | t003 | — **DONE**
| t005 | Test coverage | 40m | t003, t004 | — **DONE**
| t006 | Closeout | 10m | t005 | — **DONE**

## Reproduced finding

Found 2026-09-21 by CLI QA at HEAD `39c6894f`, checkout `bea 0.3.0`,
Python 3.13.0, macOS 26.5.1 arm64. Fresh subprocesses, closed stdin,
isolated config/cache, synthetic ledgers only. No authentication.

Create `/absolute/main.bean`:

```beancount
2026-01-01 open Assets:Cash
2026-01-01 open Expenses:Food
```

Create `/absolute/first.csv`:

```csv
Date,Amount,Currency,Description
2026-01-02,-0.001,ETH,Reward
2026-01-02,-0.002,ETH,Reward
```

Create `/absolute/reversed.csv` with the same header and the two data rows
reversed, changing nothing else. Run:

```sh
bea --json --file /absolute/main.bean import /absolute/first.csv \
  --csv date=Date,amount=Amount,currency=Currency,narration=Description \
  --account Assets:Cash --default-account Expenses:Food --apply
bea --json --file /absolute/main.bean import /absolute/first.csv --apply
bea --json --file /absolute/main.bean import /absolute/reversed.csv --apply
```

The first command writes both rows (exit 0); the same-order replay returns
`duplicates=2, written=0` (exit 0). The reversed replay exits **4**, empty stdout,
with a JSON conflict on stderr: both rows say `Stable ID matches an entry
with different transaction data`, `conflicts=2, duplicates=0, written=0`.
It advises editing/removing entries or changing a bank ID, although these
rows have no native bank ID and neither transaction changed. Ledger hashes
remain unchanged on refused replays. Reproduced on two pristine roots.

A separate variant using `-1 ETH` and `-1 BTC` on the same date with the same
Reward description also imports both, replays in original order successfully,
and falsely conflicts on both after reversal. A control using `-1.01 USD`
and `-1.02 USD` returns two duplicates after reversal, proving order alone
is not the problem. Expected: all these unchanged rows remain duplicates,
without edits to source data or existing ledger entries.

## Root cause and compatibility boundary

`cli/src/bea_engine/importing.py:537` `_hash_base` renders a single source
amount with `.2f` and omits its currency. Thus distinct sub-cent amounts
and equal amounts of distinct commodities share a base. `_hash_import_ids`
assigns occurrence suffixes in input order to that base. Reversing distinct
rows swaps their generated IDs; the exact-ID branch compares full
fingerprints and correctly notices different data under each reused ID.
The erroneous identity generation, not that conflict guard, is the defect.

The same helper serves no-native-ID rows from CSV and Python importers;
only the no-code CSV path was exercised here. Preserve real native-ID
conflicts, source-account scoping, NFC compatibility and the N-identical-rows
occurrence guarantee. Do not solve this by globally skipping mismatched IDs,
silently merging different commodities, or rewriting existing ledger history.
Generated IDs must retain exact source amount/currency distinctions, and
legacy lossy IDs need a content-aware compatibility policy. Only treat a
legacy collision as a duplicate when the full source row agrees.

This is deliberately a milestone: the current two-decimal/no-currency form is
normative in `skills/.claude/skills/beancount-import/references/dedup.md` and
is also used by migration workflows. A one-line hash change would break
existing IDs and CLI/skill interoperability. Keep package changes separate:
CLI implementation in cli; shared convention documentation in skills.
No cross-package import or backend/API change is needed.

## Definition of done

- Replaying both synthetic fixtures in either order reports two duplicates,
  writes zero entries and leaves existing ledger bytes unchanged.
- Distinct exact amounts and distinct commodities cannot share generated
  identities solely because of decimal rounding or omitted currency.
- Legacy ASCII/NFC/pre-NFC IDs remain recognized with full-content checks;
  actual native-ID reuse with changed content remains a conflict.
- N truly identical rows still import as N entries and replay idempotently.
  Numeric spellings of the same exact value have a documented stable identity.
- CLI and customer skill documentation describe the same format and legacy
  behavior, including migration prefixes where applicable.
- Real-command regressions inspect counts and before/after bytes; cli
  `make check-all` and applicable skills/guidance checks pass.

## Source + Goal linkage

- **Source:** continuous `qa-find-bugs-cli`, user-directed w3 filing. Evidence
  is ignored under `cli/tmp/qa-20260922T052032Z-loop/`: fixtures
  `csv-identity-precision/`, `csv-identity-collisions/`; captures
  `csv-identity-precision-*.json`, `csv-id-collision-*.json`. Captures retain
  exact argv/cwd/environment, streams, exits, duration, revision and file
  contents/hashes. The public repro above needs no ignored file.
- **Goal linkage:** **A1 — Agent-native accounting**, **A2 — Frictionless
  onboarding**. Agents and users can re-import reordered multi-currency or
  fractional-unit exports without being told to remove valid entries.
- **Expected outcome:** unchanged source transactions remain recognizable
  across export ordering while genuinely changed native identities still
  require review.
- **Why now:** two independently repeated real CLI cases expose a shared
  identity defect after the earlier NFC compatibility work. Adoption-surface
  work is required because the hash convention is shared with customer skills.

## Dedupe and unverified scope

Searched all open/done/blocked board records for hash collisions, occurrence
ordering, fingerprints, cents rounding and currency identity. Read complete
w3/377: it fixes NFC/pre-NFC compatibility, preserving the two-decimal base;
its controls do not cover these collisions. Targeted history traces the
single-amount `.2f` expression to `a90b1706`. No matching open owner found.
The ordinary same-order replay and reversed distinct-cent control pass.
This is separate from w3/408: amounts here are short exact decimals, written
correctly; identity generation then conflates them. Other OSes, standalone
Python importers, actual customer-skill executions, migration histories and
a repaired implementation remain unverified.
