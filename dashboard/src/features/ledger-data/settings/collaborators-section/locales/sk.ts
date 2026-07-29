export interface TranslationEntry {
  message: string;
  description: string;
}

const skCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message: "Spravujte, kto môže pristupovať a spolupracovať na tejto knihe",
    description: "Description for collaborators settings section",
  },
};

export default skCollaboratorsSection;
