export interface TranslationEntry {
  message: string;
  description: string;
}

const deCollaboratorsSection: Record<string, TranslationEntry> = {
  "page.settings.collaboratorsDescription": {
    message:
      "Verwalten Sie, wer auf dieses Hauptbuch zugreifen und daran mitarbeiten kann",
    description: "Description for collaborators settings section",
  },
};

export default deCollaboratorsSection;
