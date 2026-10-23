# w4 · m35 — Keep form fields usable when suggestions fail

**Worker:** worker1 **Goal:** A failed suggestions read leaves New Entry fields editable and offers recovery without restarting the draft. **Status:** in progress (t001, t002, t004, t005 done; t003 resumed)

**Severity:** minor. **Estimate:** 145m across six tasks, dashboard only.

## Source + Goal linkage

Continuous dashboard QA requested for w4, 2026-10-20. **A2 — Frictionless onboarding:** a newcomer should be able to type a known payee, narration, account or currency when an optional suggestion request fails. The current wrappers replace the actual fields with error alerts and expose no retry. Fix the four independently reproduced wrappers and verify their shared consumers now, because a single transient request failure blocks ordinary entry without any ledger outage. Four components, caller preservation and real query/form regression coverage exceed one hour. Adoption-surface verification is included because the recovery controls and draft behavior are visible to users.

## Tasks

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Retain Payee and Narration fields on suggestion failure — **DONE** | 30m | — |
| [t002](./done/t002.md) | Retain Account and Currency fields with existing validation — **DONE** | 25m | t001 |
| [t003](./t003.md) | Verify the visible recovery and draft journey | 35m | t002 |
| [t004](./done/t004.md) | Simplify the changed field handling — **DONE** | 10m | t003 |
| [t005](./done/t005.md) | Prove query failure recovery and run dashboard checks — **DONE** | 35m | t003 |
| [t006](./t006.md) | Close out and archive the milestone | 10m | t003, t004, t005 |

## Fresh live reproduction

Production https://beancount.io, local main `c5e4cd11a`, QA-owned isolated headless Chromium 155.0.8059.85, English/light, designated disposable synthetic ledger. Each case uses a fresh owner context at 1440×1000 and 390×844. These are explicit browser-local network aborts, not evidence of a natural production outage. All mutations are guarded before transmission; none was attempted.

1. Open `/ledger/<qa-owner>/<synthetic-ledger>/journal?action=new-entry&directive=transaction`. Abort only the read-only GetLedgerPayees operation. The settled Transaction panel shows Connection problem guidance where Payee belonged; zero comboboxes named Payee and zero Retry/Try Again buttons exist.
2. Type `qa-20261020 preserved suggestion-failure draft` into the healthy Narration field. Remove the request fault. The mounted form keeps that narration, but Payee remains absent and the alert remains. Reload: a genuine successful Payees read restores the field, while the narration draft is empty.
3. Independently repeat with only GetLedgerNarrations aborted: Narration is absent, while Payee accepts a prefixed draft. Removing the fault leaves the same inaccessible field; reload restores it and clears the draft.
4. Independently open directive=note with only GetLedgerAccounts aborted. Note content remains editable, but Account is absent and Create Note Entry stays disabled. There is no retry; restoring the network alone does not restore Account. The root background and form issue separate account reads; both are recorded and aborted.
5. Independently open directive=balance with only GetLedgerCurrencies aborted. Amount accepts 49.70, but Currency is absent and cannot be edited. Reload restores its real default USD control. No Balance entry was submitted.

All four failures and successful reload controls reproduce at both widths. Other healthy fields and the dialog remain usable; the entire ledger is not unavailable. Missing Account and Currency are not assertions that their values may bypass validation or that a draft with other missing required fields must submit.

## Cause and repair boundary

The following independent wrappers return only Alert on query error, before their value/onValueChange-controlled Combobox:

- `common/components/ledger-comboboxes/payees-combobox.tsx:65–70`
- `common/components/ledger-comboboxes/narrations-combobox.tsx:65–70`
- `common/components/ledger-comboboxes/account-combobox.tsx:72–77`
- `common/components/ledger-comboboxes/currency-combobox.tsx:65–70`

