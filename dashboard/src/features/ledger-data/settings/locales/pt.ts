import ptGeneralSettingsSection from "../general-settings-section/locales/pt";
import ptVisibilitySection from "../visibility-section/locales/pt";
import ptDangerZoneSection from "../danger-zone-section/locales/pt";
import ptCollaboratorsSection from "../collaborators-section/locales/pt";
import ptBeancountOptionsSection from "../beancount-options-section/locales/pt";
import ptFavaOptionsSection from "../fava-options-section/locales/pt";
import ptBcioOptionsSection from "../bcio-options-section/locales/pt";

export type { TranslationEntry } from "../general-settings-section/locales/en";

const ptSettings: Record<string, { message: string; description: string }> = {
  "page.settings.failedToLoadLedgerSettings": {
    message:
      "Falha ao carregar configurações do livro-razão. Por favor, tente novamente.",
    description: "Error message when ledger settings fail to load",
  },
};

const ptAllSettings = {
  ...ptGeneralSettingsSection,
  ...ptVisibilitySection,
  ...ptDangerZoneSection,
  ...ptCollaboratorsSection,
  ...ptBeancountOptionsSection,
  ...ptFavaOptionsSection,
  ...ptBcioOptionsSection,
  ...ptSettings,
  "page.settings.embedCodeDescription": {
    message:
      'Este código incorporado inclui dimensionamento responsivo, transformação de escala e um botão "Visualizar no Beancount.io" para atribuição.',
    description: "Description of the generated public embed code",
  },
};

export default ptAllSettings;
