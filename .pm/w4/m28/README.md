# w4 · m28 — Locale-aware plurals on both clients

**Worker:** worker1 **Goal:** both clients pluralise counts by each language's own rules (`Intl.PluralRules`), and m27's count strings read as natural sentences in every shipped language. **Status:** in progress (t001–t006 done)

## Tasks (in order)

| id   | title                                                                   | est | depends_on |
| ---- | ----------------------------------------------------------------------- | --- | ---------- |
| t001 | Dashboard: typed plural keys resolved by i18next, with a parity check — **DONE** | 60m | —          |
| t002 | Mobile: i18n-js pluralization from `Intl.PluralRules`, with a check — **DONE** | 45m | —          |
| t003 | Rewrite m27's count strings as natural plural sentences — **DONE** | 45m | t001, t002 |
| t004 | Adoption surface — **DONE** | 15m | t003       |
| t005 | Simplify — **DONE** | 20m | t004       |
| t006 | Test coverage — **DONE** | 30m | t004       |
| t008 | Dashboard: make the type-check require `count` for plural keys         | 45m | t001       |
| t007 | Closeout                                                                | 10m | t005, t006, t008 |

## Definition of done

- **Dashboard: plural keys.** A key may carry `_one`, `_two`, `_few`, `_many` and `_other` variants. Callers pass the base key with `{ count }`, and the type-check requires `count` for a plural key. The dev-mode existence check accepts such a key.
- **Dashboard: parity check.** For each language, a plural key provides exactly the categories that `new Intl.PluralRules(lang).resolvedOptions().pluralCategories` lists; other keys keep strict parity. The check fails when a Russian key lacks `few`, or when a Chinese key carries `one`.
- **Mobile.** `i18n-js` pluralises through `Intl.PluralRules` for every shipped locale, and the locale-integrity suite applies the same category check.
- **m27 strings.** Web Home reads `6 prices not updated since Sep 8, 2017 · 1 not in total` on `open_ledger/example`. Russian, Ukrainian and Slovak read correctly for 2 and for 5 on both clients.
- **Gates.** Every gate in both packages passes.

## Source + Goal linkage

- **Source:** promoted from w4/187 (see its [tombstone](../README.md#dropped)), which was filed from m27's recorded wording deviation.
- **Goal linkage:** **A2 — Frictionless onboarding:** readers of every shipped language see grammatical counts on Home, instead of `Prices not updated since …: 6` on web or wrong forms for 2–4 in Slavic languages on mobile.
- **Expected outcome:** any future count string on either client can be written as a natural sentence once and pluralise correctly in all 15 dashboard and 13 mobile languages.
- **Why now:** m27 just shipped the first count strings on Home and had to work around the missing support, so every later count string would repeat that workaround.
- **Adoption surface:** included, because the change alters visible copy on Home and the translation authoring rules contributors follow.
