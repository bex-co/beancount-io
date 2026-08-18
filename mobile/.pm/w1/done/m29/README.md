# w1 · m29 — Translation integrity gate, then the six largest locales

**Worker:** worker1 **Goal:** English becomes the enforced source of truth for translations — a test fails if any locale file is missing an `en` key, declares a key `en` does not have, or drops an interpolation token — and the six largest non-English locales are brought to full parity behind that gate. **Status:** **done** 2026-08-17 — gate live, six locales at full parity, 1283 unit tests green

## Tasks (in order)

| id   | title                                                             | est | depends_on           |
| ---- | ----------------------------------------------------------------- | --- | -------------------- |
| t001 | Whole-file locale integrity checker: no missing, no extra, no dup | 40m | — — **DONE**         |
| t002 | Interpolation-token parity for every declared key                 | 25m | t001 — **DONE**      |
| t003 | Bring `zh` to full parity (148 keys)                              | 45m | t002 — **DONE**      |
| t004 | Bring `de` to full parity (168 keys)                              | 45m | t002 — **DONE**      |
| t005 | Bring `ru` to full parity (168 keys)                              | 45m | t002 — **DONE**      |
| t006 | Bring `es` to full parity (171 keys)                              | 45m | t002 — **DONE**      |
| t007 | Bring `fr` to full parity (171 keys)                              | 45m | t002 — **DONE**      |
| t008 | Bring `pt` to full parity (175 keys)                              | 45m | t002 — **DONE**      |
| t009 | UX pass — longest new strings rendered in the six locales         | 30m | t003–t008 — **DONE** |
| t010 | Simplify — retire the per-feature parity suites now subsumed      | 20m | t009 — **DONE**      |
| t011 | Test coverage — the checker's own failure modes                   | 30m | t010 — **DONE**      |

## Definition of done

`src/translations/__tests__/locale-integrity.test.ts` exists and asserts, for all twelve non-English locale files, that (a) every top-level key of `en.ts` is **explicitly declared**, (b) no key is declared that `en.ts` does not have, (c) no key is declared twice in one file, and (d) every `{{token}}` in an `en` value appears in that locale's value for the same key. `zh`, `de`, `ru`, `es`, `fr`, and `pt` have **zero** entries left in the `KNOWN_GAPS` baseline — all 148–175 of their previously inherited keys are declared with real translations, not English copies. The remaining six locales are still listed in `KNOWN_GAPS` with exact key lists, so the suite is green and any _new_ gap fails it. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** `/pm` request 2026-08-17 — "add tests to check translation integrity, en as the source, others should be consistent with it, no missing, no extra, and then translate missing items to make the tests pass". Supersedes **m27** (receipt-group-only parity), whose keys are a strict subset of this work.
- **Goal linkage:** the cross-cutting quality bar in `.pm/GOAL.md`, which names "localized (13 locales, English as base)" as a standing requirement, and Pillar 2 **AI-powered ease** — the receipt and smart-suggestion flows are among the untranslated groups.
- **Expected outcome:** a Chinese, German, Russian, Spanish, French, or Portuguese user stops hitting English text mid-flow in the newest half of the app — multi-posting entry, open-account, reports, transaction edit/delete, receipt capture, notifications, and the ledger editor are all English-only for them today.
- **Why now:** measured on 2026-08-17, `en.ts` declares **330** top-level keys and the twelve locale files declare **155–182** each — **2051 missing declarations**, and **148 keys are missing in all twelve**. Every locale file is `{ ...en, <overrides> }`, so the gap is invisible at runtime: an untranslated string silently serves English and no lookup can ever reveal it. The two existing per-feature suites (`account-picker-parity`, `budget-parity`) prove the source-level check works but each guards one prefix, so every feature since has widened the gap. The gate has to land before the translations, or the next feature reopens it.

## Outcome — shipped 2026-08-17

The gate is in `src/translations/__tests__/locale-integrity.test.ts`, on machinery in `locale-parity.ts` and a 2051-entry baseline in `known-gaps.ts`. All six breakages fail red, verified by hand: a deleted key, an unknown key, a twice-declared key, a dropped `...en`, a dropped `{{token}}`, and a **stale** baseline entry.

Four things the plan did not anticipate:

- **The base has 330 keys, not 318.** Twelve are quoted — `"01"` … `"12"`, the month abbreviations — and an identifier-only regex silently skipped them in every file. The per-locale _missing_ counts and the 2051 total are unchanged (months are declared everywhere), but a scanner that loses twelve keys per file is exactly the failure `t011` exists to catch, so `declaredKeys` now reads quoted keys and the suite asserts the scan and `Object.keys(en)` agree.
- **`zh.ts` had neither `...en` nor `: typeof en`** — alone among the twelve. Without the annotation TypeScript never checked its keys, which is the likeliest reason it drifted least in count but most in structure. Both added; behavior is unchanged because `i18n-js` already falls back to English.
- **Locale files imported `en` through the `@/` alias**, which the unit-test runner does not resolve for value modules, so no test could import a locale at all. Switched to `./en` in all eleven; this is what makes value-level checks (token parity now, the identical-value rule in m30) possible instead of regex-parsing string values.
- **Plural branches are checked individually.** `budgetHistoryCount` is `{ one, other }`; taking the union of branches let a `{{count}}` dropped from `one` pass, which is precisely the case the plural exists for. Each branch is now checked against the English union — so `ru`/`uk`/`sk` may add `few`/`many` branches, and every branch still has to interpolate the count.

