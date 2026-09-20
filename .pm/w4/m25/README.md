# w4 · m25 — Reach the Latin-script locales with a half-translated guard

**Worker:** worker1 **Goal:** the half-translated defect is detectable in all fourteen non-English locales, not just the seven whose script gives it away **Status:** todo

## Tasks (in order)

| id   | title                                                        | est | depends_on  |
| ---- | ------------------------------------------------------------ | --- | ----------- |
| t001 | Design a predicate that survives loanwords and German nouns    | 40m | —           |
| t002 | Repair the keys already repaired in other locales              | 30m | w4/m25/t001 |
| t003 | Repair what the tuned predicate finds beyond those             | 30m | w4/m25/t002 |
| t004 | Adoption surface: check the repaired screens in two locales    | 20m | w4/m25/t003 |
| t005 | Simplify the scan module after the second predicate lands      | 20m | w4/m25/t004 |
| t006 | Extend the guard to all fourteen locales and prove it fails    | 30m | w4/m25/t004 |
| t007 | Closeout                                                       | 10m | w4/m25/t006 |

## Definition of done

`dashboard/src/test/locale-stray-english.test.ts` covers all fourteen
non-English locales, not the seven it covers today. Every offender it finds in
a Latin-script locale is either repaired or recorded in `KNOWN_DEVIATIONS`
against a filed note — the allowlist is not widened to hide one. Reverting a
repair fails the guard by name. English is unchanged. The dashboard gates pass.

## Definition of not-done

The predicate must not fire on correct translations. Two specific classes were
measured while triaging and are the bar to clear:

- **Loanwords.** `Criar token`, `Prejsť na dashboard`, `Copiar link`,
  `Redefinir layout`, `Filteren op bank`, `Adicionar arquivos via upload`,
  `Fout bij sluiten van pull request` are all correct. A plain shared-English-
  tail rule flags 188 messages across the seven locales, mostly these.
- **German noun capitalization.** German capitalizes every noun, so
  `Intelligenter Import`, `Unbekannter Plan`, `Automatischer Import` and
  `Neueste Updates` are correct German that a title-case rule flags. The rule
  that separates `Conta Balance` from `Criar token` in Romance languages does
  not transfer to German.

## Source + Goal linkage

- **Source:** `.pm/w4/157.md`, filed from the `/simplify` review of `w4/m24/t010`.
- **Goal linkage:** A2 and A3 — seven of the fourteen translated locales currently have no automated protection against a defect this repo has shipped four times (Catalan `w4/m14`, Russian `w4/149`+`w4/153`, Ukrainian `w4/m24`, bg/fa/ko/zh `w4/156`).
- **Expected outcome:** a reader in Spanish, French, German, Dutch, Portuguese, Catalan or Slovak stops meeting labels like `Cuenta Balance` and `Eliminar Ledger`, and the guard keeps it that way.
- **Why now:** `w4/m24` and `w4/156` closed the class everywhere the script check can see. What remains is exactly the half it cannot see, and the same keys recur — `page.accountReport.*` is damaged in es, fr and pt after being repaired in ru, uk and zh, and `seo.welcome.description` is damaged in six Latin-script locales after being repaired in bg, fa and ru. The overlap is the cheapest way in.
- **Adoption surface task included** because this changes user-facing strings; t004 walks two of the repaired locales rather than trusting the catalogs.
