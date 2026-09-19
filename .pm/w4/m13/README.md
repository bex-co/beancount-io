# w4 · m13 — Preserve ledger pages through loading and hydration

**Worker:** worker1 **Goal:** Accounts accepts continuous typing, Journal resets its page and BQL retains in-flight state while report loading and initial hydration stay truthful **Status:** todo (t001–t005 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Preserve page state through local URL navigation — **DONE** | 60m | — |
| t002 | Keep Journal pagination resets correct through scope changes — **DONE** | 30m | t001 |
| t003 | Verify adoption journeys and guidance — **DONE** | 10m | t002 |
| t004 | Simplify the changed navigation lifecycle — **DONE** | 10m | t003 |
| t005 | Cover the real layout/router regression and run dashboard gates — **DONE** | 60m | t004 |
| t006 | Close out only after all live journeys pass | 10m | t005 |

180 minutes across two related implementation tasks and verification. Four independently reproduced failures share the pending-layout boundary: major Accounts typing interruption and minor Journal page-reset loss, initial hydration replacement for valid encoded date ranges, and BQL in-flight state loss on query URL changes. Full evidence, source traces, controls and limits are in [FINDINGS.md](./FINDINGS.md).

## Definition of done

- At desktop and narrow widths, typing Checking into the populated public example Accounts search retains focus/caret, accepts the complete word, and yields the matching account. Back/reload still restores search and type.
- Changing Journal's year while on page 2 starts the new result set at offset 0; shared account/expression changes and Clear all follow the same rule. Explicit offset reload and journal→account→Back preserve the selected page.
- Pending report/filter and cross-ledger reads never expose old values or exports as settled for the new scope; empty and error states remain truthful.
- Initial hydration preserves populated overview nodes and statement tables for equivalent percent-space/plus-space date ranges without React418; ordinary unfiltered/year loads remain passing controls.
- Submitting a different BQL query in the same ledger preserves the earlier query's loading state and accepts its eventual result into the correct card, without requiring a history reopen. Keep query bookmarks and ledger isolation.
- Integration checks include the real pending layout and router, not only isolated page mocks; dashboard format/lint/test/build pass.

## Source + Goal linkage

- **Source:** user-requested repeated dashboard QA, 2026-09-17; promoted w4/073 after independently reproducing the Accounts consequence. See FINDINGS.md.
- **Goal linkage:** A2 — frictionless onboarding: newcomers can search example accounts and filter transactions without interrupted input or silently skipped results.
- **Expected outcome:** continuous typing reaches one matching account, and a changed journal filter begins at the first matching transaction.
- **Why now:** the 2026-09-15 stale-report safeguard interacts with the previously shipped URL-state fixes. Fix the boundary once while retaining both contracts.
- **Adoption surface:** included because the affected dashboard journeys are user-facing; confirm existing README/guidance remains accurate without unrelated documentation churn.
