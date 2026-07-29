export interface TranslationEntry {
  message: string;
  description: string;
}

const nlCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message:
      "Beheer wie toegang heeft tot en kan samenwerken aan dit grootboek",
    description: "Description for collaborators settings section",
  },
};

export default nlCollaboratorsSection;
