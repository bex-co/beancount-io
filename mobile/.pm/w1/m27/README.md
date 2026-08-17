# w1 · m27 — Localize the AI receipt capture flow

**Worker:** worker1 **Goal:** A Chinese, German, or Russian user scanning a receipt reads the whole flow — "AI is reading your receipt…", "Retake", "Upload", "Here's what we read" — in their language, and a parity test makes the group impossible to regress. **Status:** todo

## Tasks (in order)

| id   | title                                                           | est | depends_on |
| ---- | --------------------------------------------------------------- | --- | ---------- |
| t001 | Translate the `receipt*` group: zh, de, es, fr, pt, ru          | 45m | —          |
| t002 | Translate the `receipt*` group: bg, ca, fa, nl, sk, uk          | 45m | —          |
| t003 | UX pass — longest translations rendered in the flow, light/dark | 30m | t001, t002 |
| t004 | Simplify pass over the translation diff                         | 20m | t003       |
| t005 | `receipt-parity.test.ts` so the group cannot regress            | 30m | t003       |

## Definition of done

Every one of the twelve non-English locale files explicitly declares the full receipt group — the ~19 `receipt*` keys at `src/translations/en.ts:272-305` plus `scanReceipt` and `total` — with real translations, not English copies. `receipt-parity.test.ts` exists alongside the other parity tests and fails if any locale drops a key. The receipt capture flow (`/(app)/receipt-capture`) walked in the two longest locales shows no truncated or overflowing strings in light or dark. `yarn lint` / `yarn typecheck` / `yarn test:unit` pass.

## Source + Goal linkage

- **Source:** inbox note `w1/022` (found while verifying `w1/m21/t006` on 2026-08-15), promoted during the 2026-08-17 board triage. Re-verified today: only `en.ts` declares any receipt key.
- **Goal linkage:** Pillar 2 **AI-powered ease** — receipt understanding is a headline pillar-2 feature and is currently monolingual — plus the cross-cutting quality bar, which names "localized (13 locales)" explicitly.
- **Expected outcome:** the AI capture flow stops being English-only for the twelve non-English locales; the flow's payoff moment ("Here's what we read", shipped in m21) lands in the user's language.
- **Why now:** m21 just polished this exact flow and had to ship its two new strings **without** a parity test, because the missing pre-existing keys would fail it — this milestone removes that standing gap, and the parity test (t005) is only possible after the translations land.

## Notes

- Every locale file is `{ ...en, <overrides> }`, so missing keys fall back silently — which is why only a parity test catches this class of gap.
- "AI" transliteration: follow each locale's existing convention in its current strings (e.g. how the smart-suggestion keys render "AI") rather than inventing one per key.
