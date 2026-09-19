# w4 · m17 — Keep profile search updates from hijacking ledger navigation

**Worker:** worker1 **Goal:** opening a newly filtered ledger reaches that ledger and Back restores the search, even before the URL debounce settles **Status:** todo (t001–t003 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Stop delayed profile updates crossing navigation boundaries — **DONE** | 30m | — |
| t002 | Preserve the current search when leaving before debounce settlement — **DONE** | 25m | t001 |
| t003 | Verify the public discovery adoption journey — **DONE** | 10m | t002 |
| t004 | Simplify profile state and navigation ownership | 10m | t003 |
| t005 | Test pending navigation and fast departure, then run gates | 35m | t004 |
| t006 | Close out after fresh desktop and narrow journeys pass | 10m | t005 |

120 minutes across navigation/state implementation and verification. Reproduction and controls are in [FINDINGS.md](./FINDINGS.md).

## Definition of done

- Fresh public profile: type budget, immediately open budgeting-envelopes, and remain at the selected ledger after all pending reads settle. Never navigate to `/ledger/undefined` or back to the old profile from a stale timer.
- Back restores the latest visible search and matching collection even when departure preceded the debounced URL write; Forward still opens the intended ledger.
- A delayed read, an already cached destination, tab changes, another profile, and unmount cancel or finish only the appropriate profile's work. Do not overwrite another history entry or user identity.
- Preserve validated search/sort/show parameters, bounded counts, typing focus, the no-history-churn contract and existing public/read-only behavior. Do not change the collection's server cap.
- Meaningful router integration tests cover the race rather than only pre-seeded search URLs; dashboard format/lint/test/build pass.

## Source + Goal linkage

- **Source:** user-requested continuous dashboard QA for w4, 2026-09-17.
- **Goal linkage:** A2 — a reader can discover and open a matching public ledger without a timing-dependent dead end.
- **Expected outcome:** selecting a filtered card reliably opens it and preserves a usable return journey.
- **Why now:** the URL persistence repair4d701a91 introduced a delayed relative navigation that can fire after another navigation has already begun.
- **Adoption surface:** verify the existing public profile search, result cards and browser navigation; no new feature documentation needed.
- **Coordination:** completed w3/164 supplies the history contract. w4/m13 affects LedgerLayout's list remounts, while this profile is outside that layout. w4/093 owns a separate account-journal offset lifetime.
