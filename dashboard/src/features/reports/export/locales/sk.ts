import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "Exportovať",
  markdown: "Markdown výkaz",
  csv: "Tabuľka CSV",
  printSavePdf: "Tlačiť / Uložiť ako PDF",
  completed: "Export výkazu je pripravený.",
  failed: "Výkaz sa nepodarilo exportovať.",
  context: "Rozsah a základ vykazovania",
  generatedAt: "Vygenerované {generatedAt}",
  asOf: "K dátumu",
  period: "Za obdobie",
  accountFilter: "Filter účtu",
  advancedFilter: "Rozšírený filter",
  interval: "Interval",
  conversion: "Prepočet",
  notApplied: "Nepoužité",
  currency: "Mena",
  unit: "Jednotka",
  amount: "Suma",
  unauditedManagementReport: "Neauditovaný manažérsky výkaz",
  unauditedMultiUnitManagementReport:
    "Neauditovaný manažérsky výkaz vo viacerých jednotkách",
  unauditedInternalDraft: "Neauditovaný interný návrh",
  statementSummary: "Súhrn výkazu",
  lineItem: "Položka",
  totalAssets: "Aktíva spolu",
  totalLiabilities: "Záväzky spolu",
  totalEquity: "Vlastné imanie spolu",
  totalLiabilitiesAndEquity: "Záväzky a vlastné imanie spolu",
  reconciliationDifference: "Rozdiel odsúhlasenia",
  totalRevenue: "Celkové výnosy a ostatné príjmy",
  totalExpenses: "Celkové náklady",
  netLoss: "Čistá strata",
  netCashOperating: "Čistý peňažný tok z prevádzkovej činnosti",
  netCashInvesting: "Čistý peňažný tok z investičnej činnosti",
  netCashFinancing: "Čistý peňažný tok z finančnej činnosti",
  netChangeInCash: "Čistá zmena peňažných prostriedkov a ich ekvivalentov",
  openingCash: "Peňažné prostriedky a ich ekvivalenty na začiatku obdobia",
  closingCash: "Peňažné prostriedky a ich ekvivalenty na konci obdobia",
  supportingAccountDetail: "Doplňujúce podrobnosti účtov",
  allActivity: "Všetka dostupná aktivita účtovnej knihy do",
  dateUnavailable: "Dátum výkazu nie je dostupný",
  presentationCurrency: "Mena vykazovania",
  ledgerUnits: "Zobrazené jednotky účtovnej knihy",
  sourceLedger: "Zdrojová účtovná kniha",
  importantNotices: "Dôležité upozornenia",
  reportingEntity: "Vykazujúci subjekt",
  netIncome: "Čistý príjem",
  reportingEntityFallbackNotice:
    'Vykazujúci subjekt nie je nastavený. Používa sa názov zdrojovej účtovnej knihy; pred externým použitím nastavte Beancount option "title".',
  placeholderDataNotice:
    "Vykazujúci subjekt alebo zdrojová kniha zrejme obsahuje ukážkové údaje. Pred externým použitím ich nahraďte.",
  inferredPeriodNotice:
    "Tento výkaz zahŕňa účtovnú aktivitu od {startDate} do {endDate}. Dátumy boli odvodené z dostupných údajov výkazu.",
  periodNotExplicitNotice:
    "Úplné vykazované obdobie nebolo možné určiť. Tento výkaz zostáva interným návrhom.",
  inferredAsOfDateNotice:
    "Nebol zvolený výslovný dátum výkazu. Používa sa posledný dostupný dátum v reporte: {asOfDate}.",
  asOfDateUnavailableNotice:
    "Dátum súvahy nebolo možné určiť. Tento výkaz zostáva interným návrhom.",
  subtotalRowsNotice:
    "Tučné riadky sú medzisúčty alebo súčty a nemajú sa pripočítavať k príslušným podrobným riadkom.",
  partialReportNotice:
    "Filter účtu alebo rozšírený filter obmedzuje rozsah; nejde o úplný finančný výkaz.",
  balanceSheetClassificationNotice:
    "Zdrojová účtovná kniha neobsahuje klasifikáciu na krátkodobé a dlhodobé položky; účty sú uvedené v poradí knihy.",
  balanceSheetDoesNotReconcileNotice:
    "Účtovná rovnica sa nezhoduje pre jednu alebo viac jednotiek. Pred externým použitím skontrolujte neuzavreté výsledky, čiastkové filtre, vplyvy ocenenia alebo prepočtu a chyby knihy. Výkaz zostáva interným návrhom.",
  cashFlowClassificationNotice:
    "Rozdelenie na prevádzkovú, investičnú a finančnú činnosť sa odvodzuje z typov a názvov účtov bez deklarovanej cash-flow-role; účty s deklaráciou sa klasifikujú tak, ako je napísané.",
  cashFlowCashEquivalentsNotice:
    "Množina peňažných prostriedkov a ich ekvivalentov sa odvodzuje z názvov účtov (bežné, sporiace a pokladničné účty). Pred externým použitím skontrolujte zahrnuté účty.",
  customUnitsNotice: "Vlastné jednotky vyžadujúce kontrolu:",
  customUnitsDefinitionNotice:
    "Ich význam nie je v tomto exporte k dispozícii; pred externým použitím ho zdokumentujte v sprievodnej poznámke.",
  multiUnitScheduleNotice:
    "Tento výkaz vo viacerých jednotkách je manažérskym výkazom, nie finančným výkazom v jednej mene prezentácie. Nesčítavajte sumy medzi jednotkami; pred externým použitím vyberte menu prezentácie.",
  noAssurance:
    "Neposkytuje sa žiadne uistenie. Výkaz bol pripravený z údajov používateľa; identita, úplnosť, ocenenie ani súlad s účtovným rámcom neboli overené.",
  generatedBy: "Vygenerované službou Beancount.io {generatedAt}",
});
