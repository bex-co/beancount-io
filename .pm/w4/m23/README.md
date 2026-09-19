# w4 · m23 — Prevent native authentication forms from putting passwords in URLs

**Worker:** worker1 **Goal:** Safe login and registration while client JavaScript loads or fails. **Status:** todo (t001–t003 done)

**Severity:** major. **Estimate:** 125m across 6 tasks. Dashboard only; no API contract change.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Protect login and registration before hydration — **DONE** | 35m | — |
| t002 | Verify shared authentication consumers — **DONE** | 20m | t001 |
| t003 | Adoption surface — **DONE** | 15m | t002 |
| t004 | Simplify | 10m | t003 |
| t005 | Test coverage | 35m | t003, t004 |
| t006 | Closeout | 10m | t005 |

## Definition of done

- Delaying or failing the client entry script cannot cause login or registration to construct a GET URL containing password fields, through button or keyboard submission.
- Hydrated authentication, local validation, next routing and shared consent form contracts still work.
- Browser regressions intercept synthetic attempts before transmission and verify both the vulnerable loading window and healthy controls.

## Source + Goal linkage

- **Source:** Repeated `$qa-find-bugs-dashboard` requested in w4; see [FINDINGS.md](./FINDINGS.md).
- **Goal linkage:** A2 — Frictionless onboarding requires safe credential entry even when scripts are delayed.
- **Expected outcome:** New and returning users can use authentication without a native form fallback exposing passwords in request URLs.
- **Why now:** Reproduced on the currently served public forms, independently at narrow and desktop widths; this affects the onboarding entrypoint. Adoption surface is included because users directly encounter the loading state.
