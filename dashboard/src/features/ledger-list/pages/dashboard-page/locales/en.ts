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
  "page.dashboard.goToDashboard": {
    message: "Go to dashboard",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
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
  "page.dashboard.failedToLoadLedgers": {
    message: "Failed to Load Ledgers",
    description: "Error title when ledgers fail to load",
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
  "page.dashboard.ledgerSettingsFor": {
    message: "Settings for {ledger}",
    description:
      "Accessible name and tooltip for a ledger's settings menu; {ledger} is its displayed name",
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
  "page.dashboard.nameMaxLength": {
    message: "Name must be less than 100 characters",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Name is required",
    description: "Validation error when name is missing",
  },
  "page.dashboard.presetPersonal": {
    message: "Personal ledger",
    description: "Name of the personal setup preset",
  },
  "page.dashboard.presetPersonalOutcome": {
    message: "Record a purchase and understand its effect on money remaining.",
    description: "Outcome of the personal setup preset",
  },
  "page.dashboard.presetFreelance": {
    message: "Freelance ledger",
    description: "Name of the freelance setup preset",
  },
  "page.dashboard.presetFreelanceOutcome": {
    message:
      "Record customer income or see what an unpaid customer still owes.",
    description: "Outcome of the freelance setup preset",
  },
  "page.dashboard.presetBusiness": {
    message: "Business ledger",
    description: "Name of the business setup preset",
  },
  "page.dashboard.presetBusinessOutcome": {
    message:
      "Establish an opening position and distinguish funding from revenue.",
    description: "Outcome of the business setup preset",
  },
  "page.dashboard.presetPortfolio": {
    message: "Portfolio ledger",
    description: "Name of the portfolio setup preset",
  },
  "page.dashboard.presetPortfolioOutcome": {
    message:
      "Record a purchase and verify units, acquisition records, and cash movement.",
    description: "Outcome of the portfolio setup preset",
  },
  "page.dashboard.presetRental": {
    message: "Rental ledger",
    description: "Name of the rental setup preset",
  },
  "page.dashboard.presetRentalOutcome": {
    message: "Record receipts and distinguish rent from a refundable deposit.",
    description: "Outcome of the rental setup preset",
  },
  "page.dashboard.presetShared": {
    message: "Shared expenses ledger",
    description: "Name of the shared expenses setup preset",
  },
  "page.dashboard.presetSharedOutcome": {
    message: "Record an advance and see who owes whom.",
    description: "Outcome of the shared expenses setup preset",
  },
  "page.dashboard.presetCommunity": {
    message: "Community ledger",
    description: "Name of the community setup preset",
  },
  "page.dashboard.presetCommunityOutcome": {
    message: "Explain contributions, project spending, and funds remaining.",
    description: "Outcome of the community setup preset",
  },
  "page.dashboard.presetBlank": {
    message: "Blank ledger",
    description: "Name of the blank setup preset",
  },
  "page.dashboard.presetBlankOutcome": {
    message: "Add a chosen structure without removing unwanted categories.",
    description: "Outcome of the blank setup preset",
  },
  "page.dashboard.setupAmountInvalid": {
    message: "Enter an amount like 100 or -30.50",
    description: "Validation error for the opening balance amount",
  },
  "page.dashboard.setupCurrency": {
    message: "Operating currency",
    description: "Label for the currency field in staged ledger creation",
  },
  "page.dashboard.setupHistoryStart": {
    message: "Books begin",
    description: "Label for the history start date in staged ledger creation",
  },
  "page.dashboard.setupOpeningAccount": {
    message: "Opening account",
    description: "Label for the first account in staged ledger creation",
  },
  "page.dashboard.setupOpeningAmount": {
    message: "Opening balance (optional)",
    description: "Label for the optional opening balance in staged creation",
  },
  "page.dashboard.setupOpeningNone": {
    message: "Decide later",
    description: "Choice to skip the opening balance in staged creation",
  },
  "page.dashboard.setupReview": {
    message: "Review",
    description: "Heading for the review step in staged ledger creation",
  },
  "page.dashboard.setupReviewDescription": {
    message:
      "This is exactly what will be created. Go back to change anything.",
    description: "Description for the review step in staged ledger creation",
  },
  "page.dashboard.setupAccounts": {
    message: "Accounts",
    description: "Label for the account list in the creation review step",
  },
  "page.dashboard.setupStep": {
    message: "Step {step} of {total}",
    description: "Progress label in staged ledger creation",
  },
  "page.dashboard.nameInvalid": {
    message:
      "Use at least one Latin letter (A–Z) or digit: the name becomes the ledger's web address.",
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
  "page.dashboard.noLedgersDescription": {
    message: "Create your first ledger to start tracking your finances.",
    description:
      "Empty state description prompting the user to create their first ledger",
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
    description: "Accessible name for the ledger selection dialog",
  },
  "page.dashboard.switchLedgerFrom": {
    message: "{ledger} — switch ledger",
    description:
      "Accessible name for the ledger switcher, starting with the visible ledger name ({ledger})",
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
  "page.dashboard.feedError": {
    message: "Failed to load feed",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.showMore": {
    message: "Show More",
    description: "Button text to load more feed items",
  },
  "page.dashboard.activity": {
    message: "Activity",
    description:
      "Heading of the user's ledger activity feed on the dashboard home",
  },
  "page.dashboard.activityEmpty": {
    message: "Commits to your ledgers show up here.",
    description:
      "Empty state of the activity feed when the user has no ledger commits yet",
  },
  "page.dashboard.activityDescription": {
    message: "Commits across every ledger you can see",
    description: "Description under the Activity heading on the dashboard home",
  },
  "page.dashboard.activityRefreshFailed": {
    message: "Couldn't refresh activity. Showing what loaded earlier.",
    description:
      "Notice above the activity cards when refreshing them failed; the cards shown are from an earlier load",
  },
};

export default enDashboardPage;
