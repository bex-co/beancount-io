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
  "aiAgent.prCreated": {
    message: "✓ 풀 리퀘스트가 생성되었습니다",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "PR # 보기",
    description: "Link text to view pull request",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "이 장부에 대해 무엇이든 물어보세요...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "질문",
    description: "Button text to submit quick question",
  },
  "aiAgent.limitReached": {
    message:
      "월간 AI 요청 한도({max}건)에 도달했습니다. 더 많은 AI 요청을 사용하려면 플랜을 업그레이드하거나 다음 달까지 기다려 주세요.",
    description: "Message when user hits AI CFO monthly limit",
  },
  "aiAgent.serviceUnavailable": {
    message:
      "AI 서비스를 일시적으로 사용할 수 없습니다. 몇 분 후 다시 시도해 주세요.",
    description:
      "Message when AI CFO service is down or usage check fails (503)",
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
  "aiAgent.suggestionsTitle": {
    message: "이렇게 물어보세요:",
    description:
      "Heading above suggested example questions in the empty chat state",
  },
  "aiAgent.suggestions.diningLastMonth": {
    message: "지난달에 외식비로 얼마를 썼나요?",
    description: "Suggested question: dining spend last month",
  },
  "aiAgent.suggestions.netWorth": {
    message: "현재 순자산은 얼마인가요?",
    description: "Suggested question: current net worth",
  },
  "aiAgent.suggestions.topCategories": {
    message: "올해 지출 상위 5개 카테고리를 보여줘",
    description: "Suggested question: top 5 expense categories this year",
  },
  "aiAgent.suggestions.uncategorized": {
    message: "분류하지 않은 거래가 있나요?",
    description: "Suggested question: uncategorized transactions",
  },
  "aiAgent.suggestions.monthOverMonth": {
    message: "이번 달 지출을 지난달과 비교해줘",
    description: "Suggested question: compare this month to last month",
  },
  "aiAgent.suggestions.largestExpense": {
    message: "이번 분기에 가장 큰 지출은 뭐야?",
    description: "Suggested question: largest single expense this quarter",
  },
  "aiAgent.stop": {
    message: "중지",
    description: "Button to stop an in-flight AI response",
  },
  "aiAgent.stopped": {
    message: "중지됨",
    description: "Label shown on an AI response the user stopped",
  },
  "aiAgent.answeredIn": {
    message: "답변 시간: {duration}",
    description:
      "Shown under a completed AI answer; {duration} is a formatted elapsed time like 12.3s or 1m 5s",
  },
  "aiAgent.retry": {
    message: "다시 시도",
    description: "Button to resubmit the last question after an error",
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
};

export default koAiAgent;
