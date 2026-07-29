export interface TranslationEntry {
  message: string;
  description: string;
}

const enCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message: "Manage who can access and collaborate on this ledger",
    description: "Description for collaborators settings section",
  },
};

export default enCollaboratorsSection;