Each healthy combobox permits custom text. These reads supply suggestions, while the draft is already owned by the parent form. The wrappers discard query refetch and expose no in-place recovery. Their initial loading skeletons are a separate state from this settled error.

Keep the actual controlled field usable on a suggestions failure, with honest localized guidance, unavailable/empty suggestions and an in-place retry. Preserve its accepted text, accessible name, error association and keyboard focus through retry/loading/success. A retry must not remount the whole dialog or reset its form. Successful recovery restores genuine current-ledger suggestions and removes the warning. Suppress retained/partial failed suggestions rather than presenting them as current data.

Preserve permissions, disabled state, exact values, custom-text and Enter/blur/Escape semantics, account prefix filtering, default currency and all independent validation. In particular, New Entry's separate GetLedgerAccountDirectives/useAccountAvailability behavior from completed w3/560 must remain intact, including closed/future accounts and explicit also-open. No API, dependency or cross-package change is needed.

## Callers, dedupe and deployment

Payee and Narration wrappers have one production consumer each: TransactionForm. Account is also used by New Entry Balance/Note/Transaction, Budget, importer Configure/mapping, receipt review and Plaid mapping/review. Currency is used by Transaction/Balance, Budget, importer Configure and receipt review. Only the recorded New Entry forms were live exercised for this failure; other consumers are shared-code regression scope. OperatingCurrencyCombobox and SourceFileCombobox have similar source branches, but no independent live failure was exercised; they are unverified audit scope, not confirmed findings in this milestone.

All board states were searched for the operation/component names and failed suggestions, autocomplete, retry and form fields. Completed w4/203 repairs optional report-filter attributes in LedgerSearchControls; that component is different and its manual fallback is present on main. Completed w3/498 supplies field names and w3/560 account availability; retain both. W4/255 concerns focus after a successful suggestion selection, m33 pending submission ownership, and 256 switching directive types. None repairs these four failed-read branches. History retains the error return from `af5339de0`; `fa3a0b9c3` forwards field identity without changing it.

Three actual HTTP200 production source maps match local sources exactly:

| source | source map | SHA-256 |
| --- | --- | --- |
| payees-combobox.tsx | ledger._ledgerOwner._ledgerName.journal-DFfgnGSN.js.map | `b3a4d459732f124d6d77a2916634d75d008e1005121d8f3f89459335456a921b` |
| narrations-combobox.tsx | same Journal map | `655162c9448f56de23a6c96d152616e3cdc5fb85e5164b3890c0079d5cafee6b` |
| account-combobox.tsx | account-combobox-DGppEH7D.js.map | `f28d046be97b2eab25b4cbb5aae64ed718c463b7b420613b5d31051156e88f03` |
| currency-combobox.tsx | currency-combobox-Dx-PAsMC.js.map | `b0a5ad352469bfa3b2f2e631624e728de7c18df3d3711b862602cbd2f5db7232` |

Deployed full revision is unverified; the four relevant implementations match this checkout, so this is not a missing local fix awaiting deployment.

## Evidence and limits

Ignored evidence under `dashboard/tmp/qa-20261020/dashboard-loop/`: `form-suggestions-payee-failure-control.json`, `form-suggestions-related-failure-control.json`, `form-suggestions-source-maps.json`, `payee-suggestions-failed-{1440,390}.png` and `form-{narration,account,currency}-suggestions-failed-{1440,390}.png`. The narrow Payee/Account and desktop Currency captures were visually inspected. JSON contains actual role snapshots, aborted operation counts, retained sibling drafts and real successful reload controls.

No ledger writes, product edits, new tests, commit or push. All temporary contexts/interceptors closed. Physical devices, other engines/locales, authz or application-error responses, retrying an already-edited field, non-New-Entry consumers and repaired behavior remain unverified.

## Definition of done

