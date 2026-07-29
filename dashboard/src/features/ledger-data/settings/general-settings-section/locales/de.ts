export interface TranslationEntry {
  message: string;
  description: string;
}

const deGeneralSettingsSection: Record<string, TranslationEntry> = {
  "page.settings.description": {
    message: "Beschreibung",
    description: "Label for ledger description field in settings",
  },
  "page.settings.settingsUpdated": {
    message: "Einstellungen erfolgreich aktualisiert",
    description: "Success message when settings are saved",
  },
  "page.settings.failedToUpdateGeneral": {
    message: "Fehler beim Aktualisieren der allgemeinen Einstellungen",
    description: "Error message when general settings update fails",
  },
  "page.settings.ledgerNameDescription": {
    message: "Dieser Name wird in der gesamten Anwendung angezeigt",
    description: "Help text for ledger name field",
  },
  "page.settings.generalSettings": {
    message: "Allgemeine Einstellungen",
    description: "Section title for general settings",
  },
  "page.settings.generalSettingsDescription": {
    message:
      "Aktualisieren Sie den Namen und die Basisinformationen Ihres Hauptbuchs",
    description: "Description for general settings section",
  },
  "page.settings.ledgerDescriptionDescription": {
    message:
      "Diese Beschreibung wird für SEO-Meta-Tags verwendet und hilft anderen, den Zweck Ihres Hauptbuchs zu verstehen.",
    description: "Help text explaining the description field",
  },
  "page.settings.ledgerDescriptionPlaceholder": {
    message: "Geben Sie eine Beschreibung für Ihr Hauptbuch ein (optional)",
    description: "Placeholder text for description field",
  },
  "page.settings.failedToRenameLedger": {
    message: "Hauptbuch konnte nicht umbenannt werden",
    description: "Error message when ledger rename fails",
  },
};

export default deGeneralSettingsSection;
