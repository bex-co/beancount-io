# w3 · m23 — Restore focus after Journal, Budget and Account dialogs

**Worker:** worker3 **Goal:** closing these dialogs returns keyboard users to the action they opened **Status:** todo

## Tasks (in order)

| id   | title                                      | est | depends_on             |
| ---- | ------------------------------------------ | --- | ---------------------- |
| t001 | Register the Journal export trigger        | 30m | —                      |
| t002 | Return Budget dialogs to their real opener | 40m | —                      |
| t007 | Return Open Account to its route opener    | 40m | —                      |
| t008 | Return account confirmations to their row  | 40m | t007                   |
| t003 | Verify keyboard adoption surfaces          | 25m | t001, t002, t007, t008 |
| t004 | Simplify the focus wiring                  | 20m | t003                   |
| t005 | Test dismissal and asynchronous completion | 55m | t004                   |
| t006 | Close out and archive the focus repair     | 15m | t005                   |

265 minutes total; 150 minutes of implementation across five dialog consumers, plus
meaningful interaction coverage and closing work. Promotes [050](../050.md)
after independent Budget and Account reproduction. This is one expanded focus-return
finding group; the historical inbox note is not counted again.

## Definition of done

- Journal Export returns focus to Export after Escape, Cancel, Close and
  successful populated/empty downloads; immediate Enter reopens it.
- Budget's Add Budget and Add Your First Budget closures return focus to the
  exact opener at desktop and narrow widths, with immediate Enter reopening.
- The shared AddBudgetDialog's card Add Entry caller retains its own opener;
  if successful creation removes the original empty-state control, focus moves
  to the persistent Add Budget action rather than BODY or a detached element.
- Accounts Open Account/New returns to that header link after Escape, Cancel
  and Close, preserving action-query cleanup and immediate keyboard reopening.
  Direct bookmarks and the Overview onboarding link use the persistent Accounts
  header as their return target when their original opener is absent.
- Account-row Close/Delete return to the corresponding More actions button
  after settled dialog dismissal. If successful completion removes that button,
  focus the persistent Search accounts input. Keep errors inside the open dialog.
- Existing permissions, validation, reset behavior, busy/error presentation,
  export contents and budget write/refetch contracts are preserved. No timers
  or global focus override are added to the common Dialog primitive.
- Meaningful tests use the real dialog/focus behavior for keyboard closures
  and asynchronous completion. Dashboard format, lint, tests and build pass.

## Source + Goal linkage

- **Source:** original Journal export finding050 plus repeated dashboard QA on
  2026-09-08 proving the same missing-opener mechanism in Budget and Accounts.
- **Goal linkage:** **A2 — Frictionless onboarding**. A keyboard user can dismiss
  a download, first-budget form or account dialog and continue from the action they used.
- **Expected outcome:** no need to restart page navigation after cancellation;
  the first-budget flow remains usable when its empty state becomes a card list.
- **Why now:** the reproduced callers bypass the trigger association required
  by the installed dialog library. Single buttons, shared budget openers,
  route links and transient account menus need explicit, scoped return targets.
- **Adoption surface:** included because these are visible dashboard journeys.

## Reproduction and evidence

Production `https://beancount.io`, 2026-09-08, Chrome152, English, System/light,
1440×1000 and 390×844. Local HEAD `a315c273`; fetched main `cc3f4c2f` has no
implicated-source repair. Deployed SHA remains unverified.

**Journal:** QA public reader on
`/ledger/open_ledger/crypto-example/journal?time=2025`. Focus Export and press
Enter, then dismiss with Escape, keyboard Cancel or Close. After the close
animation and deferred focus event, the active element is BODY and Enter does
not reopen the dialog. All closures repeat at both widths. A successful empty
period export (`time=2020`) also loses focus. HTTP200 populated and empty
downloads contain the correct supported entries/setup; scope copy is separate023.
See050 for the complete original investigation.

**Budget:** fresh isolated QA contexts on
`/ledger/open_ledger/minimax/budget`, a public ledger where this QA account has
pull/push permission but no admin permission. It is not a disposable test ledger.

1. Focus Add Budget, press Enter, then Escape.
2. Fresh-load; focus Add Your First Budget, press Enter, then focus Cancel and
   press Enter.
