export interface TranslationEntry {
  message: string;
  description: string;
}

const zhDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "及其所有数据。",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message: "此操作无法撤销。这将永久删除账本及所有关联数据。",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "警告",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "以确认",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "不可逆的操作，可能导致数据丢失",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "输入",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "删除账本是永久性的，无法撤销。所有数据，包括交易、文档和历史记录都将丢失。",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "这将永久删除",
    description: "Prefix for delete confirmation message",
  },
};

export default zhDangerZoneSection;
