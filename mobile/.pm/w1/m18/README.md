# w1 · m18 — Account picker: recents & frecency ranking

**Worker:** worker1 **Goal:** Daily-use accounts are one tap away — a per-ledger, persisted Recent section tops the picker and usage frecency boosts search ranking, entirely client-side. **Status:** todo

## Tasks (in order)

| id   | title                                       | est | depends_on |
| ---- | ------------------------------------------- | --- | ---------- |
| t001 | Frecency pure module                        | 40m | —          |
| t002 | Per-ledger persistent `accountUsageVar`     | 35m | t001       |
| t003 | Recent section pinned above the list        | 30m | t002       |
| t004 | Frecency tiebreak in search ranking         | 20m | t002       |
| t005 | Selection-source + time-to-select analytics | 25m | t003       |
| t006 | UX pass — light/dark, i18n, empty states    | 30m | t004, t005 |
| t007 | Simplify                                    | 25m | t006       |
| t008 | Test coverage                               | 35m | t006       |

## Definition of done

Select an account, kill the app, reopen the picker on the same ledger → that account appears in a Recent section on top. Recents are per-ledger and survive restarts; equal-score search results order by usage; `tap_account_picker_confirm` events carry a selection source (recents / search / browse) and time-to-select. The frecency module has unit tests; the Recent header string lives in the English base and renders via `useTranslations()`; correct in light **and** dark. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-14 ("polish the account picker") — Qonto "Suggested" / Monarch reference patterns on Mobbin; the tested `rankByFrequency` already shipped in `src/common/suggestion-utils.ts`. Moved here from the monorepo root board.
- **Goal linkage:** Pillar 1 **Effortless capture** — smart defaults are named in the pillar ("recent accounts"): the daily capture case (booking against the same handful of accounts) becomes one tap with zero typing.
- **Expected outcome:** a growing share of `tap_account_picker_confirm` events tagged `source: recents`, and a further drop in time-to-select — both observable via the instrumentation t005 ships.
- **Why now:** composes with m17's rebuilt list (sequenced after it), and landing the instrumentation together with the feature means its impact is measurable from day one. Fully client-side — no schema or server changes, no new dependencies.
