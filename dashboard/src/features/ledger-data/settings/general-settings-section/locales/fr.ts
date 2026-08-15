export interface TranslationEntry {
  message: string;
  description: string;
}

const frGeneralSettingsSection: Record<string, TranslationEntry> = {
  "page.settings.description": {
    message: "Description",
    description: "Label for ledger description field in settings",
  },
  "page.settings.settingsUpdated": {
    message: "Paramètres mis à jour avec succès",
    description: "Success message when settings are saved",
  },
  "page.settings.ledgerNameDescription": {
    message: "Ce nom sera affiché dans toute l'application",
    description: "Help text for ledger name field",
  },
  "page.settings.generalSettings": {
    message: "Paramètres généraux",
    description: "Section title for general settings",
  },
  "page.settings.generalSettingsDescription": {
    message: "Mettre à jour le nom du grand livre et les informations de base",
    description: "Description for general settings section",
  },
  "page.settings.ledgerDescriptionDescription": {
    message:
      "Cette description sera utilisée pour les balises meta SEO et aide les autres à comprendre le but de votre registre.",
    description: "Help text explaining the description field",
  },
  "page.settings.ledgerDescriptionPlaceholder": {
    message: "Entrez une description pour votre registre (facultatif)",
    description: "Placeholder text for description field",
  },
};

export default frGeneralSettingsSection;
