export interface TranslationEntry {
  message: string;
  description: string;
}

const enCommon: Record<string, TranslationEntry> = {
  "common.accountColumn": {
    message: "Account",
    description: "Table column header for account names",
  },
  "common.actions": {
    message: "Actions",
    description: "Plural form of actions",
  },
  "common.back": {
    message: "Back",
    description: "Button label to go back to previous page",
  },
  "common.beancountLogo": {
    message: "Beancount Logo",
    description: "Alt text for Beancount logo",
  },
  "common.cancel": {
    message: "Cancel",
    description: "Button label to cancel action",
  },
  "common.clearInput": {
    message: "Clear",
    description: "Aria label for clear input button",
  },
  "common.closeDialog": {
    message: "Close",
    description: "Screen reader label for close dialog button",
  },
  "common.collaboratorsLimit": {
    message: "Collaborator Limit",
    description: "Title for collaborator limit information",
  },
  "common.collaboratorsLimitReached": {
    message: "Collaborator Limit Reached",
    description: "Title when collaborator limit is reached",
  },
  "common.copied": {
    message: "Copied",
    description: "Status message indicating content was copied",
  },
  "common.copy": {
    message: "Copy",
    description: "Button label to copy content",
  },
  "common.delete": {
    message: "Delete",
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
    message: "Edit",
    description: "Button label to edit item",
  },
  "common.errorDescription": {
    message:
      "We encountered an unexpected error. Please try again or go back to the previous page.",
    description: "Error page description",
  },
  "common.errorDetails": {
    message: "Error Details",
    description: "Label for expandable error details section",
  },
  "common.errorOccurred": {
    message: "An error occurred",
    description: "Generic error message for error pages",
  },
  "common.errorTitle": {
    message: "Something went wrong",
    description: "Error page title",
  },
  "common.failedToLoadData": {
    message: "Failed to Load Data",
    description: "Error title when data fails to load",
  },
  "common.failedToLoadLedger": {
    message: "Failed to Load Ledger",
    description: "Error title when ledger fails to load",
  },
  "common.goBack": {
    message: "Go Back",
    description: "Button text to go back to previous page",
  },
  "common.goHome": {
    message: "Go Home",
    description: "Button text to return to home page",
  },
  "common.goToNextPage": {
    message: "Go to next page",
    description: "Aria label for next page button",
  },
  "common.goToPreviousPage": {
    message: "Go to previous page",
    description: "Aria label for previous page button",
  },
  "common.import": {
    message: "Import",
    description: "Label for import dropdown button",
  },
  "common.manualImport": {
    message: "Add an entry",
    description: "Label for add entry menu item (opens new entry dialog)",
  },
  "common.manualImportDesc": {
    message: "Transaction, balance, or note",
    description: "Description for add entry menu item",
  },
  "common.smartImport": {
    message: "Smart Import",
    description: "Label for smart import menu item (navigates to import page)",
  },
  "common.smartImportDesc": {
    message: "Bank statements, CSV, PDF, or scans",
    description: "Description for smart import menu item",
  },
  "common.linkImport": {
    message: "Connect Bank",
    description:
      "Label for link account menu item (navigates to Plaid bank linking page)",
  },
  "common.linkImportDesc": {
    message: "Automatically sync transactions",
    description:
      "Description for link account menu item, emphasizing automatic sync via Plaid vs. manual/file import",
  },
  "common.uploadReceipt": {
    message: "Upload Receipt",
    description:
      "Label for upload receipt menu item (navigates to receipt page)",
  },
  "common.uploadReceiptDesc": {
    message: "Scan receipt image or PDF with AI",
    description: "Description for upload receipt menu item",
  },
  "common.invalidParameters": {
    message: "Invalid URL Parameters",
    description: "Title for validation error page",
  },
  "common.invalidParametersDescription": {
    message:
      "The URL parameters provided are not valid. Please check the link and try again.",
    description: "Description for validation error page",
  },
  "common.lastUpdated": {
    message: "Last Updated",
    description: "Table column header for last update time",
  },
  "common.ledgerSettings": {
    message: "Ledger Settings",
    description:
      "Navigation label for ledger-specific settings page in sidebar",
  },
  "common.ledgersLimit": {
    message: "Ledger Limit",
    description: "Title for ledger limit information",
  },
  "common.ledgersLimitReached": {
    message: "Ledger Limit Reached",
    description: "Title when ledger limit is reached",
  },
  "common.loading": {
    message: "loading...",
    description: "Loading state message",
  },
  "common.loadingData": {
    message: "Loading data...",
    description: "Generic loading state message",
  },
  "common.morePages": {
    message: "More pages",
    description: "Screen reader label for pagination ellipsis",
  },
  "common.name": {
    message: "Name",
    description: "Table column header for name",
  },
  "common.nearLimit": {
    message: "near limit",
    description: "Indicator that user is close to their limit",
  },
  "common.networkConnectionFailed": {
    message: "Network Connection Failed",
    description: "Error title when network connection fails",
  },
  "common.networkErrorDescription": {
    message:
      "Unable to connect to the server. Please check your internet connection and try again.",
    description: "Detailed description of network error",
  },
  "common.next": {
    message: "Next",
    description: "Button label to proceed to next step",
  },
  "common.nextPage": {
    message: "Next",
    description: "Text label for next page button",
  },
  "common.noDataFound": {
    message: "No data found.",
    description: "Message when no data is available",
  },
  "common.noResultsFound": {
    message: "No results found.",
    description: "Message when search returns no results",
  },
  "common.otherColumn": {
    message: "Other",
    description: "Table column header for other currencies/amounts",
  },
  "common.owner": {
    message: "Owner",
    description: "Table column header for owner",
  },
  "common.pageNotFound": {
    message: "Page not found",
    description: "Title for 404 page",
  },
  "common.pageNotFoundDescription": {
    message:
      "The page you're looking for doesn't exist or has been moved to a different location.",
    description: "Description for 404 page",
  },
  "common.paginationNav": {
    message: "pagination",
    description: "Aria label for pagination navigation",
  },
  "common.previous": {
    message: "Previous",
    description: "Text label for previous page button",
  },
  "common.relatedPages": {
    message: "Related pages",
    description: "Aria label for related pages navigation",
  },
  "common.save": {
    message: "Save",
    description: "Button label to save changes",
  },
  "common.saving": {
    message: "Saving...",
    description: "Saving state message",
  },
  "common.seeAlso": {
    message: "Related Pages",
    description: "Heading for related pages navigation section",
  },
  "common.selectAView": {
    message: "Select a view",
    description: "Placeholder for responsive tab trigger",
  },
  "common.selectDate": {
    message: "Select date",
    description: "Screen reader label for date picker button",
  },
  "common.settings": {
    message: "Settings",
    description: "Navigation label for settings page",
  },
  "common.sidebar": {
    message: "Sidebar",
    description: "Title for sidebar",
  },
  "common.sidebarDescription": {
    message: "Displays the mobile sidebar.",
    description: "Description of mobile sidebar for screen readers",
  },
  "common.stars": {
    message: "Stars",
    description: "Navigation label for starred ledgers page",
  },
  "common.status": {
    message: "Status",
    description: "Table column header for status",
  },
  "common.toggleSidebar": {
    message: "Toggle Sidebar",
    description: "Tooltip for toggle sidebar button",
  },
  "common.tryAgain": {
    message: "Try Again",
    description: "Button to retry failed action",
  },
  "common.unexpectedError": {
    message: "An unexpected error occurred while loading the ledger.",
    description: "Generic unexpected error message",
  },
  "common.unknown": {
    message: "Unknown",
    description: "Placeholder for unknown or missing values",
  },
  "common.updating": {
    message: "updating...",
    description: "Updating state message",
  },
  "common.upgradeToPro": {
    message: "Upgrade to Pro",
    description:
      "Short CTA button shown in the sidebar directive-usage indicator once a ledger is approaching or over its free-tier directive limit",
  },
  "common.upgradeToUnlock": {
    message: "Upgrade to unlock",
    description: "Button text to upgrade subscription",
  },
  "common.userEmailFallback": {
    message: "user@example.com",
    description: "Fallback email when user email is not available",
  },
  "common.userFallback": {
    message: "User",
    description: "Fallback username when user data is not available",
  },
  "common.download": {
    message: "Download",
    description: "Auto-generated from code usage",
  },
  "common.moreActions": {
    message: "More actions",
    description: "Label for dropdown menu with additional actions",
  },
  "common.learnMore": {
    message: "Learn more",
    description: "Link text to learn more about a topic",
  },
  "common.pageDescription.account": {
    message:
      "View detailed account information for {ledgerName}. Analyze transactions, balances, and account history.",
    description: "Description for account page",
  },
  "common.pageDescription.ask": {
    message:
      "Ask questions about {ledgerName} financial data using AI. Analyze transactions, explore account balances, understand trends, and get instant accounting insights.",
    description: "Description for AI ask page",
  },
  "common.pageDescription.balanceSheet": {
    message:
      "View the balance sheet for {ledgerName}. Analyze assets, liabilities, and equity at any point in time.",
    description: "Description for balance sheet page",
  },
  "common.pageDescription.commodities": {
    message:
      "View and manage commodities (currencies, stocks, and assets) used in {ledgerName}. Track exchange rates and price history.",
    description: "Description for commodities page",
  },
  "common.pageDescription.createFile": {
    message:
      "Create a new file in {ledgerName}. Add Beancount ledger files or documents to your repository.",
    description: "Description for create file page",
  },
  "common.pageDescription.documents": {
    message:
      "Browse documents attached to transactions in {ledgerName}. View receipts, invoices, and supporting documentation.",
    description: "Description for documents page",
  },
  "common.pageDescription.errors": {
    message:
      "View parsing and validation errors in {ledgerName}. Fix issues to ensure accurate financial reports.",
    description: "Description for errors page",
  },
  "common.pageDescription.events": {
    message:
      "View important events and milestones in {ledgerName}. Track account openings, closings, and lifecycle events.",
    description: "Description for events page",
  },
  "common.pageDescription.files": {
    message:
      "Browse and edit Beancount source files in {ledgerName}. Manage your chart of accounts and transaction history.",
    description: "Description for files page",
  },
  "common.pageDescription.holdings": {
    message:
      "Analyze your current holdings and portfolio in {ledgerName}. View asset allocation, market values, and unrealized gains.",
    description: "Description for holdings page",
  },
  "common.pageDescription.import": {
    message:
      "Add transactions to {ledgerName} from bank statements, spreadsheets, or receipts. Supports CSV, PDF, OFX, and image files up to 10 MB.",
    description: "Description for import page",
  },
  "common.pageDescription.incomeStatement": {
    message:
      "View income and expenses for {ledgerName}. Track revenue, costs, and profitability over time.",
    description: "Description for income statement page",
  },
  "common.pageDescription.journal": {
    message:
      "Browse and filter all transactions in {ledgerName}. Search by date, account, narration, or payee.",
    description: "Description for journal page",
  },
  "common.pageDescription.overview": {
    message:
      "Financial dashboard for {ledgerName}. View account balances, net worth trends, and income/expense summaries.",
    description: "Description for overview page",
  },
  "common.pageDescription.query": {
    message:
      "Run BQL (Beancount Query Language) queries on {ledgerName}. Filter and analyze your financial data with SQL-like syntax.",
    description: "Description for query page",
  },
  "common.pageDescription.settings": {
    message:
      "Configure settings for {ledgerName}. Manage operating currencies, collaborators, and privacy settings.",
    description: "Description for settings page",
  },
  "common.pageDescription.statistics": {
    message:
      "View ledger statistics for {ledgerName}. Analyze transaction counts, account usage, and data quality metrics.",
    description: "Description for statistics page",
  },
  "common.pageDescription.trialBalance": {
    message:
      "View the trial balance for {ledgerName}. Verify that debits equal credits across all accounts.",
    description: "Description for trial balance page",
  },
  "common.pageDescription.uploadFiles": {
    message:
      "Upload files to {ledgerName}. Import existing Beancount files or documents.",
    description: "Description for upload files page",
  },
  "common.postings": {
    message: "Postings",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.balanceSheet": {
    message: "Balance Sheet",
    description: "Link label for balance sheet page",
  },
  "common.relatedLinks.commodities": {
    message: "Commodities",
    description: "Link label for commodities page",
  },
  "common.relatedLinks.createFile": {
    message: "Create File",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.documents": {
    message: "Documents",
    description: "Link label for documents page",
  },
  "common.relatedLinks.errors": {
    message: "Errors",
    description: "Link label for errors page",
  },
  "common.relatedLinks.events": {
    message: "Events",
    description: "Link label for events page",
  },
  "common.relatedLinks.files": {
    message: "Files",
    description: "Link label for files page",
  },
  "common.relatedLinks.holdings": {
    message: "Holdings",
    description: "Link label for holdings page",
  },
  "common.relatedLinks.import": {
    message: "Import",
    description: "Link label for import page",
  },
  "common.relatedLinks.incomeStatement": {
    message: "Income Statement",
    description: "Link label for income statement page",
  },
  "common.relatedLinks.journal": {
    message: "Journal",
    description: "Link label for journal page",
  },
  "common.relatedLinks.overview": {
    message: "Overview",
    description: "Link label for overview page",
  },
  "common.relatedLinks.query": {
    message: "Query",
    description: "Link label for query page",
  },
  "common.relatedLinks.statistics": {
    message: "Statistics",
    description: "Link label for statistics page",
  },
  "common.relatedLinks.trialBalance": {
    message: "Trial Balance",
    description: "Link label for trial balance page",
  },
  "common.relatedLinks.uploadFiles": {
    message: "Upload Files",
    description: "Auto-generated from code usage",
  },
  "common.relatedLinks.versionHistory": {
    message: "Version History",
    description: "Link label for version history page",
  },
  "common.results": {
    message: "Results",
    description: "Auto-generated from code usage",
  },
  "common.rows": {
    message: "Rows",
    description: "Auto-generated from code usage",
  },
  "common.success": {
    message: "Success",
    description: "Auto-generated from code usage",
  },
  // Accounting domain terms
  "common.assets": {
    message: "Assets",
    description: "Assets category in accounting",
  },
  "common.liabilities": {
    message: "Liabilities",
    description: "Liabilities category in accounting",
  },
  "common.income": {
    message: "Income",
    description: "Income category in accounting",
  },
  "common.expenses": {
    message: "Expenses",
    description: "Expenses category in accounting",
  },
  "common.equity": {
    message: "Equity",
    description: "Equity category in accounting",
  },
  "common.netWorth": {
    message: "Net Worth",
    description: "Label for net worth section",
  },
  "common.netProfit": {
    message: "Net Profit",
    description: "Label for net profit section",
  },
  "common.overview": {
    message: "Overview",
    description: "Navigation label for overview/dashboard page",
  },
  "common.reports": {
    message: "Reports",
    description: "Navigation group label for financial reports",
  },
  "common.advanced": {
    message: "Advanced",
    description: "Navigation group label for advanced ledger tools",
  },
  "common.helpAndSupport": {
    message: "Help and support",
    description: "Accessible label for the help and support menu",
  },
  "common.helpCenter": {
    message: "Help Center",
    description: "Menu item linking to product documentation",
  },
  "common.helpCenterDescription": {
    message: "Browse guides and documentation",
    description: "Description for the help center menu item",
  },
  "common.communitySupport": {
    message: "Community Support",
    description: "Menu item linking to the community support channel",
  },
  "common.communitySupportDescription": {
    message: "Ask the community on Telegram",
    description: "Description for the community support menu item",
  },
  "common.balanceSheet": {
    message: "Balance Sheet",
    description: "Navigation label for balance sheet financial report",
  },
  "common.incomeStatement": {
    message: "Income Statement",
    description: "Navigation label for income statement financial report",
  },
  "common.trialBalance": {
    message: "Trial Balance",
    description: "Navigation label for trial balance report",
  },
  // component.intervalSelect — interval-select.tsx
  "component.intervalSelect.placeholder": {
    message: "Select time period",
    description: "Placeholder for interval select dropdown",
  },
  "component.intervalSelect.yearly": {
    message: "Yearly",
    description: "Yearly interval option",
  },
  "component.intervalSelect.quarterly": {
    message: "Quarterly",
    description: "Quarterly interval option",
  },
  "component.intervalSelect.daily": {
    message: "Daily",
    description: "Daily interval option",
  },
  // component.conversionSelect — conversion-select.tsx
  "component.conversionSelect.placeholder": {
    message: "Select conversion",
    description: "Placeholder for conversion select dropdown",
  },
  "component.conversionSelect.atCost": {
    message: "At Cost",
    description: "Conversion option for cost-based display",
  },
  "component.conversionSelect.atMarketValue": {
    message: "At Market Value",
    description: "Conversion option for market value display",
  },
  "component.conversionSelect.units": {
    message: "Units",
    description: "Conversion option for unit display",
  },
  "component.conversionSelect.convertedTo": {
    message: "Converted to",
    description: "Prefix for currency conversion option",
  },
  // component.errorState / component.emptyState — state-components.tsx
  "component.errorState.title": {
    message: "Error loading data",
    description: "Default title for error state component",
  },
  "component.errorState.retry": {
    message: "Please try again later",
    description: "Default retry message for error state component",
  },
  "component.emptyState.title": {
    message: "No Data Available",
    description: "Default title for empty state component",
  },
  "component.emptyState.noDataForFilters": {
    message: "No Data For Selected Filters",
    description: "Empty state message when filters return no results",
  },
  // component.combobox — ui/combobox.tsx
  "component.combobox.placeholder": {
    message: "Type to search...",
    description: "Placeholder for search input in combobox",
  },
  "component.combobox.noMatchesFound": {
    message: "No matches found",
    description: "Message when search returns no results in combobox",
  },
  // component.searchControls — ledger-search-controls/
  "component.searchControls.failedToLoad": {
    message: "Failed to load filter options",
    description: "Error message when filter options fail to load",
  },
  "component.searchControls.clearAll": {
    message: "Clear all",
    description: "Button text to clear all filters",
  },
  "component.searchControls.time": {
    message: "Time",
    description: "Placeholder for time filter",
  },
  "component.searchControls.account": {
    message: "Account",
    description: "Placeholder for account filter",
  },
  "component.searchControls.filterByTagPayee": {
    message: "Filter by tag, payee, ...",
    description: "Placeholder for filter input with tags and payees",
  },
  // component.accountCombobox — account-combobox.tsx + go-to-account.tsx
  "component.accountCombobox.noAccountsFound": {
    message: "No accounts found",
    description: "Message when no accounts match search",
  },
  "component.sourceFileCombobox.placeholder": {
    message: "Search files...",
    description: "Placeholder for ledger file search",
  },
  "component.sourceFileCombobox.noFilesFound": {
    message: "No files found",
    description: "Message when no ledger files match search",
  },
  "component.accountCombobox.placeholder": {
    message: "Search accounts...",
    description: "Placeholder for account search",
  },
  // Shared across report pages
  "page.reports.hierarchyTitle": {
    message: "{sectionName} Hierarchy",
    description:
      "Title for hierarchy visualization card with dynamic section name",
  },
  "page.reports.hierarchyListTitle": {
    message: "{sectionName} List",
    description: "Title for hierarchy list card with dynamic section name",
  },
  "page.reports.hierarchyVisualizationDescription": {
    message: "Visual representation of {ledgerName} {sectionName} composition",
    description:
      "Description for hierarchy visualization with dynamic section name",
  },
  "page.reports.hierarchyListDescription": {
    message:
      "Detailed breakdown of {ledgerName} {sectionName} with USD and other commodity values",
    description: "Description for hierarchy list with dynamic section name",
  },
  "common.error": {
    message: "Error",
    description: "Generic error label",
  },
  "common.sessionExpiredTitle": {
    message: "Session Expired",
    description:
      "Title shown when a page load fails because the auth session expired",
  },
  "common.sessionExpiredDescription": {
    message: "Your login session has expired. Please log in again to continue.",
    description:
      "Description shown when a page load fails because the auth session expired",
  },
  "common.errors.unauthenticated": {
    message: "Please sign in to continue.",
    description: "Error shown when the user must sign in (UNAUTHENTICATED)",
  },
  "common.errors.forbidden": {
    message: "You don't have permission to perform this action.",
    description: "Error shown when the user lacks permission (FORBIDDEN)",
  },
  "common.errors.notFound": {
    message: "The requested resource could not be found.",
    description: "Error shown when a resource does not exist (NOT_FOUND)",
  },
  "common.errors.badUserInput": {
    message:
      "Some of the information provided is invalid. Please check and try again.",
    description: "Error shown for invalid client input (BAD_USER_INPUT)",
  },
  "common.errors.validationFailed": {
    message: "Validation failed. Please review your input and try again.",
    description: "Error shown when input validation fails (VALIDATION_FAILED)",
  },
  "common.errors.conflict": {
    message:
      "This change conflicts with the current state. Please refresh and try again.",
    description:
      "Error shown when a change conflicts with current state (CONFLICT)",
  },
  "common.errors.rateLimited": {
    message: "Too many requests. Please wait a moment and try again.",
    description: "Error shown when the user is rate limited (RATE_LIMITED)",
  },
  "common.errors.internal": {
    message: "Something went wrong on our end. Please try again later.",
    description:
      "Error shown for unexpected server errors (INTERNAL_SERVER_ERROR)",
  },
  "common.errors.serviceUnavailable": {
    message:
      "The service is temporarily unavailable. Please try again shortly.",
    description:
      "Error shown when a backing service is down (SERVICE_UNAVAILABLE)",
  },
  "common.errors.resourceLimitReached": {
    message: "You've reached your plan's limit. Upgrade to continue.",
    description:
      "Error shown when a plan resource limit is hit (RESOURCE_LIMIT_REACHED)",
  },
  "common.errors.operationNotAllowed": {
    message: "This action isn't allowed.",
    description:
      "Error shown when business rules forbid the action (OPERATION_NOT_ALLOWED)",
  },
  "common.errors.premiumRequired": {
    message: "This feature requires a Premium subscription.",
    description:
      "Error shown when a feature needs a premium plan (PREMIUM_REQUIRED)",
  },
  "common.errors.network": {
    message:
      "Connection problem. Please check your internet connection and try again.",
    description:
      "Error shown when the network request itself fails (offline, DNS)",
  },
  "common.errors.generic": {
    message: "Something went wrong. Please try again.",
    description: "Generic fallback error message for unrecognized errors",
  },
  "common.errorBoundary.title": {
    message: "Something went wrong",
    description: "Title of the error boundary fallback panel",
  },
  "common.errorBoundary.description": {
    message:
      "This section couldn't be displayed. The rest of the page should still work.",
    description: "Body of the error boundary fallback panel",
  },
  "common.copyCode": {
    message: "Copy code",
    description: "Aria label for the copy button on code blocks",
  },
  "common.copiedToClipboard": {
    message: "Copied to clipboard",
    description: "Toast after content was copied to the clipboard",
  },
  "common.copyFailed": {
    message: "Failed to copy",
    description: "Toast when copying to the clipboard failed",
  },
};

export default enCommon;
