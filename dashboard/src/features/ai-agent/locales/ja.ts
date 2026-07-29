import type { TranslationEntry } from "@/i18n";

const jaAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Beancount.io に質問する",
    description: "Title for AI chat feature",
  },
  "aiAgent.subtitle": {
    message: "台帳のためのAIサポート",
    description: "Subtitle for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Beancountについて何でも聞いてください...",
    description: "Input placeholder text",
  },
  "aiAgent.send": {
    message: "送信",
    description: "Send button text",
  },
  "aiAgent.sending": {
    message: "送信中...",
    description: "Loading state text",
  },
  "aiAgent.welcome": {
    message:
      "こんにちは！私はBeancountのAIアシスタントです。プレーンテキスト会計をサポートします。\n\n" +
      "できること：\n" +
      "• Beancountの構文の説明とエラーのデバッグ\n" +
      "• 取引、勘定科目、ディレクティブの記述サポート\n" +
      "• 会計・簿記に関する質問への回答\n" +
      "• クエリ、レポート、ベストプラクティスのサポート\n\n" +
      "何を知りたいですか？",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.you": {
    message: "あなた",
    description: "Label for user messages",
  },
  "aiAgent.assistant": {
    message: "AIアシスタント",
    description: "Label for AI assistant messages",
  },
  "aiAgent.prCreated": {
    message: "✓ プルリクエストが作成されました",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "PR # を表示",
    description: "Link text to view pull request",
  },
  "aiAgent.status.connecting": {
    message: "考え中...",
    description: "Status badge text when connecting to AI",
  },
  "aiAgent.status.streaming": {
    message: "ストリーミング中...",
    description: "Status badge text when receiving AI response",
  },
  "aiAgent.status.finalizing": {
    message: "完了処理中...",
    description: "Status badge text when finalizing AI response",
  },
  "aiAgent.status.complete": {
    message: "完了",
    description: "Status badge text when AI response is complete",
  },
  "aiAgent.status.error": {
    message: "エラー",
    description: "Status badge text when an error occurs",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "この台帳について何でも聞いてください...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "質問する",
    description: "Button text to submit quick question",
  },
  "aiAgent.limitReached": {
    message:
      "月間AIリクエスト上限（{max}リクエスト）に達しました。より多くのAIリクエストをご利用いただくにはプランをアップグレードするか、来月までお待ちください。",
    description: "Message when user hits AI CFO monthly limit",
  },
  "aiAgent.serviceUnavailable": {
    message: "AIサービスは一時的に利用できません。数分後に再度お試しください。",
    description:
      "Message when AI CFO service is down or usage check fails (503)",
  },
  "aiAgent.upgradeTitle": {
    message: "AIリクエスト残数が少なくなっています",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message:
      "今月{used}/{max}リクエストを使用しました。さらに使用するにはアップグレードしてください。",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "アップグレード",
    description: "Button text to upgrade plan",
  },
  "aiAgent.premiumTier": {
    message: "プレミアム",
    description: "Premium tier name",
  },
  "aiAgent.growthTier": {
    message: "グロース",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "オーガナイゼーション",
    description: "Organization tier name",
  },
  "aiAgent.perMonth": {
    message: "/月",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "{count}トークン / 月",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "人気",
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
  "aiAgent.editApproval.binaryContent": {
    message: "(binary content)",
    description:
      "Placeholder shown when file content is binary (image, PDF, etc.)",
  },
  "aiAgent.readFile.label": {
    message: "Read",
    description: "Label on the read-file tool step",
  },
  "aiAgent.listFiles.label": {
    message: "List",
    description: "Label on the list-files tool step",
  },
};

export default jaAiAgent;
