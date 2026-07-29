export interface TranslationEntry {
  message: string;
  description: string;
}

const frCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message: "Gérez qui peut accéder et collaborer sur ce grand livre",
    description: "Description for collaborators settings section",
  },
};

export default frCollaboratorsSection;
