export interface TranslationEntry {
  message: string;
  description: string;
}

const koDangerZoneSection: Record<string, TranslationEntry> = {
  "page.settings.deleteLedgerConfirmationSuffix": {
    message: "및 모든 데이터.",
    description: "Suffix for delete confirmation message",
  },
  "page.settings.deleteLedgerDialogDescription": {
    message:
      "이 작업은 되돌릴 수 없습니다. 장부와 모든 관련 데이터가 영구적으로 삭제됩니다.",
    description: "Dialog description for ledger deletion",
  },
  "page.settings.warning": {
    message: "경고",
    description: "Warning alert title",
  },
  "page.settings.toConfirm": {
    message: "으로 확인",
    description: "Label suffix for type to confirm",
  },
  "page.settings.dangerZoneDescription": {
    message: "데이터 손실을 일으킬 수 있는 되돌릴 수 없는 작업",
    description: "Description for danger zone section",
  },
  "page.settings.typeToConfirm": {
    message: "입력",
    description: "Label prefix for type to confirm",
  },
  "page.settings.deleteLedgerWarning": {
    message:
      "장부 삭제는 영구적이며 되돌릴 수 없습니다. 거래, 문서, 기록을 포함한 모든 데이터가 손실됩니다.",
    description: "Warning message about ledger deletion consequences",
  },
  "page.settings.deleteLedgerConfirmationPrefix": {
    message: "이 작업은 영구적으로 삭제합니다",
    description: "Prefix for delete confirmation message",
  },
};

export default koDangerZoneSection;