- [ ] All four live-reproduced failed-read cases retain their named manual fields, honest failure guidance and in-place recovery at desktop/narrow widths.
- [ ] Accepted form text and focus survive failed retry, retry loading and successful suggestions recovery without restarting New Entry.
- [ ] Suggestions remain correctly scoped; failed/partial reads do not display stale options.
- [ ] Existing account availability, exact decimal submission, permissions, disabled state and keyboard selection behavior pass meaningful controls.
- [ ] Actual query/form regression checks detect the original branches; dashboard native checks pass and evidence states deployment/platform limits.
- [ ] Tasks and milestone are archived through /pm only when the observable end state holds.

## Unblocked

**Unblocked 2026-10-23** — The blocker was the missing browser and owner stack for the four aborted-read journeys, and then the deployed retry-focus gap recorded below. The local fixture app now supplies a synthetic owner and Playwright for those journeys, and the bounded retry-focus follow-up is dashboard code this loop can land, so t003 resumed. The original block record (shipped baseline, blocker, unblock condition) is in this file's history at the commit that blocked it.

## Deployed verification 2026-10-20: retry focus still fails

The initial field-replacement failure is fixed in the served build. In fresh desktop 1440px and narrow 390px owner contexts, aborting GetLedgerPayees leaves the named Payee input enabled, with linked unavailable-suggestions guidance and Try Again. Type qa-20261020-kept-payee, use native Tab (past Clear) to focus Try Again, and Enter while the read is still aborted. Restore the network, reach Try Again again with native Tab/Enter, and let its real refetch succeed. The same input node retains the exact draft and healthy suggestions return (10 options after clearing the search), but focus ends on the enclosing New Entry dialog rather than the field or a useful continuation control. Both widths reproduce. An independent narrow repeat waits 800ms after completion and captures the same final dialog focus.

Failed-retry focus itself varies: the two-width sample ended on the dialog, while the settled repeat retained Try Again. One first-success-only sample ended with role=combobox, without recording the specific field identity; it is not evidence that every successful retry loses focus. The retained-text/healthy-options control is working, and clicking Payee restores its native input focus. The reproducible residual is the keyboard recovery sequence after a failed retry, not renewed field loss or data loss. No mutations were attempted; all writes were guarded and extra contexts closed.

use-suggestions-fallback.tsx renders the retry with loading=retrying and no completion focus handoff; the shared Button disables itself while loading, and the notice/button disappears on success. Combobox renders that notice below its field. The helper and Combobox source maps exactly match source at capture (1cdf076a0) (SHA-256 a9448e8c11c6133f1450c36f73dee50aa35fd7792b76ba606c6fe0ab4796658f and b2ac5fe51d83219653b0c59dc8b6a4bce73ae57eea5e57a3b1e3e2204adf4bba). A complete deployed Payees wrapper hash was not extracted. All four wrappers share this helper; only Payee's residual focus was independently exercised.

Finish a bounded focus handoff for these retry controls without remounting the field, losing text, reopening stale options or changing normal Tab behavior. Preserve logical field/retry focus through failed and pending attempts; when a successful retry removes its button, return focus to the associated field. Add a real Dialog/form userEvent Tab/Enter regression that observes activeElement. Existing suggestions-failure.test.tsx uses fireEvent.click and checks node/value preservation, so its passing assertions do not establish native focus recovery. Audit the other three helper consumers and complete the existing desktop/narrow four-operation verification in t003. No global focus manager, dependency or API change is needed; estimate adds 25m to that remaining task.

This extends the original m35 focus acceptance, with no duplicate issue or extra finding-group count. Completed 255 concerns ordinary option selection and 274 concerns the separate sidebar account-search retry. Ignored evidence under dashboard/tmp/qa-20261020/dashboard-loop: suggestions-retry-focus-control.json, suggestions-retry-focus-settled-control.json, suggestions-retry-focus-source-control.json and inspected suggestions-retry-after-{failure,success}-focus-390.png. The earlier suggestions-retry-focus-lost-390.png came from a first-success-only control and is excluded as failure evidence.

