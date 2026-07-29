export interface TranslationEntry {
  message: string;
  description: string;
}

const jaDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "およびすべてのデータ。",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "この操作は元に戻せません。元帳とすべての関連データが永久に削除されます。",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "警告",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "で確認",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "データ損失を引き起こす可能性のある元に戻せない操作",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "入力",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "元帳の削除は永久であり、元に戻すことはできません。取引、ドキュメント、履歴を含むすべてのデータが失われます。",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "これにより永久に削除されます",
    description: "Prefix for delete confirmation message",
  },
};

export default jaDangerZoneSection;
