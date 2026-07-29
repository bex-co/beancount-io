export interface TranslationEntry {
  message: string;
  description: string;
}

const frDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "Dernières Mises à Jour",
    description: "Title for blog feed section on dashboard",
  },
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
  "page.dashboard.failedToCreateLedger": {
    message: "Échec de la création du grand livre",
    description: "Error message when ledger creation fails",
  },
  "page.dashboard.failedToDeleteLedger": {
    message: "Échec de la suppression du grand livre",
    description: "Error message when ledger deletion fails",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Échec du chargement des grands livres",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.failedToLoadLedgersDescription": {
    message:
      "Nous n'avons pas pu récupérer vos grands livres. Veuillez vérifier votre connexion et réessayer.",
    description: "Detailed error description for ledger loading failure",
  },
  "page.dashboard.failedToUpdateLedger": {
    message: "Échec de la mise à jour du grand livre",
    description: "Error message when ledger update fails",
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
  "page.dashboard.manageLedgersDescription": {
    message:
      "Gérez vos grands livres Beancount. Cliquez sur un grand livre pour voir ses détails.",
    description: "Detailed description with click instruction",
  },
  "page.dashboard.nameInvalid": {
    message: "Le nom doit contenir au moins une lettre ou un chiffre",
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
  "page.dashboard.noFeedItems": {
    message: "Aucun élément de flux disponible",
    description: "Empty state message when no feed items exist",
  },
  "page.dashboard.noLedgersFound": {
    message: "Aucun grand livre trouvé",
    description: "Message when user has no ledgers",
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
    description: "Aria label for ledger switcher button",
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
};

export default frDashboardPage;
