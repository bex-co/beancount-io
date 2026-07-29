export interface TranslationEntry {
  message: string;
  description: string;
}

const esCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message: "Gestiona quién puede acceder y colaborar en este libro mayor",
    description: "Description for collaborators settings section",
  },
};

export default esCollaboratorsSection;
