export interface TranslationEntry {
  message: string;
  description: string;
}

const ptDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "e todos os seus dados.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "Esta ação não pode ser desfeita. Isso excluirá permanentemente o livro-razão e todos os dados associados.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "Aviso",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "para confirmar",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "Ações irreversíveis que podem causar perda de dados",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "Digite",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "Excluir um livro-razão é permanente e não pode ser desfeito. Todos os dados, incluindo transações, documentos e histórico serão perdidos.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "Isso excluirá permanentemente",
    description: "Prefix for delete confirmation message",
  },
};

export default ptDangerZoneSection;
