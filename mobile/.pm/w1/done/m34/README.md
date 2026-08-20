# w1 · m34 — Offline-tolerant cold start: persist the Apollo cache

**Worker:** worker1 **Goal:** the app opens to the user's own numbers even with no network — the Apollo cache survives relaunch, staleness is shown honestly, and sign-out purges everything. **Status:** **done** 2026-08-19 — Apollo cache persists across relaunch; Home/Accounts/Reports cold-start offline with a translated stale banner; sign-out purges

## Tasks (in order)

| id   | title                                                                        | est | depends_on            |
| ---- | ---------------------------------------------------------------------------- | --- | --------------------- |
| t001 | Add `apollo3-cache-persist` (new dependency — owner-approved); restore first | 45m | — — **DONE**          |
| t002 | Fetch-policy audit: cached data renders while refetching                     | 40m | t001 — **DONE**       |
| t003 | Purge the persisted cache on sign-out and account switch                     | 30m | t001 — **DONE**       |
| t004 | Honest staleness: offline indicator; airplane-mode cold-start walk           | 40m | t002, t003 — **DONE** |
| t005 | UX pass — light/dark, translations gate, loading states                      | 30m | t004 — **DONE**       |
| t006 | Simplify pass over the persistence diff                                      | 20m | t005 — **DONE**       |
| t007 | Test coverage — purge rules, fetch policies, staleness state                 | 40m | t006 — **DONE**       |
| t008 | Closeout — move completed tasks and milestone into done/                     | 10m | t007 — **DONE**       |

## Definition of done

With the device in airplane mode, a **cold start** (app killed, relaunched) renders the last-fetched Home, Accounts, and Reports data instead of first-load skeletons; when a refetch fails, a visible, translated indicator says the data may be stale — no silent staleness. Signing out purges the persisted cache so a subsequent sign-in with a different account can never see the previous account's data; a test proves the purge. `yarn lint` / `yarn typecheck` / `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-19. Grounded before proposing: nothing persists the cache today (`src/common/apollo/cache.ts` is a bare `new InMemoryCache()`); Home cards already use `cache-and-network` (`spending-card.tsx:75`, `feed-card.tsx:90`, `recent-transactions-card.tsx:55`) so persistence alone makes them render instantly; the holdout is `src/screens/home-screen/hooks/use-balance-sheet.ts:14` (`network-only`).
- **Goal linkage:** **Pillar 3 — analytics & insights** ("at a glance" fails when the glance needs a network round-trip) plus the cross-cutting quality bar's "fast and offline-tolerant where feasible — mobile moments are short."
- **Expected outcome:** subway and airplane cold starts show the user's numbers, not skeletons; the app's front door works in exactly the short mobile moments it exists for.
- **Why now:** sequenced after m33 (feature before infrastructure) in the same hand-off; every surface currently assumes network at launch, and m28 made Home the tap-through hub, so cold start is now the front door to everything. **Dependency note:** t001 adds `apollo3-cache-persist` (pure JS) — flagged per repo rule and approved by the owner at materialization (hand-off 2026-08-19). **At-rest posture, stated deliberately:** persisted ledger data sits in AsyncStorage relying on OS-level encryption (iOS Data Protection / Android file-based encryption); encrypted app-level storage would be another dependency and is out of scope — this is the simple version, written down so it is a decision rather than an accident.
