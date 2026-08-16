# w1 · m16 — Open a new account from the Accounts tab

**Worker:** worker1 **Goal:** A "+" in the Accounts tab header opens a create-account flow (type → name → currency → date) that writes a valid beancount `open` directive and shows the new account in the list. **Status:** done (shipped `6dda674`; board closed retroactively 2026-08-16)

## Tasks (in order)

| id   | title                                                              | est | depends_on | outcome                     |
| ---- | ------------------------------------------------------------------ | --- | ---------- | --------------------------- |
| t001 | Account-name model + beancount naming validation (pure)            | 30m | —          | **DONE**                    |
| t002 | `useOpenAccount` hook — build OPEN entry, submit, refetch accounts | 30m | t001       | **DONE**                    |
| t003 | Open-account screen — route + form (type, name, currency, date)    | 60m | t002       | **DONE**                    |
| t004 | Accounts tab "+" header action → open-account                      | 25m | t003       | **DONE**                    |
| t005 | UX pass — light/dark, i18n, submit/loading states, safe area       | 40m | t004       | **DONE**                    |
| t006 | Simplify pass over the open-account code                           | 30m | t005       | **DONE** (no separate pass) |
| t007 | Unit tests for name validation + OPEN entry building               | 40m | t005       | **DONE**                    |

## Definition of done

From the Accounts tab, tapping the top-right "+" opens a form where the user picks an account type, names the account (with a live `Assets:Bank:Checking` preview and beancount naming validation), picks a currency and an open date (defaulting to today), and submits. The app writes an `open` directive via the existing `addEntries`/`bulkEntries` mutation (`LedgerOpenInput`), and the new account appears in the Accounts list without an app restart. Failures surface the server message honestly (no silent success). Correct in light **and** dark, all strings via `useTranslations()` from the English base, `SafeAreaView` spacing, analytics on screen mount and on the entry tap. `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm` request 2026-07-27 ("learn how to open account in beancount.io/ledger/puncsky/example/accounts via `../../web-beancount/beancount-dashboard`, then add open-account to the Accounts tab"). Web reference: `beancount-dashboard` `src/features/ledger-data/accounts/open-account-dialog.tsx` — a 2-field dialog (date + account) that submits `bulkEntries` with a single `OPEN` `AddEntryInput` (`LedgerOpenInput { date, account, currencies }`), validating the name against the ledger's account prefixes.
- **Goal linkage:** Pillar 1 **Effortless capture** — set up an account on the go with minimal taps, instead of dropping to desktop/web; Pillar 4 **Plain-text fidelity** — writes a valid beancount `open` directive that round-trips to the ledger.
- **Expected outcome:** users can create a new account from the phone. Today the app can _delete_ accounts (`deleteAccount`) but offers no way to _open_ one — the flow is desktop/web-only.
- **Why now:** extends m2's Accounts tab (done); the `addEntries`/`bulkEntries` mutation and `LedgerOpenInput` input type are already in the mobile schema (confirmed reachable in `src/generated-graphql/` + `src/common/graphql/queries/addEntries.graphql`), so this needs no new dependencies and no server work — a self-contained gap fill sequenced right after the Accounts tab exists.

## How it landed

Shipped in `6dda674` ("feat(mobile): add compact open-account flow") as `src/screens/open-account-screen/` — `account-name.ts` (validation), `open-account-entry.ts` (OPEN payload), `use-open-account.ts` (submit), `open-account-screen.tsx` (form) — behind `app/(app)/open-account.tsx`, entered from the Accounts tab header button. The board was never closed at the time; verified against the working tree on 2026-08-16 and closed retroactively.

Two later milestones touched the same write path and are part of why the definition of done now holds end to end: `m19` put the new account's queries in the post-write invalidation set (it appears in the list without a restart), and `m21` routed the submit through `runLedgerWrite`, so failures surface honestly with a distinct error haptic. The only task closed without doing the specced work is `t006` — no dedicated `/simplify` run; see its outcome note.
