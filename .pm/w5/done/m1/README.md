# w5 · m1 — Ledger sidebar: richer rows, honest states, post-create landing

**Worker:** worker1 **Goal:** make the `/ledger` sidebar — the entire ledger-list UI — show ledger status and activity at a glance, with intentionally designed loading/empty/error states, and land the user inside a newly created ledger. **Status:** done

## Tasks (in order)

| id   | title                                                                       | est | depends_on                   |     |
| ---- | --------------------------------------------------------------------------- | --- | ---------------------------- | --- |
| t001 | Ledger rows: visibility badge + description/last-updated meta line          | 40m | —                            | — **DONE** |
| t002 | Skeleton rows reflect real count; shared Skeleton in BlogFeed               | 30m | —                            | — **DONE** |
| t003 | Empty state with icon + inline Create Ledger CTA                            | 25m | —                            | — **DONE** |
| t004 | Navigate into the new ledger after create-from-sidebar                      | 30m | w5/m1/t001                   | — **DONE** |
| t005 | Long owner/name truncation tooltips                                         | 20m | w5/m1/t001                   | — **DONE** |
| t006 | Adoption surface                                                            | 30m | w5/m1/t002, t003, t004, t005 | — **DONE** |
| t007 | Simplify                                                                    | 30m | w5/m1/t006                   | — **DONE** |
| t008 | Test coverage                                                               | 45m | w5/m1/t006                   | — **DONE** |
| t009 | Closeout                                                                    | 10m | w5/m1/t008                   | — **DONE** |

## Definition of done

A signed-in user sees each ledger's public/private state and last activity at a glance; loading, empty, and error states each have intentional design (icon, copy, action); creating a ledger from the sidebar lands you inside it.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-17 — designer+TPM polish review of https://beancount.io/ledger. Key files: `dashboard/src/features/ledger-list/pages/dashboard-page/components/dashboard-sidebar.tsx` (live sidebar; skeleton hardcoded to 10 rows at ~line 156, text-only empty state), `components/blog-feed.tsx` (hand-rolled skeletons), retired `components/ledger-list.tsx` (proves Status/Owner/Last-Updated GraphQL fields already exist).
- **Goal linkage:** **A2 — Frictionless onboarding.** `/ledger` is the first screen after sign-up and on every return; ambiguity here (no visibility state, no post-create landing) is onboarding friction for exactly the newcomers the board serves.
- **Expected outcome:** fewer "did it create / where is my ledger" drop-offs; a first session reaches a real ledger page faster; returning users can tell ledger state without opening each one.
- **Why now:** the ledger-list UI just consolidated into the sidebar, but its states and metadata were left behind in the retired table view — cheapest moment to close the gap, before w3 mobile parity copies the pattern.
- **Adoption surface:** included — this ships a user-facing dashboard change. **Note for t008 (Test coverage):** `DashboardSidebar` currently has zero tests; the 854-line `ledger-list.test.tsx` covers its dead predecessor. Coverage must target the live sidebar.
