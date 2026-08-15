# w1 · m17 — Account picker: fuzzy search + instant open

**Worker:** worker1 **Goal:** The account picker becomes a search-first, virtualized list — fava-parity fuzzy search, instant open from cache, current selection highlighted, every account rendered exactly once. **Status:** done

## Tasks (in order)

| id   | title                                                          | est | depends_on             |            |
| ---- | -------------------------------------------------------------- | --- | ---------------------- | ---------- |
| t001 | Fuzzy-match pure module with fava-parity semantics             | 45m | —                      | — **DONE** |
| t002 | Rebuild picker list: single virtualized list + root-type chips | 45m | t001                   | — **DONE** |
| t003 | Search field: filter-as-you-type across all accounts           | 40m | t002                   | — **DONE** |
| t004 | Honor `selectedItem`: highlight + scroll into view             | 20m | t002                   | — **DONE** |
| t005 | Instant open: render from cached ledger meta                   | 30m | t002                   | — **DONE** |
| t006 | Harden the picker return channel                               | 25m | t002                   | — **DONE** |
| t007 | UX pass — light/dark, i18n, loading backgrounds, analytics     | 40m | t003, t004, t005, t006 | — **DONE** |
| t008 | Simplify                                                       | 30m | t007                   | — **DONE** |
| t009 | Test coverage                                                  | 40m | t007                   | — **DONE** |

## Definition of done

On a ledger with hundreds of accounts: the picker opens instantly when ledger meta is already cached (no skeleton on second open), typing `exfo` ranks `Expenses:Food…` first (fuzzy semantics asserted by unit tests), the caller's current selection is highlighted and scrolled into view, and each account renders exactly once in a virtualized list. All new strings live in the English base under `src/translations/` and render via `useTranslations()`; correct in light **and** dark. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-14 ("polish the account picker") — code audit + UX research: Monarch/Expensify/Quicken/Qonto/Brex picker screens on Mobbin; fava `frontend/src/lib/fuzzy.ts` matching semantics. Moved here from the monorepo root board.
- **Goal linkage:** Pillar 1 **Effortless capture** — the highest-frequency interaction in transaction capture goes from scroll-hunting a full account list to typing two letters, with the same fuzzy semantics beancount users already know from fava's editor.
- **Expected outcome:** time from the `account_picker` page-view to `tap_account_picker_confirm` (both events already fire) drops measurably, and the picker scales to real-world charts of accounts.
- **Why now:** the picker is now a shared surface — the default multi-posting add flow, the review screen, transaction filters, and the recently shipped add-budget flow all route through it — and the current screen renders every account twice unvirtualized, debt that worsens with every account a user adds.

## Post-closeout polish (2026-08-14)

Owner review after closeout caught that the filter chips were "barely visible", which turned out to be two defects the milestone shipped:

- **Contrast.** Inactive chips and the search field were filled with `black10`, which is within a shade of the `white` surface token in _both_ palettes — they read as faint smudges rather than controls. Both now carry a `black40` border; the active chip fills with `primary` and matches its border so the size doesn't shift.
- **Clipped chip labels (layout bug).** The horizontal chip `ScrollView` was a flex child of the screen's column, so it was handed a share of the height and clipped its own chips — every label was cut off top and bottom. Fixed with `flexGrow: 0` / `flexShrink: 0` on the scroll view (the list below owns the free space) plus an explicit `lineHeight` on the label.

Also raised hierarchy off colour alone: the leaf segment now carries `fontWeights.medium` against the dimmed parent path, and section headers are uppercase with letter-spacing.

Both defects were visible in the t007 verification screenshots and were misread as artifacts of the preview harness's missing header inset. The lesson for future in-app passes: **Fast Refresh does not reliably apply StyleSheet changes in this dev client** — two consecutive screenshots showed a stale bundle. Always terminate and relaunch before trusting a screenshot.
