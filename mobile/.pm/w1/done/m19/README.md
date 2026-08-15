# w1 · m19 — Cascading refetch after ledger writes

**Worker:** worker1 **Goal:** Every write to the ledger — a file save, a new transaction, an edit, a delete — invalidates the same canonical set of ledger-derived queries, so no tab is left showing pre-write numbers. **Status:** done

## Tasks (in order)

| id   | title                                                        | est | depends_on |            |
| ---- | ------------------------------------------------------------ | --- | ---------- | ---------- |
| t001 | `invalidateLedgerData` — canonical scopes + evict pass       | 45m | —          | — **DONE** |
| t002 | Editor: errors on save, full invalidation on leave           | 35m | t001       | — **DONE** |
| t003 | File browser: invalidate on create/delete, fix the stale sha | 25m | t001       | — **DONE** |
| t004 | `addEntries`: wire the `entries` scope                       | 30m | t001       | — **DONE** |
| t005 | Collapse the hand-written refetch lists onto the invalidator | 35m | t001       | — **DONE** |
| t006 | Cache-first sweep — budget groups and interval totals        | 30m | t004, t005 | — **DONE** |
| t007 | Simplify                                                     | 25m | t006       | — **DONE** |
| t008 | Test coverage                                                | 35m | t006       | — **DONE** |
| t009 | Closeout                                                     | 10m | t008       | — **DONE** |

## Definition of done

With all five tabs mounted (`lazy: false`), each of these leaves no stale view behind, without a pull-to-refresh:

- Fix a parse error in a `.bean` file → Save → the editor's error banner clears. Introduce one → Save → it appears. (Diagnosed as "fetched at mount and never refetched"; the live walk found a second cause on top of that — see the `filterFileErrors` note below.)
- Save a file in the editor → back → delete that file in the browser → no sha conflict. (Today the browser hands the pre-save sha to `deleteLedgerFile`.)
- Add a transaction from any entry point → Home, Accounts, Transactions, Reports and the budget cards all show it.
- Edit or delete a transaction → the Reports income statement and budget actuals update too, not just the six queries the current lists name.

