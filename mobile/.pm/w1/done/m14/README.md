# w1 · m14 — Ledger trust: bell notifications for errors & change history

**Worker:** worker1 **Goal:** A bell icon next to the hamburger surfaces the ledger's health: it badges when the ledger has errors, and opens a notification list showing errors (with file/line context) and recent ledger changes, with drill-down from a change to a readable commit diff. **Status:** done

## Tasks (in order)

| id   | title                                                                       | est | depends_on |
| ---- | --------------------------------------------------------------------------- | --- | ---------- |
| t001 | GraphQL ops + codegen: `getLedgerErrors`, `listCommits`, `getCommitDetails` | 20m | —          | — **DONE** |
| t002 | Bell icon with error badge in the shared header, right of the hamburger     | 35m | t001       | — **DONE** |
| t003 | Notifications screen: ledger errors + recent ledger changes                 | 50m | t002       | — **DONE** |
| t004 | Commit detail screen: files + stats + monospace diff                        | 45m | t003       | — **DONE** |
| t005 | UX pass — light/dark, i18n, loading bg, safe area, analytics                | 40m | t004       | — **DONE** |
| t006 | Simplify pass over notifications/commit code                                | 20m | t005       | — **DONE** |
| t007 | Unit tests for notification list + badge behavior                           | 30m | t005       | — **DONE** |

## Definition of done

When the ledger has errors, the bell in the tab header shows a count badge; tapping the bell opens a Notifications screen listing each error (message + filename:lineno) and the recent ledger changes (commit message, author, short SHA); tapping a change opens its detail — files changed, +/− stats, and a monospace diff tinted via theme tokens. A clean ledger shows no badge and an honest empty state ("no errors, recent changes below"). First loads render skeletons per convention; correct in light **and** dark; strings localized via `useTranslations()` from the English base. `yarn test:unit` green.

## Source + Goal linkage

- **Source:** inbox notes `w1/004` (surface ledger errors) + `w1/005` (change history), merged by `/pm-brainstorm` 2026-07-13; entry-point direction ("bell icon right of the hamburger → notification list; errors show in notifications") from `/pm` request 2026-07-14. Both inbox notes superseded and removed.
- **Goal linkage:** Pillar 4 **Plain-text fidelity** — the ledger stays the visible source of truth — plus the cross-cutting quality bar's own words: "no silent mutations of the user's ledger; errors surfaced honestly".
- **Expected outcome:** a user whose write broke the ledger finds out in the app, with file/line context, instead of via desktop fava; every mobile write (quick add, multi-leg, edits, receipts) is auditable as a change with a readable diff — one tap from any tab.
- **Why now:** m8–m11 multiplied mobile's write paths; the trust counterweight is the missing half. All three ops (`getLedgerErrors`, `listCommits`, `getCommitDetails`) sit unused in the mobile schema; pure client work over the existing header (`src/components/ledger-drawer/ledger-drawer-header.tsx`) — no new dependencies.
