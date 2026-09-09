# w3 · m29 — Protect file drafts during navigation and cancellation

**Worker:** worker3 **Goal:** existing-file and new-file drafts survive a decision to stay, and are discarded only after a confirmed departure **Status:** todo

## Tasks (in order)

| id   | title                                                    | est | depends_on |
| ---- | -------------------------------------------------------- | --- | ---------- |
| t001 | Preserve existing-file drafts until discard is confirmed | 45m | —          |
| t002 | Guard new-file drafts during navigation                  | 40m | t001       |
| t003 | Verify file-draft adoption surfaces                      | 20m | t002       |
| t004 | Simplify file-draft transitions                          | 20m | t003       |
| t005 | Test draft retention, navigation and save outcomes       | 45m | t004       |
| t006 | Close out and archive file-draft protection              | 15m | t005       |

185 minutes total, including85 minutes of implementation. One major finding
group, promoted from [041](../041.md) and expanded with the missing new-file
navigation guard.041 remains historical evidence, not a second implementation
queue. The two failures have distinct caller causes within one draft-protection
journey; do not describe them as the same bug in the router.

## Definition of done

- On an existing text file, Cancel/Escape opens the dirty-draft choice before
  clearing the buffer. Stay or closing the choice keeps the complete contents
  and edit session. Confirmed discard restores saved contents and exits once.
- On Create File with an edited name or contents, sidebar links and browser
  Back require a decision before navigation; Stay preserves both fields.
  Reload/unload uses the existing platform confirmation while a draft is dirty.
- Empty new-file forms and clean existing-file buffers navigate normally.
  Confirmed departure proceeds to the user's intended destination.
- A rejected save retains the draft and protection. A successful save can
  complete its intended navigation without presenting the just-saved content
  as unsaved. Local controlled writes verify these outcomes.
- Behavior holds at1440×1000 and390×844, with the existing localized confirmation
  and usable keyboard focus. No persistent draft store or automatic save is
  required.
- Meaningful real-component/router regressions and dashboard format, lint,
  test and build gates pass. Production mutations are unnecessary.

## Source + Goal linkage

- **Source:** [041](../041.md), expanded through fresh dashboard QA on2026-09-08.
- **Goal linkage:** **A2 — Frictionless onboarding.** A newcomer writing a first
  ledger file can inspect another page or choose Stay without losing the draft.
- **Expected outcome:** the file editor's existing unsaved-changes promise also
  protects new files and actually preserves existing-file content until a
  discard is confirmed.
- **Why now:**041's early reset and Create File's absent guard leave the two
  main text-editing paths unprotected at different transition points. Their
  shared route-confirmation convention makes this a coherent bounded repair.
- **Adoption surface:** included because both editor entrypoints are user-facing.
  Preserve documentation and existing navigation conventions; do not add
  unsupported autosave or recovery claims.

## Environment and fresh evidence

Production `https://beancount.io`, Chrome152 on macOS,2026-09-08,
English/light,1440×1000 and390×844. Existing QA writer on public
`open_ledger/minimax`. Checkout `a623f745`, fetched main `cc5683bf`;
implicated editor sources unchanged, deployed SHA unverified. Every mutation
is guarded, and none is attempted in these draft-only journeys.

### New-file loss

1. Open `/ledger/open_ledger/minimax/files/new/main?lang=en`.
2. Enter filename **qa-20260908-navigation.bean** and a local comment
   **; qa-20260908-new-file-navigation**.
3. Open the sidebar if needed and choose Journal. Navigation completes with no
   unsaved-changes dialog. Browser Back returns to Create File with an empty
   filename and empty editor.
4. Repeat fresh through Files → Create File. Browser Back goes to the directory
   immediately; Forward returns to an empty form. Both widths reproduce.
5. In separate fresh documents, reload the dirty form. No native beforeunload
   prompt appears; both values disappear. Typing supplied a real user gesture.
6. Clean-form Back/Forward controls navigate without a prompt and remain empty.

Two initial sidebar-navigation cases and six fresh Back/reload/clean controls
show the same result. The narrow Create File toolbar control has no text label;
the probe used its actual plus button. This does not add a new control-name
finding to the existing narrow-toolbar work.

### Existing-file comparison and041 writer repeat

Open `/ledger/open_ledger/minimax/files/blob/main/main.bean?lang=en&editMode=true`.
Insert **; qa-20260908-draft-guard-control** without saving. The actual mounted
Monaco model starts at4582 UTF-16 code units and becomes4618 at desktop or4616
at390px; indentation accounts for the different draft lengths.

