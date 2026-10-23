# Pending New Entry can lose modal focus; failed submissions do not restore the retry position

**Minor · dashboard · 110m across the milestone.** Production https://beancount.io, 2026-10-20 America/Los_Angeles (2026-10-21 UTC), owned isolated headless Chromium155.0.8059.85, fresh1440×1000 and390×844 contexts, English/UTC. Dedicated QA login and designated synthetic ledger. Report baseline b21a394bb; source rechecked after pulling e293667b6. The full deployed revision is unverified; the relevant implementation is compared below.

## Reproduce: ordinary failed keyboard submission

1. Open `/ledger/<qa-owner>/<synthetic-ledger>/journal?action=new-entry&directive=note`. Wait for the real hydrated Note form and actual account suggestions. Choose an existing open account and type `qa-20261020-failed-submit-focus retained text`.
2. Verify Create Note Entry is enabled, focus it and press native Enter. Hold its actual BulkEntries request before transport. Each case attempts exactly one NOTE for the designated ledger with the prefixed content. Every mutation remains guarded; no write is forwarded.
3. The original note and submit nodes remain attached, but the field/button are disabled and activeElement becomes DIV role=dialog.
4. Abort the held request before transport. The real client shows `Connection problem. Please check your internet connection and try again.` The same input/submit nodes, exact text and valid account remain; both controls re-enable.
5. After800ms, focus still belongs to the enclosing dialog, not the original submit control or an explicit recovery target. Native Tab then starts at the selected Note directive tab. Fresh desktop and narrow cases agree.

Expected: keep the accepted draft and recover the originating or another explicit useful action when the request fails, preserving deliberate user focus moves. Actual draft retention and failure guidance work; the keyboard retry position is lost. This is not accepted-text loss, a duplicate booking or an actual production outage.

## Independent pending reverse-Tab reproduction

In separate fresh contexts at both widths, repeat steps1–3 and wait500ms with the write still held. Press native Shift+Tab once. Actual activeElement is an A outside the New Entry dialog whose destination is the background ledger Query route. The modal remains open and the request remains held. Native DOM containment is false at both widths. The link is not activated; background navigation or any resulting data loss is not claimed. Abort the request; its ordinary error/draft recovery remains available, with focus still on that background anchor until another Tab returns to the dialog.

