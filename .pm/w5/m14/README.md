# w5 · m14 — Use one form of address per locale in the dashboard

**Worker:** worker1 **Goal:** a German, Dutch, Spanish or Catalan reader of the web app is addressed one way throughout, the same way the native app addresses them, and a test keeps it that way **Status:** todo

**Estimate:** about 3h implementation, 4h including the standing closing tasks (8 tasks).

## The finding

On one Accounts page (`/ledger/<owner>/<ledger>/accounts`), the web app switches between formal and informal "you":

- **German:** the Liabilities heading reads "Negative Salden sind **Ihre** Schulden" (*Sie*). The Equity row's **Actions** menu says "… Um dieses Konto zu schließen, **füge** eine close-Direktive zur Hauptbuchdatei hinzu." (*du*).
- **Dutch:** "Een negatief saldo is wat **u** verschuldigd bent" (*u*) sits above "Hier kun **je** alleen activa- en passivarekeningen sluiten." (*je*).
- **Catalan:** "Un saldo negatiu és el que **deveu**" (*vosaltres*) sits above "Per tancar aquest compte, **afegeix** una directiva close …" (*tu*).
- **Spanish:** consistent on this page (*tú*: "lo que **debes**", "**añade**"). Elsewhere the catalog uses *usted*, for example `importer.upload.fileSizeError` "Por favor, **intente** con un archivo más pequeño", `collaboration.inviteCollaboratorsDescription` "**Busque y seleccione** usuarios …" and `importer.preview.emptyFileDescription` "… **revise su** archivo", next to `journal.readFailedLedgerUnchanged` "**Inténtalo** de nuevo o **vuelve** en un minuto."

Approximate catalog counts (messages under `dashboard/src/**/locales/<lang>.ts` that contain each register's pronouns or imperatives; a regex scan, so treat them as sizes rather than exact lists):

| Locale | Formal | Informal | Native app's recorded choice (`mobile/AGENTS.md`) |
| --- | --- | --- | --- |
| de | ~396 (*Sie/Ihr/Ihnen*) | ~34 (*du/dein/dir/dich*, *Füge/Wähle/Gib/Prüfe…*) | *Sie* |
| nl | ~147 (*u/uw*) | ~137 (*je/jouw/jij*) | *je* |
| es | ~51 (*usted*, *intente/seleccione/revise su…*) | ~177 (*tú/tu*, *añade/inténtalo…*) | *tú* |
| ca | ~152 (*vostre/vostra*, *-eu* imperatives) | ~149 (*tu/teu/teva*, *afegeix/torna…*) | none recorded |
| fr, pt | consistent (*vous*, *você*) | — | *vous* (fr) |

The informal German strings cluster in `features/auth` (15), `features/ai-agent`, `features/importer` and the dashboard home. The Dutch and Catalan registers are split across every feature.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | German: rewrite the *du* messages in *Sie* | 25m | — |
| t002 | Spanish: rewrite the *usted* messages in *tú* | 30m | — |
| t003 | Dutch: rewrite the *u/uw* messages in *je/jouw* | 45m | — |
| t004 | Catalan: choose one register, record it, rewrite the other | 45m | — |
| t005 | Guard the register per locale and record the rule in `dashboard/AGENTS.md` | 30m | w5/m14/t001, w5/m14/t002, w5/m14/t003, w5/m14/t004 |
| t006 | Simplify | 15m | w5/m14/t005 |
| t007 | Test coverage | 20m | w5/m14/t005, w5/m14/t006 |
| t008 | Closeout | 10m | w5/m14/t006, w5/m14/t007 |

## Definition of done

- In German, Dutch, Spanish and Catalan, the Accounts page (Liabilities heading and the Equity row's Actions menu), Sign in, Account Settings and Import each address the reader in that locale's one recorded register. Checked in the browser with `?lang=<code>`.
- A dashboard test scans the de, nl, es and ca catalogs for the other register's pronouns and imperatives. It passes, and it fails when one outlier is restored (for example German `page.accounts.closeInLedgerFile` with "füge").
- `dashboard/AGENTS.md` (Internationalization) names the register for each of these locales, matching `mobile/AGENTS.md` for de, nl and es.
- `yarn i18n:check`, `src/test/translations.test.ts`, `src/test/locale-stray-english.test.ts` and the dashboard gates (`yarn format:check && yarn lint && yarn test && yarn build`) pass.

## Source + Goal linkage

- **Source:** `/qa-find-bugs-dashboard` (`dashboard-qa` routine), 2026-11-27, against `https://beancount.io` (entry chunk `main-BBmi61Hs.js`), signed in on the designated synthetic ledger, read-only for this finding. Local HEAD `efcd0bb01`. It is the dashboard half of [w21/012](../../w21/done/012.md), which fixed the same mix in the native app on 2026-10-20 and recorded German *Sie*, Dutch *je* and Spanish *tú*.
- **Evidence:** the Accounts page strings quoted above, read from the rendered page with `?lang=de`, `nl` and `ca`, and the catalog counts in the table. Searched `.pm/**` (including `done/` and `blocked/`) for formal, informal, register, form of address, *Sie*/*du*, *u*/*je*, *usted*, *vostè*: only w21/012 (mobile, resolved) and the m7 task note in w7 that asks new strings to follow each locale's form of address. No dashboard item.
- **Goal linkage:** A2. A newcomer who uses the web app in their own language should read one product voice. Switching register within one screen reads as unedited machine output to native speakers, and it differs from the native app the same person may also use (w21/012's rationale).
- **Expected outcome:** German, Dutch, Spanish and Catalan readers are addressed one way on every web page and in the same way as in the native app. A new string in the wrong register fails CI instead of adding to the mix.
- **Why now:** the native app already settled the choice and guards it, so the web app is the remaining outlier. Every new string currently picks a side at random (the German informal strings are mostly recent auth, AI and import copy). The guard stops that drift before the catalogs grow further.
- **Adoption surface omitted:** the change alters copy inside existing pages only. No install step, quickstart, package table or skill catalog changes. The per-locale rule is recorded in `dashboard/AGENTS.md` by t005.
- **Sizing:** the rewrites are mechanical but about 400 messages across four locales, plus a guard. That is more than an hour, split by locale, so it is a milestone, not a note.
