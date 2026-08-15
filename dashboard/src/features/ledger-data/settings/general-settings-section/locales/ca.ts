export interface TranslationEntry {
  message: string;
  description: string;
}

const caGeneralSettingsSection: Record<string, TranslationEntry> = {
  "page.settings.description": {
    message: "Description",
    description: "Label for ledger description field in settings",
  },
  "page.settings.settingsUpdated": {
    message: "Settings updated successfully",
    description: "Success message when settings are saved",
  },
  "page.settings.ledgerNameDescription": {
    message: "Aquest nom es mostrarà a tota l'aplicació",
    description: "Help text for ledger name field",
  },
  "page.settings.generalSettings": {
    message: "Configuració general",
    description: "Section title for general settings",
  },
  "page.settings.generalSettingsDescription": {
    message: "Actualitza el nom del teu llibre i la informació bàsica",
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
};

export default caGeneralSettingsSection;
