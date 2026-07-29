export interface TranslationEntry {
  message: string;
  description: string;
}

const koGeneralSettingsSection: Record<string, TranslationEntry> = {
  "page.settings.description": {
    message: "설명",
    description: "Label for ledger description field in settings",
  },
  "page.settings.settingsUpdated": {
    message: "설정이 성공적으로 업데이트되었습니다",
    description: "Success message when settings are saved",
  },
  "page.settings.failedToUpdateGeneral": {
    message: "일반 설정 업데이트 실패",
    description: "Error message when general settings update fails",
  },
  "page.settings.ledgerNameDescription": {
    message: "이 이름은 애플리케이션 전체에 표시됩니다",
    description: "Help text for ledger name field",
  },
  "page.settings.generalSettings": {
    message: "일반 설정",
    description: "Section title for general settings",
  },
  "page.settings.generalSettingsDescription": {
    message: "장부 이름 및 기본 정보 업데이트",
    description: "Description for general settings section",
  },
  "page.settings.ledgerDescriptionDescription": {
    message:
      "이 설명은 SEO 메타 태그에 사용되며 다른 사람들이 장부의 목적을 이해하는 데 도움이 됩니다.",
    description: "Help text explaining the description field",
  },
  "page.settings.ledgerDescriptionPlaceholder": {
    message: "장부 설명 입력 (선택사항)",
    description: "Placeholder text for description field",
  },
  "page.settings.failedToRenameLedger": {
    message: "장부 이름 변경 실패",
    description: "Error message when ledger rename fails",
  },
};

export default koGeneralSettingsSection;
