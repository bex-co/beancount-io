import { createExportLocale } from "../export-locale";

export default createExportLocale({
  action: "Exporter",
  markdown: "Rapport Markdown",
  csv: "Feuille de calcul CSV",
  printSavePdf: "Imprimer / Enregistrer en PDF",
  completed: "L’exportation du rapport est prête.",
  failed: "Le rapport n’a pas pu être exporté.",
  context: "Périmètre et base de présentation",
  generatedAt: "Généré le {generatedAt}",
  asOf: "À la date du",
  period: "Pour la période",
  accountFilter: "Filtre de compte",
  advancedFilter: "Filtre avancé",
  interval: "Intervalle",
  conversion: "Conversion",
  notApplied: "Non appliqué",
  currency: "Devise",
  unit: "Unité",
  amount: "Montant",
  unauditedManagementReport: "Rapport de gestion non audité",
  unauditedMultiUnitManagementReport:
    "Annexe de gestion multi-unités non auditée",
  unauditedInternalDraft: "Projet interne non audité",
  statementSummary: "Synthèse de l’état",
  lineItem: "Poste",
  totalAssets: "Total de l’actif",
  totalLiabilities: "Total du passif",
  totalEquity: "Total des capitaux propres",
  totalLiabilitiesAndEquity: "Total du passif et des capitaux propres",
  reconciliationDifference: "Écart de rapprochement",
  totalRevenue: "Total des produits et autres revenus",
  totalExpenses: "Total des charges",
  netLoss: "Perte nette",
  supportingAccountDetail: "Détail complémentaire des comptes",
  allActivity: "Toute l’activité disponible du grand livre jusqu’au",
  dateUnavailable: "Date du rapport indisponible",
  presentationCurrency: "Monnaie de présentation",
  ledgerUnits: "Unités du grand livre affichées",
  sourceLedger: "Grand livre source",
  importantNotices: "Avis importants",
  reportingEntity: "Entité déclarante",
  netIncome: "Résultat net",
  reportingEntityFallbackNotice:
    'Aucune entité déclarante n’est configurée. Le nom du grand livre source est utilisé ; définissez l’option "title" de Beancount avant tout usage externe.',
  placeholderDataNotice:
    "L’entité déclarante ou le grand livre source semble contenir des données d’exemple. Remplacez-les avant tout usage externe.",
  inferredPeriodNotice:
    "Ce rapport couvre l’activité du grand livre du {startDate} au {endDate}. Les dates ont été déduites des données disponibles du rapport.",
  periodNotExplicitNotice:
    "Une période de reporting complète n’a pas pu être déterminée. Ce rapport reste un brouillon interne.",
  inferredAsOfDateNotice:
    "Aucune date de clôture explicite n’a été sélectionnée. Cet état utilise la dernière date disponible dans le rapport : {asOfDate}.",
  asOfDateUnavailableNotice:
    "Aucune date de clôture n’a pu être déterminée. Cet état reste un projet interne.",
  subtotalRowsNotice:
    "Les lignes en gras sont des sous-totaux ou des totaux et ne doivent pas être ajoutées aux lignes de détail correspondantes.",
  partialReportNotice:
    "Les filtres de compte ou avancés limitent ce rapport ; il ne constitue pas un état financier complet.",
  balanceSheetClassificationNotice:
    "Le grand livre source ne fournit pas de classement courant et non courant ; les comptes sont présentés dans l’ordre du grand livre.",
  balanceSheetDoesNotReconcileNotice:
    "L’équation comptable ne se rapproche pas pour une ou plusieurs unités. Vérifiez les résultats non clôturés, les filtres partiels, les effets d’évaluation ou de conversion et les erreurs du grand livre avant tout usage externe. Cet état reste un projet interne.",
  customUnitsNotice: "Unités personnalisées à examiner :",
  customUnitsDefinitionNotice:
    "Leur signification n’est pas disponible dans cet export ; documentez-la dans une note jointe avant tout usage externe.",
  multiUnitScheduleNotice:
    "Ce rapport multi-unités est une annexe de gestion et non un état financier dans une monnaie de présentation unique. N’additionnez pas les montants entre unités ; sélectionnez une monnaie de présentation avant tout usage externe.",
  noAssurance:
    "Aucune assurance n’est fournie. Le rapport repose sur des écritures fournies par l’utilisateur ; l’identité, l’exhaustivité, l’évaluation et la conformité comptable ne sont pas vérifiées.",
  generatedBy: "Généré par Beancount.io le {generatedAt}",
});
