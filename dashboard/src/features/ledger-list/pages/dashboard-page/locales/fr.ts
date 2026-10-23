export interface TranslationEntry {
  message: string;
  description: string;
}

const frDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "Créer un grand livre",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Créer un nouveau grand livre",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message:
      "Créez un nouveau grand livre Beancount pour commencer à gérer vos finances.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "Tableau de bord",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "Aller au tableau de bord",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "Supprimer le grand livre",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Êtes-vous sûr de vouloir supprimer "{name}" ? Cette action ne peut pas être annulée.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Suppression en cours...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "Description (Facultatif)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Modifier le grand livre",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Modifier les paramètres du grand livre",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Saisir la description",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Saisir le nom du grand livre",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Échec du chargement des grands livres",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.feedError": {
    message: "Échec du chargement du flux",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Grand livre créé avec succès",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Grand livre supprimé avec succès",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "Vous avez atteint votre limite de grand livre. Mettez à niveau pour créer plus de grands livres.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Nom du grand livre",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerSettingsFor": {
    message: "Paramètres de {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Grand livre mis à jour avec succès",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Chargement des grands livres...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Gérer vos grands livres Beancount",
    description: "Description of ledger management",
  },
  "page.dashboard.nameInvalid": {
    message:
      "Utilisez au moins une lettre latine (A–Z) ou un chiffre : le nom devient l'adresse web du registre.",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "Le nom doit contenir moins de 100 caractères",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Le nom est requis",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "Livre personnel",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message:
      "Enregistrez un achat et comprenez son effet sur l'argent restant.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "Livre de freelance",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "Enregistrez des revenus clients ou voyez ce qu'un client impayé doit encore.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "Livre d'entreprise",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message:
      "Établissez une position d'ouverture et distinguez financement et revenu.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "Livre de portefeuille",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message:
      "Enregistrez un achat et vérifiez quantités, acquisitions et mouvements de trésorerie.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "Livre de location",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message:
      "Enregistrez les reçus et distinguez le loyer d'un dépôt remboursable.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "Livre de dépenses partagées",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "Enregistrez une avance et voyez qui doit à qui.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "Livre de communauté",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "Expliquez contributions, dépenses de projets et fonds restants.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "Livre vierge",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message:
      "Ajoutez une structure choisie sans supprimer de catégories indésirables.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "Saisissez un montant comme 100 ou -30.50",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "Devise de fonctionnement",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "Les livres commencent le",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "Compte d'ouverture",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "Solde d'ouverture (facultatif)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "Décider plus tard",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "Vérifier",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message:
      "Voici exactement ce qui sera créé. Revenez en arrière pour modifier.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "Comptes",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "Étape {step} sur {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.noLedgersFound": {
    message: "Aucun grand livre trouvé",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message:
      "Créez votre premier grand livre pour commencer à suivre vos finances.",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "Privé",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Seuls vous et les collaborateurs pouvez accéder",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Public",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message:
      "Toute personne disposant du lien peut consulter vos données financières",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "Nom du référentiel",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "Réessayer",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Rechercher des grands livres...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Sélectionner un grand livre",
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — changer de grand livre",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
  },
  "page.dashboard.showMore": {
    message: "Afficher Plus",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Mettre à jour les détails de votre grand livre.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Vos grands livres",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Aller au compte de {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.activity": {
    message: "Activité",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "Les modifications de vos livres apparaissent ici.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "Modifications dans tous les livres que vous pouvez voir",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message:
      "Impossible d'actualiser l'activité. Affichage de celle chargée précédemment.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default frDashboardPage;
