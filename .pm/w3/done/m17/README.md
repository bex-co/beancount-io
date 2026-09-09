# w3 · m17 — Make commit file links reach deferred and virtualized diffs

**Worker:** worker3 **Goal:** a reader can select or reopen a changed file and reach its actual diff **Status:** done

## Tasks (in order)

| id   | title                                                 | est | depends_on |
| ---- | ----------------------------------------------------- | --- | ---------- |
| t001 | Navigate to files outside the rendered virtual range — **DONE** | 45m | —          |
| t002 | Resolve commit fragments after the diff becomes ready — **DONE** | 40m | t001       |
| t003 | Adoption surface — **DONE** | 20m | t002       |
| t004 | Simplify — **DONE** | 20m | t003       |
| t005 | Test coverage — **DONE** | 45m | t003, t004 |
| t006 | Closeout — **DONE** | 15m | t005       |

Implementation estimate: 85 minutes; total including closing tasks: 185 minutes.

## Definition of done

- Selecting Walmart's FY2027 file from **files changed**, by mouse or keyboard,
  brings its header and diff into view at 1440px and 390px, even when that file's
  virtual row has not been mounted. The URL still identifies the selected file.
- Opening or reloading the freelancer-invoicing fragment below reaches the
  requested file after the asynchronous diff arrives. A later ordinary render
  does not repeatedly move a reader who has scrolled elsewhere.
- The existing large-diff gate remains usable. A selected fragment is honored
  after the reader presses **Load Large Diff**, including an offscreen virtual
  target. A changed commit cannot reuse a stale file selection or row index.
- Existing small-diff links, commit selection, narrow history sheets, malformed
  or missing targets, and the shared pull-request diff rendering remain usable.
- Meaningful browser checks assert the requested file is visible; checking only
  the URL or an anchor's existence does not satisfy this milestone. Dashboard
  format, lint, tests and build pass; closing tasks finish through `/pm`.

## Source + Goal linkage

- **Source:** repeated dashboard QA for w3, 2026-09-08, using public example and
  public company ledgers. This is report-mode follow-up work; no product fix was
  implemented during discovery.
- **Goal linkage:** **A2 — Frictionless onboarding** and **A3 — Community &
  distribution**. Readers exploring an example's history can reach a named file
  and share a useful location in its diff.
- **Expected outcome:** a newcomer selects FY2027 and sees FY2027 without
  manually searching thousands of diff lines; reopening an existing file link
  preserves that destination.
- **Why now:** the dashboard already publishes these file-fragment links, but
  ordinary large commits and fresh loads break their navigation promise.
- **Adoption surface:** included because commit history and shared diff rendering
  are user-facing. No new API or dependency is required.

## Live reproduction and evidence

Severity: **major** for file navigation in virtualized diffs; the same milestone
also covers a **minor** fresh-load fragment failure in small diffs. Count this
as one related finding group, with independently reproduced mechanisms.

Environment: production `https://beancount.io`, Chrome 152, English, System/light;
signed-in QA reader, public ledgers with pull access and no write permission.
Desktop 1440×1000; fresh narrow repeat 390×844. Deployed commit SHA is unverified.
Local source is `a315c273`; fetched `origin/main` is `cc3f4c2f`, with no changes to
the implicated dashboard files between them.

### Virtualized file selection

1. Open `/ledger/open_ledger/walmart/commit/752d3b5750e84a0b02ac642bc4708da17e312fcf?lang=en`.
2. Expand **files changed** and select **FY2027/FY2027Q2.bean**. The desktop
   repeat used focus + Enter; the fresh narrow repeat used a click.
3. URL gains `#diff-file-FY2027%2FFY2027Q2.bean`, but the diff still starts with
   `FY2022/FY2022.bean`. The virtual list's `scrollTop` stays **0**, its scroll
   height is **12087px**, and the requested target has **0 mounted elements**.
4. Working control: wheel-scrolling the same list to **8100px** mounts the FY2027
   header, which is visible at desktop y=375. The file and its diff are present.

Both GraphQL `getCommitDetails` and REST
`/api-gateway/v1/ledgers/open_ledger/walmart/commit-details?sha=752d3b5750e84a0b02ac642bc4708da17e312fcf`
return HTTP200, seven files and **479 additions / 45 deletions**. REST's 573-line
unified diff contains the exact FY2027 file header and content. No console errors
were captured. This is not a missing-file or permission failure.

### Fresh fragment and explicit loading

1. Open `/ledger/open_ledger/freelancer-invoicing/commit/51683ab5cc44e9d4cc5399c12c5c39475beaf1e9#diff-file-transactions%2Fsales-tax.bean`
   from a fresh navigation. This commit has 434 changed lines and uses the
   non-virtualized viewer.
