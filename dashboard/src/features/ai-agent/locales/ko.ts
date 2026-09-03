import type { TranslationEntry } from "@/i18n";

const koAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Beancount.io에 질문하기",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Beancount에 대해 무엇이든 물어보세요...",
    description: "Input placeholder text",
  },
  "aiAgent.readOnlyTitle": {
    message: "읽기 전용 에이전트",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "질문하고 파일을 분석할 수 있습니다. 변경하려면 쓰기 권한이 필요하지만 변경안을 작성해 드릴 수 있습니다.",
    description: "Explanation shown when the agent cannot change the ledger",
  },
  "aiAgent.welcome": {
    message:
      "안녕하세요! 저는 Beancount AI 어시스턴트입니다. 일반 텍스트 회계를 도와드립니다.\n\n" +
      "제가 할 수 있는 것:\n" +
      "• Beancount 문법 설명 및 오류 디버깅\n" +
      "• 거래, 계정, 지시어 작성 가이드\n" +
      "• 회계 및 장부 관련 질문 답변\n" +
      "• 쿼리, 보고서, 모범 사례 지원\n\n" +
      "무엇을 알고 싶으신가요?",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "이 장부에 대해 무엇이든 물어보세요...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "질문",
    description: "Button text to submit quick question",
  },
  "aiAgent.upgradeTitle": {
    message: "AI 요청이 얼마 남지 않았습니다",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "이번 달 {used}/{max}건을 사용했습니다. 더 사용하려면 업그레이드하세요.",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "업그레이드",
    description: "Button text to upgrade plan",
  },
  "aiAgent.premiumTier": {
    message: "프리미엄",
    description: "Premium tier name",
  },
  "aiAgent.growthTier": {
    message: "그로스",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "조직",
    description: "Organization tier name",
  },
  "aiAgent.perMonth": {
    message: "/월",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count}토큰 / 월",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "인기",
    description: "Badge label for the most popular tier",
  },
  "aiAgent.editApproval.title": {
    message: "Edit Request",
    description: "Title for the file edit approval card",
  },
  "aiAgent.editApproval.approve": {
    message: "Approve",
    description: "Button to approve an AI file edit",
  },
  "aiAgent.editApproval.deny": {
    message: "Deny",
    description: "Button to deny an AI file edit",
  },
  "aiAgent.editApproval.approved": {
    message: "Approved",
    description: "Badge shown after user approved the edit",
  },
  "aiAgent.editApproval.denied": {
    message: "Denied",
    description: "Badge shown after user denied the edit",
  },
  "aiAgent.editApproval.newFile": {
    message: "New file",
    description: "Label in diff block when creating a new file",
  },
  "aiAgent.editApproval.replaceFile": {
    message: "Replace file",
    description: "Label in diff block when replacing an entire file",
  },
  "aiAgent.editApproval.deleteFile": {
    message: "Delete file",
    description: "Label in diff block when deleting a file",
  },
  "aiAgent.receiptApproval.title": {
    message: "영수증 거래 기록",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "거래 준비 중…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "거래가 기록되었습니다",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "거래 기록에 실패했습니다",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "날짜",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "수취인",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "금액",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "지출",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "결제",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "파일 첨부",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "{fileName} 제거",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "실패",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "맨 아래로 스크롤",
    description: "Aria label for the scroll to bottom button in the chat",
  },
  "aiAgent.attachment": {
    message: "첨부 파일",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "준비 중…",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} 실패",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "목록",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "읽기",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "원장 컨텍스트 확인",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "{count} 파일을 확인함",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "{count} 쿼리를 실행했습니다.",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "사용된 {count} 도구",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "알 수 없는 블록",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "변경 준비 중…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "{count} 작업 적용됨",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "편집 실패",
    description: "Fallback error for a failed AI file edit",
  },
};

export default koAiAgent;
