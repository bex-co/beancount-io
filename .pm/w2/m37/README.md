# w2 · m37 — Refresh native measurements after live Dynamic Type changes

**Worker:** worker2 **Goal:** readers can change iOS text size while the app is open and retain readable dates, account choices, range controls and file permission notices. **Status:** in progress (t001–t004 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Validate native invalidation and repair journal date headers — **DONE** | 45m | — |
| t002 | Apply the validated policy to picker text, pills and file notices — **DONE** | 55m | t001 |
| t003 | Adoption surface: verify native navigation and guidance — **DONE** | 20m | t002 |
| t004 | Simplify the changed font-transition handling — **DONE** | 15m | t003 |
| t005 | Meaningful transition coverage and native verification | 50m | t003 |
| t006 | Closeout after the native outcomes hold | 30m | t004,t005 |

## Definition of done

- Example Transactions default→maximum→default settles to complete dates and fresh-launch spacing in both themes, including background/resume, without restart or appearance change.
- The actual filter Account Picker refreshes parent/leaf rows and Recent/root section text without clipped glyphs or retained enlarged blanks. Observed49-point ordinary and110.333-point maximum row baselines are comparison controls, not hardcoded heights.
- Picker All/Assets pills and shared range labels resize coherently with their selected indicator. Observed27.667-point ordinary and67.667-point maximum pill heights are comparison controls.
- Files→README.md retains the complete native read-only notice without clipping or enlarged blank space after both transition directions/themes. Observed52-point ordinary and337.667-point maximum banner heights are comparison controls, not prescribed heights.
- Date-header query/search/filter state, amounts, pagination and scroll position survive; picker identity, selection, ranking/callbacks and position survive; pill value/null-key semantics, horizontal reveal and animation survive.
- File document identity, buffer, revision/SHA tracking and editor position survive notice remeasurement. Read-only/write guards, absence of Save for readers and notice yielding to file errors remain intact.
- Meaningful mounted-transition tests and mobile gates pass. Native iPhone17e proof covers both transition directions/themes; coverage limits are stated.
- All tasks are complete, statuses synchronized and the milestone moves to done only after these observable outcomes hold.

## Source + Goal linkage

- **Source:** report-only native QA [w2/062](../062.md), original date-header evidence plus independently measured picker/section/pill extension on main726e565c and file-notice extension on main9961ef82. Severity minor. Roughly3h35 across implementation and verification; no product fix or server write performed.
- **Goal linkage:** **A2 — Frictionless onboarding.** A reader changing accessibility text size can still identify dates and accounts without manually recovering the app.
- **Expected outcome:** actual journal, account-choice and file-reader journeys remain readable after live iOS text-size changes; retained and fresh layouts agree in visibility/spacing.
- **Why now:** repeated light/dark controls cross four owned renderers. One investigation avoids unrelated patches based on an unproven common native cache cause; the expanded scope exceeds the original inbox estimate.
- **Adoption surface:** included because journals, account selection and period controls are directly used. Check native navigation and guidance; document only changes to documented usage.

The exact common Fabric cache cause is **unverified**. Task1 must prove a minimal native measurement repair before reusing it. Mere React rerendering may leave native measurements unchanged. Avoid an RN fork, dependency change, disabling scaling or whole-ledger remount. If no safe local policy resolves the proof, record the result and resize remaining work instead of declaring completion.

## Evidence and scope

Public synthetic Example, official https://beancount.io/, io.beancount.ios1.20260906.47/47, RN0.86/Expo57, sole iPhone17e/iOS26.5,390×844, English/System. Fresh QA OAuth is unverified because the designated credential file is absent. Full original repro, API control and additional115–122 metadata/capture details live in062; public frames are self-contained there.

Owners: DateSectionHeader (Transactions, merchant/account journals); AccountPickerScreen AccountRow/section labels (seven launch call sites); TimeRangePills (picker and other range consumers); LedgerFileEditorSession's native readOnlyText/banner (authenticated and guest file-reader aliases). Example Transactions, the filter picker/root pills and actual Files→Example README have native transition proof. Enumerate aliases and remaining consumers without claiming the entire app is reproduced. Separate Home lifetime measurements058, account total reflow063, AccountEntryRow layout064 and decorative names069 remain independent. CodeMirror's DOM source typography is outside this native-notice scope.
