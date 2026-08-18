# w1 · m18 — Account picker: recents & frecency ranking

**Worker:** worker1 **Goal:** Daily-use accounts are one tap away — a per-ledger, persisted Recent section tops the picker and usage frecency boosts search ranking, entirely client-side. **Status:** done

## Tasks (in order)

| id   | title                                       | est | depends_on |            |
| ---- | ------------------------------------------- | --- | ---------- | ---------- |
| t001 | Frecency pure module                        | 40m | —          | — **DONE** |
| t002 | Per-ledger persistent `accountUsageVar`     | 35m | t001       | — **DONE** |
| t003 | Recent section pinned above the list        | 30m | t002       | — **DONE** |
| t004 | Frecency tiebreak in search ranking         | 20m | t002       | — **DONE** |
| t005 | Selection-source + time-to-select analytics | 25m | t003       | — **DONE** |
| t006 | UX pass — light/dark, i18n, empty states    | 30m | t004, t005 | — **DONE** |
| t007 | Simplify                                    | 25m | t006       | — **DONE** |
| t008 | Test coverage                               | 35m | t006       | — **DONE** |

## Definition of done

Select an account, kill the app, reopen the picker on the same ledger → that account appears in a Recent section on top. Recents are per-ledger and survive restarts; equal-score search results order by usage; `tap_account_picker_confirm` events carry a selection source (recents / search / browse) and time-to-select. The frecency module has unit tests; the Recent header string lives in the English base and renders via `useTranslations()`; correct in light **and** dark. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-14 ("polish the account picker") — Qonto "Suggested" / Monarch reference patterns on Mobbin; the tested `rankByFrequency` already shipped in `src/common/suggestion-utils.ts`. Moved here from the monorepo root board.
- **Goal linkage:** Pillar 1 **Effortless capture** — smart defaults are named in the pillar ("recent accounts"): the daily capture case (booking against the same handful of accounts) becomes one tap with zero typing.
- **Expected outcome:** a growing share of `tap_account_picker_confirm` events tagged `source: recents`, and a further drop in time-to-select — both observable via the instrumentation t005 ships.
- **Why now:** composes with m17's rebuilt list (sequenced after it), and landing the instrumentation together with the feature means its impact is measurable from day one. Fully client-side — no schema or server changes, no new dependencies.

## Outcome (2026-08-17)

Shipped as designed, plus two things the milestone's own tasks surfaced.

**Where the policy lives.** `visibleAccountSections` owns the pinned block end to end — it takes the ledger's usage and the instant to rank against, calls `topAccounts`, and caps at `RECENT_LIMIT`. The screen supplies data and a header string, nothing else. That keeps "at most five are pinned" and "an account renamed elsewhere is not pinned" assertable in the view-model's own tests rather than only in `topAccounts` in isolation.

**One exit from the picker.** `t002` said to record usage where `tap_account_picker_confirm` fires, which is the row-tap path. The create-account row (m25) has its own exit, and it recorded nothing — so an account a user created for the transaction in hand could not be pinned until they found it a second time by scrolling. Both paths now go through one `confirmSelection`.

**Verified in the simulator** (dev build against a real ledger, read-only — usage lives in AsyncStorage, not the ledger): zero-usage shows no section; picking pins it; killing and relaunching the app keeps it; switching ledgers swaps the block and switching back restores it; a query hides it; light and dark both read correctly. Analytics could not be verified here — `analytics.track` returns early under `__DEV__` — so `source` is proven structurally instead: it is stamped on the section where the section is built, and asserted per section kind in `picker-sections.test.ts`.

**Follow-ups this milestone deliberately did not take** (each is a design decision, not an oversight):

- **Role-blind recents.** Usage is keyed by ledger, and both picker orderings hold every account, so a funding account booked daily can pin itself at the top of a destination picker. Fixing it means keying usage by ledger + role — a stored-shape decision beyond this milestone's `{[ledgerId]: {[account]: …}}`.
- **Only the picker feeds the map.** The suggestion chips in the add flow choose accounts without opening the picker, and read-only pickers (transaction filters, budget category) record the same as a booking.
- **No pruning.** Named out of scope in `t002`; the map grows by one entry per distinct account ever picked.
- **Cold start.** Recents come only from local picks, so a user with years of journal history still starts empty (out of scope in `t003`).
