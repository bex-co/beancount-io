# w4 · m57 — Keep report interval choices through shared-filter changes

**Worker:** worker1 **Goal:** readers comparing dates keep the grouping interval they chose on Account, Balance Sheet, Income Statement and Cash Flow. **Status:** in progress (t001–t005 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Define a validated report-scoped interval preference — **DONE** | 30m | — |
| [t002](./done/t002.md) | Wire four report pages and matching server reads — **DONE** | 35m | t001 |
| [t003](./done/t003.md) | Verify adoption surfaces and document the preference — **DONE** | 10m | t002 |
| [t004](./done/t004.md) | Simplify the selection and query plumbing — **DONE** | 10m | t003 |
| [t005](./done/t005.md) | Cover the real scope/remount regressions — **DONE** | 40m | t004 |
| [t006](./t006.md) | Verify repaired journeys, ship and close out | 15m | t005 |

140 minutes: one shared selection contract, four page/schema integrations, matching SSR loader inputs and meaningful lifecycle/browser verification. This is one minor interval-retention finding across four independently reproduced consumers, not four duplicate reports. Details and evidence are in [FINDINGS.md](./FINDINGS.md).

## Definition of done

- Account, Balance Sheet, Income Statement and Cash Flow retain a reader-selected Weekly interval when shared Time changes from2016-04 to2016 and back, at1440×1000 and390×844. The displayed selector and actual report request both remain weekly.
- Shared account/expression edits follow the same interval policy. Existing chart views, Income/Expenses bar mode, Account journal offset normalization/reset, conversion and legend choices remain intact.
- Use validated page-scoped state compatible with the existing URL-view policy. Initial/default Monthly keeps a clean URL; a valid explicit interval survives a shared link/reload and scope edits; a typo falls back safely. Keep all five existing interval choices.
- Server prefetch and client queries read the same selected interval. Preserve truthful pending/error/retry states and coherent exports; retained data must never be presented under a different interval label.
- Keep report/ledger isolation and route-private parameter policy. Do not turn this into a global cookie/localStorage preference or implicitly carry the choice into unrelated routes.
- Meaningful real-router/layout/Apollo regressions fail with the old page-local initializers. Native checks on the repaired production build cover all eight report/viewport cases and manual selection controls, with correct weekly/calendar totals.
- Dashboard format/lint/test/build pass; any changed guidance passes the repository guidance checker. Record the shipped SHA and distinguish repaired-build verification from deployed verification.
- Closeout moves every completed task and this milestone into done, synchronizes statuses/table rows/workstream checkbox and verifies the old open paths are gone.

## Source + Goal linkage

- **Source:** continuous user-requested dashboard QA,2026-10-25; [eight fresh native reproductions](./FINDINGS.md),26 genuine report reads,16 unrequested Weekly→Monthly resets and complete served-source matches to current main.
- **Goal linkage:** A2 — frictionless onboarding and analysis. A reader should change the dates being compared without silently changing how the report groups them.
- **Expected outcome:** choose Weekly once, compare another date scope and keep weekly figures on all four report pages.
- **Why now:** the completed view-lifetime repairs retain the chart tab/bar mode, but the adjacent interval still lives below the same outer remount boundary. Repair this one preference coherently rather than weakening the pending-data safeguards.
- **Prior work:** [142](../done/142.md) establishes the page-scoped view-preference decision; [174](../done/174.md) applies it to Account and explicitly leaves interval policy unverified; [998](../done/998.md), [M16](../done/m16/README.md) and [M51](../done/m51/README.md) cover other choices/lifetimes. Keep those completed outcomes closed. Record one interval-consumer residual of that family, without increasing historical finding groups.
- **Adoption surface:** included because selection/bookmark behavior is user-facing. Check existing dashboard README/report guidance and package/catalog descriptions for accuracy; update only guidance that actually changes.
