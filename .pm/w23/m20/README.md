# w23 · m20 — Diff the BQL engine against stock beanquery in a release gate

**Worker:** worker1 **Goal:** a checked-in, offline-reproducible corpus of stock beanquery 0.2.0 results is replayed by `yarn verify:rustledger`, so a BQL regression such as w23/212 turns the gate red before it ships **Status:** todo (t001, t002 done)

## Tasks (in order)

| id   | title                                                                                      | est | depends_on |
| ---- | ------------------------------------------------------------------------------------------ | --- | ---------- |
| t001 | Write the stock beanquery 0.2.0 oracle generator and `bql-oracle.json` format — **DONE**   | 45m | —          |
| t002 | Select ~60 representative queries and offline fixture ledgers                              — **DONE** | 60m | t001       |
| t003 | Add the corpus replayer with a per-query diff to `verify:rustledger`                       | 45m | t002       |
| t004 | Document the intentional-deviation allowlist, each entry citing a reference                | 30m | t003       |
| t005 | Wire the replay into the `CI (ledger)` path with a readable out-of-date-oracle failure     | 30m | t003       |
| t006 | Simplify                                                                                   | 30m | t004, t005 |
| t007 | Test coverage                                                                              | 45m | t004, t005 |
| t008 | Closeout                                                                                   | 15m | t006, t007 |

## Definition of done

- `yarn verify:rustledger` (from `backend-cluster/ledger`) replays the corpus against the checked-in `bql-oracle.json` and prints a per-query diff on any unexpected change.
- Deliberately reintroducing the w23/212 wrap in `bql-from-fold.ts` (an operator after a fold-column name, e.g. `FROM year > 2026`) turns the gate red; reverting it turns the gate green again.
- Every allowlisted deviation from stock beanquery cites a reference (a blocked `w6` item, an ADR, or a documented engine limitation).
- The oracle is reproducible offline: no fixture or query reads a network source, including any `include "https://beancount.io/prices/..."` line.
- An out-of-date oracle fails with a message that names the regeneration command.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w23` (2026-11-05), proposal 1, approved by the owner. Modelled on `backend-cluster/ledger/scripts/rustledger-shadow/` (`generate-python-oracle.py` + `python-oracle.json`) and the live checks in `backend-cluster/ledger/scripts/verify-rustledger.ts`.
- **Goal linkage:** A1 — agent-native accounting. Coding agents query ledgers through MCP, REST and the CLI with standard beanquery statements; the gate keeps the ledger engine from silently refusing or value-changing them.
- **Expected outcome:** standard beanquery statements are no longer silently refused or value-changed by the ledger engine, and BQL regressions are caught by CI instead of by a later manual comparison, so fewer BQL parity findings reach the board.
- **Why now:** `bql-from-fold.ts` was rewritten six times in a month (w23/116, 124, 125, 130, 199, 212 — the last one a regression), and 20+ w23 BQL findings were each found by manual comparison with stock beanquery and pinned one note at a time. **Sequence:** the regression note [w23/212](../done/212.md) already shipped (`dbdc195d1`), so the first corpus does not have to allowlist it; the corpus should include its queries as the regression pin.
- **Adoption surface omitted:** this is an internal release gate; no user or coding agent touches it, so there is no README, package-table, skill-catalog, or `AGENTS.md` surface to check.
