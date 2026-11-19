export interface TranslationEntry {
  message: string;
  description: string;
}

const skAccounts: Record<string, TranslationEntry> = {
  "page.accounts.actionsForAccount": {
    message: "Akcie pre {account}",
    description:
      "Accessible name for account row actions; {account} is the full account name",
  },
  "page.accounts.account": {
    message: "Účet",
    description: "Table column header for account name",
  },
  "page.accounts.accountMustStartWith": {
    message: "Účet musí začínať jedným z: {prefixes}",
    description: "Validation error when account prefix is invalid",
  },
  "page.accounts.timeFilterNotApplied": {
    message:
      "Zostatky tu sú aktuálne. Časový filter sa na túto stránku nevzťahuje.",
    description:
      "Note on the Accounts directory when a Time filter is in the URL; its balances are always current",
  },
  "page.accounts.accountAlreadyOpen": {
    message: "Účet {account} je už otvorený (od {date}).",
    description:
      "Validation error when the account to open is already open; {account} is the name, {date} its open date",
  },
  "page.accounts.accountAlreadyClosed": {
    message:
      "Účet {account} bol zatvorený {date}; Beancount ho nedovolí znova otvoriť.",
    description:
      "Validation error when the account to open was opened and later closed; {account} is the name, {date} its close date",
  },
  "page.accounts.accountName": {
    message: "Názov účtu",
    description: "Form label for account name input",
  },
  "page.accounts.accountNameRequired": {
    message: "Názov účtu je povinný",
    description: "Validation error when account name field is empty",
  },
  "page.accounts.accountNameInvalid": {
    message:
      "Použite komponenty účtu oddelené dvojbodkou bez medzier a prázdnych častí",
    description:
      "Validation error when the account name is not a complete Beancount account token",
  },
  "page.accounts.accountNameWhitespace": {
    message: "Názvy účtov nemôžu obsahovať medzery.",
    description: "Validation error when the account name contains whitespace",
  },
  "page.accounts.accountNameEmptyComponent": {
    message:
      "Odstráňte prázdnu časť: bez „::“ a bez „:“ na začiatku alebo konci.",
    description:
      "Validation error when the account name has an empty colon-separated part",
  },
  "page.accounts.accountNameComponentStart": {
    message:
      "Každá časť musí začínať veľkým písmenom alebo číslicou 0 – 9 — „{component}“ tak nezačína (napríklad Assets:Bank).",
    description:
      "Validation error when a part does not start with an uppercase letter or digit; {component} is that part",
  },
  "page.accounts.accountNameInvalidCharacter": {
    message: "„{component}“ môže obsahovať iba písmená, číslice a spojovníky.",
    description:
      "Validation error when a part contains a character other than letters, digits and hyphens; {component} is that part",
  },
  "page.accounts.accountSubAccountPlaceholder": {
    message: "Account:SubAccount",
    description:
      "Placeholder text for account name input showing the expected format",
  },
  "page.accounts.accounts": {
    message: "Účty",
    description: "Page title for the accounts list page",
  },
  "page.accounts.allTypes": {
    message: "Všetky typy",
    description: "Filter option to show all event types",
  },
  "page.accounts.balance": {
    message: "Zostatok",
    description: "Table column header for account balance",
  },
  "page.accounts.balanceNotComputed": {
    message: "Nevypočítané",
    description:
      "Balance cell for an account whose balance the server does not compute (income, expense, and equity accounts); distinct from a zero balance",
  },
  "page.accounts.close": {
    message: "Zavrieť",
    description: "Button text to close an account",
  },
  "page.accounts.closeAccount": {
    message: "Zavrieť účet",
    description: "Dialog title and button text for closing an account",
  },
  "page.accounts.closeAccountDescription": {
    message: "Toto pridá direktívu uzavretia pre {account} dňa {date}.",
    description:
      "Description shown in close account dialog. {account} is the account name, {date} is the close date.",
  },
  "page.accounts.closed": {
    message: "Uzavretý",
    description: "Badge text showing an account is closed",
  },
  "page.accounts.deleteAccount": {
    message: "Odstrániť účet",
    description: "Dialog title for deleting an account",
  },
  "page.accounts.deleteAccountDescriptionOpenOnly": {
    message: "Toto natrvalo odstráni direktívu otvorenia pre {account}.",
    description:
      "Description in delete account dialog when account is not closed. {account} is replaced with the account name.",
  },
  "page.accounts.deleteAccountDescriptionWithClose": {
    message:
      "Toto natrvalo odstráni direktívy otvorenia a uzavretia pre {account}.",
    description:
      "Description in delete account dialog when account is closed. {account} is replaced with the account name.",
  },
  "page.accounts.entries": {
    message: "Zápisy",
    description: "Table column header for posting count",
  },
  "page.accounts.loadingEntryContent": {
    message: "Načítavam obsah záznamu...",
    description: "Loading message when fetching entry content in delete dialog",
  },
  "page.accounts.noAccountsFound": {
    message: "Nenašli sa žiadne účty",
    description: "Empty state title when no accounts exist or match filters",
  },
  "page.accounts.noAccountsMatchFilters": {
    message: "Žiadne účty nezodpovedajú vašim aktuálnym filtrom.",
    description:
      "Empty state description when no accounts match the current search/filter",
  },
  "page.accounts.open": {
    message: "Otvorený",
    description:
      "Badge text showing an account is open; also used as directive label",
  },
  "page.accounts.openAccount": {
    message: "Otvoriť účet",
    description: "Dialog title and button text for opening a new account",
  },
  "page.accounts.openDate": {
    message: "Dátum otvorenia",
    description: "Table column header and form label for account open date",
  },
  "page.accounts.searchAccounts": {
    message: "Hľadať účty...",
    description: "Placeholder text for accounts search input",
  },
  "page.accounts.type": {
    message: "Typ",
    description: "Table column header for type",
  },
  "page.accounts.accountClosedToast": {
    message: "Účet {account} bol zavretý",
    description:
      "Toast shown after an account was closed; {account} is the account name",
  },
  "page.accounts.accountDeletedToast": {
    message: "Účet {account} bol odstránený",
    description: "Toast shown after deleting an account",
  },
  "page.accounts.accountCount_one": {
    message: "{shown} účet",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_few": {
    message: "{shown} účty",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_many": {
    message: "{shown} účtu",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.accountCount_other": {
    message: "{shown} účtov",
    description:
      "Account count under the Accounts page title, after the ledger name; {shown} is the formatted number",
  },
  "page.accounts.openRegister": {
    message: "Otvoriť kartu účtu",
    description:
      "Menu item on an Accounts row that opens that account's register (its running list of postings)",
  },
  "page.accounts.closeNeedsZeroBalance": {
    message: "Zatvoriť možno len účet s nulovým zostatkom.",
    description:
      "Why Close is unavailable for an account, shown under the greyed Close item in its row menu",
  },
  "page.accounts.deleteNeedsNoPostings": {
    message: "Odstrániť možno len účet bez zápisov.",
    description:
      "Why Delete is unavailable for an account, shown under the greyed Delete item in its row menu",
  },
  "page.accounts.balancesNotComputed": {
    message: "Zostatky sa nepočítajú",
    description:
      "Note in an account type's heading on the Accounts page when no balance is computed for that type (Equity)",
  },
  "page.accounts.periodTotals": {
    message: "Súčty za obdobie:",
    description:
      "In the Income and Expenses headings on the Accounts page, before a link to the Income Statement, which has their totals by period",
  },
  "page.accounts.otherType": {
    message: "Ostatné",
    description:
      "Heading on the Accounts page for accounts outside the five account types",
  },
  "page.accounts.totalsOn": {
    message: "Súčty:",
    description:
      "In the Equity heading on the Accounts page, before a link to the Balance Sheet, which has Equity's totals",
  },
  "page.accounts.readFailedLedgerUnchanged": {
    message:
      "Vo vašej knihe sa nič nezmenilo. Skúste to znova alebo sa vráťte o minútu.",
    description:
      "Message when the Accounts list could not be read, above Try Again: nothing was changed",
  },
  "page.accounts.withSubAccounts": {
    message: "s podúčtami",
    description:
      "Under a parent account's figure on the Accounts page: the total is what its sub-accounts hold, the parent itself holding nothing",
  },
  "page.accounts.liabilitiesOwed": {
    message: "Záporný zostatok je to, čo dlhujete",
    description:
      "Note in the Liabilities heading on the Accounts page: Beancount records money owed as a negative balance",
  },
  "page.accounts.noMatchFor": {
    message: "Žiadny názov účtu neobsahuje „{query}“.",
    description:
      "Accounts page when a search finds nothing; {query} is what was typed",
  },
};

export default skAccounts;
