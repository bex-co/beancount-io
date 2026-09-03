export interface TranslationEntry {
  message: string;
  description: string;
}

const zhAiAgent: Record<string, TranslationEntry> = {
  "aiAgent.title": {
    message: "询问 Beancount.io",
    description: "Title for AI chat feature",
  },
  "aiAgent.placeholder": {
    message: "询问我关于 Beancount 的任何问题...",
    description: "Input placeholder text",
  },
  "aiAgent.readOnlyTitle": {
    message: "只读助手",
    description: "Title of the agent permission notice",
  },
  "aiAgent.readOnlyDescription": {
    message:
      "你可以提问和分析文件。更改账本需要写入权限，但我可以为你起草更改内容。",
    description: "Explanation shown when the agent cannot change the ledger",
  },
  "aiAgent.welcome": {
    message:
      "你好！我是你的 Beancount AI 助手，帮助你进行纯文本记账。\n\n" +
      "我可以：\n" +
      "• 解释 Beancount 语法并调试错误\n" +
      "• 指导你编写交易、账户和指令\n" +
      "• 回答会计和记账问题\n" +
      "• 帮助你进行查询、报表和最佳实践\n\n" +
      "你想知道什么？",
    description: "Welcome message shown when chat loads",
  },
  "aiAgent.quickAskPlaceholder": {
    message: "问我关于此账本的任何问题...",
    description: "Placeholder for quick ask input on overview page",
  },
  "aiAgent.ask": {
    message: "询问",
    description: "Button text to submit quick question",
  },
  "aiAgent.upgradeTitle": {
    message: "AI 请求即将用完",
    description: "Title for upgrade panel when near AI usage cap",
  },
  "aiAgent.upgradeDescription": {
    message: "本月已使用 {used}/{max} 次请求。升级以获取更多。",
    description: "Description for upgrade panel showing usage",
  },
  "aiAgent.upgradeCta": {
    message: "升级",
    description: "Button text to upgrade plan",
  },
  "aiAgent.premiumTier": {
    message: "Premium",
    description: "Premium tier name",
  },
  "aiAgent.growthTier": {
    message: "Growth",
    description: "Growth tier name",
  },
  "aiAgent.organizationTier": {
    message: "Organization",
    description: "Organization tier name",
  },
  "aiAgent.perMonth": {
    message: "/月",
    description: "Per month pricing suffix",
  },
  "aiAgent.tokensPerMonth": {
    message: "每月 {count} 个令牌",
    description: "Number of AI tokens included in a tier",
  },
  "aiAgent.popular": {
    message: "热门",
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
    message: "记录收据交易",
    description: "Title of the receipt transaction approval card",
  },
  "aiAgent.receiptApproval.preparing": {
    message: "正在准备交易…",
    description: "Status while the receipt transaction is being prepared",
  },
  "aiAgent.receiptApproval.recorded": {
    message: "交易已记录",
    description: "Status after the receipt transaction was recorded",
  },
  "aiAgent.receiptApproval.failed": {
    message: "记录交易失败",
    description: "Error when recording the receipt transaction failed",
  },
  "aiAgent.receiptApproval.date": {
    message: "日期",
    description: "Label for the receipt transaction date",
  },
  "aiAgent.receiptApproval.payee": {
    message: "收款方",
    description: "Label for the receipt transaction payee",
  },
  "aiAgent.receiptApproval.amount": {
    message: "金额",
    description: "Label for the receipt transaction amount",
  },
  "aiAgent.receiptApproval.expense": {
    message: "支出",
    description: "Label for the receipt expense account",
  },
  "aiAgent.receiptApproval.payment": {
    message: "付款",
    description: "Label for the receipt payment account",
  },
  "aiAgent.attachFile": {
    message: "附加文件",
    description: "Aria label for the attach file button in the chat input",
  },
  "aiAgent.removeAttachment": {
    message: "移除 {fileName}",
    description:
      "Aria label for removing a staged attachment; {fileName} is the attachment file name",
  },
  "aiAgent.attachmentFailed": {
    message: "失败",
    description: "Chip label when an attachment failed to upload",
  },
  "aiAgent.scrollToBottom": {
    message: "滚动到底部",
    description: "Aria label for the scroll to bottom button in the chat",
  },
  "aiAgent.attachment": {
    message: "附件",
    description: "Fallback filename for an attachment",
  },
  "aiAgent.preparing": {
    message: "准备...",
    description: "Status while an AI tool is preparing",
  },
  "aiAgent.toolFailed": {
    message: "{tool} 失败",
    description: "Fallback error when an AI tool fails",
  },
  "aiAgent.toolList": {
    message: "列表",
    description: "Label for the list-files AI tool",
  },
  "aiAgent.toolRead": {
    message: "阅读",
    description: "Label for the read-file AI tool",
  },
  "aiAgent.checkingLedgerContext": {
    message: "检查账本上下文",
    description: "Status while AI tools inspect a ledger",
  },
  "aiAgent.checkedFiles": {
    message: "已检查 {count} 文件",
    description: "Summary of files inspected by AI tools",
  },
  "aiAgent.ranQueries": {
    message: "执行 {count} 查询或查询",
    description: "Summary of queries run by AI tools",
  },
  "aiAgent.usedTools": {
    message: "使用过 {count} 工具",
    description: "Summary of tools used by the AI",
  },
  "aiAgent.unknownBlock": {
    message: "未知块",
    description: "Fallback label for an unsupported AI message block",
  },
  "aiAgent.editApproval.preparingChanges": {
    message: "准备更改...",
    description: "Status while AI file changes are prepared",
  },
  "aiAgent.editApproval.appliedOperations": {
    message: "应用了 {count} 操作",
    description: "Success status for applied AI file operations",
  },
  "aiAgent.editApproval.failed": {
    message: "编辑失败",
    description: "Fallback error for a failed AI file edit",
  },
};

export default zhAiAgent;
