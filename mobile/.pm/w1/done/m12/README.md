# w1 · m12 — Typography polish: unified fonts, sizes, legibility

**Worker:** worker1 **Goal:** One typographic system across the app — system font for prose, a single legible mono (JetBrains Mono) for ledger text, tabular figures on every amount, and a shared size/weight scale in the theme — replacing 151 ad-hoc `fontSize` declarations, 6 duplicated `tabular-nums` styles, and a broken iOS mono fallback. **Status:** done

## Tasks (in order)

| id   | title                                                                          | est | depends_on |            |
| ---- | ------------------------------------------------------------------------------ | --- | ---------- | ---------- |
| t001 | Typography tokens in the theme: mono family, size scale, shared amount style   | 30m | —          | — **DONE** |
| t002 | Bundle JetBrains Mono via the existing expo-font plugin; drop unused SpaceMono | 30m | t001       | — **DONE** |
| t003 | Journal mono sweep — fix iOS fallback, scope mono to structured text           | 45m | t002       | — **DONE** |
| t004 | Tabular figures on every amount via the shared amount style                    | 45m | t001       | — **DONE** |
| t005 | Size/weight audit — normalize the main tabs onto the scale                     | 45m | t003, t004 | — **DONE** |
| t006 | UX pass — light/dark, i18n, loading bg, safe area, font scaling                | 30m | t005       | — **DONE** |
| t007 | Simplify pass over typography changes                                          | 20m | t006       | — **DONE** |
| t008 | Unit tests for the typography module                                           | 30m | t006       | — **DONE** |

## Definition of done

Every journal row and the transaction bottom sheet render ledger text in JetBrains Mono on both platforms (today `fontFamily: "monospace"` silently falls back to San Francisco on iOS); free-form narration renders in the system font. Every money amount in the app (home cards, accounts list, account detail, journal, add-transaction flows) uses one shared amount style with `fontVariant: ["tabular-nums"]`, so stacked amounts align on the decimal point. Font sizes and weights on the main tabs come from a theme scale (no mono below 13, weights limited to regular/medium), and no screen hard-codes a mono family or duplicates the tabular style. Light **and** dark verified, `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm` request 2026-07-10 ("polish and unify text font, size, and legibility") + this session's font/legibility analysis (system font for UI, JetBrains Mono for ledger text, tabular figures for amounts).
- **Goal linkage:** Pillar 4 **Plain-text fidelity** — the journal is the ledger's face on mobile, and its mono rendering is currently broken on iOS; Pillar 3 **Analytics & insights** — "understands their money at a glance" needs decimal-aligned, disambiguated digits; cross-cutting quality bar — "delightful in light **and** dark themes".
- **Expected outcome:** ledger text becomes legible and visibly "plain-text" on both platforms (distinct `0/O`, `1/l`, dotted zero at small sizes); columns of amounts stop wobbling as digits change; screens stop drifting typographically because new work inherits tokens instead of inventing sizes.
- **Why now:** m1–m8 each added surfaces with ad-hoc typography (151 `fontSize` declarations, 6 copies of the `tabular-nums` style, a per-file `MONO_FONT` const); m9–m11 are queued to add more. Landing tokens first means those milestones inherit the system for free instead of deepening the drift — and the iOS mono bug is a shipped defect today.

## Out of scope (v1)

Custom UI (non-mono) font — the system font is the deliberate choice for Dynamic Type and 13-locale script coverage (Cyrillic, Farsi); per-locale font overrides; settings/referral/welcome screens beyond what the audit catches for free.