- Choosing Journal opens **Unsaved Changes**. The complete model and marker
  remain. Choosing Stay preserves them and keeps the file URL.
- Reload triggers a native **beforeunload** prompt. Dismissing it preserves
  both model and route. The browser automation's navigation wait is cancelled
  by design; it is not a product timeout.
- Escape invokes Cancel and opens the same choice, but the model has already
  reverted to4582 and the synthetic marker is gone. Stay leaves that reverted
  model in place, independently repeating041 with writer permission.

The model is inspected read-only through its existing mounted editor reference;
loss is not inferred from Monaco's virtualized visible lines. This pass does
not establish whether the complete old draft can be recovered from undo history.
The earlier041 reader/control artifacts remain valid historical evidence.

Ten retained initial/fresh contexts, all initial documents HTTP200, zero page
exceptions and zero mutation attempts. Two native dialogs belong only to the
working existing-editor reload controls. All dialogs and contexts are closed.

## Root causes and implementation direction

- Existing edit: `features/ledger-editor/file-editor/components/ledger-file-view/text-file-view.tsx:127–132`
  calls setEditedContent(plainContent) before onExitEditMode. The route
  navigation is then blocked by `file-edit-mode.tsx:64–71`; its choice at166–195
  can stop navigation but cannot restore already-reset state.
- New file: `features/ledger-editor/create-file/index.tsx:44–46` stores filename
  and content only in local React state. The page has no useBlocker or
  beforeunload protection. Content is wired to Monaco at182–184, and route
  unmount/reload discards those values.
- The existing `@tanstack/react-router1.167.0` useBlocker implementation at
  `src/useBlocker.tsx:210–249` supplies shouldBlockFn, reset/proceed and
  enableBeforeUnload. The published pinned source was inspected and the
  existing-editor controls prove its behavior. No router patch is indicated.

Make the confirmation own the discard transition. Preserve existing buffers
while a decision is pending, reset only after confirmed discard, and reuse the
same route/beforeunload convention for Create File. Keep the new-file name and
contents together as the dirty draft. A small shared confirmation view/helper
inside ledger-editor is appropriate if it removes duplicated transition logic;
avoid building a general draft-storage or navigation framework.

Account for successful-save navigation when adding the guard:
Create File `index.tsx:76–113` awaits CreateLedgerFile and refetches before
navigating to the directory. A newly installed dirty guard must not block that
successful completion. Failure at108–112 retains the local state and must leave
protection active. Existing-file save has its own success-only exit wrapper.
092 separately fixes duplicate pending saves; preserve that work's boundary.

There is no malformed server response or missing persisted draft field here.
No mutation occurs before loss, so the observed defect belongs to dashboard
state/navigation. File creation/storage contracts and API permissions stay
outside this milestone.

## Blast radius, dedupe and limits

TextFileView has one FileContentView caller and is the only EditModeToolbar
caller; existing supported text blob routes share the first fix. The sole
new-file route wrapper is
`src/routes/ledger.$ledgerOwner.$ledgerName.files.new.$branch.$.tsx:5–8`;
directory creation at `directory-browse/components/ledger-directory-view.tsx:129–140`
and the source-traced nested-directory path reach the same page. The root new
route, real directory button and sidebar Journal link were exercised. Nested
directories were source-traced, not live-tested.

All open/completed boards and targeted history were searched for draft loss,
new-file navigation and useBlocker.041 already owns file-draft protection and
is promoted;040 concerns reader edit affordances,042 Find/Escape,009 names
and092 pending writes. The new native093 merchant-search item is unrelated.
Both caller gaps date to `af5339de`; later localization/SEO changes leave
them intact. Fetched main's new BQL and CLI work does not repair these paths.

No successful creation/save, server persistence, confirmed destructive
departure, physical device, Safari or Windows Ctrl shortcuts were exercised
in this pass. Those success/discard outcomes are explicit local acceptance
checks, not claimed live results. Do not turn the lack of cross-reload draft
storage into a separate feature request: confirmation is sufficient.

Ignored evidence under `dashboard/tmp/qa-20260907-w3-loop/`:
`file-draft-navigation-evidence.json`, four
`new-file-draft-{before,after}-{1440,390}.png`, the original041 artifacts and
`react-router-1.167.0-useBlocker.tsx`. The narrow before screenshot was visually
inspected. No product code, dependency, ledger content or credential changed.
