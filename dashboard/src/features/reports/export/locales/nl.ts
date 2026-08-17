import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "Exporteren",
  markdown: "Markdown-rapport",
  csv: "CSV-spreadsheet",
  printSavePdf: "Afdrukken / Opslaan als PDF",
  completed: "De rapportexport is gereed.",
  failed: "Het rapport kon niet worden geëxporteerd.",
  context: "Reikwijdte en grondslag",
  generatedAt: "Gegenereerd op {generatedAt}",
  asOf: "Per",
  period: "Voor de periode",
  accountFilter: "Rekeningfilter",
  advancedFilter: "Geavanceerd filter",
  interval: "Interval",
  conversion: "Conversie",
  notApplied: "Niet toegepast",
  currency: "Valuta",
  unit: "Eenheid",
  amount: "Bedrag",
  unauditedManagementReport: "Niet-gecontroleerd managementrapport",
  unauditedMultiUnitManagementReport:
    "Niet-gecontroleerde managementbijlage met meerdere eenheden",
  unauditedInternalDraft: "Niet-gecontroleerd intern concept",
  statementSummary: "Overzicht van de staat",
  lineItem: "Post",
  totalAssets: "Totaal activa",
  totalLiabilities: "Totaal verplichtingen",
  totalEquity: "Totaal eigen vermogen",
  totalLiabilitiesAndEquity: "Totaal verplichtingen en eigen vermogen",
  reconciliationDifference: "Aansluitingsverschil",
  totalRevenue: "Totale opbrengsten en overige inkomsten",
  totalExpenses: "Totale kosten",
  netLoss: "Nettoverlies",
  supportingAccountDetail: "Ondersteunende rekeningdetails",
  allActivity: "Alle beschikbare grootboekactiviteit tot en met",
  dateUnavailable: "Rapportdatum niet beschikbaar",
  presentationCurrency: "Presentatievaluta",
  ledgerUnits: "Getoonde grootboekeenheden",
  sourceLedger: "Brongrootboek",
  importantNotices: "Belangrijke mededelingen",
  reportingEntity: "Rapporterende entiteit",
  netIncome: "Nettoresultaat",
  reportingEntityFallbackNotice:
    'Er is geen rapporterende entiteit ingesteld. De naam van het brongrootboek wordt gebruikt; stel vóór extern gebruik Beancount-option "title" in.',
  placeholderDataNotice:
    "De rapporterende entiteit of het brongrootboek lijkt voorbeeldgegevens te bevatten. Vervang deze vóór extern gebruik.",
  inferredPeriodNotice:
    "Dit rapport omvat grootboekactiviteiten van {startDate} tot en met {endDate}. De datums zijn afgeleid uit de beschikbare rapportgegevens.",
  periodNotExplicitNotice:
    "Een volledige rapportperiode kon niet worden vastgesteld. Dit rapport blijft een intern concept.",
  inferredAsOfDateNotice:
    "Er is geen expliciete balansdatum geselecteerd. Deze staat gebruikt de laatste beschikbare datum in het rapport: {asOfDate}.",
  asOfDateUnavailableNotice:
    "Een balansdatum kon niet worden vastgesteld. Deze staat blijft een intern concept.",
  subtotalRowsNotice:
    "Vetgedrukte rijen zijn subtotalen of totalen en mogen niet bij de onderliggende detailrijen worden opgeteld.",
  partialReportNotice:
    "Rekening- of geavanceerde filters beperken dit rapport; het is geen volledige jaarrekening.",
  balanceSheetClassificationNotice:
    "Het brongrootboek bevat geen classificatie in vlottende en niet-vlottende posten; rekeningen worden in grootboekvolgorde weergegeven.",
  balanceSheetDoesNotReconcileNotice:
    "De boekhoudkundige vergelijking sluit niet aan voor een of meer eenheden. Controleer vóór extern gebruik niet-afgesloten resultaten, gedeeltelijke filters, waarderings- of omrekeningseffecten en grootboekfouten. Deze staat blijft een intern concept.",
  customUnitsNotice:
    "Aangepaste grootboekeenheden die moeten worden beoordeeld:",
  customUnitsDefinitionNotice:
    "Hun betekenis is niet beschikbaar in deze export; documenteer deze vóór extern gebruik in een begeleidende toelichting.",
  multiUnitScheduleNotice:
    "Dit rapport met meerdere eenheden is een managementbijlage en geen jaarrekening in één presentatievaluta. Tel bedragen van verschillende eenheden niet bij elkaar op; kies vóór extern gebruik een presentatievaluta.",
  noAssurance:
    "Er wordt geen zekerheid verstrekt. Het rapport is opgesteld uit door de gebruiker aangeleverde boekingen; identiteit, volledigheid, waardering en verslaggevingsnaleving zijn niet geverifieerd.",
  generatedBy: "Gegenereerd door Beancount.io op {generatedAt}",
});
