export interface TranslationEntry {
  message: string;
  description: string;
}

const esGeneralSettingsSection: Record<string, TranslationEntry> = {
  "page.settings.description": {
    message: "Descripción",
    description: "Label for ledger description field in settings",
  },
  "page.settings.settingsUpdated": {
    message: "Configuración actualizada correctamente",
    description: "Success message when settings are saved",
  },
  "page.settings.failedToUpdateGeneral": {
    message: "Error al actualizar la configuración general",
    description: "Error message when general settings update fails",
  },
  "page.settings.ledgerNameDescription": {
    message: "Este nombre se mostrará en toda la aplicación",
    description: "Help text for ledger name field",
  },
  "page.settings.generalSettings": {
    message: "Configuración General",
    description: "Section title for general settings",
  },
  "page.settings.generalSettingsDescription": {
    message: "Actualice el nombre de su libro mayor e información básica",
    description: "Description for general settings section",
  },
  "page.settings.ledgerDescriptionDescription": {
    message:
      "Esta descripción se utilizará para etiquetas meta SEO y ayuda a otros a comprender el propósito de su libro mayor.",
    description: "Help text explaining the description field",
  },
  "page.settings.ledgerDescriptionPlaceholder": {
    message: "Ingrese una descripción para su libro mayor (opcional)",
    description: "Placeholder text for description field",
  },
  "page.settings.failedToRenameLedger": {
    message: "Error al renombrar el libro mayor",
    description: "Error message when ledger rename fails",
  },
};

export default esGeneralSettingsSection;
