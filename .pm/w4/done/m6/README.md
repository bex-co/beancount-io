# w4 · m6 — Create a ledger from mobile

**Worker:** worker1 **Goal:** a mobile user creates a Starter or Sample ledger from the drawer and lands inside it, and an account with no ledgers sees Create and Discover instead of a dead end **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Create-ledger operation and screen | 50m | — — **DONE** |
| t002 | Entry points and honest empty states | 35m | t001 — **DONE** |
| t003 | Post-create landing and error surfacing | 35m | t001 — **DONE** |
| t004 | Localize the new strings across 13 locales | 25m | t002, t003 — **DONE** |
| t005 | Adoption surface | 25m | t004 — **DONE** |
| t006 | Simplify | 25m | t005 — **DONE** |
| t007 | Test coverage | 45m | t005 — **DONE** |
| t008 | Closeout | 15m | t006, t007 — **DONE** |

## Definition of done

- On the development server, a Starter and a Sample ledger are created from the drawer, each becomes the selected ledger with Home showing its data, and both appear in the drawer after a restart.
- A conflicting name and an over-tier account show inline errors and leave no half-created ledger.
- An account with zero ledgers sees Create and Discover in the drawer and in the ledger guard, and the guard fallback renders translated in Chinese and Persian.
- Mobile `yarn format:check`, `yarn lint`, `yarn typecheck`, and `yarn test:unit` pass; light and dark simulator screenshots are recorded; no production ledger is created or modified.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w4`, 2026-09-08 (user approved all four milestones with `/pm for them all for w4`)
- **Goal linkage:** **A2 — Frictionless onboarding**: the native client can now start a book on its own, including the Sample template that shows a newcomer what a working ledger looks like, instead of sending them to the website.
- **Expected outcome:** ledgers get created from the mobile client, and the "No Ledger Selected" dead end no longer exists in any locale.
- **Why now:** the mutation, templates, and validation rules already exist on the backend and dashboard, so this is a bounded client addition; it also removes the app's last untranslated strings.
- **Adoption surface:** included because this ships a user-facing flow described in the mobile README.

## Closeout evidence

- Create screen light/dark on iPhone 17 Pro: `mobile/tmp/m6-create-light.png`, `m6-create-dark.png` via `beancount:///(app)/create-ledger`.
- Slug rules, Sample-only template payload, and conflict/tier error classification covered by unit tests (`create-ledger-screen/__tests__/ledger-name.test.ts`).
- Live create against production was not exercised (DoD forbids production ledger writes). Local docker-mac is available for a follow-up create/delete smoke with a local session.
- Gates: `yarn format`, `yarn lint`, `yarn typecheck`, `yarn test:unit` (1530 passed); `check-agent-guidance.py` OK.