3. Fresh-load; open Add Budget and dismiss with its Close button.
4. For each case wait until the dialog is hidden plus 300ms. Focus is BODY;
   immediate Enter does not reopen. Repeat all three cases at390: same result.

The initial dialog focuses an input and its submit button stays disabled.
No fields were changed or forms submitted. All six documents and minimal
permission controls return HTTP200, with no console/page errors. A fresh
GetLedgerJournal read with `directiveTypes=[Custom]`, `customSubtypes=[budget]`
returns total0/data[], matching the empty Budget page; its is_empty=false
describes the nonempty ledger, not the budget result. No API error is involved.
Mutation guards recorded zero attempts. All isolated contexts and guards closed.

**Working control:** Overview Customize registers a SheetTrigger and returns
focus/reopens correctly at both widths, as independently captured in050. No
customization preferences were changed. The gallery's completed delete-ledger
work also demonstrates explicit return-target handling in source; no deletion
was exercised for this milestone.

Verified ignored evidence under `dashboard/tmp/qa-20260907-w3-loop/`:
`budget-dialog-focus-evidence.json`, `budget-dialog-api-control.json`, two
`budget-dialog-lost-focus-{1440,390}.png` opener crops, and050's original
Journal evidence/downloads. Opener crops show the available action; JSON carries
the actual focus measurements. Native mobile and private ledger data are absent.

## Root cause and repair boundary

Journal's `features/journal/components/export-journal-button.tsx:96–112`
opens a controlled Dialog with an unregistered Button. Use DialogTrigger asChild
for that single opener, preserving asynchronous controlled closure.

Budget `features/ledger-data/budget/index.tsx:73,208,221,311` opens the same
controlled AddBudgetDialog from the header and empty-state actions.
`add-budget-dialog.tsx:168–175` supplies neither a DialogTrigger nor an explicit
return target. `budget-chart-card.tsx:282–290,402` independently instantiates
the same dialog for Add Entry; that populated writer case is source-traced,
not live-reproduced because no disposable writable budget fixture was available.

The shared wrapper forwards to Radix. The verified pinned Dialog1.1.15 module
starts with a null triggerRef, attaches it through DialogTrigger, and its modal
close callback at146–148 prevents default restoration before focusing that
reference. FocusScope1.1.7 dispatches the close event asynchronously; all retained
measurements wait beyond it. Evidence and registry integrity were already read
for050 and the exact modules were re-inspected. This is caller wiring, not a
defect to patch globally in Radix or the common wrapper.

Budget must remember the actual opener (or give each independently scoped
dialog its own trigger). Merely mounting two DialogTriggers against one shared
triggerRef can return focus to the wrong button. Reuse the repository's explicit
onCloseAutoFocus/connected-element pattern where appropriate, and define the
persistent header fallback for an opener removed by successful creation.

Keep focus in an open form during validation or server errors. Preserve normal
Tab order, Escape semantics, permission gates, nested calendar/select focus,
form resets and existing budget/posting operations. No backend/REST/MCP change,
new dependency, synthetic production budget or unrelated dialog refactor.

## Dedupe and unverified states

Searched all open/completed board records for budget/modal focus and missing
triggers. This extends050 using independently reproduced evidence and the same
verified library mechanism, so no separate inbox duplicate is created. 031
concerns zero actuals,003 budget-write ambiguity, and m11 entry context; those
contracts remain separate. Completed w5/m2 has an explicit delete-dialog return
target. Targeted source history traces these Budget callers to `af5339de`, with
no later change on fetched main.

Live Budget checks cover cancellation only. Successful creation/refetch,
disappearing opener, card Add Entry, pending/error states, screen readers,
other browsers/locales and patched behavior need local-fixture verification.
The milestone does not claim all dialogs in the dashboard share this defect.

## Account continuation — same verified focus mechanism

Production 2026-09-08, Chrome 152, English/light, authenticated QA writer of
public minimax, 1440×1000 and 390×844. Local `a315c273`, fetched main `5b70f569`,
implicated source unchanged; deployed SHA unverified. No account mutation occurs.

1. Open `/ledger/open_ledger/minimax/accounts?lang=en`; wait for the real
   28 account rows, rather than the eight-row loading skeleton.