2. At 390px the target is absent at DOMContentLoaded. After the diff has arrived
   and all loading indicators have gone, the target exists at **y=13406px**, but
   the commit pane remains at **scrollTop=0**. At 1440px a separate fresh load
   likewise leaves the target at **y=8088px**, with pane scrollTop=0. Reloading
   after a successful file click also loses the destination.
3. Working control: once this small diff is loaded, selecting its same file link
   scrolls the requested file into view. The narrow history sheet also opens,
   selects another commit, and closes correctly; desktop history links work with
   Enter.
4. Additional desktop control:
   `/ledger/open_ledger/crypto-example/commit/0d023f5e1c7029c4977fe11004fee0551caa147c`
   has 1117 changed lines. Select `transactions/transfers.bean` while the large
   diff is gated, then press **Load Large Diff**. Loading succeeds, but the list
   remains at 0 showing `.gitignore`; the selected file remains unmounted.

Verified ignored evidence under `dashboard/tmp/qa-20260907-w3-loop/`:

- `commit-file-navigation-evidence.json` — sanitized UI, GraphQL, REST, reload,
  fresh desktop/narrow, manual-scroll and large-diff-gate controls.
- `commit-virtual-file-link-1440.png`, `commit-virtual-file-link-390.png`.
- `commit-fragment-fresh-1440.png`, `commit-fragment-fresh-390.png`.

## Root cause and fix contract

Owning package: **dashboard**.

- `features/git/commits/components/commit-file-list.tsx:35–38` emits only a native
  fragment anchor using `common/components/diff-viewer/diff-file-id.ts:1`.
- `common/components/diff-viewer/diff-viewer.tsx:85–104` flattens diffs above 500
  lines. At lines166–191, `List` creates file IDs only inside mounted virtual
  rows. It has no `listRef` or file-to-row navigation, so a browser fragment
  cannot materialize an offscreen target. The pinned react-window 2.2.5 exposes
  `ListImperativeAPI.scrollToRow({index, align})` for this purpose.
- `features/git/commits/components/commit-detail.tsx:31–46,95–124` loads data with
  `useQuery` and conditionally mounts the diff. The commit route has no data
  loader, and neither component responds to the requested fragment when content
  becomes ready. The pinned TanStack router-core 1.167.0 hash handling tries
  `document.getElementById` during restoration/render handling; it does not wait
  for this later Apollo result. This timing explanation is source-traced and
  supported by the captured absent-then-present target.
- Producer control: backend-v2
  `features/gitea/commits/service/commits-service.ts:190–300` authorizes the read,
  fetches commit metadata and unified diff, and returns filenames unchanged.
  `api/commits-resolver.ts:31–40` delegates; `api/commit-reads.ts:56–67` serves the
  same read to REST/MCP registration. Payloads are correct. No backend schema,
  service, authorization, or API-parity changes belong to this fix.

Resolve the selected file against the parsed diff's existing file IDs. For a
virtualized file, scroll the actual List to its flattened header index, then
bring that viewer/target into the visible commit pane. For a small diff, scroll
its mounted target after data readiness. Handle explicit file clicks, incoming
fragments and history changes, including a repeated click on the same fragment.
Retain real link semantics and encoded filename compatibility. Keep any pending
destination tied to ledger + commit; resolve it once when eligible content
mounts, cancel it on navigation, and do not force-scroll unrelated rerenders.
Unknown or malformed fragments must fail harmlessly. Preserve the explicit
large-diff gate and resolve its pending destination after the user's load action.

## Blast radius, dedupe and limits

`CommitFileList` has one production caller, `CommitDetail`. `DiffViewer` is also
used by `features/git/pull-requests/pages/pr-review-page.tsx:123`; that rendering
must remain compatible, but no live pull-request failure is claimed. Commit
list and detail routes both use `CommitsSplitView`, including desktop and narrow
history. Searches found no other producer of `getDiffFileId` links.

Searched all open/completed `.pm` records for commit/diff navigation, fragments,
anchors, virtualized diffs and file links, and reviewed open milestone summaries.
`w3/008` concerns keyboard access to directory rows; its loaded small-diff anchor
control remains valid. `w3/009` concerns the directory toolbar's accessible name.
Completed `w2/m9` promises commit SEO and canonical metadata, not file scrolling;
its full DoD does not cover these failures. Completed `w1/m10/t014` and the parent
DoD cover API parity; the live REST/GraphQL payload controls succeed here.
Targeted history traces `getDiffFileId` and the viewer to `af5339de`; `c04cd2a8`
only adds a ledger scroll-to-top selector. No landed fix was found on fetched main.

Unverified: a patched implementation, live MCP execution, pull requests, deleted
or renamed diff targets, failed/denied reads, expired sessions, very large diffs
above 10000 lines, other browsers and locales. Keep these limits explicit; do
not infer data loss or API failures from this UI navigation defect.
