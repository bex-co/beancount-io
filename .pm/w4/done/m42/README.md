# w4 · m42 — Keep keyboard focus owned during and after modal submissions

**Worker:** worker1 **Goal:** Keyboard users stay inside a pending entry dialog and retain a useful position when a submission fails. **Status:** done

**Severity:** minor. **Estimate:** 110m across five tasks, dashboard only.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Keep submission focus inside its dialog through pending and failure — **DONE** | 40m | — |
| [t002](./done/t002.md) | Verify keyboard recovery across submission adoption surfaces — **DONE** | 20m | t001 |
| [t003](./done/t003.md) | Simplify the bounded focus integration — **DONE** | 10m | t002 |
| [t004](./done/t004.md) | Prove pending containment and failed-submit focus ownership — **DONE** | 30m | t002 |
| [t005](./done/t005.md) | Close out and archive the milestone — **DONE** | 10m | t003, t004 |

## Definition of done

- [x] In real desktop/narrow New Entry, a valid native submission remains single-flight and locks its fields while keyboard Tab/Shift+Tab stays inside the visible modal. Pending focus cannot reach the background Query link.
- [x] After a controlled pre-transport failure, the same accepted draft and controls remain usable and focus returns to the originating or explicit recovery control, without restarting at the directive tabs.
- [x] A deliberate move to another enabled modal control, including the pending Close control, retains its focus. Success, actual dismissal and obsolete dialog lifetimes do not receive a stale focus handoff.
- [x] Preserve the shared hook's six current callers: four New Entry forms, Accounts Open Account and Budget. Keep exact values, validation, pending input/dismissal protection, duplicate-submit guards, truthful errors and successful return focus.
- [x] Meaningful real Dialog/form regressions and native browser controls fail against the current lifecycle and pass after repair; dashboard format/lint/test/build pass. Distinguish deployed checks from local ones and record unexercised callers/platforms.
- [x] No global focus manager, copied upstream focus trap, newly enabled pending field, backend/API change or new dependency is needed; archive through /pm only when the observable behavior holds.

## Source + Goal linkage

- **Source:** Continuous dashboard QA requested for w4, 2026-10-20; [fresh live controls and source comparison](./FINDINGS.md).
- **Goal linkage:** **A2 — Frictionless onboarding:** a keyboard reader entering bookkeeping data must keep their place during a slow or failed action and remain in the dialog that owns it.
- **Expected outcome:** A held or failed entry submission keeps the user's keyboard in the active workflow, with preserved draft and a usable retry position.
- **Why now:** The existing pending/draft repairs correctly retain text but their focus behavior still fails in a real modal. Native reverse-Tab can reach the background while the write is held. Bounded shared submission integration, meaningful portal/native-focus regressions and six-caller preservation exceed an hour. Adoption verification is included because this is a customer-facing keyboard contract.

## Scope and dedupe

Own the pending/settled focus lifecycle at `common/hooks/use-pending-submit.ts` and the necessary owning Dialog/form integrations. New Entry Note is independently reproduced at both widths; the other five current hook callers are compatibility/audit scope until exercised. Completed [m33](../m33/README.md), [284](../284.md) and [295](../295.md) retain their draft/serialization work; this is its remaining focus boundary. Open [m35](../../m35/README.md) concerns a separate suggestions Retry helper, not a form submission. No persistent draft store, broad Radix rewrite or bank/credential action.

## Closeout (2026-10-22)

- **Implementation:** `common/hooks/use-pending-submit.ts` parks focus on the nearest focusable region around the submitting control while the lock holds it disabled. In New Entry that is the visible tab panel; in Accounts and Budget it is the dialog. A failed write returns focus to that control unless the user moved to another one. `onValid` resolves `true` once written, so a success hands nothing back. The six callers changed only to return that value. The pre-existing confetti test failure that kept the dashboard gate red was fixed separately in `7f3124e39`.
- **Evidence:** a local production build at both widths, driven by real keyboard input in Chromium 155 against replayed public reads, with every write held in the browser (details in [t002](./done/t002.md)).
  - New Entry: pending Tab/Shift+Tab stays between the Note panel and Close, with no outside focus.
  - New Entry: a failure returns focus to Create Note Entry with the draft kept, and Enter retries.
  - New Entry: deliberate Close focus is kept, and a success gives no handoff.
  - Accounts and Budget: a failure returns focus to their submit buttons.
  - With the original hook, 7 of 8 new real-Dialog regressions fail ([t004](./done/t004.md)).
- **Gates:** dashboard `yarn format:check`, `yarn lint`, `yarn test` (636 files, 6662 tests) and `yarn build` pass. No dependency, API, backend or cross-package change.
- **Target and limits:**
  - Everything was verified locally, not on the deployed site. QA should repeat the production steps in FINDINGS.md after deployment.
  - Transaction, Balance and New Entry Open Account were covered by jsdom only.
  - Budget's pending containment was isolated only at 1440px: a fixture-only suggestion popover paused its trap even while idle.
  - Accounts and Budget containment depends on Radix's trap holding the parked dialog.
  - Successful return focus to the New Entry link was observed ending on BODY in both the baseline and the fixed build under fixtures. That belongs to completed w4/238 and was not changed.
  - An early harness misroute let one anonymous BulkEntries reach the public API. It was refused `UNAUTHENTICATED`, with no write. Nothing private entered the board.
