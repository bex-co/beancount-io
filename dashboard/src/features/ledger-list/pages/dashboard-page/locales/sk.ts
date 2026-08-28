export interface TranslationEntry {
  message: string;
  description: string;
}

const skDashboardPage: Record<string, TranslationEntry> = {
  "page.dashboard.blogFeed": {
    message: "Najnovšie Aktualizácie",
    description: "Title for blog feed section on dashboard",
  },
  "page.dashboard.createLedger": {
    message: "Vytvoriť knihu",
    description: "Button to create new ledger",
  },
  "page.dashboard.createNewLedger": {
    message: "Vytvoriť novú knihu",
    description: "Dialog title for creating ledger",
  },
  "page.dashboard.createNewLedgerDescription": {
    message:
      "Vytvorte si novú Beancount knihu a začnite spravovať svoje financie.",
    description: "Description in create ledger dialog",
  },
  "page.dashboard.dashboard": {
    message: "Dashboard",
    description: "Dashboard page title shown in sidebar header",
  },
  "page.dashboard.goToDashboard": {
    message: "Prejsť na dashboard",
    description:
      "Aria label for the home/logo button navigating to the dashboard",
  },
  "page.dashboard.deleteLedger": {
    message: "Vymazať knihu",
    description: "Button tooltip or action for deleting ledger",
  },
  "page.dashboard.deleteLedgerConfirm": {
    message:
      'Ste si istí, že chcete vymazať "{name}"? Túto akciu nie je možné vrátiť späť.',
    description:
      "Confirmation message for ledger deletion (contains {name} placeholder)",
  },
  "page.dashboard.deleting": {
    message: "Vymazávam...",
    description: "Button text while deleting account",
  },
  "page.dashboard.descriptionOptional": {
    message: "Popis (Voliteľné)",
    description: "Description field label with optional indicator",
  },
  "page.dashboard.editLedger": {
    message: "Upraviť knihu",
    description: "Button tooltip for editing ledger",
  },
  "page.dashboard.editLedgerSettings": {
    message: "Upraviť nastavenia knihy",
    description: "Dialog title for editing ledger",
  },
  "page.dashboard.enterDescription": {
    message: "Zadajte popis",
    description: "Placeholder for description input",
  },
  "page.dashboard.enterLedgerName": {
    message: "Zadajte názov knihy",
    description: "Placeholder for ledger name input",
  },
  "page.dashboard.failedToLoadLedgers": {
    message: "Načítanie kníh zlyhalo",
    description: "Error title when ledgers fail to load",
  },
  "page.dashboard.feedError": {
    message: "Nepodarilo sa načítať kanál",
    description: "Error message when feed fails to load",
  },
  "page.dashboard.ledgerCreatedSuccess": {
    message: "Kniha bola úspešne vytvorená",
    description: "Success message when ledger is created",
  },
  "page.dashboard.ledgerDeletedSuccess": {
    message: "Kniha bola úspešne vymazaná",
    description: "Toast notification when ledger deleted",
  },
  "page.dashboard.ledgerLimitReached": {
    message:
      "Dosiahli ste limit hlavných kníh. Inovujte, aby ste mohli vytvoriť viac kníh.",
    description: "Tooltip shown when save button is disabled due to limit",
  },
  "page.dashboard.ledgerName": {
    message: "Názov knihy",
    description: "Form label for ledger name field",
  },
  "page.dashboard.ledgerUpdatedSuccess": {
    message: "Kniha bola úspešne aktualizovaná",
    description: "Toast notification when ledger updated",
  },
  "page.dashboard.loadingLedgers": {
    message: "Načítavam knihy...",
    description: "Message shown while loading ledgers",
  },
  "page.dashboard.manageLedgers": {
    message: "Spravujte svoje Beancount knihy",
    description: "Description of ledger management",
  },
  "page.dashboard.nameInvalid": {
    message: "Názov musí obsahovať aspoň jedno písmeno alebo číslo",
    description: "Validation error when name contains only special characters",
  },
  "page.dashboard.nameMaxLength": {
    message: "Názov musí mať menej ako 100 znakov",
    description: "Validation error when name exceeds limit",
  },
  "page.dashboard.nameRequired": {
    message: "Názov je povinný",
    description: "Validation error when name is missing",
  },
  "page.dashboard.noFeedItems": {
    message: "Nie sú k dispozícii žiadne položky",
    description: "Empty state message when no feed items exist",
  },
  "page.dashboard.noLedgersFound": {
    message: "Žiadne knihy neboli nájdené",
    description: "Message when user has no ledgers",
  },
  "page.dashboard.noLedgersDescription": {
    message: "Vytvorte si prvú knihu a začnite sledovať svoje financie.",
    description:
      "Empty state description prompting the user to create their first ledger",
  },
  "page.dashboard.private": {
    message: "Súkromné",
    description: "Privacy status: private/not public",
  },
  "page.dashboard.privateAccess": {
    message: "Prístup majú len vy a spolupracovníci",
    description: "Description of private access level",
  },
  "page.dashboard.public": {
    message: "Verejné",
    description: "Privacy status: public/visible to all",
  },
  "page.dashboard.publicWarning": {
    message: "Ktokoľvek s odkazom môže vidieť vaše finančné údaje",
    description: "Warning about public access level",
  },
  "page.dashboard.repositoryName": {
    message: "Názov repozitára",
    description: "Label for the slugified repository name preview",
  },
  "page.dashboard.retry": {
    message: "Opakovať",
    description: "Button to retry failed operation",
  },
  "page.dashboard.searchLedgers": {
    message: "Hľadať knihy...",
    description: "Placeholder for ledger search input",
  },
  "page.dashboard.selectLedger": {
    message: "Vybrať knihu",
    description: "Aria label for ledger switcher button",
  },
  "page.dashboard.showMore": {
    message: "Zobraziť Viac",
    description: "Button text to load more feed items",
  },
  "page.dashboard.updateLedgerDetails": {
    message: "Aktualizujte podrobnosti vašej knihy.",
    description: "Description in edit ledger dialog",
  },
  "page.dashboard.yourLedgers": {
    message: "Vaše knihy",
    description: "Section title for user's ledgers list",
  },
  "page.dashboard.goToAccount": {
    message: "Prejsť na účet {owner}",
    description: "Tooltip for navigating to owner's account page",
  },
};

export default skDashboardPage;
