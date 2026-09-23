# w2 · m32 — Managed price status on every client surface

**Worker:** worker2 **Goal:** the per-source status the ledger service already computes for managed price includes (ADR 015 §8) reaches REST, GraphQL, MCP and the dashboard with one shape, users can refresh a managed feed on demand, and the dashboard stops offering an edit the ledger refuses **Status:** in progress (t001–t005 done)

## Tasks (in order)

| id   | title                                                                  | est | depends_on |
| ---- | ---------------------------------------------------------------------- | --- | ---------- |
| t001 | Ledger service: managed price status and refresh endpoints + IDL — **DONE** | 60m | —          |
| t002 | backend-v2: managed price status on REST, GraphQL and MCP (parity) — **DONE** | 60m | t001       |
| t003 | backend-v2: "Refresh prices" action on REST, GraphQL and MCP — **DONE** | 45m | t001, t002 |
| t004 | Dashboard: freshness labels and Refresh prices in the price view — **DONE** | 60m | t002, t003 |
| t005 | Dashboard: managed price entries are read-only in the journal           | 30m | t002       |
| t006 | Adoption surface                                                        | 30m | t004, t005 |
| t007 | Simplify                                                                | 30m | t006       |
| t008 | Test coverage                                                           | 45m | t006, t007 |
| t009 | Closeout                                                                | 15m | t007, t008 |

## Definition of done

- `GET /api-gateway/v1/ledgers/{owner}/{name}/managed-prices`, the GraphQL query `getLedgerManagedPrices`, and the MCP resource for the same read return the same records (url, alias, includes, commodity pair, source, revision, ETag, observed/fetched/next-refresh times, `recent`/`stale`/`unavailable`, last error) under the same credential policy; `surface-parity` stays at zero gaps.
- A refresh request (REST, GraphQL mutation, MCP tool) sets each of the ledger's managed feeds' `nextRefreshAt` to zero, so the next load re-fetches; it never fetches the repository, creates a commit, or deletes the last validated revision (ADR 015 §5). The refresh is refused to credentials that cannot write the ledger.
- The dashboard's price view shows each managed source's freshness label and timestamps, and a Refresh prices action; managed price entries show no Edit/Delete action in the journal entry panel.
- Ledger, backend-v2 and dashboard package checks pass, and each new behavior has tests that fail when it is reverted.

## Source + Goal linkage

- **Source:** [w2/026](../done/026.md), the follow-up recorded by w2/m31 and ADR 015 (Consequences: "exposing `managedPrices` through backend-v2 on REST, GraphQL, and MCP with the dashboard freshness labels … and a manual refresh endpoint").
- **Goal linkage:** A1 — an agent working a ledger over MCP can tell whether its valuations rest on a live, stale or unavailable feed and trigger a refresh instead of guessing. A2 — a newcomer who adds the one-line managed include sees the prices arrive and knows when they are stale, rather than meeting a silent gap or an edit button that errors.
- **Expected outcome:** every client that already reads prices can also read their provenance and freshness with one shape, and can ask for a refresh; the dashboard never offers an action the ledger refuses.
- **Why now:** w2/m31 shipped the ledger layer and w1/m29 shipped the same contract in the `bea` CLI; the hosted surfaces are the last place the status is invisible, and ADR 015 explicitly defers the refresh endpoint to "ships with that surface".
- **Adoption surface:** included — new REST routes, a GraphQL field, an MCP resource and tool, and dashboard UI all ship to users and agents. Mobile has no managed-price surface yet and is out of scope.
