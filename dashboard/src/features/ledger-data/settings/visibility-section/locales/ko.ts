export interface TranslationEntry {
  message: string;
  description: string;
}

const koVisibilitySection: Record<string, TranslationEntry> = {
  "page.settings.publicLedger": {
    message: "공개 장부",
    description: "Label when ledger is public",
  },
  "page.settings.publicLedgerDescription": {
    message: "장부가 공개됩니다. 링크가 있는 누구나 볼 수 있습니다.",
    description: "Description for public ledger state",
  },
  "page.settings.embedCode": {
    message: "삽입 코드",
    description: "Label for embed code field",
  },
  "page.settings.copyUrl": {
    message: "URL 복사",
    description: "Button text for copying URL",
  },
  "page.settings.failedToUpdateVisibility": {
    message: "장부 공개 설정 업데이트 실패",
    description: "Error message when visibility update fails",
  },
  "page.settings.copied": {
    message: "복사됨!",
    description: "Confirmation message when text is copied",
  },
  "page.settings.visibility": {
    message: "공개 설정",
    description: "Section title for visibility settings",
  },
  "page.settings.visibilityDescription": {
    message: "장부에 접근할 수 있는 사람 제어",
    description: "Description for visibility settings section",
  },
  "page.settings.sharingDescription": {
    message: "공개 장부를 다른 사람과 공유",
    description: "Description for sharing settings section",
  },
  "page.settings.shareableUrl": {
    message: "공유 가능한 URL",
    description: "Label for shareable URL field",
  },
  "page.settings.sharingOnlyPublic": {
    message:
      "공유는 공개 장부에서만 가능합니다. 공유를 활성화하려면 위에서 장부 공개 설정을 변경하세요.",
    description: "Info message when ledger is private",
  },
  "page.settings.sharing": {
    message: "공개 공유",
    description: "Subsection title for public sharing options",
  },
  "page.settings.privateLedgerDescription": {
    message: "장부가 비공개입니다. 귀하와 협업자만 접근할 수 있습니다.",
    description: "Description for private ledger state",
  },
  "page.settings.privateLedger": {
    message: "비공개 장부",
    description: "Label when ledger is private",
  },
  "page.settings.copyCode": {
    message: "코드 복사",
    description: "Button text for copying embed code",
  },
};

export default koVisibilitySection;