`account-picker-parity.test.ts` and `budget-parity.test.ts` were deleted at t001 rather than t010: they called `expectLocaleParity`, which whole-file parity replaced. Their one piece of real knowledge, the `budgetAccountPlaceholder` exception, moved to `INTENTIONALLY_UNTRANSLATED` with its reason.

### The six locales (t003–t008)

Each file was rewritten in `en.ts` key order, carrying `en`'s group comments, so the two read side by side. **Zero pre-existing translations were altered or lost** — verified by extracting every prior key's value from `HEAD` and diffing against the new file: 182 / 162 / 162 / 159 / 159 / 155 prior keys in `zh` / `de` / `ru` / `es` / `fr` / `pt`, all byte-identical; 330 declared in each now.

`ledgerEditorErrorCount` was the base's only key no locale had: a `{ one, other }` plural. `typeof en` forbids extra branches, so `ru` cannot add the `few` / `many` its grammar wants — it uses the count-last form (`Ошибок: {{count}}`), correct for every count, rather than a one/other pair that is wrong for 2–4. The checker itself allows extra branches, so a future custom pluraliser needs no test change.

### UX pass (t009)

Driven headlessly with `xcrun simctl`; locale switched by writing the `locale` key into the app's AsyncStorage manifest and relaunching, which is faster than tapping through the drawer and touches nothing else. The simulator was restored to as-found afterwards (locale key removed, appearance light). Read-only throughout — nothing was written to the ledger.

Walked and screenshotted — **de**: home, reports, multi-posting entry, open-account, notifications, ledger file list, editor, receipt camera-permission state; **fr**: home, reports, multi-posting entry, plus reports and receipt in dark; **ru**: home, budget. **No truncated, clipped, or overlapping string anywhere.**

Two things checked and cleared rather than fixed:

- The net-worth card's third tab clips (`Verbindlichkeite…` in German). Pre-existing and by design — the tab strip is a horizontal `ScrollView` whose own comment says three labels can outrun the width at 16px.
- Russian `С нач. года` is the widest range chip by a distance. `TimeRangePills` is also a horizontal `ScrollView`, centred when the row fits and scrollable when it does not, so it degrades rather than truncating.

**Not verified, and not claimed:** the receipt capture and reveal states. The simulator has no camera permission granted, so the flow stops at the permission screen — which does render correctly in German. `receiptRevealTitle`, `receiptRevealHint`, and `total` are unseen in place.

### Simplify + coverage (t010, t011)

`keyReport` and `tokenMismatches` were split into pure cores (`keyReportFor`, `tokenMismatchesFor`) taking lists rather than a locale name, so fixtures can drive them; the file-reading wrappers memoise, since the suite asked each locale the same question once per rule.

`locale-parity.test.ts` covers the checker against synthetic fixtures, and the two sabotage runs are what made it honest. With `declaredKeys` stubbed to `[]`, 19 tests go red. With `blankLiterals` stubbed to the identity, **nothing** went red at first — the literal-blanking fixtures were vacuous, because Prettier indents wrapped strings to four spaces and the hazard only appears inside a multi-line template literal. Rewritten to use one, both fixtures now fail under that sabotage.

One check was written, fired, and then deleted: "no key is in both `KNOWN_GAPS` and `INTENTIONALLY_UNTRANSLATED`" reads like a contradiction and is not one — `budgetAccountPlaceholder` is undeclared in the six remaining locales (a gap) and will be declared as the English literal when they land (intentional). The rule was wrong, not the data.

### Handoff to m30

`KNOWN_GAPS` now holds exactly `bg`, `ca`, `fa`, `nl`, `sk`, `uk` at 175 keys each — 1050 entries. Everything m30 needs is in place; its `t007` empties the record and adds the identical-value rule.

## Notes

- **Measured gap, 2026-08-17** (top-level keys, source-level declaration): `en` 330. Missing per locale — `zh` 148, `de` 168, `ru` 168, `es` 171, `fr` 171, `pt` 175, `bg`/`ca`/`fa`/`nl`/`sk`/`uk` 175 each. **Extra keys: zero in every locale**, so check (b) is a guard against future drift, not a cleanup.
- m30 finishes the remaining six locales and empties the baseline.
- The runner is `scripts/jest-lite-runner.js`, not Jest: it does **not** resolve the `@/` alias for value modules (use relative imports), and it supports only `toBe` / `toEqual` / `toBeCloseTo` / `toBeTruthy` / `toBeFalsy` / `toThrow` plus `.not`. The existing `locale-parity.ts` helper already respects both constraints — extend it rather than starting over.
- No new dependencies: the checker reads the locale files with `fs` and matches source text, exactly as `locale-parity.ts` does today.
