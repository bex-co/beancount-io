# Catalan controls display messages for unrelated concepts

Environment: production https://beancount.io, anonymous public synthetic `open_ledger/example`, QA-owned isolated headless Chromium 149.0.7827.55, light, Catalan `lang=ca`; desktop 1440×1000 and fresh 390×844 load. Local main `26d54a9db7d33c31a549bd12a0454a1c01f3f038`; deployed main-BIr0jJni.js, exact deployed commit unverified. No product or ledger changes.

## Reproduction and controls

1. Open `/ledger/open_ledger/example/journal?lang=ca&time=2016` with Transaction selected. The API returns HTTP 200 and 393 transactions; the table is populated.
2. At desktop, the Overview navigation link says “No s'han trobat dades del balanç de comprovació per a aquest llibre.” This is a missing Trial Balance data message, not an Overview label.
3. Clear all says “Veure els canvis del compte al llarg del temps” (view account changes over time); the payee/tag combobox placeholder is “Error en carregar la informació general del llibre. Si us plau, torneu-ho a intentar més tard.”
4. Journal Open says “El contingut de la nota és obligatori”; Note says “No s'han trobat beneficiaris”; Metadata says “Carregant el context de l'entrada...”; Payee/Narration is “Emplenar”. Pending's visible text is “El beneficiari és obligatori” and its accessible name is only “!”. These are not actual validation/loading failures.
5. Reload at 390×844: the same Journal labels persist. Open Filtres: the same unrelated Clear all sentence and error placeholder are present in the named filter dialog.
6. Close the sheet, click the misnamed Open button, then deselect Transacció. GetLedgerJournal sends directiveTypes:["Open"], time:"2016", offset:0, limit:60 and returns 53 Open entries. The control executes Open filtering, not note validation.
7. On the earlier desktop Transaction-only state, clicking the misnamed Clear all removed time from the URL and returned HTTP-200 1,044 transactions. Its label describes a different action.
8. Switch to `lang=en`: Open, Metadata, Note and the other controls have their expected labels. Data/operations remain usable. This is a catalog/consumer-label defect, not a broken ledger or server.

The desktop screenshot was visually inspected. Narrow accessibility snapshots independently reproduce the labels. No actual screen-reader speech or Catalan native-speaker session is claimed.

## Source and repair boundary

| Message key | Current Catalan value / mismatch | Source |
| --- | --- | --- |
| common.overview | missing Trial Balance data sentence | common/ca.ts:712 |
| component.searchControls.clearAll | view account changes over time | common/ca.ts:608 |
| component.searchControls.filterByTagPayee | overview load-error sentence | common/ca.ts:636 |
| journal.metadata | loading entry context | journal/locales/ca.ts:226 |
| journal.note | no payees found | journal/locales/ca.ts:254 |
| journal.open | note content required | journal/locales/ca.ts:266 |
| journal.payeeNarration | fill | journal/locales/ca.ts:282 |
| journal.pending / pendingTransactions | payee required / bare ! | journal/locales/ca.ts:290–297 |

Common paths are under `dashboard/src/i18n/locales/`; Journal paths are under `dashboard/src/features/`. English keys and adjacent descriptions explicitly identify each intended concept. Other nearby Catalan Journal values also appear assigned to neighboring concepts; audit that namespace against the keyed English source rather than repairing only the screenshot strings. Do not infer that the entire language catalog is wrong or claim untested form journeys as reproduced.

Producers are the two Catalan catalogs. Consumers pass the right keys: `common/components/ledger-search-controls/index.tsx:171,208`, `common/components/ledger-layout/ledger-sidebar.tsx`, `features/journal/components/journal-filters.tsx:27,91,137` and journal-table's headers/postings controls. The common sidebar and filter layout serve eligible ledger routes; JournalFilters also serves Account Journal. The primary live scope is Journal plus its common shell; Account Journal, other reports and entry forms are source-traced only.

Repair the key-to-meaning associations with coherent Catalan wording, preserving placeholders, interpolation parameters and flag semantics. Keep literal flag labels such as ! separate from explanatory accessible names. Do not change route destinations, filter behavior, data/permission rules or API surfaces to match the wrong text. Root cause is verified wrong values under correct keys; the historical process that produced them is unverified.

## Dedupe and history

Searched all `.pm/**/*.md`, including done/blocked, for Catalan, ca.ts, exact incorrect phrases, locale filter labels and misassigned messages; scanned open milestone titles. No overlapping Catalan repair found. Completed SEO localization w2/m11 concerns separate SEO catalogs; sidebar/Journal accessibility changes supply semantics but do not fix these values. `git log -S` traces the incorrect Open/common Clear all phrases to `af5339de`; current main retains them. Later Journal/common changes do not repair the reported key mappings. No deployment-lag disposition.

Other locales' partly untranslated Clear all messages are scoped in w4/083, excluding Catalan to avoid overlapping ownership.

## Evidence and limits

Verified ignored artifacts: `dashboard/tmp/qa-20260917/localized-filter-labels.json` contains fresh narrow dialog/Journal snapshots, actual clear/Open query variables/results and English control; `catalan-clear-label.png` is the desktop screenshot. One exploratory dialog count used a typographic apostrophe and returned zero; the subsequent exact-name snapshot is the valid evidence.

API requests succeeded; visible error/loading sentences are static labels, not failures to classify. Empty/denied/offline/expired-session states and authenticated/write forms were not exercised for this candidate. Preserve their actual messages and gates during the namespace audit. No product implementation, commit or push.
