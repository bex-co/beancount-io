# w1 · m25 — Inline `open`-directive creation from the account picker

**Worker:** worker1 **Goal:** When account-picker fuzzy search finds nothing, the user can create the typed account on the spot — the YNAB "New Category" pattern — landing in the existing open-account flow prefilled, and returning with the new account already selected in the form they came from. **Status:** in progress (only t003 open: implemented and cancel-path verified in the simulator, but the save→handoff step writes a real `open` directive to the production ledger, so its final walk needs the owner's go-ahead. t006 shipped the reviewers' redesign: one-shot `AccountCreated` + `pushOpenAccount` replaced the borrowed `SelectedAccount` slot and `router.dismiss(2)`)

## Tasks (in order)

| id   | title                                                                  | est | depends_on |                                             |
| ---- | ---------------------------------------------------------------------- | --- | ---------- | ------------------------------------------- |
| t001 | "Create `<typed>`" row in the picker's zero-results state              | 35m | —          | — **DONE**                                  |
| t002 | Open-account screen accepts a prefill account-name param               | 40m | —          | — **DONE**                                  |
| t003 | Selection handoff: a successful open selects the account in the caller | 45m | t001, t002 | implemented; save-path walk awaits owner OK |
| t004 | Analytics on create-row impressions and taps                           | 20m | t003       | — **DONE**                                  |
| t005 | UX pass — light/dark, i18n, safe area, both entry directions           | 30m | t003, t004 | — **DONE**                                  |
| t006 | Simplify pass over the create-flow diff                                | 25m | t005       | — **DONE**                                  |
| t007 | Unit tests for validity gating and the handoff                         | 40m | t005       | — **DONE**                                  |

## Definition of done

Typing an account name that matches nothing in the picker shows a tappable "Create `<typed name>`" row instead of only the `accountPickerNoResults` text. Tapping it lands on the open-account screen with the name prefilled (root + sub-path split correctly); saving writes a real `open` directive through the existing `buildOpenAccountEntry` path, pops back past the picker, and the calling form field holds the new account. A typed string that can never be a valid account (bad root, illegal characters) either hides the row or routes to open-account with the validation message already visible — it is impossible to write an invalid `open`. Works in light and dark, all new strings in the English base via `useTranslations()`. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** inbox note `w1/009` (from `/pm-brainstorm` 2026-08-14, "polish the account picker"), promoted during the 2026-08-17 board triage.
- **Goal linkage:** Pillar 1 **Effortless capture** — the dead-end "no results" moment becomes a two-tap create; Pillar 4 **Plain-text fidelity** — the shortcut writes a genuine `open` directive via the same schema input as the Accounts tab, nothing proprietary.
- **Expected outcome:** a user categorizing on the go never has to leave the add-transaction flow, open the Accounts tab, create the account, and start over. The picker's zero-match state converts to a completed transaction instead of an abandonment.
- **Why now:** both prerequisites shipped — m16 built the open-account flow (`use-open-account.ts`, validation in `account-name.ts`) and m17 rebuilt the picker with fuzzy search and the callback handoff (`push-account-picker.ts`). This milestone is the seam between them; the 2026-08-16 triage already flagged it as unblocked with only a sizing pass outstanding.
