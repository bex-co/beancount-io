# w2 · m34 — Ledger catalogs list every ledger, not the first upstream page

**Worker:** worker2 **Goal:** every catalog read — REST, GraphQL, the MCP tool and the MCP catalog resources — returns the caller's complete ledger list when it asks for no page, and exactly the page size it asks for up to the documented 100, instead of whatever single page Gitea hands the ledger service **Status:** blocked (t001–t005 done; t006 waits on a production deploy)

## Tasks (in order)

| id   | title                                                                   | est | depends_on |
| ---- | ----------------------------------------------------------------------- | --- | ---------- |
| t001 | backend-v2: an unpaged catalog read returns every ledger — **DONE**     | 60m | —          |
| t002 | backend-v2: honor a documented page size above the ledger service's 50 — **DONE** | 45m | t001       |
| t003 | Adoption surface — **DONE**                                             | 30m | t001, t002 |
| t004 | Simplify — **DONE**                                                     | 20m | t003       |
| t005 | Test coverage — **DONE**                                                | 45m | t003, t004 |
| t006 | Closeout                                                                | 15m | t004, t005 |

## Definition of done

- `listLedgers` and `listUserOwnedLedgers` called with neither `page` nor `limit` return every ledger the ledger service lists for the caller, on every adapter, because all of them call the same workflow method. Workflow tests over a fake ledger service that serves 91 ledgers in Gitea's 50-item pages (30 when `limit` is omitted) prove it, and fail against the previous implementation.
- An explicit `limit` from 51 to 100 returns exactly `limit` ledgers per page with correct page boundaries; `limit` ≤ 50 and page-only calls reach the ledger service with unchanged arguments, and `catalog-parity.test.ts` stays green.
- A pinned credential still sees only its ledger, including when that ledger sorts after the first upstream page.
- The MCP `listLedgers` description and `docs/mcp.md` say that omitting `page` and `limit` returns every ledger. The REST summaries are left unchanged: they already describe the complete list, and every word of them is copied into the CLI's pinned spec, its generated commands and its reference (`cli/Makefile` `spec-check`).
- `yarn typecheck`, `yarn test` and the `yarn generate-v1-openapi` drift check pass in `backend-cluster/backend-v2`.
- On the deployed stack, signed in as an account with more than 50 ledgers: an unpaged GraphQL `listLedgers` returns the full count, the dashboard ledger switcher finds a ledger that sorts after the 50th (searching `stock` finds `open_ledger/stock-example`), and the `/ledger` sidebar and the OAuth consent picker list every ledger.

## Blocked

- **What:** t006 Closeout. Its definition of done includes the deployed-stack checks, and the code is on `main` but not yet in production.
- **Blocker:** production deploys are operator-triggered (`deploy/bex/README.md`: auto-deploy on push did not fire), so shipping to `main` does not change what users see.
- **Unblock:** production backend-v2 (`beancount-api`) runs a build that includes the w2/m34 catalog fix. A deployed check proves it: signed in as an account with more than 50 ledgers, an unpaged GraphQL `listLedgers` returns more than 50. Then run t006's checks and `/pm done w2/m34/t006`.
- **Who:** whoever deploys beancount.io; nothing in this repository can clear it.
- **Shipped baseline:** t001–t005. The workflow, parity and seeded-defect evidence is in `done/t001.md`–`done/t005.md`.

## Source + Goal linkage

- **Source:** user report 2026-10-01 — the dashboard ledger switcher answered "No ledgers found" for `stock` while `open_ledger/stock-example` was the open ledger. Reproduced the same day against the deployed site on the public `open_ledger` showcase account (91 ledgers): the switcher's `ListLedgers` request carried no `page` or `limit`, the response held 30 ledgers (`accenture` … `delta-air-lines`, name order), so `crypto` found `crypto-example` (28th) and `stock` found nothing (82nd). `limit: 100` returned 50; `limit: 50, page: 2` returned the remaining 41.
- **Goal linkage:** A1 — the MCP `listLedgers` tool is documented as "List the ledgers this credential can reach" and is the first call an agent makes; today an agent with more than 30 ledgers sees a partial catalog with no hint that more exist, and one that asks for the documented maximum of 100 receives 50, which reads as a final page. The OAuth consent picker, the screen where a user grants an agent a ledger, has the same 30-ledger ceiling. A3 — the `open_ledger` showcase that docs, blog posts and the Open Ledger page link to is unreachable past its 30th ledger from the dashboard's own navigation.
- **Expected outcome:** any user or agent can reach every ledger they have access to from the switcher, the `/ledger` list, OAuth consent and the API, whatever the catalog size.
- **Why now:** the showcase account crossed 50 ledgers, so even a client asking for Gitea's maximum misses ledgers, and it keeps growing. The defect sits below every adapter, so one workflow change fixes all of them; leaving it means each client keeps reinventing paging (mobile already does) or silently truncating (dashboard, MCP).
- **Adoption surface:** included — agent-facing MCP descriptions and the REST contract change. The dashboard needs no code change because its callers send no paging arguments and start receiving complete lists; mobile already pages explicitly and is unaffected. `bea cloud ledger list` sends `--limit 50` by default, a single upstream call as before. Its documented `--limit` up to 100 now returns that many, and its `truncated` flag, which compares the rows returned with the limit, stops reporting a clamped page as complete.
