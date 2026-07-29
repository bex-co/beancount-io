export interface TranslationEntry {
  message: string;
  description: string;
}

const ukCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message:
      "Керуйте тим, хто може отримати доступ і співпрацювати над цією книгою",
    description: "Description for collaborators settings section",
  },
};

export default ukCollaboratorsSection;
