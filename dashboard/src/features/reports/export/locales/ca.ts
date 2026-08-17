import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "Exporta",
  markdown: "Informe Markdown",
  csv: "Full de càlcul CSV",
  printSavePdf: "Imprimeix / Desa com a PDF",
  completed: "L’exportació de l’informe està a punt.",
  failed: "No s’ha pogut exportar l’informe.",
  context: "Abast i base",
  generatedAt: "Generat el {generatedAt}",
  asOf: "A data de",
  period: "Per al període",
  accountFilter: "Filtre de compte",
  advancedFilter: "Filtre avançat",
  interval: "Interval",
  conversion: "Conversió",
  notApplied: "No aplicat",
  currency: "Moneda",
  unit: "Unitat",
  amount: "Import",
  unauditedManagementReport: "Informe de gestió no auditat",
  unauditedMultiUnitManagementReport: "Annex de gestió multiunitat no auditat",
  unauditedInternalDraft: "Esborrany intern no auditat",
  statementSummary: "Resum de l’estat",
  lineItem: "Partida",
  totalAssets: "Total d’actius",
  totalLiabilities: "Total de passius",
  totalEquity: "Total de patrimoni",
  totalLiabilitiesAndEquity: "Total de passius i patrimoni",
  reconciliationDifference: "Diferència de conciliació",
  totalRevenue: "Ingressos i altres rendes totals",
  totalExpenses: "Despeses totals",
  netLoss: "Pèrdua neta",
  supportingAccountDetail: "Detall de comptes de suport",
  allActivity: "Tota l’activitat disponible del llibre fins al",
  dateUnavailable: "Data de l’informe no disponible",
  presentationCurrency: "Moneda de presentació",
  ledgerUnits: "Unitats del llibre mostrades",
  sourceLedger: "Llibre d’origen",
  importantNotices: "Avisos importants",
  reportingEntity: "Entitat informant",
  netIncome: "Resultat net",
  reportingEntityFallbackNotice:
    'No s’ha configurat cap entitat informant. S’utilitza el nom del llibre d’origen; definiu l’option "title" de Beancount abans de l’ús extern.',
  placeholderDataNotice:
    "L’entitat informant o el llibre d’origen sembla contenir dades d’exemple. Substituïu-les abans de l’ús extern.",
  inferredPeriodNotice:
    "Aquest informe cobreix l’activitat del llibre des de {startDate} fins a {endDate}. Les dates s’han derivat de les dades disponibles de l’informe.",
  periodNotExplicitNotice:
    "No s’ha pogut determinar un període d’informe complet. Aquest informe continua sent un esborrany intern.",
  inferredAsOfDateNotice:
    "No s’ha seleccionat una data de tancament explícita. Aquest estat utilitza l’última data disponible a l’informe: {asOfDate}.",
  asOfDateUnavailableNotice:
    "No s’ha pogut determinar una data de tancament. Aquest estat continua sent un esborrany intern.",
  subtotalRowsNotice:
    "Les files en negreta són subtotals o totals i no s’han de sumar a les files de detall corresponents.",
  partialReportNotice:
    "Els filtres de compte o avançats limiten aquest informe; no és un estat financer complet.",
  balanceSheetClassificationNotice:
    "El llibre d’origen no proporciona classificacions corrents i no corrents; els comptes es presenten en l’ordre del llibre.",
  balanceSheetDoesNotReconcileNotice:
    "L’equació comptable no concilia per a una o més unitats. Reviseu els resultats no tancats, els filtres parcials, els efectes de valoració o conversió i els errors del llibre abans de l’ús extern. Aquest estat continua sent un esborrany intern.",
  customUnitsNotice: "Unitats personalitzades que cal revisar:",
  customUnitsDefinitionNotice:
    "Els seus significats no estan disponibles en aquesta exportació; documenteu-los en una nota adjunta abans de l’ús extern.",
  multiUnitScheduleNotice:
    "Aquest informe multiunitat és un annex de gestió, no un estat financer en una única moneda de presentació. No sumeu imports entre unitats; seleccioneu una moneda de presentació abans de l’ús extern.",
  noAssurance:
    "No es proporciona cap garantia. Preparat a partir de registres aportats per l’usuari; no s’han verificat la identitat, la integritat, la valoració ni el compliment comptable.",
  generatedBy: "Generat per Beancount.io el {generatedAt}",
});
