export interface TranslationEntry {
  message: string;
  description: string;
}

const skGeneralSettingsSection: Record<string, TranslationEntry> = {
  "page.settings.description": {
    message: "Description",
    description: "Label for ledger description field in settings",
  },
  "page.settings.settingsUpdated": {
    message: "Settings updated successfully",
    description: "Success message when settings are saved",
  },
  "page.settings.failedToUpdateGeneral": {
    message: "Failed to update general settings",
    description: "Error message when general settings update fails",
  },
  "page.settings.ledgerNameDescription": {
    message: "Tento názov sa zobrazí v celej aplikácii",
    description: "Help text for ledger name field",
  },
  "page.settings.generalSettings": {
    message: "Všeobecné nastavenia",
    description: "Section title for general settings",
  },
  "page.settings.generalSettingsDescription": {
    message: "Aktualizujte názov vašej knihy a základné informácie",
    description: "Description for general settings section",
  },
  "page.settings.ledgerDescriptionDescription": {
    message:
      "This description will be used for SEO meta tags and helps others understand the purpose of your ledger.",
    description: "Help text explaining the description field",
  },
  "page.settings.ledgerDescriptionPlaceholder": {
    message: "Enter a description for your ledger (optional)",
    description: "Placeholder text for description field",
  },
  "page.settings.failedToRenameLedger": {
    message: "Premenovanie knihy zlyhalo",
    description: "Error message when ledger rename fails",
  },
};

export default skGeneralSettingsSection;