2. Keyboard-open the header **Open Account** link (**New** at390). The route
   gains `action=open-account`. Wait 550ms for opening to settle; leave all
   fields alone and the creation button disabled. Dismiss via Escape, keyboard
   Cancel or Close; each fresh desktop/narrow case leaves BODY focused after
   the dialog hides plus350ms. The action query clears correctly. Immediate
   Enter does not reopen the dialog.
3. Open the **More actions** menu for public `Expenses:IncomeTax`, then
   keyboard-select **Close**. After the opening wait, focus is inside the
   confirmation. Dismiss via each of the same three controls. Focus becomes
   BODY instead of the row's More actions button, at both widths.
4. Repeat step3 with public `Expenses:OtherNet` → **Delete**, always cancelling
   the confirmation. All three methods at both widths also focus BODY.
   Fresh repeats retain eighteen failing dismissal states across the three dialogs.

Working controls: the normal row menu itself registers DropdownMenuTrigger;
Escape from the menu returns to its exact More actions button in all four
Close/Delete desktop/narrow controls. The existing Overview Customize and
SSH/token DialogTrigger controls also work. Initial focus is correctly inside
each settled row confirmation; this is specifically a return-focus failure.

Timing matters: an exploratory immediate row-dialog dismissal appeared to
return focus correctly because the menu's delayed close callback was still
pending. Those early observations were discarded. The retained cases wait
550ms after opening and350ms after close, beyond both menu/dialog transitions.
Do not write a test that closes the dialog before the menu has finished closing.

Source: Accounts at `features/ledger-data/accounts/index.tsx:329–339,525–537`
opens OpenAccountDialog through a route Link/action parameter. The modal root
at `open-account-dialog.tsx:146–153` has neither a registered trigger nor an
explicit return target. Close/Delete menu items at index.tsx:170/179 store
only the account target; page-level dialogs at540/550 do not receive the row
trigger. Their roots at `close-account-dialog.tsx:77–78` and
`delete-account-dialog.tsx:133–134` have the same missing association.
The already verified Radix1.1.15/FocusScope1.1.7 mechanism above applies.

Repair Accounts locally: preserve a connected header-link target for Open
Account, including direct `?action=open-account` arrivals and the source-traced
Overview empty-ledger link at `features/reports/overview/components/empty-ledger-setup.tsx:81–86`.
For Close/Delete capture the persistent row More actions button, not its
transient menu item. Use Search accounts as a deterministic fallback when a
successful close/delete removes the original action. Reuse the repository's
onCloseAutoFocus/connected-element pattern, with no global Dialog override.

One Accounts page instantiates each of these three dialogs; the Overview link
is the only other production open-account action link. Empty-ledger onboarding,
direct bookmark closure and successful write/removal fallbacks are source-scoped
acceptance work, not production cases claimed here. Preserve write permission,
account eligibility, form reset, context/hash reads, errors and cache refresh.
Coordinate m24's date input repair without combining parsing into this work.

API controls: every retained GetLedgerAccountDirectives response is HTTP200,
28 rows and no errors. IncomeTax reports entryCount5, OtherNet0, both unclosed;
their menus expose the tested actions. No financial-balance or successful-close
claim follows from this metadata. The typed query in accounts/graphql and
gateway ledger-account-resolver.query.ts:66–78 → ledger-account-service.ts:113+
provide those rows; no server or serializer repair is indicated for focus.

Dedupe searched local/fetched open/completed records and active milestones.
This extends the existing m23 mechanism; 057 validation focus, 065 form labels,
073/074 account-search behavior and m24 parsing are distinct. Reviewed completed
w5/m2's explicit connected return-target pattern previously; it remains a useful
control. Targeted history traces these openers to `af5339de`; later responsive
and localization changes do not repair focus. No fetched-main fix exists.

All ten retained documents return200; zero mutation attempts, console errors
or page exceptions. Contexts closed. No existing account is created, closed,
deleted or edited. Screen-reader speech, other browsers/locales, pending/server
failure and successful production writes remain unverified. Ignored evidence:
`dashboard/tmp/qa-20260907-w3-loop/account-dialog-focus-evidence.json`, six
`account-{open,close,delete}-focus-{1440,390}.png` opener crops, and the existing
pinned Radix sources/integrity record. Crops show available controls; JSON
records the actual focus outcome. This extension adds no finding count.
