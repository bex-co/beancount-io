export interface TranslationEntry {
  message: string;
  description: string;
}

const ptCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message: "Gerencie quem pode acessar e colaborar neste livro-razão",
    description: "Description for collaborators settings section",
  },
};

export default ptCollaboratorsSection;