The modal keyboard contract keeps focus inside it while open; [Radix's official Dialog documentation](https://www.radix-ui.com/primitives/docs/components/dialog) describes modal focus containment. The controlled pending case violates that contract without any clock stub, fabricated response or hosted content change.

## Working controls and limits

- Two fresh idle Note dialogs keep native Tab and reverse-Tab focus inside the dialog; these records do not assert a particular idle edge control.
- A separate pending desktop case deliberately clicks the still-enabled Close control. The pending-dismissal guard keeps New Entry open and Close owns focus. After the same aborted submission and800ms, Close still owns focus. Preserve this deliberate choice rather than unconditionally refocusing the origin.
- All five retained submit cases intercept one prefixed request each; none reaches the server. Field/node identity, accepted text and actionable connection guidance survive. No uncaught page errors occur. These working draft, pending-dismissal and serialization observations preserve the existing repair while isolating its focus failure.
- The first diagnostic tried a Note Cmd/Ctrl+Enter shortcut that this form does not implement; it made no request and is excluded. An immediate reverse-Tab diagnostic is superseded by the two fresh500ms controls. No clipboard operation, native browser toolbar action or physical screen reader is used.

## Source and deployment comparison

`dashboard/src/features/journal/components/new-directive-dialog/note-form.tsx:125–130` uses usePendingSubmit and disables its fieldset for the pending interval. `common/hooks/use-pending-submit.ts:37–50` remembers the active element, but after pending it restores only when activeElement is null or BODY. In the real Dialog, the disabled origin loses focus to the dialog, so the connected-origin restoration condition never runs. The pending modal's focus loss also exposes the background reverse-Tab case; preserve a usable, owned focus target throughout the interval.

Actual production journal-D2vpXNGR.js.map contains the original feature-local hook, SHA-256 `88c6c9cd28bacf8a17bfdd5eebfdedc4946c38eb1514a09b87505b576cad0e0b`, and NoteForm `0179e6f514974bc61e20a91fcaac192f4afd541738da58bd3a35185107635871`. Current common-hook SHA is `8a38fceceac2a05d24609be3709cb4290d8906f1af24932886e63be135775b40`. A full text diff finds only the hook's comment naming Accounts and the NoteForm import relocation; the implementation is unchanged. The exact focus-restoration section matches byte-for-byte, SHA-256 `462c62af06185aa2ad1bc44b76a50efefc65140de8777ceaa4575ecb497bf7fa`. This is not a relevant focus fix already on main awaiting deployment.

Installed Radix FocusScope1.1.7's dist/index.mjs:35–51 refocuses its last focused node on an outside focus event; :143–151 tests a candidate's own disabled property without explicitly testing an ancestor disabled fieldset. This is consistent with the disabled-origin interaction seen here. Exact internal event scheduling was not instrumented, so do not treat that inference as a separately proved upstream defect or fork the focus trap. Check supported upstream behavior and use a bounded owning integration.

## Callers, dedupe and repair boundary

Current main has six production hook callers: TransactionForm, BalanceForm, NoteForm and OpenAccountForm in New Entry; Accounts OpenAccountDialog; and AddBudgetDialog. Only New Entry Note's focus failure is live-proved here. Accounts shares the hook after f0ff6709f; Budget's newer adapter is source-audit scope. Do not claim every caller independently fails.

All board states/open milestones and targeted history were searched for pending fieldsets, usePendingSubmit, failed-submit focus, modal escape and reverse-Tab. Completed [m33](../m33/README.md)'s definition of done and closeout explicitly include focus and promise restoration for retry; its current live draft retention/field lock/one-request/blocked-Close controls pass, but the focus bullet fails. Its other form/lifetime cases remain supported by the existing regressions and were not all rerun here. Preserve its completed draft/serialization work and track this bounded residual separately. Completed [284](../284.md) and [295](../295.md) reuse the lifecycle; [238](../238.md) owns successful post-write return focus. Open [m35](../../m35/README.md) owns a different suggestion-read Retry helper. No pending shared-submit focus repair was found. History follows the hook from b33115f15 to its common relocation f0ff6709f.

Keep Tab/Shift+Tab inside the visible pending modal, then recover useful focus on failure if the user has not moved elsewhere. Preserve accepted values, actual field locking, single-flight guards, pending dismissal/tab protection, validation, exact quantities and successful/obsolete-lifetime focus behavior. Do not re-enable pending fields to hide focus loss, reset the form, always steal focus from Close, silence the error, copy Radix internals or add a global focus manager. No API/backend/parity or dependency change is indicated.

## Evidence and cleanup

Ignored dashboard/tmp/qa-20261020/dashboard-loop/new-entry-submit-focus-controls.json holds the five retained submit cases, idle controls, exact native containment/focus records, guarded mutation metadata and source comparison. `note-failed-submit-focus-{1440,390}.png` dialog crops were visually inspected; they show retained text/error without the original submit focus cue. The public deployed sources are kept in `deployed-use-pending-submit.ts` and `deployed-note-form.tsx` for reproducible diffs. Screenshots alone do not prove pending focus escape; native activeElement/containment records do.

Every held write is aborted before transport and all temporary contexts/interceptors are closed, leaving the single owned main context. No hosted file/entry/credential, primary-session preference/history, clipboard or OS state changes. No product fix or test change was made by QA. Natural network-failure frequency, other five callers' live focus outcomes, other engines/locales, physical devices/speech, background-link activation and repaired behavior remain unverified.
