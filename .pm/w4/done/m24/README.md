# w4 · m24 — Repair the Ukrainian catalogs' first-word find/replace damage

**Worker:** worker1 **Goal:** Ukrainian stops being the worst-rendering locale in the product — no screen shows half-translated labels like `Вocuments` or `Рахунок Journal` **Status:** done

## Tasks (in order)

| id   | title                                                    | est | depends_on   |
| ---- | -------------------------------------------------------- | --- | ------------ |
| t001 | Repair the `auth` and `collaboration` catalogs             | 30m | —            | — **DONE**
| t002 | Repair the `journal` catalog                               | 30m | w4/m24/t001  | — **DONE**
| t003 | Repair the `user-settings` catalog                         | 30m | w4/m24/t002  | — **DONE**
| t004 | Repair the `ledger-list` catalogs                          | 30m | w4/m24/t003  | — **DONE**
| t005 | Repair the `reports` catalogs                              | 30m | w4/m24/t004  | — **DONE**
| t006 | Repair the `ledger-data` catalogs                          | 30m | w4/m24/t005  | — **DONE**
| t007 | Repair the `ledger-editor` catalogs                        | 20m | w4/m24/t006  | — **DONE**
| t008 | Adoption surface: verify the repaired screens in Ukrainian | 20m | w4/m24/t007  | — **DONE**
| t012 | Repair the shared common and seo Ukrainian catalogs        | 20m | w4/m24/t007  | — **DONE**
| t009 | Simplify the catalog-guard code this milestone touched     | 20m | w4/m24/t012  | — **DONE**
| t010 | Generalise the stray-English guard to every locale         | 40m | w4/m24/t012  | — **DONE**
| t011 | Closeout                                                   | 10m | w4/m24/t010  | — **DONE**

## Definition of done

Scanning every Ukrainian catalog file — all 47 that `find src -name uk.ts`
returns, not the 45 matched by a `locales/uk.ts` glob — for messages that mix
Cyrillic with a stray English word — the predicate now lives in
`dashboard/src/test/locale-scan.ts`, with its allowlist of brand names,
Beancount directive and metadata keywords, file formats, currency codes and
literal account names — returns no offenders. Flag keys still render
one- or two-character literals in Ukrainian. A guard covering every locale is
in the suite and fails when any repaired catalog is reverted. English and the
other thirteen locales are unchanged. The dashboard gates pass.

## Source + Goal linkage

- **Source:** `.pm/w4/152.md`, filed while closing `w4/149` (the Russian Journal catalogs).
- **Goal linkage:** A2 and A3 — a reader evaluating Beancount.io in Ukrainian currently meets labels that are words in neither language (`Вocuments`, `Пoading entry statistics...`), which reads as an abandoned product rather than a localized one.
- **Expected outcome:** a Ukrainian-speaking newcomer can use the dashboard without meeting a broken label, and the shipped guard stops the whole class returning in any locale.
- **Why now:** the same damage has now been found and repaired twice — Catalan in `w4/m14`, Russian in `w4/149` — each time by accident while chasing something else. Ukrainian is the largest remaining instance at ca 110 messages across 22 catalogs, and the scan predicate that finds it already exists, so the cost is translation rather than investigation.
- **Adoption surface task included** because this changes user-facing strings on most screens in the product; t008 walks them in Ukrainian rather than trusting the catalogs alone.
