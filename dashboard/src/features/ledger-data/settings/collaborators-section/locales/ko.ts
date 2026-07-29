export interface TranslationEntry {
  message: string;
  description: string;
}

const koCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message: "이 장부에 접근하고 협업할 수 있는 사람 관리",
    description: "Description for collaborators settings section",
  },
};

export default koCollaboratorsSection;
