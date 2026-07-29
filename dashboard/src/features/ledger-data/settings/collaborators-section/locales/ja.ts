export interface TranslationEntry {
  message: string;
  description: string;
}

const jaCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message: "この元帳にアクセスしてコラボレートできるユーザーを管理する",
    description: "Description for collaborators settings section",
  },
};

export default jaCollaboratorsSection;
