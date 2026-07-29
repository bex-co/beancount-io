export interface TranslationEntry {
  message: string;
  description: string;
}

const zhCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message: "管理谁可以访问和协作此账本",
    description: "Description for collaborators settings section",
  },
};

export default zhCollaboratorsSection;