Exactly one module owns the field list; no screen hand-maintains its own `refetchQueries` array. `HomeChartsDocument` is gone from every list (nothing calls `useHomeChartsQuery` — it was a silent no-op). `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Verification (2026-08-14, iOS simulator against the live `puncsky/example` ledger)

All four walked end to end. Every write was reverted; the ledger finished healthy and byte-identical to how it started.

| Scenario                                                                       | Result                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Introduce a parse error in `main.bean` → Save                                  | Banner shows **⚠ 1 error** in place, without leaving the editor                                                                                                                                                                                         |
| Remove it → Save                                                               | Banner clears in place                                                                                                                                                                                                                                  |
| Save a file → back → delete it                                                 | No sha conflict; file removed and the listing repainted                                                                                                                                                                                                 |
| Add a transaction (deep-linked, so **no** `AddTransactionCallback` registered) | Accounts 109,529.34 → **109,517.00**; Vanguard 81,750.00 → **81,737.66**; Expenses 254,609.05 → **254,621.39**; Home net worth 106,826.05 → **106,813.71**; Reports expenses **$12.34**; new row atop Recent Transactions — all with no pull-to-refresh |
| Delete that transaction                                                        | Every one of the above returned to its baseline; the Reports 6M window snapped back to the ledger's real range                                                                                                                                          |

The add/delete case is the sharpest evidence: `trialBalance`, `balanceSheet` and `incomeStatement` are all `network-only` on tabs mounted since app launch, so nothing but the invalidation could have moved them — and with the flow entered by deep link, the legacy `AddTransactionCallback` was never registered.

## Source + Goal linkage

- **Source:** `/pm` research request 2026-08-14 ("when files are saved in the Files tab, should we update relevant queries to refetch? and are there other places that should trigger cascading refetches?"). Findings: `handleSave` (`src/screens/ledger-file-editor-screen/index.tsx:336`) runs `updateLedgerFile` with no `refetchQueries`, no `update`, no eviction; the cache is a bare `new InMemoryCache()` (`src/common/apollo/cache.ts:3`) with no `typePolicies`, so nothing about a write invalidates anything. Nothing self-heals: `app/(app)/(tabs)/_layout.tsx:50` sets `lazy: false` so all five tabs mount once and stay mounted, `network-only` only fires on mount, and no screen refetches on focus. Related inbox note: `w1/002.md` (lazy tab mounting).
- **Goal linkage:** Pillar 3 **Analytics & insights** — the dashboards' whole value is that the numbers are right; a net-worth curve or budget "spent" figure that silently predates the user's own edit is worse than no number. Pillar 4 **Plain-text fidelity** — the ledger is the source of truth, so the app must reflect what it just wrote to it. Cross-cutting quality bar: _trustworthy — errors surfaced honestly_ (the editor's error banner currently contradicts the file the user just saved).
- **Expected outcome:** a user edits their ledger on the phone and every screen agrees with the file. The specific misinformation this removes: an error banner that shows errors the user already fixed, and budget/report figures that never update after a write because `getLedgerIntervalTotals` and the budget journal are `cache-first`.
- **Why now:** the write surface just grew past what the ad-hoc pattern can carry. m15 shipped the file editor — the broadest write in the app, able to change every transaction, account, balance and parse error at once — and it invalidates nothing, while m9's transaction edit invalidates seven queries. Six write sites now carry four different hand-written lists and one dead entry; m16 (open account) and `w1/009` add two more. Centralizing costs less now than after those land. No new dependencies, no schema work, no server work.
- **Adoption surface task omitted:** this milestone changes no user- or agent-facing documentation surface — no README quickstart, package table, skills table or `AGENTS.md` / `.agents/skills` symlink is affected. It is a data-freshness fix behind existing screens.

## Design decisions (settled during research)

- **A curated field list, not `include: "active"`** — the latter would also re-run `suggestTransactionCategories` (an LLM call) and `getFeed`, neither of which is ledger-derived.
- **Eviction alone, inside `updateCache`** — _revised during t007 after measuring against a real `ApolloClient`._ The plan called for refetch **and** evict as two separate halves. They are not: `cache.evict` inside `refetchQueries({ updateCache })` refetches every watched query reading the field — verified at exactly one network call each for `cache-first`, `cache-and-network` and `network-only` — **and** clears the unwatched variable sets that `refetchQueries` can never reach. Naming the documents in `include:` on top of that was pure redundancy, and Apollo logs `Unknown query named "..."` (invariant 43) for every document with no active observer — most of them, on every write. Dropping `include` deleted the whole document registry and the generated-GraphQL import with it; the module is now a field-name table. The three fetch-policy cases are locked down in `__tests__/invalidate-ledger.test.ts` because this is the assumption everything else rests on.
- **The editor invalidates in two beats** — refetching a dozen queries on every Save is heavy when users save repeatedly mid-edit, so `errors` fires on save (the editor renders it) and the full `file` scope fires on leave.
- **No `typePolicies` refactor** — the backend returns per-ledger aggregate report fields, not normalizable entities; normalization would not buy automatic invalidation here.
- **No polling or subscriptions** — external changes (web dashboard, CLI, git push) stay covered by the existing sha optimistic lock.
- **`lazy: false` stays** — flipping it would make tab switches refetch, but pushes five tabs' first-paint cost onto the user. Tracked separately as `w1/002`.
- **No file-type gate** — `isEditable` (`src/screens/ledger-file-browser-screen/utils.ts:2`) admits only `.bean` / `.beancount`, so every save is by definition a ledger-semantics change.
- **`ledgerRevisionVar`** — _added during t006, not in the plan._ Eviction cannot reach a reader that never re-reads. The Home budget panel (`use-budget-panel.ts`) fetches interval totals through one-off `client.query` calls in an effect keyed on the budget _directives_, which a new transaction does not change — so it would sit on evicted cache entries forever. A reactive counter bumped by every invalidation gives it, and any future imperative reader, something to depend on.
- **`filterFileErrors` message fallback** — _added during t009, not in the plan._ The first DoD walk found the error banner never rendering **even on a fresh mount with the server reporting an error** — so the invalidation was not to blame. `getLedgerErrors` returns `filename: null` for this backend and names the file in the message text instead ("parse errors in main.bean"), which `filterFileErrors` filtered out unconditionally; the notifications row's missing file chip is the same bug. The banner was dead for every file, however broken the ledger. Fixed by falling back to a basename match on the message when `filename` is absent — never when it is present, so an error attributed elsewhere cannot leak in. Without this the milestone's headline outcome ("the editor stops contradicting the file you just saved") would not have shipped at all.
- **`refetchBudgetJournal` deleted** — _revised during t007._ The plan said to keep it and add the `entries` scope beside it. That double-fetches: it awaits a network read of the budget journal that the very next line evicts. Its narrow variable-targeting was also obsolete by design — a budget directive **is** a journal entry, so the transactions list it was avoiding should update too. Both callers now await `invalidateLedgerData` instead, and the helper is gone. Same reasoning retired the separate `refetchQueries` in `use-open-account.ts`.
