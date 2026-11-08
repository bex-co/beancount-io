# w2 · m51 — Track a home, its mortgage, and a rental in the same ledger

**Worker:** worker2 **Goal:** a homeowner records the purchase, each monthly mortgage payment split from statement figures, escrow flows, rental income per property, and eventually the sale — with the property visible in net worth at cost or at a stated price. **Status:** in progress (t001–t007 done; simplify next)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| [t001](done/t001.md) | Decide the property model and where its procedures live — **DONE** | 45m | — |
| [t002](done/t002.md) | Record a home purchase and open its mortgage — **DONE** | 60m | t001 |
| [t003](done/t003.md) | Record the monthly mortgage payment split from statement figures — **DONE** | 60m | t002 |
| [t004](done/t004.md) | Record rental income per property and a property sale — **DONE** | 60m | t002 |
| [t005](done/t005.md) | Write evals, fixtures, and routing entries — **DONE** | 60m | t002, t003, t004 |
| [t006](done/t006.md) | Run the evals and routing set on both clients — **DONE** | 45m | t005 |
| [t007](done/t007.md) | Adoption surface — **DONE** | 30m | t006 |
| t008 | Simplify | 15m | t007 |
| t009 | Test coverage | 45m | t007, t008 |
| t010 | Closeout | 15m | t009 |

## Decisions

- **Placement (t001, 2026-10-20): new top-level skill `beancount-property`.** It meets [ADR 020](../../../docs/adrs/ADR020-skills-accounting-workflow-candidates.md)'s test: a distinct trigger (property lifecycle — bought a house, mortgage payment, rent received, sell the rental), a distinct input contract (closing-statement figures; loan-statement principal/interest/escrow printouts; a per-property identity), a distinct deliverable (a property lot, its mortgage, and escrow kept in step with statement balances), and its own eval set (t005). Routing probe at `803f3dfae` (scratch workspace, suite linked, Claude Code 2.1.289): "I bought a house…", "Record this month's mortgage payment…", and "My tenant paid rent…" all invoked `beancount-add`, which has no property model and improvises accounts — the same gap shape that justified `beancount-trade` in m45/t001. Splitting the lifecycle across add (payments/rent) and trade (sale) references was rejected: the statement tie-out and per-property accounts are one workflow, and two half-owners would each need the model anyway.
- **Model (t001): the property is a commodity lot.** One commodity per property, named by the user (e.g. `OAKST`), held as `1 OAKST {basis, purchase-date}` in `Assets:Property:<Name>`; mortgage in `Liabilities:Mortgage:<Name>` (negative while owed; principal postings reduce it toward zero); escrow in `Assets:Escrow:<Name>`; rent in `Income:Rent:<Name>`; interest/tax/costs in the user's existing expense accounts. Closing costs split exactly as the user states — capitalized into basis or expensed — and the skill shows both figures without deciding tax treatment. A `price` directive on the commodity values the property in beancount-ask's holdings recipes (m49) unchanged. Verified against `bea 0.3.1` on a synthetic lifecycle: purchase (510000 basis incl. capitalized costs + 3000 escrow seed + 2000 expensed = 115000 cash + 400000 loan), one payment (balance −399400.00 = statement), escrow disbursement, rent, `price` valuation at 620000 via the holdings query, and a sale (lot out @650000, payoff 399400, costs 10000) producing a booking-computed 140000.00 gain with property, mortgage, and escrow all at zero.
- **Numbers discipline carries over:** principal splits are read from the loan statement's printed figures, never computed from an amortization schedule; a statement without a printed split is a question, not an entry (t003). Depreciation is recorded only as figures the user states.

## Previous blocker

- **t006 onward (2026-10-20)** — t001–t005 are shipped (the `beancount-property` skill is live), and t006's Claude Code half passes (evals 7/7, routing 99/100 with the one miss shown to be variance; evidence in [t006](done/t006.md)). t006's acceptance requires both clients, and Codex returns its account usage-limit error until 2026-11-17, so t007–t010 wait behind it. **Unblock:** Codex usage returns (2026-11-17); rerun property evals 1–7 and the 100-prompt routing set on Codex, close t006, then t007 (adoption: suite-count catalogs) starts. **Who can clear it:** the operator (Codex usage).

## Definition of done

- A described purchase books property + mortgage + escrow so cash out + loan = price + stated closing costs, check-gated.
- Monthly payments split principal/interest/escrow strictly from statement-printed figures and tie to the printed new balance; a statement without the split produces a question, never a computed entry.
- Rent and expenses report per property; a sale closes property and mortgage with a booking-produced gain. Evals pass on both clients; tenant-rent and statement-line near-misses route to their existing owners.

## Source + Goal linkage

- **Source:** user walkthrough as a personal investor (real estate, crypto, stocks, daily spending), 2026-10-19.
- **Goal linkage:** **A1 — Agent-native accounting:** the largest household asset and liability are invisible to the suite today, so net-worth answers silently omit them.
- **Expected outcome:** homeowners and small landlords can keep property in the same agent-maintained ledger. Signals: eval pass on both clients, net-worth answers that include (or explicitly exclude) property.
- **Why now:** m45's lot/gain mechanics and m48's statement tie-out gates are exactly the machinery a sale and a mortgage split need; only the model and procedures are missing.

## Unblocked — 2026-11-08

Codex 0.167.0 / gpt-6.1-sol completes real sandboxed turns; original property
evals 1–7 resume on independent linked synthetic workspaces. All original 100
routing entries are audited unchanged inside later completed client cohorts;
those dated results remain distinct from this fresh behavior run.
