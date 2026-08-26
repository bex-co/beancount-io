export interface TranslationEntry {
  message: string;
  description: string;
}

const enSeo: Record<string, TranslationEntry> = {
  "seo.authCallback.description": {
    message: "Completing your sign in to Beancount.",
    description: "Auth callback page meta description",
  },
  "seo.authCallback.title": {
    message: "Signing In",
    description: "Auth callback page title",
  },
  "seo.deviceAuth.description": {
    message: "Authorize CLI access to your Beancount account.",
    description: "Device auth page meta description",
  },
  "seo.deviceAuth.title": {
    message: "Authorize CLI Access",
    description: "Device auth page title",
  },
  "seo.dashboard.description": {
    message:
      "Your Beancount dashboard. Access your ledgers and manage your financial data.",
    description: "Dashboard page meta description",
  },
  "seo.dashboard.title": {
    message: "Dashboard",
    description: "Dashboard page title",
  },
  "seo.forgotPassword.description": {
    message:
      "Reset your Beancount.io password securely. We'll email a one-time link — then get back to your ledgers.",
    description: "Forgot password page meta description",
  },
  "seo.forgotPassword.title": {
    message: "Reset Beancount Password — Secure Access",
    description: "Forgot password page title",
  },
  "seo.home.description": {
    message:
      "Professional plain-text accounting with Beancount. Track finances, manage ledgers, and generate reports with powerful, precise, auditable accounting.",
    description: "Home page meta description",
  },
  "seo.home.title": {
    message: "Beancount Dashboard - Plain-Text Accounting",
    description: "Home page title",
  },
  "seo.ledgerAccount.description": {
    message:
      "Account details and transaction history for {accountName} in {ledgerName}.",
    description: "Account detail page meta description",
  },
  "seo.ledgerAccount.title": {
    message: "{accountName} - {ledgerName}",
    description: "Account detail page title with account and ledger name",
  },
  "seo.ledgerAsk.description": {
    message:
      "Ask questions about {ledgerName} financial data using AI. Analyze transactions, explore account balances, understand trends, and get instant accounting insights.",
    description: "Ask AI page meta description for SEO",
  },
  "seo.ledgerAsk.title": {
    message: "Ask About {ledgerName} - AI Financial Assistant",
    description: "Ask AI page title with ledger name for SEO",
  },
  "seo.ledgerBalanceSheet.description": {
    message:
      "Balance sheet report for {ledgerName}. View assets, liabilities, and equity at a glance.",
    description: "Balance sheet page meta description",
  },
  "seo.ledgerBalanceSheet.title": {
    message: "Balance Sheet - {ledgerName}",
    description: "Balance sheet page title with ledger name",
  },
  "seo.ledgerCashFlow.description": {
    message:
      "Cash flow statement for {ledgerName}. Track operating, investing, and financing cash movements over time.",
    description: "Cash flow page meta description",
  },
  "seo.ledgerCashFlow.title": {
    message: "Cash Flow - {ledgerName}",
    description: "Cash flow page title with ledger name",
  },
  "seo.ledgerCommodities.description": {
    message:
      "Commodity list and prices for {ledgerName}. Track currencies, stocks, and other assets.",
    description: "Commodities page meta description",
  },
  "seo.ledgerCommodities.title": {
    message: "Commodities - {ledgerName}",
    description: "Commodities page title with ledger name",
  },
  "seo.ledgerDashboard.description": {
    message:
      "View and manage all your Beancount ledgers. Create new ledgers, access existing ones, and organize your financial records.",
    description: "Ledger dashboard page meta description",
  },
  "seo.ledgerDashboard.title": {
    message: "My Ledgers",
    description: "Ledger dashboard page title",
  },
  "seo.ledgerDocuments.description": {
    message:
      "Document attachments and receipts for {ledgerName}. Organize supporting files for your transactions.",
    description: "Documents page meta description",
  },
  "seo.ledgerDocuments.title": {
    message: "Documents - {ledgerName}",
    description: "Documents page title with ledger name",
  },
  "seo.ledgerErrors.description": {
    message:
      "Validation errors and warnings for {ledgerName}. Review and fix issues in your ledger.",
    description: "Errors page meta description",
  },
  "seo.ledgerErrors.title": {
    message: "Errors - {ledgerName}",
    description: "Errors page title with ledger name",
  },
  "seo.ledgerEvents.description": {
    message:
      "Event timeline for {ledgerName}. Track important financial events and milestones.",
    description: "Events page meta description",
  },
  "seo.ledgerEvents.title": {
    message: "Events - {ledgerName}",
    description: "Events page title with ledger name",
  },
  "seo.ledgerFiles.description": {
    message: "Browse Beancount accounting files for {ledgerName}.",
    description: "Ledger file browser meta description",
  },
  "seo.ledgerFiles.title": {
    message: "Files - {ledgerName}",
    description: "File editor page title with ledger name",
  },
  "seo.ledgerFilesCreate.description": {
    message:
      "Create a new file in {ledgerName}. Add accounts, transactions, or other Beancount entries.",
    description: "Create file page meta description",
  },
  "seo.ledgerFilesCreate.title": {
    message: "Create File - {ledgerName}",
    description: "Create file page title with ledger name",
  },
  "seo.ledgerFilesUpload.description": {
    message:
      "Upload files to {ledgerName}. Import existing Beancount files or documents.",
    description: "Upload files page meta description",
  },
  "seo.ledgerFilesUpload.title": {
    message: "Upload Files - {ledgerName}",
    description: "Upload files page title with ledger name",
  },
  "seo.ledgerGallery.description": {
    message:
      "Browse public Beancount ledger examples and templates. Find inspiration for your own financial tracking setup.",
    description: "Ledger gallery page meta description",
  },
  "seo.ledgerGallery.title": {
    message: "Ledger Gallery",
    description: "Ledger gallery page title",
  },
  "seo.ledgerHoldings.description": {
    message:
      "Investment holdings and portfolio for {ledgerName}. View current positions and valuations.",
    description: "Holdings page meta description",
  },
  "seo.ledgerHoldings.title": {
    message: "Holdings - {ledgerName}",
    description: "Holdings page title with ledger name",
  },
  "seo.ledgerImport.description": {
    message:
      "Import transactions into {ledgerName} from CSV, PDF, OFX, or image files. AI-powered parsing for bank statements and receipts.",
    description: "Import page meta description",
  },
  "seo.ledgerImport.title": {
    message: "Smart Import - {ledgerName}",
    description: "Import page title with ledger name",
  },
  "seo.ledgerIncomeStatement.description": {
    message:
      "Income statement report for {ledgerName}. Track revenue, expenses, and net income over time.",
    description: "Income statement page meta description",
  },
  "seo.ledgerIncomeStatement.title": {
    message: "Income Statement - {ledgerName}",
    description: "Income statement page title with ledger name",
  },
  "seo.ledgerJournal.description": {
    message:
      "Transaction journal for {ledgerName}. View, search, and filter all your accounting entries.",
    description: "Journal page meta description",
  },
  "seo.ledgerJournal.title": {
    message: "Journal - {ledgerName}",
    description: "Journal page title with ledger name",
  },
  "seo.ledgerOverview.description": {
    message:
      "Financial overview and reports for {ledgerName}. View net worth, income, expenses, and asset distribution.",
    description: "Ledger overview page meta description",
  },
  "seo.ledgerOverview.title": {
    message: "Overview - {ledgerName}",
    description: "Ledger overview page title with ledger name",
  },
  "seo.ledgerQuery.description": {
    message:
      "Query {ledgerName} with BQL syntax. Run custom queries and analyze your financial data.",
    description: "BQL query page meta description",
  },
  "seo.ledgerQuery.title": {
    message: "BQL Query - {ledgerName}",
    description: "BQL query page title with ledger name",
  },
  "seo.ledgerSettings.description": {
    message:
      "Configure ledger settings for {ledgerName}. Manage ledger preferences, access, and options.",
    description: "Ledger settings page meta description",
  },
  "seo.ledgerSettings.title": {
    message: "Ledger Settings - {ledgerName}",
    description: "Ledger settings page title with ledger name",
  },
  "seo.ledgerStatistics.description": {
    message:
      "Statistical analysis for {ledgerName}. View metrics, trends, and insights from your financial data.",
    description: "Statistics page meta description",
  },
  "seo.ledgerStatistics.title": {
    message: "Statistics - {ledgerName}",
    description: "Statistics page title with ledger name",
  },
  "seo.ledgerTrialBalance.description": {
    message:
      "Trial balance report for {ledgerName}. Verify the equality of debits and credits in your accounts.",
    description: "Trial balance page meta description",
  },
  "seo.ledgerTrialBalance.title": {
    message: "Trial Balance - {ledgerName}",
    description: "Trial balance page title with ledger name",
  },
  "seo.login.description": {
    message:
      "Sign in to Beancount.io — open-source, Git-backed plain-text accounting. Manage ledgers, import banks, and keep your books auditable.",
    description: "Login page meta description",
  },
  "seo.login.title": {
    message: "Sign In to Beancount — Free Plain-Text Accounting",
    description: "Login page title",
  },
  "seo.logout.description": {
    message: "Signing out of your Beancount account.",
    description: "Logout page meta description",
  },
  "seo.logout.title": {
    message: "Sign Out",
    description: "Logout page title",
  },
  "seo.notFound.description": {
    message:
      "The page you're looking for doesn't exist. It may have been moved or deleted.",
    description: "404 page meta description",
  },
  "seo.notFound.title": {
    message: "Page Not Found",
    description: "404 page title",
  },
  "seo.resetPassword.description": {
    message: "Create a new password for your Beancount account.",
    description: "Reset password page meta description",
  },
  "seo.resetPassword.title": {
    message: "Reset Password",
    description: "Reset password page title",
  },
  "seo.settingsDangerZone.description": {
    message:
      "Manage destructive account actions like permanently deleting your account and all data.",
    description: "Danger zone settings page meta description",
  },
  "seo.settingsDangerZone.title": {
    message: "Danger Zone",
    description: "Danger zone settings page title",
  },
  "seo.settingsGeneral.description": {
    message:
      "Update your profile information, language preferences, and general account settings.",
    description: "General settings page meta description",
  },
  "seo.settingsGeneral.title": {
    message: "General Settings",
    description: "General settings page title",
  },
  "seo.settingsSshKeys.description": {
    message:
      "Manage SSH keys for secure access to your Beancount ledgers via Git.",
    description: "SSH keys settings page meta description",
  },
  "seo.settingsSshKeys.title": {
    message: "SSH Keys",
    description: "SSH keys settings page title",
  },
  "seo.signUp.description": {
    message:
      "Create your free Beancount.io account. Track finances with plain-text ledgers, Fava reports, bank import, and version control — no lock-in.",
    description: "Sign up page meta description",
  },
  "seo.signUp.title": {
    message: "Create Free Beancount Account — Git-Backed Accounting",
    description: "Sign up page title",
  },
  "seo.signUpOtp.description": {
    message:
      "Verify your email address to complete your Beancount account registration.",
    description: "OTP verification page meta description",
  },
  "seo.signUpOtp.title": {
    message: "Verify Email",
    description: "OTP verification page title",
  },
  "seo.welcome.description": {
    message:
      "Welcome to Beancount! Get started with plain-text accounting and financial management.",
    description: "Welcome page meta description",
  },
  "seo.welcome.title": {
    message: "Welcome",
    description: "Welcome page title",
  },
  "seo.error.description": {
    message:
      "An error occurred while loading this page. Please try again or return to the home page.",
    description: "Error page meta description",
  },
  "seo.error.title": {
    message: "Error",
    description: "Error page title",
  },
  "seo.ledgerCommits.description": {
    message:
      "View commit history and version control for {ledgerName}. Track changes to your ledger files over time.",
    description: "Commits page meta description",
  },
  "seo.ledgerCommits.title": {
    message: "Commits - {ledgerName}",
    description: "Commits page title with ledger name",
  },
  "seo.ledgerCommit.description": {
    message:
      "Changes in commit {shortSha} for {ledgerName}. Review modified files and diffs.",
    description: "Commit detail page meta description",
  },
  "seo.ledgerCommit.title": {
    message: "Commit {shortSha} - {ledgerName}",
    description: "Commit detail page title with short hash and ledger name",
  },
  "seo.ledgerPullRequest.description": {
    message:
      "Review pull request changes for {ledgerName}. Approve or reject proposed modifications to your ledger.",
    description: "Pull request page meta description",
  },
  "seo.ledgerPullRequest.title": {
    message: "Pull Request #{prNumber} - {ledgerName}",
    description: "Pull request page title with PR number and ledger name",
  },
  "seo.plaidSettings.description": {
    message:
      "Connect bank accounts to {ledgerName} using Plaid. Automatically import transactions and sync financial data.",
    description: "Plaid settings page meta description",
  },
  "seo.plaidSettings.title": {
    message: "Connected Accounts - {ledgerName}",
    description: "Plaid settings page title with ledger name",
  },
  "seo.plaidConnections.description": {
    message:
      "Manage your connected bank accounts for {ledgerName} — link new banks, update account mappings, sync, or disconnect.",
    description: "Plaid connections management page meta description",
  },
  "seo.plaidConnections.title": {
    message: "Manage Bank Connections - {ledgerName}",
    description: "Plaid connections management page title with ledger name",
  },
};

export default enSeo;
