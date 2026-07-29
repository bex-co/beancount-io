export interface TranslationEntry {
  message: string;
  description: string;
}

const caCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message: "Gestiona qui pot accedir i col·laborar en aquest llibre",
    description: "Description for collaborators settings section",
  },
};

export default caCollaboratorsSection;
