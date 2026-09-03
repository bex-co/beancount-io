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
  "aiAgent.readOnlyTitle": {
    message: "読み取り専用エージェント",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "質問やファイルの分析はできます。変更には書き込み権限が必要ですが、変更案を作成できます。",
    description: "Explanation shown when the agent cannot change the ledger",
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
  "aiAgent.quickAskPlaceholder": {
    message: "この台帳について何でも聞いてください...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "質問する",
    description: "Button text to submit quick question",
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
  "aiAgent.attachment": {
    message: "添付ファイル",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "準備中…",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} が失敗しました",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "リスト",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "読む",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "台帳のコンテキストを確認しています",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "{count} ファイルをチェックしました",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "{count} クエリを実行しました",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "{count} ツールを使用しました",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "不明なブロック",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "変更を準備しています…",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "適用された {count} 操作",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "編集に失敗しました",
    description: "Fallback error for a failed AI file edit",
  },
};

export default jaAiAgent;
