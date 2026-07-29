export interface TranslationEntry {
  message: string;
  description: string;
}

const ruCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message:
      "Управляйте тем, кто может получить доступ и сотрудничать с этой книгой",
    description: "Description for collaborators settings section",
  },
};

export default ruCollaboratorsSection;
