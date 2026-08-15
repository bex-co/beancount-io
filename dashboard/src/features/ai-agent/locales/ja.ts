import type { TranslationEntry } from "@/i18n";

const jaAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "Beancount.io に質問する",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "Beancountについて何でも聞いてください...",
    description: "Input placeholder text",
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
  "aiAgent.prCreated": {
    message: "✓ プルリクエストが作成されました",
    description: "Message shown when PR is created",
  },
  "aiAgent.viewPR": {
    message: "PR # を表示",
    description: "Link text to view pull request",
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
  "aiAgent.suggestionsTitle": {
    message: "質問してみましょう:",
    description:
      "Heading above suggested example questions in the empty chat state",
  },
  "aiAgent.suggestions.diningLastMonth": {
    message: "先月の食費はいくらでしたか？",
    description: "Suggested question: dining spend last month",
  },
  "aiAgent.suggestions.netWorth": {
    message: "現在の純資産はいくらですか？",
    description: "Suggested question: current net worth",
  },
  "aiAgent.suggestions.topCategories": {
    message: "今年の支出カテゴリ上位5件を見せて",
    description: "Suggested question: top 5 expense categories this year",
  },
  "aiAgent.suggestions.uncategorized": {
    message: "未分類の取引はありますか？",
    description: "Suggested question: uncategorized transactions",
  },
  "aiAgent.suggestions.monthOverMonth": {
    message: "今月の支出を先月と比較して",
    description: "Suggested question: compare this month to last month",
  },
  "aiAgent.suggestions.largestExpense": {
    message: "今四半期で最大の支出は何ですか？",
    description: "Suggested question: largest single expense this quarter",
  },
  "aiAgent.stop": {
    message: "停止",
    description: "Button to stop an in-flight AI response",
  },
  "aiAgent.stopped": {
    message: "停止しました",
    description: "Label shown on an AI response the user stopped",
  },
  "aiAgent.retry": {
    message: "再試行",
    description: "Button to resubmit the last question after an error",
  },
  "aiAgent.receiptApproval.title": {
    message: "レシートの取引を記録",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "取引を準備中…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "取引を記録しました",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "取引の記録に失敗しました",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "日付",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "支払先",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "金額",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "費用",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "支払い",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "ファイルを添付",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "{fileName}を削除",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "失敗",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "一番下へスクロール",
    description: "Aria label for the scroll to bottom button in the chat",
  },
};

export default jaAiAgent;
