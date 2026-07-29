export interface TranslationEntry {
  message: string;
  description: string;
}

const enDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.createLedger": {
    message: "Create Ledger",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Create New Ledger",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message: "Create a new Beancount ledger to start managing your finances.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "Dashboard",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.deleteLedger": {
    message: "Delete Ledger",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Are you sure you want to delete "{name}"? This action cannot be undone.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Deleting...",
    description: "Button state while deleting",
  },
  "page.dashboard.descriptionOptional": {
    message: "Description (Optional)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Edit Ledger",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Edit Ledger Settings",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Enter description",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Enter ledger name",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToCreateLedger": {
    message: "Failed to create ledger",
    description: "Error message when ledger creation fails",
  },
  "page.dashboard.failedToDeleteLedger": {
    message: "Failed to delete ledger",
    description: "Error message when ledger deletion fails",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Failed to Load Ledgers",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.failedToLoadLedgersDescription": {
    message:
      "We couldn't retrieve your ledgers. Please check your connection and try again.",
    description: "Detailed error description for ledger loading failure",
  },
  "page.dashboard.failedToUpdateLedger": {
    message: "Failed to update ledger",
    description: "Error message when ledger update fails",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Ledger created successfully",
    description: "Toast notification when ledger created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Ledger deleted successfully",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerName": {
    message: "Ledger Name",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Ledger updated successfully",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Loading ledgers...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Manage your Beancount ledgers",
    description: "Description of ledger management",
  },
  "page.dashboard.manageLedgersDescription": {
    message:
      "Manage your Beancount ledgers. Click on a ledger to view its details.",
    description: "Detailed description with click instruction",
  },
  "page.dashboard.nameMaxLength": {
    message: "Name must be less than 100 characters",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Name is required",
    description: "Validation error when name is missing",
  },
  "page.dashboard.nameInvalid": {
    message: "Name must contain at least one letter or number",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.repositoryName": {
    message: "Repository name",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.noLedgersFound": {
    message: "No ledgers found",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.private": {
    message: "Private",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Only you and collaborators can access",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Public",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "Anyone with the link can view your financial data",
    description: "Warning about public access level",
  },
  "page.dashboard.retry": {
    message: "Retry",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Search ledgers...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Select a ledger",
    description: "Aria label for ledger switcher button",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Update the details of your ledger.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Your Ledgers",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Go to {owner}'s account",
    description: "Tooltip for navigating to owner's account page",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "You've reached your ledger limit. Upgrade to create more ledgers.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.blogFeed": {
    message: "Latest Updates",
    description: "Title for blog feed section on dashboard",
  },
  "page.dashboard.feedError": {
    message: "Failed to load feed",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.noFeedItems": {
    message: "No feed items available",
    description: "Empty state message when no feed items exist",
  },
  "page.dashboard.showMore": {
    message: "Show More",
    description: "Button text to load more feed items",
  },
};

export default enDashboardPage;