The previously missing deployed build/browser is now available, but the original focus-preservation unblock condition is not met. Keep this milestone and t003 blocked until the bounded retry-focus follow-up lands and the real four-wrapper journeys pass at both widths; the implementation follow-up can use the concrete evidence above. Closeout now explicitly depends on t003 as well as the prior initial implementation reviews. QA made no product fix.

## Independent Narration, Account and Currency retry controls

Follow-up production checks, 2026-10-20 local date (2026-10-21 UTC), local main d53587ae6, same owned isolated headless Chromium155, English/UTC, fresh1440×1000 and390×844 contexts. All six new controls reproduce the existing retry-focus residual in the other three already-scoped wrappers:

1. Open the designated synthetic ledger's New Entry Transaction for Narration, Note for Account, or Balance for Currency. Abort only GetLedgerNarrations, GetLedgerAccounts or GetLedgerCurrencies respectively. Guard every mutation before transport. The named manual field remains enabled, its unavailable-suggestions notice is associated, and Try Again is present.
2. Enter `qa-20261020-retry-narration`, `Assets:qa-20261020-Retry`, or `USD` respectively. Native Tab from the field (past Clear) reaches Try Again; Enter retries while the operation is still aborted. After500ms each case has the same field node/exact draft and an enabled Retry, but native activeElement is the enclosing DIV role=dialog.
3. Allow the real read, reach Retry again using native Tab/Enter and wait for HTTP200/no GraphQL errors, notice removal and800ms settlement. All six cases keep the same input and exact value, yet focus is still on the dialog and no retry remains. The count of forwarded mutations and attempted mutations is zero; these are read-only controls, not failed writes.
4. Clear/focus the field and open its genuine recovered list: Narration has11 suggestions, Account12 and Currency1 at capture, at both widths. Account's synthetic custom name correctly retains its not-open validation; this control never claims invalid text may submit. Narration/Currency each have three read attempts (initial/fail/success); Account has four because the background and form also issue separate initial account reads.

The original Payee proof plus these six cases now independently cover all four helper wrappers at both widths. This replaces the earlier statement that only Payee's residual was live exercised; historical varying Payee failed-retry/first-success observations remain bounded as recorded. The source-only OperatingCurrency/SourceFile wrappers still have only Plaid callers and remain unverified; no bank connection or quota action was used to reach them.

Fresh actual HTTP200 source maps exactly match local helper/wrappers: use-suggestions-fallback SHA-256 `a9448e8c11c6133f1450c36f73dee50aa35fd7792b76ba606c6fe0ab4796658f` and Account `107fcd8887a32dcea1d8af820197201116eff38967a9197cdae3196167c1d34b` in account-combobox-DShEj4ac.js.map; Narration `d1c8b94264e0b602462eaa04b8465cc4f02d3a9384d0a2fac629902bcb7b1aa6` in ledger._ledgerOwner._ledgerName.journal-D2vpXNGR.js.map; Currency `1905263648dadbd59c2922bee64daf7d8f4058da38507e6dd7cd1f0ef7f0daab` in currency-combobox-CBAjGjkW.js.map. The helper's :48–54 loading button still lacks a completion focus handoff. No new implementation cause or finding group is introduced; the145m estimate and pending focused repair remain unchanged.

Ignored evidence: dashboard/tmp/qa-20261020/dashboard-loop/suggestions-retry-six-alias-controls.json and suggestions-{narration,account,currency}-recovered-{1440,390}.png. Narrow Account/Currency dialog crops were visually inspected. All six cases complete without page errors; all temporary contexts/interceptors close, leaving one original QA context. No hosted file, ledger fact, primary-session history/preference or OS clipboard changes. Physical devices, speech, other engines/locales and repaired retry-focus behavior remain unverified. The original initial field-replacement repair passes these controls; the focus-preservation unblock condition still fails, so t003 and closeout remain blocked.
