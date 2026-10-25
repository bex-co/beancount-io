# w21 · m2 — Readable-width caps for the remaining bespoke screens

**Worker:** worker1 **Goal:** every mobile screen caps its content to a readable column on iPad **Status:** todo (t001, t002 done)

## Tasks (in order)

| id   | title                                      | est | depends_on         |
| ---- | ------------------------------------------ | --- | ------------------ |
| t001 | Cap the bespoke list screens — **DONE**    | 45m | —                  |
| t002 | Cap the detail, form, and settings screens — **DONE** | 45m | —     |
| t003 | Verify the zero-hit screens need no cap    | 30m | —                  |
| t004 | Adoption surface                           | 15m | t001, t002, t003   |
| t005 | Simplify                                   | 20m | t004               |
| t006 | Test coverage                              | 30m | t004               |
| t007 | Closeout                                   | 15m | t005, t006         |

## Definition of done

On a 1024 pt window every screen below caps its content in a centered column
at most 640 pt wide; phones render unchanged (caps do not bind below 640 pt);
`content-column.test.ts` has a consumer check per touched screen; the mobile
gates pass (`yarn format:check`, `yarn lint`, `yarn typecheck`,
`yarn test:unit`).

## Source + Goal linkage

- **Source:** w21/1007 (moved to `FINDINGS.md` on promotion), the follow-up to w21/1005, which capped the `DashboardScrollView` scaffold, the Picker and valuation sheets, and the Add Budget, Open Account, and transaction forms.
- **Goal linkage:** **A2 — Frictionless onboarding.** A newcomer opening the app on iPad gets composed, readable screens instead of edge-to-edge forms and 700 pt list rows.
- **Expected outcome:** no mobile screen runs content edge to edge on iPad; every screen shares the `contentColumn`/`sheetColumn` styles.
- **Why now:** w21/1005 just established the shared styles and the test pattern; each remaining screen is the same small, mechanical application, cheapest while the context is hot.
- **Adoption surface:** included. The change is user-visible on iPad; verify no docs, skills, or store metadata reference the old full-width layouts.
