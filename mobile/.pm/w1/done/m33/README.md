# w1 · m33 — Cash-flow Sankey on Reports

**Worker:** worker1 **Goal:** Reports answers "where did my money come from and where did it go" in one picture — a cash-flow Sankey for the selected time range, readable at phone width. **Status:** **done** 2026-08-19 — cash-flow Sankey ships on Reports with `d3-sankey`, top-N + Other rollup, skeleton/empty/draw-in, and transformer unit tests

## Tasks (in order)

| id   | title                                                                      | est | depends_on      |
| ---- | -------------------------------------------------------------------------- | --- | --------------- |
| t001 | Phone-width design pass: orientation, top-N + "Other" rollup, RTL behavior | 40m | — — **DONE**    |
| t002 | Add `d3-sankey` + `@types/d3-sankey` (new dependency — owner-approved)     | 10m | t001 — **DONE** |
| t003 | Port the Sankey data transformer, fed by the income-statement hierarchy    | 60m | t002 — **DONE** |
| t004 | Render the Sankey: nodes + curved ribbons on `react-native-svg`            | 90m | t003 — **DONE** |
| t005 | States and motion: time-range pills, skeleton, empty state, draw-in        | 45m | t004 — **DONE** |
| t006 | Wire into the Reports screen; reconcile totals with the income statement   | 30m | t005 — **DONE** |
| t007 | UX pass — light/dark, translations gate, RTL, loading states               | 40m | t006 — **DONE** |
| t008 | Simplify pass over the Sankey diff                                         | 20m | t007 — **DONE** |
| t009 | Test coverage — transformer, rollup, reconciliation                        | 40m | t008 — **DONE** |
| t010 | Closeout — move completed tasks and milestone into done/                   | 10m | t009 — **DONE** |

## Definition of done

On the Reports tab, a signed-in user picks a time range and sees an income → category flow whose totals reconcile with the income statement for the same range. Top-N categories with an "Other" rollup keep the picture readable at 402pt width; first load shows a `LoadingTile` skeleton, a ledger with no flows in range shows an honest empty state, and the chart draws in using the m20 motion tokens. Light **and** dark via theme tokens only; every new string declared in `src/translations/en.ts` and translated in all twelve other locales or named in `KNOWN_GAPS`; the RTL treatment decided in t001 is verified in Persian. The transformer is covered by `yarn test:unit`; `yarn lint` / `yarn typecheck` green.

## Source + Goal linkage

- **Source:** inbox note `w1/020` (2026-08-14, "Scope a mobile cash-flow Sankey"), parked on exactly two blockers — the `d3-sankey` dependency decision and a phone-width design pass — which are now t002 and t001. Promoted 2026-08-19 from that day's `/pm-brainstorm`. Web reference (public repo): `dashboard/src/features/reports/overview/components/cash-flow-sankey.tsx` with `lib/sankey-data-transformer.ts` and `lib/sankey-colors.ts`, both under test.
- **Goal linkage:** **Pillar 3 — analytics & insights** ("where did it come from and where did it go" in one picture, without spreadsheets). It also honors the BQL anti-goal's stated alternative: with the agent-chat track closed by anti-goal (owner decision 2026-08-19), Reports is the mobile way to answer ad-hoc questions.
- **Expected outcome:** beancount.io mobile users get the signature cash-flow view natively — the last major Reports parity gap with the web client closes.
- **Why now:** the 2026-08-19 anti-goal closed the AI-chat track, making this the largest open analytics gap; the risky half (data shaping) is already solved and tested in-repo, so the genuinely new work is phone rendering; and the two blockers that parked `020` for five days are cleared by this milestone's first two tasks. **Dependency note:** t002 adds `d3-sankey` (~10KB, pure JS) + `@types/d3-sankey` — flagged per repo rule and approved by the owner at materialization (hand-off 2026-08-19).
