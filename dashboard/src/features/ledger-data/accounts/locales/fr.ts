export interface TranslationEntry {
  message: string;
  description: string;
}

const frAccounts: Record<string, TranslationEntry> = {
  "page.accounts.account": {
    message: "Compte",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "Account must start with one of: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.accountName": {
    message: "Nom du compte",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Le nom du compte est requis",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "Comptes",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "Tous les comptes beancount dans {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "Tous les types",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Solde",
    description: "Table column header for account balance",
  },
  "page.accounts.close": {
    message: "Fermer",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Fermer le compte",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message:
      "Cela ajoutera une directive de fermeture pour {account} le {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "Date de fermeture",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "Fermé",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Supprimer le compte",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "This will permanently delete the open directive for {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "This will permanently delete the open and close directives for {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Entrées",
    description: "Table column header for entry count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Loading entry content...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "Nouveau",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "Aucun compte trouvé",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Aucun compte ne correspond à vos filtres actuels.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Ouvert",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Ouvrir le compte",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Open Date",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Rechercher des comptes...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.status": {
    message: "Statut",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "Type",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Compte {account} fermé",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Compte {account} supprimé",
    description: "Toast shown after deleting an account",
  },
};

export default frAccounts;
