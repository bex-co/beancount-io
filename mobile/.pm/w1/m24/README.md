# w1 · m24 — Controls you can see: fix the light neutral ramp, then share the primitives

**Worker:** worker1 **Goal:** Search fields, chips, cards and drawers get a real boundary in light mode — at the 3:1 non-text minimum — and the three copies of "search bar + pills + push the picker" collapse onto shared components. **Status:** todo

## Tasks (in order)

| id   | title                                                            | est | depends_on             |
| ---- | ---------------------------------------------------------------- | --- | ---------------------- |
| t001 | Re-tune the light neutral ramp (or add paired control tokens)    | 60m | —                      |
| t002 | Adopt the control token across ~24 surfaces; drop the workaround | 45m | t001                   |
| t003 | Extract `src/components/search-bar/` and adopt it                | 45m | —                      |
| t004 | Generalize `TimeRangePills` — `scrollable`, `haptics`, nullable  | 40m | —                      |
| t005 | `pushAccountPicker` helper, then one `SelectedAccount` key       | 50m | —                      |
| t006 | UX pass — light/dark contrast, i18n, safe area                   | 35m | t002, t003, t004, t005 |
| t007 | Simplify pass over the shared-primitive diff                     | 25m | t006                   |
| t008 | Tests: contrast guard + one locale-parity helper                 | 35m | t006                   |

## Definition of done

Every control surface that today fills with `theme.black10` has a boundary that clears **3:1 against the surface it sits on, in light mode** — measured, not eyeballed — and the per-screen border the account picker added as a workaround is deleted. Placeholder text clears its own contrast bar on that fill.

`src/components/search-bar/` is the only search input in the app, `TimeRangePills` is the only pill row, and every account-picker push goes through one helper that cannot mismatch its callback key. Correct in light **and** dark; strings via `useTranslations()` from the English base. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** inbox notes `011` (the light neutral ramp gives no usable control boundary) and `010` (deferred `/simplify` findings from `w1/m17`), both from the account-picker work of 2026-08-14, re-verified during the 2026-08-16 triage.
- **Goal linkage:** the cross-cutting quality bar — _"Delightful in light **and** dark themes"_ — and Pillar 1 **Effortless capture**: the surfaces in question are the capture path's own controls (the account picker's search field and chips, the quick-add selector, the payee/narration inputs). A control the user cannot see the edge of is a tax on every entry.
- **Expected outcome:** in light mode, search fields and cards stop reading as smudges on the surface; measured contrast goes from 1.10–1.34 to ≥3:1 on every control boundary. And the next screen that needs a search field gets one, instead of a fourth copy.
- **Why now:** `w1/m17` shipped a per-screen `black40` border as a workaround for exactly this defect — it clears 3:1 in dark (4.07) but not in light (1.34) — so the debt is already in the tree with a marker on it. Fixing the token layer deletes that workaround instead of spreading it. And `010`'s extraction should happen before a fourth search-bar copy appears.

## Measured starting point (from note `011`)

| pair                 | light    | dark |
| -------------------- | -------- | ---- |
| `black10` vs `white` | 1.10     | 1.21 |
| `black20` vs `white` | 1.18     | 2.50 |
| `black40` vs `white` | **1.34** | 4.07 |
| `black60` vs `white` | 1.78     | —    |
| `black80` vs `white` | 5.22     | —    |

The light ramp is compressed: the first four steps all land within 1.1–1.35 of the surface, then jump to secondary-text darkness. Light `black60` — documented as "placeholders / disabled" — is 1.62:1 on a `black10` field, and nine screens pass `placeholderTextColor={theme.black60}`. Dark is 5.21, so this is a **light-only** defect.

## Sequencing note

`t004` touches `src/components/time-range-pills/index.tsx`, which `w1/m20/t011` is fixing. Land `m20/t011` first.
