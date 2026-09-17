# w1 · m29 — `bea` resolves managed price includes locally

**Worker:** worker1 **Goal:** the one-line `include "https://beancount.io/prices/BTC-USD"` that PRFAQ002 promises works in the CLI too — in every load path, offline-safe, with inspectable freshness and a portable escape hatch **Status:** todo (t001–t003 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Mirror the ADR 015 URL policy, bounded fetch, and price-only validation in the CLI — **DONE** | 60m | — |
| t002 | Cache feeds locally with an immutable revision and a mutable head — **DONE** | 60m | t001 |
| t003 | Resolve managed includes in every load path, with ledger prices winning — **DONE** | 60m | t002 |
| t004 | Report source status through `bea price status` and refresh on demand | 45m | t003 |
| t005 | Export the effective include so upstream tools value the same books | 45m | t003 |
| t006 | Test against a fixture feed server, then verify once against the hosted feed | 45m | t004, t005 |
| t007 | Adoption surface | 25m | t004, t005, t006 |
| t008 | Simplify | 30m | t007 |
| t009 | Test coverage | 45m | t007, t008 |
| t010 | Closeout | 15m | t009 |

## Definition of done

- A local ledger containing `include "https://beancount.io/prices/BTC-USD"` loads through `bea check`, `list`, `query`, `report`, `import`, and write validation, all seeing the same resolved prices, and requires no Beancount.io account.
- A ledger-authored price for the same date and pair wins over the managed feed, decided before the price map is built, with the shadowed count reported; the customer's files are never rewritten and a write targeting a managed price entry fails with an error naming the source.
- Policy holds as ADR 015 states it: only allowlisted origins and the exact `/prices/<ALIAS>` path, no redirects, a bounded fetch and body, a per-load URL cap, and price-only validation that rejects a body whole on any other directive and treats zero directives as a failure.
- A failed refresh — validation error, timeout, non-2xx status, or empty body — never replaces or deletes the last good revision; offline mode resolves from the cached head with no network call; strict mode exits nonzero naming any stale or unavailable source.
- A status view lists every managed source with freshness computed at read time, revision, observed-at, next refresh, shadowed count, and last error, in human and JSON form; a refresh action re-resolves on demand; an unavailable source names the include as written with its file and line.
- An exported local include is accepted by the upstream `bean-check` oracle and values the ledger identically, satisfying PRFAQ002's portability gate.
- The whole suite passes offline against a fixture feed server; one acceptance run against the hosted feed is recorded, or the live run is plainly stated as pending. `cd cli && make check-all` passes.

## Source + Goal linkage

- **Source:** Inbox note [w2/027](../../w2/027.md), promoted and routed to w1. Contract: [ADR 015](../../../docs/adrs/ADR015-ledger-managed-price-includes.md) (accepted 2026-09-15) and [PRFAQ002](../../../docs/prfaqs/PRFAQ002-include-live-price.md), whose section 16 names the CLI row and section 12 the local-loading requirement.
- **Goal linkage:** **A2 — Frictionless onboarding:** one line replaces a Beanprice setup, a provider key, and a recurring maintenance chore for anyone holding crypto or ETFs. **A1 — Agent-native accounting:** an agent can value a portfolio and answer net-worth questions locally without being told to go configure a quote provider.
- **Expected outcome:** A CLI user adds one include line and their holdings are valued at market in every local command, offline-safe, with a portable export for unmodified upstream tools — and `beancount-ask` can answer valuation questions without a missing-price caveat.
- **Why now:** ADR 015 settled the hosted contract on 2026-09-15 and w2/m31 shipped the ledger layer, so the CLI mirrors a fixed design instead of re-deciding one. PRFAQ002's internal-alpha gate explicitly requires local `bea` to work end to end, and its compatibility boundary requires the portable export. Doing this now, while the ADR is fresh and the hosted side is the reference implementation, avoids two divergent resolution policies.
- **Adoption surface:** included — the one-line setup, the new subcommands, the README and usage guide, and the skills' price guidance are all customer- and agent-facing.

## Boundaries

This milestone mirrors [ADR 015](../../../docs/adrs/ADR015-ledger-managed-price-includes.md); it does not amend the hosted contract or reopen its decisions. Resolution is engine-side: the `bea` frontend must not load Beancount, Beanquery, or Fava, per [ADR014](../../../docs/adrs/ADR014-cli-beancount-parity.md) and `cli/CLAUDE.md`. Managed URLs are registered price requests, not general remote file includes. Ordinary local usage stays account-free, and no ledger credential, ledger name, or private content is sent with a price request. Provider selection, the instrument catalog, and the final canonical URL format remain open in PRFAQ002 section 19 and are out of scope here.

## Sequencing note

t006's live acceptance run depends on the hosted `/prices` route being mounted; ADR 015 records that it still redirects. The fixture feed server carries the entire suite, so only that single acceptance run is exposed. If the route is not mounted when the milestone is otherwise complete, record the pending live run explicitly rather than claiming coverage, and decide with the user whether to close on fixture evidence or block on the deploy.
