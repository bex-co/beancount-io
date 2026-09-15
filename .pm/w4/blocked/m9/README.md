# w4 · m9 — `bea price fetch`: keep commodity and currency prices current through upstream bean-price

**Worker:** worker1 **Goal:** a ledger that declares price sources on its `commodity` directives gets today's quotes appended as deduplicated `price` directives with one `bea` verb, the ledger skills use that verb for period-end valuation and freshness, and no price-fetching code of our own is written — upstream `beanprice` does the fetching **Status:** blocked — see [Blocked](#blocked)

## Blocked

**Blocked 2026-09-14 by `/loop-worker w4` triage; no implementation started.** m9 was approved on 2026-09-11 around an optional `price` extra and new `bea price fetch` / `bea price sources` subcommands. The next day, w1/m20 (`cc5ce3f9`) shipped a different design under [ADR014](../../../../docs/adrs/ADR014-cli-beancount-parity.md). Beanprice is enabled into the managed engine with `bea engine enable beanprice`, and `bea price` is a direct passthrough to upstream `bean-price` — ADR014's parity table maps `bean-price` to `bea price`. That replaces t001's install mechanism and leaves no room for `fetch`/`sources` subcommands without changing the passthrough contract. What m9 would still add on top needs a redesign against that passthrough, which is a product decision. That is: appending fetched quotes to the ledger with same-day dedup, a per-commodity JSON result, a sources report, the close and ask skill steps, and the docs.

**Unblock with a user decision:** either re-scope m9 onto `bea price` as it now ships (for example, appending deduplicated quotes plus the skills and docs work around the passthrough), or drop it as superseded by w1/m20. When re-scoped, rewrite the tasks and move this directory back to `.pm/w4/m9/`; the workstream checkbox stays unchecked until closeout.

## Tasks (in order)

| id   | title                                                                                                                       | est | depends_on |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | --- | ---------- |
| t001 | Add `beanprice` as the optional `price` extra with a capability probe and install hint                                      | 30m | —          |
| t002 | `bea price fetch`: fetch declared sources through beanprice and append through the add-price dedup                          | 60m | t001       |
| t003 | `bea price sources`: report which commodities have a source, which lack one, and the metadata line to add                   | 40m | t002       |
| t004 | Skills: the close ritual fetches period-end prices before the report; the ask skill reports price freshness                 | 45m | t002       |
| t005 | Docs: multi-currency and crypto section in USAGE and TUTORIAL, skills guide note, drafted reply for issue 176               | 30m | t003, t004 |
| t006 | Adoption surface                                                                                                            | 25m | t005       |
| t007 | Simplify                                                                                                                    | 25m | t006       |
| t008 | Test coverage                                                                                                               | 45m | t006       |
| t009 | Closeout                                                                                                                    | 15m | t007, t008 |

## Definition of done

- On a ledger whose `commodity BTC` directive carries `price: "USD:coinbase/BTC-USD"`, one `bea price fetch` run appends one dated `price` directive, a second run on the same day writes zero and reports the duplicate, and `bea check` stays green.
- `bea price fetch --dry-run` prints what would be written and changes no file; `--json` emits one result object per commodity with `fetched`, `duplicate`, or `failed` and the source that answered.
- Without the `price` extra installed, both `price` verbs exit with the documented `usage` code and the exact install hint; the default `bea` install gains no new runtime dependency.
- `bea price sources` lists every commodity in the ledger with its declared source or `none`, and prints the metadata line to add for the ones without one.
- The close skill's report lists the period-end prices it fetched, and the ask skill names the newest price date behind any market-value answer and points at the fetch verb when quotes are stale, without writing anything itself.
- Every command in the new USAGE and TUTORIAL sections runs as written; `make check-all` and `python3 skills/scripts/ci-check.py` pass.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w4`, 2026-09-10 (item 1); user handed items 1, 6, and 7 to `/pm` on 2026-09-11. Community request: [issue 176](https://github.com/bex-co/beancount-io/issues/176), asks 1 and 2 on the local-first path.
- **Goal linkage:** **A1 — Agent-native accounting**: a coding agent maintaining a ledger with crypto, foreign currency, or metals can keep valuations current with one verb whose output it can parse, and the close and ask skills stop treating prices as somebody else's problem. **A2** spillover: a newcomer who holds more than one currency sees a real net worth instead of hand-typed prices.
- **Expected outcome:** `bea price fetch` invocations appear in real ledgers; issue 176's first two asks are answerable for CLI and agent users; the hosted price-refresh and mobile display-currency milestones proposed alongside this one can reuse the same metadata grammar.
- **Why now:** it is the cheapest complete answer to a fresh community request, it respects the anti-goal by wrapping upstream `beanprice` instead of fetching prices ourselves, and the follow-on milestones inherit its `price:` metadata convention and dedup semantics. The optional extra is a new dependency; the user approved this milestone with that extra on 2026-09-11, and it must stay optional so the default install is unchanged.
- **Adoption surface:** included because this ships a CLI verb, skill behavior, and docs that users and agents touch.
