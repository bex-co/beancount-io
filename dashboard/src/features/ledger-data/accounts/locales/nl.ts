export interface TranslationEntry {
  message: string;
  description: string;
}

const nlAccounts: Record<string, TranslationEntry> = {
  "page.accounts.actionsForAccount": {
    message: "Acties voor {account}",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "Rekening",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "Rekening moet beginnen met een van: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "De saldi hier zijn actueel. Het tijdfilter geldt niet voor deze pagina.",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "{account} is al geopend (sinds {date}).",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "{account} is op {date} gesloten; Beancount staat heropenen niet toe.",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "Rekeningnaam",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Rekeningnaam is verplicht",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message:
      "Gebruik door dubbele punten gescheiden rekeningdelen zonder spaties of lege onderdelen",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "Rekeningnamen mogen geen spaties bevatten.",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message:
      "Verwijder het lege deel: geen “::” en geen “:” aan het begin of einde.",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "Elk deel moet beginnen met een hoofdletter of een cijfer 0–9 — “{component}” doet dat niet (bijvoorbeeld Assets:Bank).",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message:
      "“{component}” mag alleen letters, cijfers en koppeltekens bevatten.",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "Rekeningen",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allAccountsIn": {
    message: "Alle beancount rekeningen in {ledgerName}",
    description:
      "Page description showing all accounts. {ledgerName} is replaced with the ledger display name.",
  },
  "page.accounts.allTypes": {
    message: "Alle typen",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Saldo",
    description: "Table column header for account balance",
  },
  "page.accounts.balanceNotComputed": {
    message: "Niet berekend",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
  },
  "page.accounts.close": {
    message: "Sluiten",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Rekening sluiten",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "Dit voegt een sluitingsdirectief toe voor {account} op {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closeDate": {
    message: "Sluitingsdatum",
    description: "Table column header for account close date",
  },
  "page.accounts.closed": {
    message: "Gesloten",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Rekening verwijderen",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "Dit verwijdert permanent de openingsdirectief voor {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "Dit verwijdert permanent de openings- en sluitingsdirectieven voor {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Boekingen",
    description: "Table column header for posting count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Inhoudsitem laden...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.new": {
    message: "Nieuw",
    description: "Button text to create a new account",
  },
  "page.accounts.noAccountsFound": {
    message: "Geen rekeningen gevonden",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Geen rekeningen komen overeen met uw huidige filters.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Open",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Rekening openen",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Openingsdatum",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Rekeningen zoeken...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.status": {
    message: "Status",
    description: "Table column header for account status (Open/Closed)",
  },
  "page.accounts.type": {
    message: "Type",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Rekening {account} gesloten",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Account {account} verwijderd",
    description: "Toast shown after deleting an account",
  },
};

export default nlAccounts;
