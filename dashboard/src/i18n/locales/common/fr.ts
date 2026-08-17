export interface TranslationEntry {
  message: string;
  description: string;
}

const frCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "Compte",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "Transactions",
    description: "Plural form of transaction",
  },
  "common.back": {
    message: "Retour",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Logo Beancount",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "Annuler",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "Effacer",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "Fermer",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "Limite de collaborateurs",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "Limite de collaborateurs atteinte",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "Copié",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "Copier",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "Supprimer",
    description: "Button label to delete item",
  },
  "common.directives": {
    message: "directives",
    description:
      "Unit label for beancount directive count (e.g. '842 / 1000 directives')",
  },
  "common.directivesLimitApproaching": {
    message: "Approaching your free plan limit",
    description:
      "Secondary text shown when a ledger's directive usage is between 90% and 100% of the free-tier limit",
  },
  "common.directivesLimitReached": {
    message: "Free plan limit reached",
    description:
      "Secondary text shown when a ledger's directive usage is at or over the free-tier limit",
  },
  "common.edit": {
    message: "Modifier",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "Nous avons rencontré une erreur inattendue. Veuillez réessayer ou retourner à la page précédente.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "Détails de l'erreur",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "Une erreur est survenue",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "Quelque chose s'est mal passé",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "Échec du chargement des données",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "Échec du chargement du grand livre",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "Retour",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "Accueil",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "Aller à la page suivante",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "Aller à la page précédente",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "Importer",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "Ajouter une entrée",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "Transaction, solde ou note",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "Import intelligent",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "Relevés bancaires, CSV, PDF ou scans",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "Connecter une banque",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "Synchroniser automatiquement les transactions",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "Télécharger un reçu",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "Scanner un reçu avec l'IA",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "Paramètres d'URL invalides",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "Les paramètres d'URL fournis ne sont pas valides. Veuillez vérifier le lien et réessayer.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "Dernière mise à jour",
    description: "Table column header for last update time",
  },
  "common.ledgerSettings": {
    message: "Paramètres du livre",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "Limite de registres",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "Limite de registres atteinte",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "chargement...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "Chargement des données...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "Plus de pages",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "Nom",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "proche de la limite",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "Échec de la connexion réseau",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "Impossible de se connecter au serveur. Veuillez vérifier votre connexion Internet et réessayer.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "Suivant",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "Suivant",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "Aucune donnée trouvée.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "Aucun résultat trouvé.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "Autre",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "Propriétaire",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "Page non trouvée",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message: "La page que vous cherchez n'existe pas ou a été déplacée.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "pagination",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "Précédent",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "Pages connexes",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "Enregistrer",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "Enregistrement...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "Pages connexes",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "Sélectionner une vue",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "Sélectionner une date",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "Paramètres",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "Barre latérale",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "Affiche la barre latérale mobile.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "Étoiles",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "Statut",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "Basculer la barre latérale",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "Réessayer",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message:
      "Une erreur inattendue s'est produite lors du chargement du grand livre.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "Inconnu",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "mise à jour...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "Passer à Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "Mettre à niveau pour débloquer",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "utilisateur@exemple.fr",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "Utilisateur",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "Télécharger",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "Plus d’actions",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "En savoir plus",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "Vue des détails du compte pour {ledgerName}. Analysez les transactions, les soldes et l'historique du compte.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "Posez des questions sur les données financières de {ledgerName} en utilisant l'IA. Analysez les transactions, explorez les soldes des comptes, comprenez les tendances et obtenez des informations comptables instantanées.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "Vue du bilan pour {ledgerName}. Analysez les actifs, les passifs et les capitaux propres à tout moment.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.commodities": {
    message:
      "Affichez et gérez les marchandises (devises, actions et actifs) utilisées dans {ledgerName}. Suivez les taux de change et l'historique des prix.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "Créez un nouveau fichier dans {ledgerName}. Ajoutez des fichiers du grand livre Beancount ou des documents à votre référentiel.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "Affichez les documents joints aux transactions dans {ledgerName}. Consultez les reçus, factures et documentation justificative.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "Vue des erreurs d'analyse et de validation dans {ledgerName}. Corrigez les problèmes pour garantir des rapports financiers précis.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "Affichez les événements et jalons importants dans {ledgerName}. Suivez les ouvertures et fermetures de comptes et les événements du cycle de vie.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "Affichez et modifiez les fichiers sources Beancount dans {ledgerName}. Gérez votre plan comptable et votre historique de transactions.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "Analysez vos participations actuelles et votre portefeuille dans {ledgerName}. Affichez la répartition des actifs, les valeurs marchandes et les gains non réalisés.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "Ajoutez des transactions à {ledgerName} à partir de relevés bancaires, tableurs ou reçus. Compatible avec CSV, PDF, OFX et images jusqu'à 10 Mo.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "Vue des revenus et dépenses pour {ledgerName}. Suivez les revenus, les dépenses et la rentabilité au fil du temps.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "Affichez et filtrez toutes les transactions dans {ledgerName}. Recherchez par date, compte, description ou bénéficiaire.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "Tableau de bord financier pour {ledgerName}. Consultez les soldes des comptes, les tendances de la valeur nette et les récapitulatifs des revenus/dépenses.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "Exécutez des requêtes BQL (Beancount Query Language) sur {ledgerName}. Filtrez et analysez vos données financières avec une syntaxe similaire à SQL.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "Configurez les paramètres pour {ledgerName}. Gérez les devises opérationnelles, les collaborateurs et les paramètres de confidentialité.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "Vue des statistiques du grand livre pour {ledgerName}. Analysez les décomptes de transactions, l'utilisation des comptes et les métriques de qualité des données.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "Vue de la balance de vérification pour {ledgerName}. Vérifiez les débits et crédits dans tous les comptes.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "Téléchargez des fichiers vers {ledgerName}. Importez des fichiers ou documents Beancount existants.",
    description: "Description for upload files page",
  },
  "common.postings": {
    message: "Écritures",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.balanceSheet": {
    message: "Bilan",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.commodities": {
    message: "Marchandises",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "Créer un fichier",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "Documents",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "Erreurs",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "Événements",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "Fichiers",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "Participations",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "Importer",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "Compte de résultat",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "Journal",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "Aperçu",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "Requête",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "Statistiques",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "Balance de vérification",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "Télécharger des fichiers",
    description: "Link label for upload files page",
  },
  "common.relatedLinks.versionHistory": {
    message: "Historique des versions",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "Résultats",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "Lignes",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "Succès",
    description: "Auto-generated from code usage",
  },
  "common.assets": {
    message: "Actifs",
    description: "Assets category in accounting",
  },
  "component.conversionSelect.atCost": {
    message: "Au coût",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "À la valeur de marché",
    description: "Conversion option for market value display",
  },
  "common.reports": {
    message: "Rapports",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "Avancé",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "Aide et assistance",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "Centre d’aide",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "Consultez les guides et la documentation",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "Assistance communautaire",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Posez vos questions à la communauté sur Telegram",
    description: "Description for the community support menu item",
  },
  "common.requestFeature": {
    message: "Proposer une fonctionnalité",
    description: "Menu item linking to the feature request page on GitHub",
  },
  "common.requestFeatureDescription": {
    message: "Partagez vos idées ou signalez des bugs sur GitHub",
    description: "Description for the request a feature menu item",
  },
  "common.balanceSheet": {
    message: "Bilan",
    description: "Navigation label for balance sheet financial report",
  },
  "component.searchControls.clearAll": {
    message: "Effacer all",
    description: "Button text to clear all filters",
  },
  "component.conversionSelect.convertedTo": {
    message: "Converti en",
    description: "Prefix for currency conversion option",
  },
  "component.intervalSelect.daily": {
    message: "Quotidien",
    description: "Daily interval option",
  },
  "common.equity": {
    message: "Capitaux propres",
    description: "Equity category in accounting",
  },
  "component.errorState.title": {
    message: "Erreur lors du chargement des données",
    description: "Error message when data fails to load",
  },
  "common.expenses": {
    message: "Dépenses",
    description: "Expenses category in accounting",
  },
  "component.searchControls.failedToLoad": {
    message: "Échec du chargement des options de filtrage",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.filterByTagPayee": {
    message: "Filtrer par étiquette, bénéficiaire, ...",
    description: "Placeholder for filter input with tags and payees",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Répartition détaillée de {ledgerName} {sectionName} avec valeurs en USD et autres matières premières",
    description: "Description for hierarchy list with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "Liste {sectionName}",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyTitle": {
    message: "Hiérarchie {sectionName}",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message:
      "Représentation visuelle de la composition de {ledgerName} {sectionName}",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "common.income": {
    message: "Revenus",
    description: "Income category in accounting",
  },
  "common.incomeStatement": {
    message: "Compte de résultat",
    description: "Navigation label for income statement financial report",
  },
  "common.liabilities": {
    message: "Passifs",
    description: "Liabilities category in accounting",
  },
  "common.netProfit": {
    message: "Bénéfice net",
    description: "Label for net profit section",
  },
  "common.netWorth": {
    message: "Patrimoine net",
    description: "Label for net worth section",
  },
  "component.accountCombobox.noAccountsFound": {
    message: "Aucun compte trouvé",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "Rechercher des fichiers...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "Aucun fichier trouvé",
    description: "Message when no ledger files match search",
  },
  "component.emptyState.title": {
    message: "Aucune donnée disponible",
    description: "Title when no data is available",
  },
  "component.emptyState.noDataForFilters": {
    message: "Aucune donnée pour les filtres sélectionnés",
    description: "Auto-generated from code usage",
  },
  "component.combobox.noMatchesFound": {
    message: "Aucune correspondance trouvée",
    description: "Message when search returns no results in combobox",
  },
  "common.overview": {
    message: "Vue d'ensemble",
    description: "Navigation label for overview/dashboard page",
  },
  "component.errorState.retry": {
    message: "Veuillez réessayer plus tard",
    description: "Generic retry message",
  },
  "component.intervalSelect.quarterly": {
    message: "Trimestriel",
    description: "Quarterly interval option",
  },
  "component.accountCombobox.placeholder": {
    message: "Rechercher des comptes...",
    description: "Placeholder for account search",
  },
  "component.conversionSelect.placeholder": {
    message: "Sélectionner la conversion",
    description: "Placeholder for conversion select dropdown",
  },
  "component.intervalSelect.placeholder": {
    message: "Sélectionner la période",
    description: "Placeholder for interval select dropdown",
  },
  "component.searchControls.time": {
    message: "Période",
    description: "Placeholder for time filter",
  },
  "common.trialBalance": {
    message: "Balance de vérification",
    description: "Navigation label for trial balance report",
  },
  "component.combobox.placeholder": {
    message: "Tapez pour rechercher...",
    description: "Placeholder for search input in filter combobox",
  },
  "component.conversionSelect.units": {
    message: "Unités",
    description: "Conversion option for unit display",
  },
  "component.intervalSelect.yearly": {
    message: "Annuel",
    description: "Yearly interval option",
  },
  "component.searchControls.account": {
    message: "Compte",
    description: "Placeholder for account filter",
  },
  "common.error": {
    message: "Erreur",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "Session Expirée",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message:
      "Votre session de connexion a expiré. Veuillez vous reconnecter pour continuer.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "Veuillez vous connecter pour continuer.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "Vous n'avez pas la permission d'effectuer cette action.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "La ressource demandée est introuvable.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "Certaines informations fournies ne sont pas valides. Veuillez les vérifier et réessayer.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message:
      "La validation a échoué. Veuillez vérifier vos informations et réessayer.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "Cette modification est en conflit avec l'état actuel. Veuillez actualiser la page et réessayer.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "Trop de requêtes. Veuillez patienter un instant et réessayer.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message:
      "Une erreur s'est produite de notre côté. Veuillez réessayer plus tard.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message:
      "Le service est temporairement indisponible. Veuillez réessayer sous peu.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message:
      "Vous avez atteint la limite de votre forfait. Passez à un forfait supérieur pour continuer.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "Cette action n'est pas autorisée.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "Cette fonctionnalité nécessite un abonnement Premium.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "Problème de connexion. Vérifiez votre connexion internet et réessayez.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "Une erreur s'est produite. Veuillez réessayer.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "Une erreur s'est produite",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "Cette section n'a pas pu être affichée. Le reste de la page devrait continuer à fonctionner.",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "Copier le code",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "Copié dans le presse-papiers",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "Échec de la copie",
    description: "Toast when copying to the clipboard failed",
  },
};

export default frCommon;
